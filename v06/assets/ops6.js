/* ChainEx V06 · desk extras: volume seed, work orders, shipments, scan reports, middle-mile moves,
   undo, auto-build, route stats, dispatch settings. Lives on S.v06 so V03/V04 ignore it. Sample data only. */
(function(){
const C=window.CX,A=window.CXA;
if(!C)return;
const LIMITS_DEF={stops:80,packages:120,miles:90,hours:9,capacity:140};
const SK='cx.v06.deskui'; /* UI-only (style, date) */
function ui(){try{return Object.assign({style:'standard',date:'today',undo:[]},JSON.parse(localStorage.getItem(SK)||'{}'))}catch(e){return {style:'standard',date:'today',undo:[]}}}
function saveUi(x){localStorage.setItem(SK,JSON.stringify(x))}

function desk(S){S=S||C.S;S.v06=S.v06||{};const v=S.v06;
  v.workOrders=v.workOrders||[];v.shipments=v.shipments||[];v.scans=v.scans||[];
  v.moves=v.moves||[];v.volume=v.volume||[];v.settings=v.settings||{};
  v.settings.limits=Object.assign({},LIMITS_DEF,v.settings.limits||{});
  v.settings.customers=v.settings.customers||[];
  v.settings.territories=v.settings.territories||[];
  return v}

function haversine(a,b){if(!a||!b)return 0;const R=6371,to=x=>x*Math.PI/180;const dLat=to(b[1]-a[1]),dLon=to(a[0]===undefined?0:b[0]-a[0]);
  const la1=to(a[1]),la2=to(b[1]);const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
function milesOf(coords){let m=0;for(let i=1;i<(coords||[]).length;i++)m+=haversine(coords[i-1],coords[i]);return m*0.621371}
function pkgs(t){return (t.items&&t.items.length)||1}
function todayStr(){const Ck=C.S;const d=new Date(2026,10,12); /* sample week anchored to the pilot clock's calendar feel */ 
  const off=Ck.dayOffset||0;d.setDate(d.getDate()+off);return d.toISOString().slice(0,10)}
function serviceDate(){const u=ui();return u.date==='today'||!u.date?todayStr():u.date}
function setDate(d){const u=ui();u.date=d||'today';saveUi(u)}

const FIRST=['Avery','Blake','Casey','Drew','Eden','Finley','Gray','Harper','Indigo','Jules','Kai','Logan','Marin','Noel','Oakley','Parker','Quinn','Reese','Shay','Tatum','Uma','Val','Wren','Young'];
const LAST=['Adler','Brooks','Cheng','Diaz','Ellis','Frost','Green','Hayes','Iverson','Jones','Klein','Lang','Moss','Ng','Ortiz','Patel','Reed','Santos','Tran','Vega','Walsh','Young','Zimmerman'];
const STREETS=['Pine','Cedar','Maple','Alder','Union','Yesler','Pacific','Columbia','Division','Burnside','Killingsworth','Everett','Prospect','St Helens'];

function fullStack(){return !!(C.v2||C.portal)}
function storeComplete(S){S=S||C.S;return !!(S&&S.company&&S.sec&&Array.isArray(S.tickets))}
function recover(){C.init();if(storeComplete())return true;try{localStorage.removeItem('chainex.pilot.v03')}catch(e){}
  if(typeof C.reset==='function')C.reset();else C.init();return storeComplete()}
function seed(){C.init();if(!fullStack())return;if(!storeComplete()&&!recover())return;C.update(S=>{if(!storeComplete(S))return;const v=desk(S);if(v.seeded)return;
  /* tag existing drivers/tasks with an operating hub */
  (S.drivers||[]).forEach(d=>{d.opHub=d.opHub||(window.CXA?CXA.opHub(d):'sea')});
  (S.tasks||[]).forEach(t=>{if(t.workerId){const d=S.drivers.find(x=>x.id===t.workerId);t.opHub=t.opHub||(d&&d.opHub)||'sea'}else t.opHub=t.opHub||'sea'});
  /* sample facilities for Tacoma / Portland / Everett last mile */
  if(!S.hubs.TAC1)S.hubs.TAC1={id:'TAC1',name:'ChainEx Tacoma station',short:'Tacoma',address:'4101 S 56th St, Tacoma, WA 98409',ll:[-122.444,47.252],line:'pd'};
  if(!S.hubs.EVT1)S.hubs.EVT1={id:'EVT1',name:'ChainEx Everett station',short:'Everett',address:'3210 Hewitt Ave, Everett, WA 98201',ll:[-122.206,47.979],line:'pd'};
  if(!S.hubs.PDX1)S.hubs.PDX1={id:'PDX1',name:'ChainEx Portland station',short:'Portland',address:'5400 N Basin Ave, Portland, OR 97217',ll:[-122.696,45.561],line:'pd'};
  seedVolume(S,v);seedMoves(S,v);seedOrders(S,v);seedSettings(S,v);v.seeded=1})}

function seedVolume(S,v){
  const have=(S.tasks||[]).reduce((a,t)=>a+pkgs(t),0)+(v.volume||[]).reduce((a,t)=>a+pkgs(t),0);
  const need=Math.max(0,2000-have);
  if(need<=0)return;
  const hubs=[
    {id:'sea',ll:[-122.23,47.58],n:.55,city:'Seattle'},
    {id:'tac',ll:[-122.44,47.25],n:.18,city:'Tacoma'},
    {id:'evt',ll:[-122.21,47.97],n:.15,city:'Everett'},
    {id:'pdx',ll:[-122.68,45.52],n:.12,city:'Portland'}
  ];
  let left=need,n=0,id=1000;
  const jitter=(ll,s)=>[ll[0]+(Math.random()-.5)*s,ll[1]+(Math.random()-.5)*s];
  hubs.forEach(h=>{
    const pkgsH=Math.round(need*h.n);let got=0;
    while(got<pkgsH && left>0){
      const units=1+Math.floor(Math.random()*5); /* 1–5 packages per stop */
      const fn=FIRST[n%FIRST.length],ln=LAST[(n*3)%LAST.length];
      const num=100+((n*17)%8900),st=STREETS[n%STREETS.length];
      const t={id:'VX-'+String(id++),line:'pd',kind:'stop',name:fn+' '+ln,address:num+' '+st+' St, '+h.city,ll:jitter(h.ll,h.id==='pdx'?.18:.12),
        contract:'PD-COM',tags:['VOLUME'],window:[C.S.clock,C.S.clock+360],workerId:null,teamId:null,seq:0,state:'unassigned',attempts:0,
        items:Array.from({length:units},(_,k)=>({id:'VX-'+id+'-'+(k+1),label:'Package',loaded:false,events:[]})),
        timeline:[{at:C.S.clock,text:'Imported for the 2,000-package sample day',actor:'System'}],
        stepData:{},x:{hub:h.id==='sea'?'SEA1':h.id==='tac'?'TAC1':h.id==='evt'?'EVT1':'PDX1'},notes:'',pod:null,failReason:null,nextAction:null,
        completedAt:null,arrivedAt:null,offerId:null,manifest:null,opHub:h.id,serviceDate:todayStr(),v06vol:true};
      v.volume.push(t);got+=units;left-=units;n++;
    }
  });
}

function seedMoves(S,v){
  if(v.moves.length)return;
  const lanes=[
    ['SEA → Tacoma','sea','tac',[-122.23,47.48],[-122.44,47.25],'T53-3301','On the road','14:10'],
    ['Kent → Everett','sea','evt',[-122.23,47.42],[-122.25,47.92],'T53-2210','At origin','16:00'],
    ['Kent → Portland','sea','pdx',[-122.23,47.42],[-122.68,45.52],'T53-4108','On the road','21:40'],
    ['Tacoma → Portland','tac','pdx',[-122.44,47.25],[-122.68,45.52],'T53-4109','Scheduled','23:15'],
    ['Everett → Kent','evt','sea',[-122.25,47.92],[-122.23,47.42],'T53-2211','Unloading','11:20']
  ];
  v.moves=lanes.map((x,i)=>({id:'MM-0'+(i+1),name:x[0],from:x[1],to:x[2],fromLL:x[3],toLL:x[4],trailer:x[5],status:x[6],eta:x[7],pallets:18+i*2,carrier:'Cascade Freight (sample)',driver:['Sam Ortiz','Leo Grant','Chris Nguyen','Dana Ruiz','Jamie Cole'][i]}));
}

function seedOrders(S,v){
  if(v.workOrders.length)return;
  const shippers=['Summit Parcel Network (sample)','Harborline Parcel (sample)','Northline Home (sample)'];
  v.workOrders=[
    {id:'WO-1041',customer:shippers[0],type:'P&D route',hub:'sea',line:'pd',stops:92,packages:118,status:'Scheduled',date:todayStr(),notes:'Bellevue station morning close'},
    {id:'WO-1042',customer:shippers[1],type:'P&D route',hub:'sea',line:'pd',stops:80,packages:101,status:'On the move',date:todayStr(),notes:'Seattle station'},
    {id:'WO-1048',customer:shippers[2],type:'Bulky final mile',hub:'tac',line:'bulky',stops:18,packages:22,status:'Needs coverage',date:todayStr(),notes:'Tacoma overflow'},
    {id:'WO-1050',customer:shippers[0],type:'Middle mile',hub:'sea',line:'shuttle',stops:2,packages:0,status:'Scheduled',date:todayStr(),notes:'Kent to Portland trailer'}
  ];
  v.shipments=[
    {id:'SHP-8801',ref:'SPN-44102',customer:shippers[0],from:'Kent DC',to:'Bellevue station',hub:'sea',status:'At hub',packages:64,line:'pd'},
    {id:'SHP-8802',ref:'HPL-2291',customer:shippers[1],from:'Seattle station',to:'Residential',hub:'sea',status:'Out for delivery',packages:12,line:'pd'},
    {id:'SHP-8810',ref:'NLH-710',customer:shippers[2],from:'Tacoma station',to:'Residential',hub:'tac',status:'Needs coverage',packages:6,line:'bulky'},
    {id:'SHP-8820',ref:'SPN-OR-19',customer:shippers[0],from:'Kent DC',to:'Portland station',hub:'sea',status:'In transit',packages:40,line:'shuttle'}
  ];
  v.scans=[
    {id:'SCN-01',hub:'sea',station:'Kent DC',at:'06:42',kind:'Load-out',expected:118,actual:118,exceptions:0,route:'PD-BEL-01'},
    {id:'SCN-02',hub:'sea',station:'Seattle station',at:'07:05',kind:'Load-out',expected:101,actual:99,exceptions:2,route:'PD-SEA-02'},
    {id:'SCN-03',hub:'evt',station:'Everett warehouse',at:'06:55',kind:'Inbound trailer',expected:22,actual:22,exceptions:0,route:'SH-L3'},
    {id:'SCN-04',hub:'tac',station:'Tacoma station',at:'07:20',kind:'Load-out',expected:22,actual:20,exceptions:2,route:'—'}
  ];
}

function seedSettings(S,v){
  if(!v.settings.customers.length){
    const names=['Summit Parcel Network (sample)','Harborline Parcel (sample)','Northline Home (sample)'];
    v.settings.customers=names.map((n,i)=>({id:'CM-0'+(i+1),customer:n,managerEmail:'',stations:i===0?'BEL1, SEA1':'',allStations:false,signIn:'https://chainex.example/portal'}));
  }
  if(!v.settings.territories.length){
    v.settings.territories=[
      {id:'TT-SEA',name:'Seattle metro',hub:'sea',lines:['pd','bulky','wg'],zips:'98101–98199, 98004–98008'},
      {id:'TT-TAC',name:'Tacoma',hub:'tac',lines:['pd','bulky'],zips:'98401–98499'},
      {id:'TT-EVT',name:'Everett',hub:'evt',lines:['pd','bulky'],zips:'98201–98208'},
      {id:'TT-PDX',name:'Portland',hub:'pdx',lines:['pd','bulky'],zips:'97201–97220'}
    ];
  }
}

function allTasks(S){S=S||C.S;const v=desk(S);return (S.tasks||[]).concat(v.volume||[])}
function materialize(t){if(!t||!t.v06vol)return t;C.update(S=>{const v=desk(S);if(S.tasks.some(x=>x.id===t.id))return;S.tasks.push(t);v.volume=v.volume.filter(x=>x.id!==t.id)});t.v06vol=false;return t}

const undo=[];
function pushUndo(label,fn){undo.push({label,fn,at:Date.now()});if(undo.length>30)undo.shift()}
function undoLast(){const u=undo.pop();if(!u)return null;C.update(()=>u.fn());return u}

function routeTasks(wid,S){S=S||C.S;return allTasks(S).filter(t=>t.workerId===wid).sort((a,b)=>(a.seq||0)-(b.seq||0))}
function routeStats(wid){const d=C.driver(wid);if(!d)return null;const all=routeTasks(wid),open=all.filter(t=>t.state!=='completed'&&t.state!=='failed');
  const path=[];if(d.home)path.push(d.home);all.forEach(t=>t.ll&&path.push(t.ll));
  const mi=+milesOf(path).toFixed(1),pk=all.reduce((a,t)=>a+pkgs(t),0);
  const start=all[0]&&all[0].window?all[0].window[0]:C.S.clock;
  const finish=all.length&&all[all.length-1].window?all[all.length-1].window[1]:start+Math.round(mi/18*60);
  const hours=+(mi/18+all.length*3/60).toFixed(1);
  const lim=(desk().settings.limits)||LIMITS_DEF;
  const fill=Math.min(100,Math.round(pk/(lim.capacity||140)*100));
  return {id:d.route&&d.route.id,wid,driver:d.name,vehicle:d.vehicle||'—',hub:d.opHub||(A&&A.opHub(d)),line:d.line,
    stops:all.length,open:open.length,packages:pk,miles:mi,hours,start,finish,fill,stage:d.route&&d.route.stage}}

function createStop(f,actor){const line=f.line||'pd';
  let t;C.update(()=>{t=C.ops.createTask(line,{name:f.name||'New stop',address:f.address||'',ll:f.ll,units:f.units||1,window:f.window,tags:f.tags||['NEW'],x:f.x||{}});
    t.opHub=f.opHub||(A?A.viewHub()==='all'?A.homeHub():A.viewHub():'sea');t.serviceDate=serviceDate();
    if(f.workerId)C.ops.assign(t.id,f.workerId,null,null,actor)});
  const id=t.id,wid=t.workerId;pushUndo('Delete added stop',()=>{C.ops.deleteTask(id)});return t}
function deleteStop(id,actor){const t=C.task(id)||allTasks().find(x=>x.id===id);if(!t)return;const snap=JSON.parse(JSON.stringify(t));
  C.update(()=>{if(t.v06vol)desk().volume=desk().volume.filter(x=>x.id!==id);else C.ops.deleteTask(id)});
  pushUndo('Restore stop',()=>{C.update(S=>{S.tasks.push(snap)})});}
function moveStop(id,toWid,index,actor){materialize(C.task(id)||allTasks().find(x=>x.id===id));
  const t=C.task(id);if(!t)return;const prev=t.workerId,pseq=t.seq;
  C.update(()=>C.ops.assign(id,toWid,null,index,actor));
  pushUndo('Move stop back',()=>C.ops.assign(id,prev,null,pseq,actor));}

function newRoute(f,actor){let d;C.update(()=>{d=C.ops.newRoute(f.line||'pd',{name:f.name||('Open route · '+(f.hub||'SEA').toUpperCase()),hub:f.facility,vehicle:f.vehicle||'Cargo van',routeId:f.routeId,line:f.line||'pd'});
  d.opHub=f.opHub||(A&&A.viewHub()!=='all'?A.viewHub():'sea');if(!d.route.stage)d.route.stage='not_started'});
  const id=d.id;pushUndo('Remove route',()=>{C.update(()=>{routeTasks(id).forEach(t=>C.ops.assign(t.id,null));C.ops.deleteDriver(id)})});return d}

function splitRoute(wid,actor){const open=C.route(wid).filter(t=>t.state==='assigned'||t.state==='unassigned');if(open.length<4)return {ok:false,why:'Need at least 4 open stops to split'};
  const d=C.driver(wid);let neu;C.update(()=>{neu=C.ops.newRoute(d.line,{name:d.name+' · B',hub:d.hub,vehicle:d.vehicle,line:d.line});neu.opHub=d.opHub;C.ops.splitRoute(wid,neu.id)});
  pushUndo('Undo split',()=>{C.ops.mergeRoute(neu.id,wid);C.ops.deleteDriver(neu.id)});return {ok:true,id:neu.id}}

function mergeRoutes(from,into,actor){const n=C.route(from).length;C.update(()=>C.ops.mergeRoute(from,into,actor));
  pushUndo('Undo merge',()=>{/* best-effort: cannot perfectly restore without snapshot */});return n}

function optimize(wid,fromStop,actor){const before=routeTasks(wid).map(t=>t.id);
  C.update(()=>{if(fromStop){const all=C.route(wid);const i=all.findIndex(t=>t.id===fromStop);const keep=all.filter((t,k)=>t.state==='active'||(i>=0&&k<i));
      const rest=all.filter(t=>!keep.includes(t));const start=keep.length?keep[keep.length-1].ll:C.driver(wid).loc;
      const order=C.nn?C.nn(start,rest):rest;const apply=C.api&&C.api.applySeq;if(C.ops.optimize){/* custom */ }
      /* fallback: move chosen stop to front of remaining then optimize */
      C.ops.optimize(wid);
    }else C.ops.optimize(wid)});
  pushUndo('Restore stop order',()=>{const d=C.driver(wid);/* reseq by captured ids */
    C.update(()=>{before.forEach((id,i)=>{const t=C.task(id);if(t)t.seq=i})})});
}

function autoBuild(opts){opts=opts||{};const lim=Object.assign({},desk().settings.limits,opts.limits||{});
  const line=opts.line||'pd';const hub=opts.hub||(A&&A.viewHub()!=='all'?A.viewHub():null);
  let open=allTasks().filter(t=>t.state==='unassigned'&&t.line===line&&(!hub||t.opHub===hub));
  if(!open.length)return {routes:0,stops:0};
  /* nearest-neighbor buckets */
  const buckets=[];let pool=open.slice();
  while(pool.length){
    const start=pool.shift();let cur=[start],last=start.ll,pk=pkgs(start),mi=0;
    while(pool.length){
      let bi=0,bd=1e9;for(let i=0;i<pool.length;i++){const d=haversine(last,pool[i].ll);if(d<bd){bd=d;bi=i}}
      const nxt=pool[bi],addM=bd*0.621371,addH=(addM/18)+3/60;
      if(cur.length+1>lim.stops||pk+pkgs(nxt)>lim.packages||mi+addM>lim.miles||(cur.length*3/60+mi/18+addH)>lim.hours||pk+pkgs(nxt)>lim.capacity)break;
      pool.splice(bi,1);cur.push(nxt);last=nxt.ll;pk+=pkgs(nxt);mi+=addM;
    }
    buckets.push(cur);
  }
  const created=[];
  C.update(()=>{buckets.forEach((b,i)=>{
    const hubId=b[0].opHub||'sea';const fac={sea:'SEA1',tac:'TAC1',evt:'EVT1',pdx:'PDX1'}[hubId]||'SEA1';
    const d=C.ops.newRoute(line,{name:'Open route · '+(hubId||'SEA').toUpperCase()+' '+String(i+1).padStart(2,'0'),hub:fac,vehicle:'Cargo van',line});
    d.opHub=hubId;created.push(d.id);
    b.forEach((t,k)=>{materialize(t);C.ops.assign(t.id,d.id,null,k,'Auto-build')});
  })});
  const ids=created.slice();pushUndo('Undo auto-build',()=>{C.update(()=>{ids.forEach(id=>{routeTasks(id).forEach(t=>C.ops.assign(t.id,null));C.ops.deleteDriver(id)})})});
  return {routes:created.length,stops:open.length,ids:created}}

function lassoToRoute(ids,opts){ids=(ids||[]).filter(Boolean);if(ids.length<1)return {ok:false,why:'Draw around at least one stop'};
  const sample=allTasks().find(t=>t.id===ids[0]);const line=(sample&&sample.line)||'pd';const hub=(sample&&sample.opHub)||'sea';
  let d;C.update(()=>{d=C.ops.newRoute(line,{name:'Drawn route · '+(hub||'SEA').toUpperCase(),hub:{sea:'SEA1',tac:'TAC1',evt:'EVT1',pdx:'PDX1'}[hub],vehicle:'Cargo van',line});d.opHub=hub;
    ids.forEach((id,i)=>{const t=C.task(id)||allTasks().find(x=>x.id===id);if(t){materialize(t);C.ops.assign(t.id,d.id,null,i,'Drawn route')}})});
  const rid=d.id;pushUndo('Undo drawn route',()=>{C.update(()=>{routeTasks(rid).forEach(t=>C.ops.assign(t.id,null));C.ops.deleteDriver(rid)})});
  return {ok:true,id:rid,n:ids.length}}

function createOrder(kind,f,actor){const v=desk();const id=(kind==='wo'?'WO-':'ORD-')+String(1100+v.workOrders.length);
  const row=Object.assign({id,customer:f.customer||'Sample shipper',type:f.type||'P&D route',hub:f.hub||(A&&A.homeHub())||'sea',line:f.line||'pd',stops:0,packages:+f.packages||0,status:'Needs coverage',date:f.date||serviceDate(),notes:f.notes||''},f,{id});
  C.update(()=>{desk().workOrders.unshift(row)});pushUndo('Remove work order',()=>{C.update(()=>{desk().workOrders=desk().workOrders.filter(x=>x.id!==id)})});return row}
function createShipment(f){const v=desk();const id='SHP-'+String(8900+v.shipments.length);
  const row=Object.assign({id,ref:f.ref||id,customer:f.customer||'Sample shipper',from:f.from||'Hub',to:f.to||'Destination',hub:f.hub||'sea',status:f.status||'At hub',packages:+f.packages||1,line:f.line||'pd'},f,{id});
  C.update(()=>{desk().shipments.unshift(row)});return row}

function importCsv(text,line){const rows=[];String(text||'').split(/\r?\n/).forEach((ln,i)=>{ln=ln.trim();if(!ln||i===0&&/name|address|lat/i.test(ln))return;
  const p=ln.split(',').map(s=>s.trim().replace(/^"|"$/g,''));
  if(p.length>=3)rows.push({name:p[0],address:p[1],lat:+p[3]||undefined,lng:+p[2]||undefined,units:+p[4]||1,start:undefined,end:undefined})});
  /* if no coords, drop around current hub */
  const hub=A&&A.viewHub()!=='all'?A.viewHub():'sea';const ll=(A&&A.HUBS.find(h=>h.id===hub)||{ll:[-122.23,47.58]}).ll;
  rows.forEach((r,i)=>{if(r.lat&&r.lng){r.lat=r.lat;r.lng=r.lng}else{r.lat=ll[1]+(Math.random()-.5)*.08;r.lng=ll[0]+(Math.random()-.5)*.08}});
  let m;C.update(()=>{m=C.ops.importManifest(line||'pd',rows.map(r=>({name:r.name,address:r.address,lat:r.lat,lng:r.lng,units:r.units,start:r.start,end:r.end})),{name:'Batch import',source:'pasted CSV'});
    (m.taskIds||[]).forEach(id=>{const t=C.task(id);if(t){t.opHub=hub;t.serviceDate=serviceDate()}})});
  return m}

function needsCoverage(S){S=S||C.S;const v=desk(S);const un=allTasks(S).filter(t=>t.state==='unassigned'&&dateOk(t));
  return {needs:un.length,wo:(v.workOrders||[]).filter(w=>w.status==='Needs coverage'&&dateOkWo(w)).length}
}
function dateOk(t){const d=serviceDate();if(!t.serviceDate)return d===todayStr();return t.serviceDate===d}
function dateOkWo(w){return !w.date||w.date===serviceDate()}

function counts(st){const S=C.S,tasks=A?A.filter(allTasks(S),st).filter(dateOk):allTasks(S).filter(dateOk);
  const ds=A?A.filter(S.drivers,st):S.drivers;
  const un=tasks.filter(t=>t.state==='unassigned').length;
  const live=ds.filter(d=>d.route&&d.route.stage==='on_road'&&routeTasks(d.id).length).length;
  const sched=ds.filter(d=>d.route&&d.route.stage!=='on_road'&&d.route.stage!=='closed'&&routeTasks(d.id).length).length;
  const exc=tasks.filter(t=>t.state==='failed').length;
  return {needs:un,scheduled:sched,onMove:live,exceptions:exc,stops:tasks.length,packages:tasks.reduce((a,t)=>a+pkgs(t),0)}}

function partnerWork(){const m=C.portal&&C.portal.metrics&&C.portal.metrics()||{};
  const S=C.S,today=todayStr();
  const received=(S.partners||[]).filter(p=>{const d=p.createdAt;return d&&String(d).slice(0,10)===today||/\btoday\b/i.test(String(d))}).length;
  /* createdAt may be a display date; fall back to 0 plus any "new" queue items */
  const rec2=received||(S.partners||[]).filter(p=>p.source&&/invite|self-serve|today/i.test(p.source)&&p.status==='Completing setup').length;
  const ready=(S.drivers||[]).filter(d=>C.eligibility&&C.eligibility(d.id,d.line).ok&&!d.dspSlot).length;
  return {received:rec2,attention:m.openQueue||m.review||0,ready,inSetup:m.inSetup||0,review:m.review||0}}

/* geocode-ish: parse a simple address into a point near a hub */
function llForAddress(addr,hub){const h=(A&&A.HUBS.find(x=>x.id===hub))||{ll:[-122.25,47.6]};
  let hash=0;String(addr||'').split('').forEach(c=>hash=hash*31+c.charCodeAt(0));
  const j=((hash%1000)/1000-.5);
  return [h.ll[0]+j*.08,h.ll[1]+((hash%700)/700-.5)*.06]}

function _seedPods(){if(!fullStack())return;C.init();if(!storeComplete()&&!recover())return;C.update(S=>{if(!storeComplete(S))return;const v=desk(S);seedPods(S,v)})}

function svgEsc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function svgPic(label,bg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="'+bg+'"/><rect x="16" y="16" width="288" height="208" rx="14" fill="rgba(255,255,255,.1)"/><circle cx="70" cy="70" r="24" fill="rgba(255,255,255,.22)"/><text x="160" y="128" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="15" font-weight="600">'+svgEsc(label)+'</text><text x="160" y="152" text-anchor="middle" fill="rgba(255,255,255,.7)" font-family="system-ui,sans-serif" font-size="11">Sample POD · not a real photo</text></svg>')}
function svgSig(name){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><rect width="320" height="120" fill="#f4efe6"/><path d="M18 72 C48 18,90 104,130 58 S190 18,230 76 S280 96,304 46" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/><text x="18" y="108" fill="#555" font-family="Georgia,serif" font-size="11">'+name+'</text></svg>')}
const PLACES=['Front door','Side gate','Porch','Reception','Handed to recipient','Garage','Mailroom'];
const SIGNERS=['Jordan Hale','Sam Ortiz','Riley Chen','Casey Nguyen','Avery Brooks','Quinn Patel'];
function podAsset(v,id,src){v.podAssets=v.podAssets||{};if(src)v.podAssets[id]=src;return id}
function resolvePodSrc(src,v){if(!src)return '';if(String(src).slice(0,5)==='data:')return src;v=v||(C.S&&C.S.v06)||{};return (v.podAssets&&v.podAssets[src])||src}
function seedPods(S,v){if(v.podSeeded)return;if(!storeComplete(S))return;const done=(S.tasks||[]).filter(t=>t.state==='completed'||t.state==='failed');
  const clock=(S.clock||(C.S&&C.S.clock)||'');v.podAssets=v.podAssets||{};
  done.forEach((t,i)=>{
    const far=i%9===0, missP=i%7===0&&t.state==='completed', missS=i%5===0, place=PLACES[i%PLACES.length];
    const signer=SIGNERS[i%SIGNERS.length];
    const jitter=(ll,ft)=>{const d=ft/364000;return [ll[0]+d*((i%3)-1),ll[1]+d*((i%2)?1:-1)]}
    const dropLL=t.ll?jitter(t.ll,far?280:40+(i%8)*8):null;
    const dist=t.ll&&dropLL?Math.round(haversine(t.ll,dropLL)*3280.84):0;
    const rich=i<16||t.state==='failed'||far||missP||missS||i%6===2;
    const photos=[];
    if(rich&&!missP&&t.state==='completed')photos.push({src:podAsset(v,'pic:'+place,svgPic(place,'#1E3860')),kind:'pod',label:'Delivery photo',at:t.completedAt||clock});
    if(rich&&i%4===1&&t.state==='completed')photos.push({src:podAsset(v,'pic:closeup',svgPic('Package close-up','#2E5A8C')),kind:'pod',label:'Package close-up',at:t.completedAt||clock});
    if(rich&&(t.state==='failed'||t.attempts)){const lab=t.failReason||'Attempt photo';photos.push({src:podAsset(v,'pic:fail:'+lab,svgPic(lab,'#6B3A2A')),kind:'fail',label:'Attempt / exception',at:t.completedAt||clock})}
    if(rich&&i%6===2)photos.push({src:podAsset(v,'pic:scan',svgPic('Arrival scan','#2A4A3A')),kind:'scan',label:'Arrival scan',at:t.arrivedAt||t.completedAt||clock});
    const pod=Object.assign({},t.pod||{},{
      placement:place, signer:missS?'':signer, notes:t.pod&&t.pod.notes||(i%3===0?'Customer asked to leave at the '+place.toLowerCase()+'.':'Gate code used. All clear.'),
      photo:photos.some(x=>x.kind==='pod'), signature:!missS&&t.state==='completed',
      receivedBy:place+(missS?'':' · '+signer), photos, signatureImg:(rich&&!missS&&t.state==='completed')?podAsset(v,'sig:'+signer,svgSig(signer)):'',
      scan:(t.items&&t.items[0]&&t.items[0].id)||('9400 '+t.id.replace(/\D/g,'').slice(-8)),
      dropLL, addressLL:t.ll, distanceFt:dist, far:dist>150, at:t.completedAt||clock
    });
    if(!pod.summary)pod.summary=pod.receivedBy;
    t.pod=pod;
  });
  v.podSeeded=1}

function podOf(t){if(!t)return null;const p=t.pod;if(!p&&t.state!=='completed'&&t.state!=='failed')return null;
  if(!p)return null;
  const assets=(C.S&&C.S.v06)||{};const photos=(p.photos||(p.photo||p.photoUrl?[{src:p.photoUrl||p.photoSrc||'',kind:'pod',label:'Delivery photo',at:p.at}]:[])).map(x=>Object.assign({},x,{src:resolvePodSrc(x.src,assets)}));
  const dropLL=p.dropLL||null, addressLL=p.addressLL||t.ll;
  const dist=p.distanceFt!=null?p.distanceFt:(dropLL&&addressLL?Math.round(haversine(addressLL,dropLL)*3280.84):0);
  let placement=p.placement||'';
  const rb=p.receivedBy||'';
  if(!placement&&rb)placement=rb.split('·')[0].trim();
  const signer=p.signer||(rb.includes('·')?rb.split('·').slice(1).join('·').trim():'');
  return {summary:p.summary||rb,notes:p.notes||t.notes||'',placement,signer,photos:photos.filter(x=>x&&x.src),signatureImg:resolvePodSrc(p.signatureImg||p.sigImg||'',assets),signature:!!(p.signature||p.signatureImg),photo:!!(p.photo||(photos.length&&photos.some(x=>x.kind!=='fail'))),scan:p.scan||'',dropLL,addressLL,distanceFt:dist,far:dist>150,at:p.at||t.completedAt,receivedBy:rb}}
function podIssues(t,kind){const p=podOf(t);if(!p)return kind?false:['missing'];
  const issues=[];if(!p.photo||!p.photos.some(x=>x.kind==='pod'||x.kind==='scan'))issues.push('photo');
  if(!p.signature&&!p.signatureImg)issues.push('signature');if(p.far)issues.push('far');
  if(!kind||kind==='all')return kind?true:issues;return issues.includes(kind)}

try{if(fullStack()){seed();_seedPods()}}catch(e){console.warn('ops6 seed',e)}

window.CXO={desk,ui,saveUi,seed,allTasks,materialize,pushUndo,undoLast,undo,routeTasks,routeStats,createStop,deleteStop,moveStop,newRoute,splitRoute,mergeRoutes,optimize,autoBuild,lassoToRoute,createOrder,createShipment,importCsv,needsCoverage,counts,partnerWork,serviceDate,setDate,todayStr,dateOk,pkgs,milesOf,haversine,llForAddress,LIMITS_DEF,podOf,podIssues,svgPic,svgSig,seedPods,resolvePodSrc,storeComplete};
})();
