/* Service line: P&D (parcel pickup & delivery). Hub sort by zone → routes built from sort codes → load-out scan-all → multi-package stops → attempts → return to station. */
(function(){
const C=CX,fmt=C.fmt,T=C.T;
const REASONS=["Building access issue","No safe place","Business closed","Address info needed","Refused","Unable to deliver today","No answer","Signature/PIN unavailable","Customer reschedule","Package missing","Damage before handoff","Unsafe conditions","Road closure","Bad weather","Vehicle/route disruption","Wrong item","Shortage","Other","Placement declined","Item doesn't fit","Access restriction","Accepted with documented damage"];
const NEXT=["Reattempt","New appointment","Escalate","Hold for instructions","Return to station","Return to shipper","Authorized redirect"];
const pick=(r,a)=>a[Math.floor(r()*a.length)];
// generic route generator shared with Bulky
function genRoute(S,api,geo,o){const r=geo.rng(o.seed);const stops=[];let units=0;
  while(units<o.target){const a=geo.addr(o.grid,r,o.area);let n=o.unitsPerStop(r);if(units+n>o.target)n=o.target-units;stops.push({a,n});units+=n}
  const hub=S.hubs[o.hub];const ordered=C.nn(hub.ll,stops.map(s=>Object.assign(s,{ll:s.a.ll})));
  const zc=o.zones.length,per=Math.ceil(ordered.length/zc);const tasks=[];
  ordered.forEach((s,i)=>{const zone=o.zones[Math.min(zc-1,Math.floor(i/per))];const id=`${o.routeId}-${String(i+1).padStart(3,'0')}`;
    const t=api.mk(o.line,id,s.a.line1,s.a.address,s.a.ll,{contract:o.contract(r,i),workerId:o.driver||null,teamId:o.team,seq:i,state:o.driver?'assigned':'unassigned',x:{zone,city:s.a.city,routeId:o.routeId}});
    o.decorate(t,r,s.n,i,zone);t.timeline=[{at:T(5,40),text:`Sorted to ${zone} · ${t.items.length} ${o.unitWord}`,actor:'Hub sort'}];tasks.push(t)});
  return tasks}
function pkgItems(api,t,n,r,zone,hubName){const items=[];for(let k=0;k<n;k++){const shelf='ABCD'[Math.floor(r()*4)]+String(1+Math.floor(r()*24)).padStart(2,'0');
  items.push({id:'CXP'+String(Math.floor(1e8+r()*9e8)),label:'Package',sortCode:`${zone}-${shelf}`,tote:`TOTE-${zone}-${k%2?'B':'A'}`,weight:+(0.5+r()*14).toFixed(1),loaded:false,events:[api.ev('Label created',T(3,10),'Shipper EDI'),api.ev('Arrived at station',T(4,50),hubName,'Inbound scan'),api.ev(`Sorted to ${zone}`,T(5,35),hubName,'Sort scan')]})}return items}
function progress(S,api,tasks,frac,who,failAt,failReason){const k=Math.floor(tasks.length*frac);let clock=T(8,30);
  tasks.forEach((t,i)=>{t.items.forEach(p=>{p.loaded=true;p.events.push(api.ev('Loaded to vehicle',T(7,50),'Load-out scan',who),api.ev('Out for delivery',T(8,5),'Route start',who))});
    if(i<k){clock+=Math.round(130/Math.max(1,k))+2;if(i===failAt){t.state='failed';t.attempts=1;t.failReason=failReason;t.nextAction='Reattempt';t.completedAt=clock;t.items.forEach(p=>p.events.push(api.ev(`Exception · ${failReason}`,clock,'Stop GPS',who)));t.timeline.push({at:clock,text:`Can't deliver · ${failReason} → Reattempt · next business day (attempt 1 of 3)`,actor:who});return}
      t.state='completed';t.completedAt=clock;t.stepData={omw:{at:clock-6},arrive:{at:clock-2},scan:{at:clock-1},pod:{at:clock,summary:'Front door · photo',photos:1}};t.pod={summary:'Front door · photo',photo:true,signature:false,receivedBy:'Front door'};t.items.forEach(p=>{p.stopScanned=true;p.events.push(api.ev('Delivered',clock,'Stop GPS',who))});t.timeline.push({at:clock,text:'Delivered · Front door · photo POD',actor:who})}
    else if(i===k){t.state='active';t.stepData={omw:{at:T(10,32)}};t.timeline.push({at:T(10,32),text:'On my way',actor:who})}})}
const SAMPLE_CSV=`stop_name,address,lat,lng,packages,window_start,window_end,zone,signature
1203 112th Ave NE,"1203 112th Ave NE, Bellevue, WA 98004",47.6210,-122.1890,3,09:00,17:00,BEL1-Z02,no
1650 140th Ave NE,"1650 140th Ave NE, Bellevue, WA 98005",47.6250,-122.1520,1,08:00,20:00,BEL1-Z03,no
4510 NE 55th St,"4510 NE 55th St, Seattle, WA 98105",47.6684,-122.2680,2,08:00,20:00,SEA1-Z06,yes
7020 15th Ave NW,"7020 15th Ave NW, Seattle, WA 98117",47.6795,-122.3750,4,08:00,20:00,SEA1-Z11,no`;
const cfg={id:'pd',name:'P&D',long:'Parcel pickup & delivery',prefix:'PD',unit:'Package',units:'Packages',stopWord:'stops',stopWord1:'stop',exceptionLabel:"Can't deliver",
  eyebrow:'Operations / P&D · Seattle–Bellevue',hubWord:'station',serviceMin:3,defaultLL:[-122.1650,47.6280],mainView:'map',
  autoLabel:'Build routes from sort codes',optLabel:'Sequence by sort code',
  autoHelp:'Each unassigned package carries a sort code (zone). Zones map to routes; if a route is over its package capacity the stop goes to the on-duty route in the same station with the most room.',
  optHelp:'Keeps zone order (the order totes are staged and loaded), nearest-neighbor inside each zone.',
  reasons:REASONS,nextActions:NEXT,rules:{requeue:'Reattempt',rts:'Return to shipper',station:'Return to station',counts:['Reattempt','New appointment']},
  howItWorks:['Inbound packages are sorted at the station into zones (sort code = station-zone-shelf) and into totes per zone.','Build routes assigns every unassigned package to the route that owns its zone, then balances against route capacity (packages per van).','Stops are grouped by address, so one stop can carry several packages (apartments, offices).','Drivers check in at the station, then scan every package (or whole totes) before the route can depart.','At each stop: On my way → Arrived → scan the stop\'s packages → photo POD (signature when flagged).',"Can't deliver uses the 22 ChainEx reasons and 7 next actions; Reattempt goes back on the same route when the contract allows same-day, and Reattempt / New appointment count toward the attempt limit, then Return to shipper.",'End of day: return to station, scan every undelivered package back in, close the route.'],
  fields:(t,S)=>[['Zone / sort',t.x.zone||'—'],['Stop type',t.tags.includes('MULTI-UNIT')?'Multi-unit building':t.tags.includes('COMMERCIAL')?'Business':'Residence'],['Packages',t.items.length],['Weight',t.items.reduce((a,p)=>a+(p.weight||0),0).toFixed(1)+' lb']],
  itemMeta:p=>`${p.sortCode||''}${p.tote?' · '+p.tote:''}${p.weight?' · '+p.weight+' lb':''}`,
  taskForm:[{id:'zone',label:'Zone / sort code',type:'select',options:S=>Object.keys(S.meta.pd.zoneMap)},{id:'stopType',label:'Stop type',type:'select',options:()=>['Residence','Business','Multi-unit building']},{id:'signature',label:'Signature required',type:'check'}],
  csv:{columns:['stop_name','address','lat','lng','packages','window_start','window_end','zone','signature'],sample:SAMPLE_CSV,row:(o)=>({name:o.stop_name,address:o.address,lat:+o.lat,lng:+o.lng,units:+o.packages||1,start:C.hm(o.window_start),end:C.hm(o.window_end),zone:o.zone,signature:/^(y|yes|true|1)$/i.test(o.signature||'')})},
  exportCols:t=>({zone:t.x.zone,packages:t.items.length}),
  makeItems(t,f,api){const zone=f.zone||Object.keys(api.S.meta.pd.zoneMap)[0];const r=CXGeo.rng(t.id.length*97+Date.now()%1000);return pkgItems(api,t,Math.max(1,+f.units||1),r,zone,'Desk')},
  onCreate(t,f){t.x.zone=f.zone||t.items[0]?.sortCode?.split('-').slice(0,2).join('-');if(f.signature)t.tags.push('SIGNATURE');if(f.stopType==='Business'){t.tags.push('COMMERCIAL')}if(f.stopType==='Multi-unit building')t.tags.push('MULTI-UNIT')},
  onEdit(t,f){if(f.x&&f.x.zone)t.items.forEach(p=>{p.sortCode=f.x.zone+'-'+(p.sortCode||'').split('-').pop();p.tote=`TOTE-${f.x.zone}-A`})},
  autoAssign(S,api,ops,h){const m=S.meta.pd;let n=0;const load=wid=>h.route(wid).reduce((a,t)=>a+t.items.length,0);const touched=new Set();
    S.tasks.filter(t=>t.line==='pd'&&t.state==='unassigned'&&!t.offerId&&!t.x.prebuilt).forEach(t=>{let wid=m.zoneMap[t.x.zone];const d=wid&&api.driver(wid);
      if(!d||d.route.stage==='closed'||!(!CX.eligibility||CX.eligibility(d.id,'pd').ok)||load(wid)+t.items.length>m.capacity){const alt=S.drivers.filter(x=>x.line==='pd'&&x.route.stage!=='closed'&&!x.dspSlot&&(!CX.eligibility||CX.eligibility(x.id,'pd').ok)&&(!d||x.team===d.team)).sort((a,b)=>load(a.id)-load(b.id))[0];wid=alt&&alt.id}
      if(wid){ops.assign(t.id,wid,null,null,'Route build');touched.add(wid);n++}});touched.forEach(w=>ops.optimize(w));return n},
  optimize(S,wid,api,h){const d=api.driver(wid);const r=h.route(wid);const act=r.filter(t=>t.state==='active');const rest=r.filter(t=>t.state!=='active');
    const zones=[...new Set(rest.map(t=>t.x.zone))].sort();let cur=act.length?act[act.length-1].ll:d.loc;const out=[...act];zones.forEach(z=>{const seg=h.nn(cur,rest.filter(t=>t.x.zone===z));out.push(...seg);if(seg.length)cur=seg[seg.length-1].ll});h.applySeq(wid,out)},
  steps:(t)=>[{id:'omw',label:'On my way',kind:'confirm',effect:'active'},{id:'arrive',label:'Arrived',kind:'confirm',effect:'arrive'},{id:'scan',label:'Scan packages',kind:'scan',itemEvent:'Scanned at stop'},
    {id:'pod',label:'Deliver',kind:'pod',placements:['Front door','Handed to recipient','Mailroom','Reception / front desk','Side door','Back porch','Parcel locker'],photoReq:true,sigReq:t.tags.includes('SIGNATURE')}],
  driver:{areas:[['Bellevue, WA','ChainEx Bellevue Station (BEL1)'],['Seattle, WA','ChainEx Seattle Station (SEA1)']],offers:true,checkinTitle:'Station check-in',
    review(D,R,S){const zones={};R.forEach(t=>{const z=t.x.zone||'—';zones[z]=zones[z]||{stops:0,pk:0,totes:new Set()};zones[z].stops++;zones[z].pk+=t.items.length;t.items.forEach(p=>zones[z].totes.add(p.tote))});
      return `<div class="dcard"><div class="eyebrow">Zones on this route (load order)</div>${Object.entries(zones).sort().map(([z,v])=>`<div class="kvrow"><span>${z}</span><span>${v.stops} stops · ${v.pk} pkgs · ${v.totes.size} totes</span></div>`).join('')}</div>`},
    loadTitle:'Scan every package before departing',loadSub:'Scan a whole tote or single packages. Missing or mis-sorted labels go to the station lead.',groupBy:p=>p.tote,groupScan:'Scan tote',returnTitle:'Return to station'},
  completeText:t=>'Delivered',
  seed(S,api,geo){S.hubs.BEL1={id:'BEL1',line:'pd',name:'ChainEx Bellevue Station (BEL1)',address:'13020 NE 20th St, Bellevue, WA 98005',ll:[-122.1650,47.6280]};S.hubs.SEA1={id:'SEA1',line:'pd',name:'ChainEx Seattle Station (SEA1)',address:'1600 W Dravus St, Seattle, WA 98119',ll:[-122.3790,47.6480]};
    Object.assign(S.contracts,{'PD-COM':{id:'PD-COM',line:'pd',name:'ChainEx Commercial Parcel',kind:'Commercial',tracking:true,maxAttempts:3,sameDay:true,sla:'Same day by 8:00 PM'},'PD-OT':{id:'PD-OT',line:'pd',name:'Harborline zone injection · Seattle',kind:'Commercial',tracking:true,maxAttempts:2,sameDay:true,sla:'Same day by 8:00 PM; photo POD'},'PD-RG':{id:'PD-RG',line:'pd',name:'Ridgeline Outfitters · Seattle e-commerce',kind:'Commercial',tracking:false,maxAttempts:2,sameDay:true,sla:'Deliver by 7:00 PM; 2 attempts then return'}});
    S.teams.push({id:'pd-bel',line:'pd',name:'Bellevue station',hub:'BEL1'},{id:'pd-sea',line:'pd',name:'Seattle station',hub:'SEA1'});
    S.vehicles.push({id:'VH-P01',line:'pd',name:'Sprinter 170" · WA C47120',type:'Cargo van',capacity:'140 pkgs'},{id:'VH-P02',line:'pd',name:'Transit 148" · WA C33018',type:'Cargo van',capacity:'120 pkgs'},{id:'VH-P03',line:'pd',name:'ProMaster 159" · WA C29031',type:'Cargo van',capacity:'130 pkgs'},{id:'VH-P04',line:'pd',name:'Transit 130" · WA C51177',type:'Cargo van',capacity:'100 pkgs'});
    const B=S.hubs.BEL1,SE=S.hubs.SEA1;const D=(id,name,did,team,hub,veh,rid,stage,duty)=>({id,name,driverId:did,line:'pd',team,duty,loc:hub.ll.slice(),home:hub.ll.slice(),hub:hub.id,hubName:hub.name,vehicle:veh,helper:'',skills:[],route:{id:rid,stage,checkin:stage==='on_road'?'arrived':'none'},sos:false});
    S.drivers.push(D('avery','Avery Valdez','CX-PILOT-001','pd-bel',B,'Sprinter 170" · WA C47120','PD-BEL-01','not_started',false),D('drew','Drew Kim','CX-1042','pd-sea',SE,'Transit 148" · WA C33018','PD-SEA-02','on_road',true),D('maria','Maria Ortiz','CX-1077','pd-sea',SE,'ProMaster 159" · WA C29031','PD-SEA-03','on_road',true),D('jamal','Jamal Price','CX-1103','pd-sea',SE,'Transit 130" · WA C51177','PD-SEA-04','not_started',true));
    const zoneMap={};const unitsPerStop=r=>{const x=r();return x<.58?1:x<.83?2:x<.94?3:4+Math.floor(r()*3)};
    const deco=(hubName)=>(t,r,n,i,zone)=>{t.items=pkgItems(api,t,n,r,zone,hubName);const x=r();if(n>=4)t.tags.push('MULTI-UNIT');if(x<.14){t.tags.push('COMMERCIAL');t.window=[T(9),T(17)]}else t.tags.push('RESIDENTIAL');if(r()<.06)t.tags.push('SIGNATURE');if(r()<.05){t.tags.push('PRIORITY');t.window=[T(8),T(12)]}};
    const routes=[{routeId:'PD-BEL-01',driver:'avery',team:'pd-bel',hub:'BEL1',grid:'belNE',area:{aves:[100,155],sts:[1,29]},target:92,seed:11,zones:['BEL1-Z01','BEL1-Z02','BEL1-Z03','BEL1-Z04'],contract:()=>'PD-COM'},
      {routeId:'PD-SEA-02',driver:'drew',team:'pd-sea',hub:'SEA1',grid:'seaNE',area:{aves:[8,34],sts:[45,84]},target:84,seed:22,zones:['SEA1-Z05','SEA1-Z06','SEA1-Z07','SEA1-Z08'],contract:()=>'PD-OT',frac:.45,fail:6,reason:'No answer'},
      {routeId:'PD-SEA-03',driver:'maria',team:'pd-sea',hub:'SEA1',grid:'seaNW',area:{aves:[1,30],sts:[50,84]},target:76,seed:33,zones:['SEA1-Z09','SEA1-Z10','SEA1-Z11','SEA1-Z12'],contract:()=>'PD-RG',frac:.35,fail:4,reason:'Building access issue'}];
    routes.forEach(o=>{o.zones.forEach(z=>zoneMap[z]=o.driver);const ts=genRoute(S,api,geo,Object.assign({line:'pd',unitsPerStop,unitWord:'pkgs',decorate:deco(S.hubs[o.hub].name)},o));if(o.frac)progress(S,api,ts,o.frac,api.driver(o.driver).name,o.fail,o.reason);S.tasks.push(...ts)});
    S.meta.pd={zoneMap,capacity:110,routes:{'PD-BEL-01':{name:'Bellevue station · Z01–Z04',station:'BEL1'},'PD-BEL-02':{name:'Bellevue Crossroads · AM wave',station:'BEL1',prebuilt:true,wave:'AM'},'PD-SEA-02':{name:'Seattle NE · Harborline injection',station:'SEA1'},'PD-SEA-03':{name:'Seattle NW · Ridgeline e-commerce',station:'SEA1'}}};
    // Unassigned walkthrough route: 80 stops in a tight Bellevue delivery area (downtown + Crossroads). Dispatch assigns it; drivers do not claim.
    (function(){
      const r=geo.rng(20261112);const BIZ=['Bellevue Corporate Plaza','Crossroads Business Center','Overlake Office Park','112th Ave Medical Suites','Eastside Family Dental','Kelsey Creek Commons','NE 8th Street Pharmacy','Lake Bellevue Landing','Bellevue Way Studios','Factoria Workshop','Main Street Credit Union','Overlake Clinic Annex'];
      const hub=S.hubs.BEL1;const zones=['BEL1-Z05','BEL1-Z06','BEL1-Z07','BEL1-Z08'];const tasks=[];
      for(let i=0;i<80;i++){
        const downtown=i<48;const g=downtown?'belNE':'belNE';
        const area=downtown?{aves:[104,116],sts:[2,16]}:{aves:[140,156],sts:[4,16]};
        const a=geo.addr(g,r,area);const zone=zones[Math.min(zones.length-1,Math.floor(i/20))];
        const id='PD-BEL-02-'+String(i+1).padStart(3,'0');
        let name=a.line1,address=a.address,tags=['RESIDENTIAL'],window=[T(8),T(20)];
        const x=r();
        if(x<.12){const biz=BIZ[Math.floor(r()*BIZ.length)];name=biz;address=a.line1+', '+a.address.split(', ').slice(1).join(', ');tags=['COMMERCIAL'];window=[T(9),T(17)]}
        else if(x<.22){const unit=(1+Math.floor(r()*12))+['A','B','C','D'][Math.floor(r()*4)];name=a.line1+' · Apt '+unit;address=a.line1+' Apt '+unit+', '+a.address.split(', ').slice(1).join(', ');tags=['MULTI-UNIT','RESIDENTIAL']}
        if(r()<.08){tags.push('SIGNATURE')}
        if(r()<.07){tags.push('PRIORITY');window=[T(8),T(12)]}
        else if(r()<.08){window=[T(16),T(20)]}
        else if(r()<.08){window=[T(10),T(14)]}
        const n=unitsPerStop(r);
        const t=api.mk('pd',id,name,address,a.ll,{contract:'PD-COM',workerId:null,teamId:null,seq:i,state:'unassigned',tags,window,x:{zone,city:a.city,routeId:'PD-BEL-02',routeName:'Bellevue Crossroads · AM wave',prebuilt:true,loop:downtown?'A':'B'}});
        t.items=pkgItems(api,t,n,r,zone,hub.name);
        t.timeline=[{at:T(5,50),text:`Sorted to ${zone} · ${t.items.length} pkgs · built as ${t.x.routeId} (unassigned)`,actor:'Hub sort'}];
        tasks.push(t);
      }
      S.tasks.push(...tasks);
      S.manifests.push({id:'MF-105',line:'pd',name:'BEL1 · Bellevue Crossroads AM wave',contract:'PD-COM',importedAt:T(5,20),slaDue:T(20,0),source:'bel1_crossroads_am.csv',taskIds:tasks.map(t=>t.id)});
      S.activity.push({at:T(6,5),text:'PD-BEL-02 built at BEL1 · 80 stops unassigned · ready for dispatch to assign',kind:'manifest',line:'pd'});
    })();
    // late-sort packages (unassigned, carry sort codes)
    const r=geo.rng(44);const late=[['belNE',{aves:[104,150],sts:[2,26]},'BEL1-Z02'],['belNE',{aves:[104,150],sts:[2,26]},'BEL1-Z03'],['belNE',{aves:[104,150],sts:[2,26]},'BEL1-Z04'],['seaNE',{aves:[10,32],sts:[48,80]},'SEA1-Z06'],['seaNE',{aves:[10,32],sts:[48,80]},'SEA1-Z07'],['seaNW',{aves:[2,28],sts:[52,82]},'SEA1-Z10'],['seaNW',{aves:[2,28],sts:[52,82]},'SEA1-Z12'],['belNE',{aves:[104,150],sts:[2,26]},'BEL1-Z01']];
    late.forEach((l,i)=>{const a=geo.addr(l[0],r,l[1]);const id=`PD-LS-${String(i+1).padStart(2,'0')}`;const t=api.mk('pd',id,a.line1,a.address,a.ll,{contract:l[2].startsWith('SEA1-Z1')?'PD-RG':l[2].startsWith('SEA1')?'PD-OT':'PD-COM',tags:['LATE SORT','RESIDENTIAL'],x:{zone:l[2],city:a.city}});t.items=pkgItems(api,t,1+Math.floor(r()*2),r,l[2],l[2].startsWith('BEL')?S.hubs.BEL1.name:S.hubs.SEA1.name);t.timeline=[{at:T(9,55),text:`Late inbound trailer · sorted to ${l[2]}`,actor:'Hub sort'}];S.tasks.push(t)});
    S.offers.push({id:'OF-301',line:'pd',title:'Late-sort add-on',zone:'BEL1 zones Z01/Z04',taskIds:['PD-LS-08','PD-LS-03'],pay:'$18 – $24',pickup:'BEL1 · dock 3',claimedBy:null});api.task('PD-LS-08').offerId='OF-301';api.task('PD-LS-03').offerId='OF-301';
    S.manifests.push({id:'MF-101',line:'pd',name:'BEL1 inbound · linehaul 04:30',contract:'PD-COM',importedAt:T(4,50),slaDue:T(20,0),source:'bel1_inbound_0430.csv',taskIds:S.tasks.filter(t=>t.id.startsWith('PD-BEL')).map(t=>t.id)},{id:'MF-102',line:'pd',name:'SEA1 inbound · Ridgeline e-commerce',contract:'PD-RG',importedAt:T(4,40),slaDue:T(19,0),source:'sea1_ridgeline_ecom.csv',taskIds:S.tasks.filter(t=>t.id.startsWith('PD-SEA-03')).map(t=>t.id)});
    S.activity.push({at:T(9,55),text:'Late inbound trailer at BEL1/SEA1 · 8 late-sort stops waiting for route build',kind:'manifest',line:'pd'},{at:T(10,32),text:'Drew Kim · On my way (PD-SEA-02)',kind:'driver',line:'pd'})},
  heavy(S,api,geo){const r=geo.rng(55);for(let i=0;i<40;i++){const z=['BEL1-Z01','BEL1-Z02','BEL1-Z03','BEL1-Z04','SEA1-Z06','SEA1-Z07','SEA1-Z10','SEA1-Z11'][i%8];const g=z.startsWith('BEL')?['belNE',{aves:[100,155],sts:[1,29]}]:z<'SEA1-Z09'?['seaNE',{aves:[8,34],sts:[45,84]}]:['seaNW',{aves:[1,30],sts:[50,84]}];const a=geo.addr(g[0],r,g[1]);const id=`PD-HV-${String(i+1).padStart(2,'0')}`;const t=api.mk('pd',id,a.line1,a.address,a.ll,{contract:'PD-COM',tags:['PEAK'],x:{zone:z}});t.items=pkgItems(api,t,1+Math.floor(r()*3),r,z,'Peak inbound');S.tasks.push(t)}api.log('Scenario: heavy volume · 40 extra P&D stops unassigned','manifest','pd')},
};
C.registerLine(cfg);CX.pdShared={genRoute,progress,pick};
})();
