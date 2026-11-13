/* ChainEx V06 · Rush (internal code: on_demand) — the sixth service line.
   Quotes held 15 min, offer waves (top 3 ChainEx drivers ~45 s, then wider radius + opted-in DSP/carrier drivers),
   dispatch queue with an SLA countdown, expiry with a reason, one driver reservation (no double-booking with routes),
   insert-into-P&D suggestion, pickup/drop-off with scans + POD, canonical events + webhooks through CXI.
   Shared state lives on S.v06.rush so every page (shipper, dispatch, driver, DSP desk, control tower) stays in sync. Sample data only. */
(function(){
const C=window.CX;if(!C||window.CXR)return;
const LINE_ID='rush',LINE_NAME='Rush',API_LEVEL='on_demand';
const SIZES={parcel:{label:'Parcel',lines:['pd','bulky','wg'],hint:'Fits in a car or van'},
  bulky:{label:'Bulky',lines:['bulky','wg','ltl'],hint:'Box truck, 1–2 people'},
  white_glove:{label:'White glove',lines:['wg'],hint:'2-person crew, room of choice'},
  freight:{label:'Freight',lines:['ltl','shuttle'],hint:'Pallets, liftgate or tractor'}};
const PRIORITY={standard:{label:'Standard'},priority:{label:'Priority'},asap:{label:'ASAP'}};
const CANCEL_REASONS=['Shipper cancelled','Order no longer needed','Wrong address','Item not ready at pickup','Duplicate request','No drivers available','Driver could not complete','Other'];
const DEF_RATE={base:9,perMile:1.65,perMin:0.38,sizeMult:{parcel:1,bulky:1.6,white_glove:2.2,freight:2.8},
  priorityFee:{standard:0,priority:6,asap:12},minimum:15,maxQuote:450,payShare:0.72,
  floor:{perMin:0.47,perMile:0.80,perOffer:5.34,on:true,note:'Seattle 2026 app-based worker minimums (SMC 8.37): $0.47 per engaged minute + $0.80 per engaged mile, or $5.34 per offer, whichever is greater. Placeholder pending legal review — confirm whether ChainEx drivers are covered.'},
  holdMin:15,waveSec:45,wave1:{n:3,radiusMi:8},wave2:{n:8,radiusMi:20},slaMin:10,speedMph:22,roadFactor:1.25,
  handleMin:{parcel:4,bulky:12,white_glove:25,freight:20}};
const PLACES=[
 ['Bellevue Square, 575 Bellevue Sq, Bellevue, WA 98004',[-122.2034,47.6157]],
 ['Lincoln Square, 700 Bellevue Way NE, Bellevue, WA 98004',[-122.2011,47.6171]],
 ['Microsoft Campus, 15010 NE 36th St, Redmond, WA 98052',[-122.1301,47.6423]],
 ['Kirkland Urban, 425 Urban Plaza, Kirkland, WA 98033',[-122.2005,47.6769]],
 ['Pike Place Market, 85 Pike St, Seattle, WA 98101',[-122.3422,47.6097]],
 ['Westlake Center, 400 Pine St, Seattle, WA 98101',[-122.3375,47.6119]],
 ['University Village, 2623 NE University Village St, Seattle, WA 98105',[-122.2994,47.6629]],
 ['Ballard, 5300 Ballard Ave NW, Seattle, WA 98107',[-122.3843,47.6677]],
 ['Capitol Hill, 401 Broadway E, Seattle, WA 98102',[-122.3208,47.6235]],
 ['SoDo, 2401 Utah Ave S, Seattle, WA 98134',[-122.3343,47.5794]],
 ['Southcenter, 2800 Southcenter Mall, Tukwila, WA 98188',[-122.2580,47.4588]],
 ['The Landing, 1 Landing Way, Renton, WA 98057',[-122.2027,47.4996]],
 ['Kent Station, 417 Ramsay Way, Kent, WA 98032',[-122.2348,47.3846]],
 ['Issaquah Highlands, 1001 NE Park Dr, Issaquah, WA 98029',[-122.0237,47.5446]],
 ['Tacoma Mall, 4502 S Steele St, Tacoma, WA 98409',[-122.4651,47.2160]],
 ['Everett Mall, 1402 SE Everett Mall Way, Everett, WA 98208',[-122.2154,47.9073]]];
const now=()=>Date.now()+((desk().skew)||0);
const rid=p=>p+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Date.now().toString(36).slice(-2).toUpperCase();
const r2=n=>Math.round(n*100)/100;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function kmTo(a,b){if(!a||!b)return 0;const R=6371,t=Math.PI/180,dLa=(b[1]-a[1])*t,dLo=(b[0]-a[0])*t;const h=Math.sin(dLa/2)**2+Math.cos(a[1]*t)*Math.cos(b[1]*t)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const miles=(a,b,rf)=>kmTo(a,b)*0.621371*(rf||rate().roadFactor||1.25);

/* ---------- state ---------- */
function desk(S){S=S||C.S;if(!S)return {};S.v06=S.v06||{};const R=S.v06.rush=S.v06.rush||{};
  R.rate=Object.assign({},DEF_RATE,R.rate||{});['sizeMult','priorityFee','floor','wave1','wave2','handleMin'].forEach(k=>R.rate[k]=Object.assign({},DEF_RATE[k],(R.rate[k]||{})));
  R.quotes=R.quotes||[];R.orders=R.orders||[];R.res=R.res||{};R.modes=R.modes||{};R.dspOpt=R.dspOpt||{};R.events=R.events||[];R.notes=R.notes||[];
  return R}
const rate=()=>desk().rate;
function mut(fn){let out;C.update(S=>{out=fn(desk(S),S)});return out}
function seed(){C.init&&C.init();const R=desk();if(R.seeded)return;
  mut(R=>{if(R.seeded)return;
    Object.assign(R.modes,{dee:'both',nate:'rush',drew:'both',kai:'both',tom:'both',jamal:'rush'});
    R.dspOpt['P-74A923AC']=true; /* Eastside Express opted in; Rainier and carriers have not */
    R.seeded=1});}

/* ---------- geo ---------- */
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function geocode(addr){const a=String(addr||'').trim();if(!a)return null;const low=a.toLowerCase();
  const hit=PLACES.find(p=>p[0].toLowerCase()===low)||PLACES.find(p=>low.length>3&&p[0].toLowerCase().indexOf(low)>=0)||PLACES.find(p=>low.indexOf(p[0].split(',')[0].toLowerCase())>=0);
  if(hit)return {address:hit[0],ll:hit[1].slice(),approx:false};
  if(window.CXO&&CXO.llForAddress){try{const ll=CXO.llForAddress(a);if(ll)return {address:a,ll,approx:true}}catch(e){}}
  const h=hash(low);return {address:a,ll:[-122.33+((h%1000)/1000-.5)*0.24,47.61+(((h>>10)%1000)/1000-.5)*0.18],approx:true}}
function opHubOf(ll){if(!ll)return 'sea';const la=ll[1];return la<46.2?'pdx':la<47.3?'tac':la>47.85?'evt':'sea'}

/* ---------- pricing ---------- */
function tripOf(pu,dr,size){const R=rate();const mi=miles(pu,dr);const min=mi/R.speedMph*60+(R.handleMin[size]||5)+4;return {miles:r2(mi),minutes:Math.round(min)}}
function price(trip,size,priority){const R=rate();const mult=R.sizeMult[size]||1,pf=R.priorityFee[priority]||0;
  const raw=(R.base+trip.miles*R.perMile+trip.minutes*R.perMin)*mult+pf;const fee=r2(Math.max(R.minimum,raw));
  return {fee,lines:[['Base',R.base],['Distance',r2(trip.miles*R.perMile)],['Time',r2(trip.minutes*R.perMin)],['Size ×'+mult,r2((R.base+trip.miles*R.perMile+trip.minutes*R.perMin)*(mult-1))],['Priority',pf]].concat(raw<R.minimum?[['Minimum fare top-up',r2(R.minimum-raw)]]:[]),needsApproval:fee>R.maxQuote}}
function payFor(o,deadMi){const R=rate(),F=R.floor;const engMi=(deadMi||0)+o.trip.miles,engMin=(deadMi||0)/R.speedMph*60+o.trip.minutes;
  const share=o.fee*R.payShare;const floor=F.on?Math.max(F.perMin*engMin+F.perMile*engMi,F.perOffer):0;
  return {pay:r2(Math.max(share,floor)),floor:r2(floor),share:r2(share),engMi:r2(engMi),engMin:Math.round(engMin),topUp:floor>share}}

/* ---------- events (canonical model via CXI when present) ---------- */
function regTypes(){const I=window.CXI;if(!I||!I.TYPES)return;const T=I.TYPES;
  T.assigned=T.assigned||{label:'Driver assigned',status:'assigned',edi:'',desc:'A driver accepted or was assigned (Rush)'};
  T.picked_up=T.picked_up||{label:'Picked up',status:'in_transit',edi:'AF',desc:'Pickup scan at the sender (Rush)'};
  T.cancelled=T.cancelled||{label:'Cancelled',status:'cancelled',edi:'',desc:'Cancelled with a reason code'}}
regTypes();
function emit(type,o,extra){extra=extra||{};const payload=Object.assign({service_level:API_LEVEL,service_line:LINE_NAME,order_id:o.id,quote_id:o.quoteId,size:o.size,fee:o.fee,currency:'USD',status:o.status,tracking_url:'track.html?id='+o.id},extra.payload||{});
  const rec={type,taskId:o.id,tracking:o.id,ref:o.ref||'',shipper:o.shipper||'',hub:o.opHub,ll:extra.ll||null,actor:extra.actor||'Rush',idem:extra.idem||('rush:'+o.id+':'+type+':'+(extra.k||'')),payload};
  let e=null;if(window.CXI&&CXI.emit){try{regTypes();e=CXI.emit(type,rec)}catch(x){}}
  if(!e)e=Object.assign({id:rid('EV'),atUtc:new Date().toISOString(),label:type},rec);
  return e}
function tl(o,text,actor){o.timeline=o.timeline||[];o.timeline.push({t:now(),at:C.S&&C.fmt?C.fmt(C.S.clock):'',text,actor:actor||'Rush'})}

/* ---------- quotes + orders ---------- */
function quote(inp,meta){meta=meta||{};const size=SIZES[inp.size]?inp.size:'parcel',priority=PRIORITY[inp.priority]?inp.priority:'standard';
  const pg=inp.pickup&&inp.pickup.ll?inp.pickup:geocode(inp.pickup&&inp.pickup.address||inp.pickup),dg=inp.dropoff&&inp.dropoff.ll?inp.dropoff:geocode(inp.dropoff&&inp.dropoff.address||inp.dropoff);
  if(!pg||!dg)return {error:'Pickup and drop-off addresses are required.'};
  const trip=tripOf(pg.ll,dg.ll,size),p=price(trip,size,priority);const t0=now();
  const deadline=inp.deadline?(+inp.deadline>1e11?+inp.deadline:t0+(+inp.deadline)*60000):t0+120*60000;
  const q={id:rid('RQ'),created:t0,expires:t0+rate().holdMin*60000,status:'open',size,priority,trip,fee:p.fee,lines:p.lines,needsApproval:p.needsApproval,
    pickup:{name:(inp.pickup&&inp.pickup.name)||'Sender',address:pg.address,ll:pg.ll,approx:pg.approx,contact:(inp.pickup&&inp.pickup.contact)||''},
    dropoff:{name:(inp.dropoff&&inp.dropoff.name)||'Recipient',address:dg.address,ll:dg.ll,approx:dg.approx,contact:(inp.dropoff&&inp.dropoff.contact)||''},
    deadline,items:Math.max(1,+inp.items||1),notes:inp.notes||'',ref:inp.reference||inp.ref||'',shipper:meta.shipper||inp.shipper||'',source:meta.source||'portal',
    pickupEta:null,dropoffEta:null};
  const best=nearestEligible(q);q.pickupEta=t0+((best?best.mi:6)/rate().speedMph*60+8)*60000;q.dropoffEta=q.pickupEta+trip.minutes*60000;
  mut(R=>{R.quotes.push(q);if(R.quotes.length>60)R.quotes.splice(0,R.quotes.length-60)});return q}
function acceptQuote(qid,meta){meta=meta||{};const R=desk();
  if(meta.idem){const ex=R.orders.find(o=>o.idem===meta.idem);if(ex)return {order:ex,idempotent:true}}
  const q=R.quotes.find(x=>x.id===qid);if(!q)return {error:'quote_not_found',message:'Quote not found.'};
  if(q.status==='accepted'){const o=R.orders.find(x=>x.quoteId===qid);return {order:o,idempotent:true}}
  if(now()>q.expires||q.status==='expired'){mut(R=>{const x=R.quotes.find(y=>y.id===qid);if(x)x.status='expired'});return {error:'quote_expired',message:'This quote expired after '+rate().holdMin+' minutes. Request a new quote.'}}
  if(q.needsApproval&&!meta.approved)return {error:'needs_approval',message:'Quote is above the rate-card cap. Dispatch must approve it.'};
  let o;mut(R=>{const x=R.quotes.find(y=>y.id===qid);x.status='accepted';
    o={id:'RX-'+String(1000+R.orders.length+1)+Math.random().toString(36).slice(2,4).toUpperCase(),quoteId:qid,status:'matching',created:now(),size:x.size,priority:x.priority,trip:x.trip,fee:x.fee,lines:x.lines,
      pickup:x.pickup,dropoff:x.dropoff,deadline:x.deadline,items:x.items,notes:x.notes,ref:x.ref,shipper:x.shipper,source:x.source,idem:meta.idem||'',opHub:opHubOf(x.pickup.ll),
      wave:0,waveUntil:0,offers:[],wid:null,slaUntil:0,timeline:[],scans:[],pod:null,line:LINE_ID};
    tl(o,'Order placed · '+LINE_NAME+' '+SIZES[o.size].label+' · $'+o.fee.toFixed(2),meta.actor||(o.source==='api'?'API':'Shipper portal'));
    R.orders.push(o);if(R.orders.length>80)R.orders.splice(0,R.orders.length-80)});
  emit('created',o,{actor:o.source==='api'?'API':'Shipper portal',ll:o.pickup.ll});
  advance(o.id);return {order:find(o.id)}}
const find=id=>desk().orders.find(o=>o.id===id);

/* ---------- drivers + eligibility ---------- */
const P=()=>C.portal;
function partnerOf(d){try{const pa=P()&&P().partner(d.partnerId);if(!pa)return null;if(pa.type==='DSP'||pa.type==='Carrier')return pa;const par=pa.parent&&P().partner(pa.parent);return par&&(par.type==='DSP'||par.type==='Carrier')?par:null}catch(e){return null}}
function mode(wid){return desk().modes[wid]||'routes'}
function setMode(wid,m){mut(R=>{R.modes[wid]=['routes','rush','both'].includes(m)?m:'routes'})}
function docsOk(d){try{return C.eligibility?C.eligibility(d.id,d.line).ok:true}catch(e){return true}}
function activeJob(wid){return desk().orders.find(o=>o.wid===wid&&['assigned','at_pickup','picked_up','at_dropoff'].includes(o.status))}
function why(d,o,wave){/* returns '' when eligible */
  if(!d||d.dspSlot)return 'not a driver';if(!d.duty)return 'off duty';
  const m=mode(d.id);if(m==='routes')return 'routes only';
  if(!(SIZES[o.size].lines||[]).includes(d.line))return 'vehicle cannot take '+SIZES[o.size].label.toLowerCase();
  if(!docsOk(d))return 'documents not current';
  const R=desk(),res=R.res[d.id];if(res&&res.oid!==o.id)return res.kind==='job'?'on another Rush job':'holding another offer';
  if(activeJob(d.id))return 'on another Rush job';
  const pa=partnerOf(d);if(pa){if(wave<2)return 'DSP/carrier drivers join in wave 2';if(!R.dspOpt[pa.id])return pa.name+' has not opted in to Rush'}
  return ''}
function cands(o,wave,ignoreRadius){const R=rate(),W=wave<2?R.wave1:R.wave2;
  return (C.S.drivers||[]).map(d=>({d,w:why(d,o,wave),mi:r2(miles(d.loc,o.pickup.ll,1.2))}))
    .filter(x=>!x.w&&(ignoreRadius||x.mi<=W.radiusMi)).sort((a,b)=>a.mi-b.mi)}
function nearestEligible(q){const c=cands(Object.assign({size:q.size,id:'_q'},q),2,true);return c[0]||null}
function eligibleList(o){return (C.S.drivers||[]).filter(d=>!d.dspSlot).map(d=>{const w=why(d,o,2);return {d,w,mi:r2(miles(d.loc,o.pickup.ll,1.2))}}).sort((a,b)=>(!!a.w-!!b.w)||a.mi-b.mi)}

/* ---------- matching ---------- */
function startWave(R,o,n,t){const W=n<2?R.rate.wave1:R.rate.wave2;
  const offered=new Set(o.offers.map(x=>x.wid));const cs=cands(o,n).filter(x=>!offered.has(x.d.id)).slice(0,W.n);
  o.wave=n;o.waveUntil=t+R.rate.waveSec*1000;
  cs.forEach(x=>{const p=payFor(o,x.mi);o.offers.push({wid:x.d.id,name:x.d.name,wave:n,at:t,until:o.waveUntil,status:'pending',pay:p.pay,floor:p.floor,topUp:p.topUp,deadMi:x.mi,engMin:p.engMin,engMi:p.engMi,dsp:(partnerOf(x.d)||{}).name||''});R.res[x.d.id]={oid:o.id,kind:'hold',at:t}});
  tl(o,cs.length?'Wave '+n+' · offered to '+cs.map(x=>x.d.name.split(' ')[0]).join(', ')+' ('+(n<2?'ChainEx drivers':'wider radius + DSP drivers')+')':'Wave '+n+' · no eligible driver within '+W.radiusMi+' mi');
  return cs.length}
function release(R,o,status){o.offers.forEach(f=>{if(f.status==='pending'){f.status=status||'timeout'}if(R.res[f.wid]&&R.res[f.wid].oid===o.id&&R.res[f.wid].kind==='hold')delete R.res[f.wid]})}
function toQueue(R,o,t,why){release(R,o,'timeout');o.status='queue';o.slaUntil=t+R.rate.slaMin*60000;tl(o,'Sent to the dispatch queue · '+(why||'no driver accepted')+' · SLA '+R.rate.slaMin+' min')}
function expire(R,o,reason,code){release(R,o,'expired');o.status='expired';o.endReason=reason;o.endCode=code;o.ended=now();tl(o,'Expired · '+reason);return ['cancelled',{payload:{reason,reason_code:code,status:'expired'}}]}
/* one pass of the state machine; returns events to emit after saving */
function step(R,t){const out=[];
  R.quotes.forEach(q=>{if(q.status==='open'&&t>q.expires)q.status='expired'});
  R.orders.forEach(o=>{
    if(o.status==='matching'){
      if(t>o.deadline){out.push([o,...expire(R,o,'Deadline passed before a driver accepted','deadline_passed')]);return}
      const cur=o.offers.filter(f=>f.wave===o.wave);const open=cur.some(f=>f.status==='pending');
      if(o.wave===0||t>=o.waveUntil||!open){
        cur.forEach(f=>{if(f.status==='pending')f.status='timeout'});release(R,o,'timeout');
        let n=o.wave+1;while(n<=2){if(startWave(R,o,n,t))break;n++}
        if(n>2){toQueue(R,o,t,o.offers.length?'no driver accepted in 2 waves':'no eligible drivers');out.push([o,'eta_updated',{payload:{status:'queue',note:'Escalated to dispatch'}}])}}}
    else if(o.status==='queue'){
      if(t>o.deadline)out.push([o,...expire(R,o,'Deadline passed in the dispatch queue','deadline_passed')]);
      else if(t>o.slaUntil)out.push([o,...expire(R,o,'No driver assigned within the '+R.rate.slaMin+'-minute dispatch SLA','no_drivers_available')])}});
  return out}
function needsStep(R,t){return R.quotes.some(q=>q.status==='open'&&t>q.expires)||R.orders.some(o=>(o.status==='matching'&&(o.wave===0||t>=o.waveUntil||t>o.deadline||!o.offers.some(f=>f.wave===o.wave&&f.status==='pending')))||(o.status==='queue'&&(t>o.slaUntil||t>o.deadline)))}
function advance(){const t=now();if(!needsStep(desk(),t))return 0;let ev=[];mut(R=>{ev=step(R,t)});ev.forEach(([o,type,x])=>emit(type,find(o.id)||o,x));return ev.length||1}
function tick(){try{advance()}catch(e){console.warn('rush tick',e)}}

function accept(oid,wid){let res={ok:false};let o2=null;
  mut(R=>{const o=R.orders.find(x=>x.id===oid);if(!o){res={ok:false,msg:'Order not found'};return}
    const f=o.offers.find(x=>x.wid===wid&&x.status==='pending');
    if(o.status!=='matching'||!f){res={ok:false,msg:o.wid&&o.wid!==wid?'Another driver took this Rush job':'This offer is no longer available'};return}
    if(now()>f.until){f.status='timeout';res={ok:false,msg:'Offer timed out'};return}
    if(R.res[wid]&&R.res[wid].kind==='job'&&R.res[wid].oid!==oid){res={ok:false,msg:'You already have a Rush job'};return}
    f.status='accepted';o.offers.forEach(x=>{if(x!==f&&x.status==='pending')x.status='lost'});release(R,o,'lost');
    assignIn(R,o,wid,f.pay,'Accepted by '+f.name+' (wave '+f.wave+')',f.name);res={ok:true};o2=o});
  if(o2)emit('assigned',o2,{actor:o2.driverName,payload:{driver:o2.driverName.split(' ')[0],eta_pickup:new Date(o2.etaPickup).toISOString()}});
  return res}
function assignIn(R,o,wid,pay,text,actor){const d=C.driver(wid);o.wid=wid;o.driverName=d?d.name:wid;o.status='assigned';o.assignedAt=now();o.pay=pay;
  const dm=d?r2(miles(d.loc,o.pickup.ll,1.2)):3;o.startLL=d&&d.loc?d.loc.slice():o.pickup.ll;o.deadMi=dm;o.etaPickup=now()+(dm/R.rate.speedMph*60+3)*60000;o.etaDrop=o.etaPickup+o.trip.minutes*60000;
  R.res[wid]={oid:o.id,kind:'job',at:now()};tl(o,text,actor)}
function decline(oid,wid,reason){mut(R=>{const o=R.orders.find(x=>x.id===oid);if(!o)return;const f=o.offers.find(x=>x.wid===wid&&x.status==='pending');if(!f)return;f.status='declined';f.reason=reason||'';
  if(R.res[wid]&&R.res[wid].oid===oid&&R.res[wid].kind==='hold')delete R.res[wid];tl(o,f.name+' declined'+(reason?' · '+reason:''),f.name)});advance()}
function assign(oid,wid,opts){opts=opts||{};let res={ok:false};let o2=null;
  if(window.CXA&&CXA.can&&!CXA.can('route.assign'))return {ok:false,msg:'Access restricted, ask an admin.'};
  mut(R=>{const o=R.orders.find(x=>x.id===oid);const d=C.driver(wid);if(!o||!d){res={ok:false,msg:'Not found'};return}
    if(!['matching','queue'].includes(o.status)){res={ok:false,msg:'Order is '+o.status};return}
    let w=why(d,o,2);if(opts.insert&&w==='routes only')w='';
    if(w){res={ok:false,msg:d.name+': '+w};return}
    release(R,o,'lost');assignIn(R,o,wid,payFor(o,r2(miles(d.loc,o.pickup.ll,1.2))).pay,(opts.insert?'Inserted into '+d.name+"'s P&D route by dispatch":'Assigned to '+d.name+' by dispatch'),opts.actor||'Dispatch');
    if(opts.insert)o.inserted=true;o2=o;res={ok:true}});
  if(o2){emit('assigned',o2,{actor:'Dispatch',payload:{driver:o2.driverName.split(' ')[0],inserted:!!opts.insert}});note(wid,'Rush job assigned',o2.pickup.address+' → '+o2.dropoff.address,o2.id)}
  return res}
function rebroadcast(oid){mut(R=>{const o=R.orders.find(x=>x.id===oid);if(!o||o.status!=='queue')return;o.status='matching';o.wave=1;o.waveUntil=0;tl(o,'Re-broadcast by dispatch','Dispatch');startWave(R,o,2,now())});advance()}
function cancel(oid,reason,by){let o2=null,err='';
  mut(R=>{const o=R.orders.find(x=>x.id===oid);if(!o){err='not_found';return}
    if(['delivered','cancelled','expired'].includes(o.status)){err='Order is already '+o.status;return}
    if(o.status==='picked_up'||o.status==='at_dropoff'){err='Already picked up. Ask dispatch for a return to sender.';return}
    release(R,o,'cancelled');if(o.wid&&R.res[o.wid]&&R.res[o.wid].oid===oid)delete R.res[o.wid];
    const stage=o.status==='matching'||o.status==='queue'?'before_assign':'after_assign';
    o.cancelFee=stage==='after_assign'?Math.min(o.fee,r2(Math.max(5,o.fee*0.25))):0;
    o.status='cancelled';o.endReason=reason||'Shipper cancelled';o.endCode=stage;o.ended=now();tl(o,'Cancelled · '+o.endReason+(o.cancelFee?' · fee $'+o.cancelFee.toFixed(2):''),by||'Shipper');o2=o});
  if(err)return {ok:false,msg:err};
  emit('cancelled',o2,{actor:by||'Shipper',payload:{reason:o2.endReason,reason_code:o2.endCode,cancel_fee:o2.cancelFee}});
  if(o2.wid)note(o2.wid,'Rush job cancelled',o2.endReason,o2.id);
  return {ok:true,order:o2}}
/* driver job flow: arrive_pickup → pickup (scans) → arrive_dropoff → deliver (POD) */
function act(oid,wid,a,data){data=data||{};let ev=null,err='';
  mut(R=>{const o=R.orders.find(x=>x.id===oid);if(!o||o.wid!==wid){err='Not your Rush job';return}const d=C.driver(wid);
    if(a==='arrive_pickup'&&o.status==='assigned'){o.status='at_pickup';o.atPickup=now();tl(o,'Arrived at pickup',o.driverName);ev=['arrived',{ll:o.pickup.ll,payload:{stop:'pickup'}}];if(d)d.loc=o.pickup.ll.slice()}
    else if(a==='pickup'&&o.status==='at_pickup'){const sc=(data.scans||[]).filter(Boolean);if(sc.length<o.items){err='Scan all '+o.items+' item'+(o.items>1?'s':'')+' first';return}
      o.scans=sc;o.status='picked_up';o.pickedAt=now();o.etaDrop=now()+o.trip.minutes*60000;tl(o,'Picked up · '+sc.length+' scanned',o.driverName);ev=['picked_up',{ll:o.pickup.ll,payload:{scans:sc,eta_dropoff:new Date(o.etaDrop).toISOString()}}]}
    else if(a==='arrive_dropoff'&&o.status==='picked_up'){o.status='at_dropoff';o.atDrop=now();tl(o,'Arrived at drop-off',o.driverName);ev=['arrived',{ll:o.dropoff.ll,payload:{stop:'dropoff'}}];if(d)d.loc=o.dropoff.ll.slice()}
    else if(a==='deliver'&&o.status==='at_dropoff'){const p=data.pod||{};const needSig=o.size!=='parcel';
      if(!p.photos||!p.photos.length){err='Take a delivery photo';return}if(needSig&&!(p.signer&&p.signatureImg)){err='Signature and signer name required for '+SIZES[o.size].label;return}
      const drop=p.dropLL||o.dropoff.ll;const ft=Math.round(kmTo(drop,o.dropoff.ll)*3280.84);
      o.pod=Object.assign({photo:true,signature:!!p.signatureImg,at:C.S.clock,scan:(o.scans||[])[0]||'',dropLL:drop,distanceFt:ft,far:ft>300},p);
      o.status='delivered';o.deliveredAt=now();o.ended=now();o.onTime=o.deliveredAt<=o.deadline;delete R.res[wid];
      tl(o,'Delivered · POD captured'+(o.pod.signer?' · signed by '+o.pod.signer:''),o.driverName);ev=['delivered',{ll:drop,payload:{pod:{photos:o.pod.photos.length,signer:o.pod.signer||'',placement:o.pod.placement||'',distance_ft:ft},on_time:o.onTime}}]}
    else if(a==='fail'){if(!['assigned','at_pickup'].includes(o.status)){err='Use the exception flow after pickup';return}
      o.status='queue';o.wid=null;o.slaUntil=now()+R.rate.slaMin*60000;delete R.res[wid];tl(o,'Driver could not complete · '+(data.reason||'no reason')+' · back to dispatch',o.driverName);ev=['exception',{payload:{reason:data.reason||'Driver could not complete',reason_code:'driver_unable'}}]}
    else err='Not allowed now ('+o.status+')'});
  if(err)return {ok:false,msg:err};if(ev)emit(ev[0],find(oid),Object.assign({actor:(find(oid)||{}).driverName,k:a},ev[1]));return {ok:true}}

/* ---------- dispatch helpers ---------- */
function insertSuggestion(oid){const o=find(oid);if(!o||!['matching','queue'].includes(o.status)||o.size!=='parcel')return null;let best=null;
  (C.S.drivers||[]).forEach(d=>{if(!d.duty||d.dspSlot||d.line!=='pd'||!d.route||d.route.stage!=='on_road')return;if(desk().res[d.id]||activeJob(d.id)||!docsOk(d))return;
    const pa=partnerOf(d);if(pa&&!desk().dspOpt[pa.id])return;
    const r=C.route(d.id);const pts=[d.loc].concat(r.map(t=>t.ll)).filter(Boolean);if(pts.length<2)return;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const add=miles(a,o.pickup.ll)+miles(o.pickup.ll,o.dropoff.ll)+miles(o.dropoff.ll,b)-miles(a,b);
      if(!best||add<best.detourMi)best={wid:d.id,name:d.name,detourMi:r2(add),after:i,stops:r.length}}});
  return best&&best.detourMi<12?best:null}
function liveLL(o){if(!o)return null;const t=now();const lerp=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
  if(o.status==='assigned'){const f=Math.min(.95,Math.max(0,(t-o.assignedAt)/Math.max(60000,o.etaPickup-o.assignedAt)));return lerp(o.startLL||o.pickup.ll,o.pickup.ll,f)}
  if(o.status==='at_pickup')return o.pickup.ll;if(o.status==='picked_up'){const f=Math.min(.95,Math.max(0,(t-o.pickedAt)/Math.max(60000,o.etaDrop-o.pickedAt)));return lerp(o.pickup.ll,o.dropoff.ll,f)}
  if(o.status==='at_dropoff'||o.status==='delivered')return o.dropoff.ll;return null}
function counts(scope){const os=desk().orders.filter(o=>!scope||scope(o));const t=now(),c={matching:0,queue:0,live:0,delivered:0,cancelled:0,expired:0,late:0,revenue:0,total:os.length,slaRisk:0};
  os.forEach(o=>{if(o.status==='matching')c.matching++;else if(o.status==='queue'){c.queue++;if(o.slaUntil-t<3*60000)c.slaRisk++}else if(['assigned','at_pickup','picked_up','at_dropoff'].includes(o.status)){c.live++;if(t>o.deadline)c.late++}
    else if(o.status==='delivered'){c.delivered++;c.revenue+=o.fee}else if(o.status==='cancelled')c.cancelled++;else if(o.status==='expired')c.expired++});
  c.onTime=c.delivered?Math.round(os.filter(o=>o.status==='delivered'&&o.onTime).length/c.delivered*100):null;return c}
const STATUS={matching:['Finding a driver','acc'],queue:['Dispatch queue','warn'],assigned:['Driver on the way','acc'],at_pickup:['At pickup','acc'],picked_up:['On the way to drop-off','acc'],at_dropoff:['At drop-off','acc'],delivered:['Delivered','ok'],cancelled:['Cancelled','bad'],expired:['Expired','bad']};
function offersFor(wid){const t=now();return desk().orders.filter(o=>o.status==='matching').map(o=>({o,f:o.offers.find(f=>f.wid===wid&&f.status==='pending'&&f.until>t)})).filter(x=>x.f)}
function note(wid,title,body,oid){try{if(window.CXI&&CXI.addNote)CXI.addNote({wid,kind:'rush',tag:'rush:'+oid+':'+title,title,body})}catch(e){}}
function dspOpt(pid,on){mut(R=>{R.dspOpt[pid]=!!on})}
function setRate(patch){if(window.CXA&&CXA.can&&!CXA.can('settings.edit'))return false;mut(R=>{const x=R.rate;Object.keys(patch).forEach(k=>{if(patch[k]&&typeof patch[k]==='object'&&!Array.isArray(patch[k]))x[k]=Object.assign({},x[k],patch[k]);else x[k]=patch[k]})});return true}
function advanceClock(ms){mut(R=>{R.skew=(R.skew||0)+ms});advance()}
function fmtLeft(ms){ms=Math.max(0,ms);const s=Math.round(ms/1000),m=Math.floor(s/60);return m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+':'+String(s%60).padStart(2,'0')}
function clock(ms){try{return new Date(ms).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'})}catch(e){return ''}}

/* ---------- double-booking guard on scheduled-route assignment ---------- */
function guardOps(){if(!C.ops||C.ops._rush)return;C.ops._rush=1;
  [['assign',1],['assignRoute',1],['dspAssignDriver',1],['claim',0]].forEach(([fn,ix])=>{const f=C.ops[fn];if(typeof f!=='function')return;
    C.ops[fn]=function(){const wid=arguments[ix];const j=wid&&activeJob(wid);if(j&&fn!=='claim'){C.ops.lastBlock=[(C.driver(wid)||{}).name+' is on Rush job '+j.id+' until '+clock(j.etaDrop)];return false}return f.apply(this,arguments)}})}

/* ---------- order API (extends CXI.request; same /v1 paths, service_level=on_demand) ---------- */
function apiErr(status,code,message){return {ok:false,status,headers:{'Content-Type':'application/json'},body:{error:{code,message}}}}
function apiOk(body){return {ok:true,status:200,headers:{'Content-Type':'application/json'},body}}
function orderJson(o){const s=STATUS[o.status]||[o.status];return {id:o.id,object:'order',service_level:API_LEVEL,service_line:LINE_NAME,status:o.status,status_label:s[0],size:o.size,priority:o.priority,fee:o.fee,currency:'USD',
  pickup:{address:o.pickup.address,ll:o.pickup.ll},dropoff:{address:o.dropoff.address,ll:o.dropoff.ll},deadline:new Date(o.deadline).toISOString(),
  driver:o.driverName?{first_name:o.driverName.split(' ')[0],location:liveLL(o)}:null,eta_pickup:o.etaPickup?new Date(o.etaPickup).toISOString():null,eta_dropoff:o.etaDrop?new Date(o.etaDrop).toISOString():null,
  cancel_reason:o.endReason||null,cancel_fee:o.cancelFee||0,pod:o.pod?{photos:(o.pod.photos||[]).length,signer:o.pod.signer||'',placement:o.pod.placement||'',distance_ft:o.pod.distanceFt}:null,tracking_url:'track.html?id='+o.id,reference:o.ref||''}}
function quoteJson(q){return {id:q.id,object:'quote',service_level:API_LEVEL,size:q.size,priority:q.priority,fee:q.fee,currency:'USD',breakdown:q.lines.map(l=>({label:l[0],amount:l[1]})),miles:q.trip.miles,minutes:q.trip.minutes,
  pickup_eta:new Date(q.pickupEta).toISOString(),dropoff_eta:new Date(q.dropoffEta).toISOString(),expires_at:new Date(q.expires).toISOString(),hold_minutes:rate().holdMin,needs_approval:q.needsApproval}}
function isRush(b){return b&&(b.service_level===API_LEVEL||b.service_level==='rush'||b.quote_id&&String(b.quote_id).indexOf('RQ-')===0)}
function apiInput(b){return {pickup:b.pickup&&typeof b.pickup==='object'?{address:b.pickup.address,name:b.pickup.name,contact:b.pickup.phone}:{address:b.pickup_address||b.pickup},dropoff:b.dropoff&&typeof b.dropoff==='object'?{address:b.dropoff.address,name:b.dropoff.name,contact:b.dropoff.phone}:{address:b.dropoff_address||b.dropoff},
  size:b.size||'parcel',priority:b.priority||'standard',deadline:b.deadline?Date.parse(b.deadline)||(+b.deadline_minutes||120):(+b.deadline_minutes||120),items:b.items||b.packages||1,notes:b.notes||'',reference:b.reference||''}}
function handle(method,path,opts,key){const parts=String(path||'').replace(/^\/+/,'').split('/');const b=(opts&&opts.body)||{};const h=(opts&&opts.headers)||{};const idem=h['Idempotency-Key']||h['idempotency-key']||(opts&&opts.idem)||'';
  const shipper=(key&&key.shipper)||'';
  if(method==='POST'&&parts[1]==='quotes'&&isRush(b)){const q=quote(apiInput(b),{source:'api',shipper});if(q.error)return apiErr(400,'invalid',q.error);return apiOk({quotes:[quoteJson(q)]})}
  if(method==='POST'&&parts[1]==='orders'&&!parts[2]&&isRush(b)){let qid=b.quote_id;
    if(!idem)return apiErr(400,'idempotency_key_required','Send an Idempotency-Key header on Rush order creation.');
    if(!qid){const q=quote(apiInput(b),{source:'api',shipper});if(q.error)return apiErr(400,'invalid',q.error);qid=q.id}
    const r=acceptQuote(qid,{idem,actor:'API'});if(r.error)return apiErr(r.error==='quote_expired'?410:r.error==='quote_not_found'?404:409,r.error,r.message);
    return apiOk(Object.assign(orderJson(r.order),{idempotent:!!r.idempotent}))}
  if(parts[1]==='orders'&&parts[2]&&/^RX-/.test(parts[2])){const o=find(parts[2]);if(!o)return apiErr(404,'not_found','No Rush order '+parts[2]);
    if(method==='POST'&&parts[3]==='cancel'){const r=cancel(o.id,b.reason||'Cancelled by API','API');return r.ok?apiOk(orderJson(r.order)):apiErr(409,'cannot_cancel',r.msg)}
    if(method==='GET')return apiOk(orderJson(o))}
  if(method==='GET'&&(parts[1]==='tracking'||parts[1]==='track')&&/^RX-/.test(parts[2]||'')){const o=find(parts[2]);if(!o)return apiErr(404,'not_found','No Rush order');
    const evs=window.CXI&&CXI.eventsFor?CXI.eventsFor(o.id):[];return apiOk(Object.assign(orderJson(o),{events:evs,timeline:o.timeline}))}
  return null}
function hookApi(){const I=window.CXI;if(!I||!I.request||I.request._rush)return;const orig=I.request;
  const wrapped=function(method,path,opts){opts=opts||{};const parts=String(path||'').replace(/^\/+/,'').split('/');const b=opts.body||{};
    const mine=(parts[1]==='quotes'||parts[1]==='orders')&&isRush(b)||/^RX-/.test(parts[2]||'');
    if(!mine)return orig.apply(this,arguments);
    const headers=opts.headers||{};const tok=(headers.Authorization||headers.authorization||'').replace(/^Bearer\s+/i,'')||opts.token||'';
    const key=I.findKey?I.findKey(tok):null;if(!key)return apiErr(401,'unauthorized','A scoped API key is required. Use Authorization: Bearer cx_test_…');
    const need=sc=>key.scopes.indexOf(sc)>=0||key.scopes.indexOf('*')>=0;
    if(method==='POST'&&parts[1]==='orders'&&!need('orders:write'))return apiErr(403,'forbidden','This key cannot create orders.');
    try{return handle(method,path,opts,key)||orig.apply(this,arguments)}catch(e){return apiErr(500,'server_error',String(e.message||e))}};
  wrapped._rush=1;I.request=wrapped;
  /* the integrations layer's placeholder offer note is replaced by real Rush offers */
  if(I.offerOnDemand&&!I.offerOnDemand._rush){const f=()=>{};f._rush=1;I.offerOnDemand=f}}

/* ---------- service-line registry (UI lists) ---------- */
function registerLine(){C.extraLines=C.extraLines||{};C.extraLines[LINE_ID]={id:LINE_ID,name:LINE_NAME,code:API_LEVEL,color:'#F25F9C',order:6,desc:'On-demand jobs within hours: instant quote, offer waves, live tracking'}}

const api={LINE_ID,LINE_NAME,API_LEVEL,SIZES,PRIORITY,STATUS,CANCEL_REASONS,PLACES,DEF_RATE,desk,rate,seed,geocode,quote,acceptQuote,find,mode,setMode,why,cands,eligibleList,partnerOf,
  accept,decline,assign,rebroadcast,cancel,act,offersFor,activeJob,insertSuggestion,liveLL,counts,dspOpt,setRate,advance,tick,advanceClock,now,fmtLeft,clock,payFor,price,tripOf,orderJson,quoteJson,handle,miles,esc,opHubOf};
window.CXR=api;
try{C.init&&C.init();seed();registerLine();guardOps();hookApi()}catch(e){console.warn('rush init',e)}
/* integ6 may load after us on some pages */
setTimeout(()=>{try{regTypes();hookApi();guardOps()}catch(e){}},0);
setInterval(tick,1000);
})();
