/* ChainEx Pilot · shared state engine. Service lines plug in via CX.registerLine(config) (assets/lines/*.js). Sample data only. */
(function(){
const KEY='chainex.pilot.v6',VERSION=6;
const LINE_ORDER=['pd','bulky','wg','ltl','shuttle'];
const lines={};const modules=[];
const fmt=m=>{if(m==null||isNaN(m))return '—';m=Math.round(m);let h=Math.floor(m/60)%24,mm=((m%60)+60)%60,ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(mm).padStart(2,'0')} ${ap}`};
const T=(h,m=0)=>h*60+m;
function ev(type,at,where,actor='System'){return{type,at,where,actor}}
function dist(a,b){const dx=(a[0]-b[0])*75,dy=(a[1]-b[1])*111;return Math.sqrt(dx*dx+dy*dy)}
let S=null;const subs=[];
function mk(line,id,name,address,ll,o={}){return Object.assign({id,line,kind:'stop',name,address,ll,contract:null,tags:[],window:[T(8),T(20)],workerId:null,teamId:null,seq:0,state:'unassigned',attempts:0,items:[],timeline:[{at:T(6,0),text:'Task created from manifest',actor:'System'}],stepData:{},x:{},notes:'',pod:null,failReason:null,nextAction:null,completedAt:null,arrivedAt:null,offerId:null,manifest:null},o)}
function log(text,kind='desk',line=null){S.activity.unshift({at:S.clock,text,kind,line});S.activity=S.activity.slice(0,200)}
const uid=(p)=>p+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
const api={T,ev,mk,dist,fmt,uid,log:(...a)=>log(...a),get S(){return S},task:id=>S.tasks.find(t=>t.id===id),driver:id=>S.drivers.find(d=>d.id===id)};
function base(){return{version:VERSION,clock:T(10,40),sim:{playing:false,speed:1},contracts:{},teams:[],drivers:[],vehicles:[],hubs:{},tasks:[],manifests:[],offers:[],activity:[],lanes:[],facilities:{},meta:{},partners:[],users:[],queue:[],recruits:[],audit:[],events:[],payouts:[],dayOffset:0,settings:{claimEnabled:{pd:false,bulky:false,wg:false,ltl:false,shuttle:false}}}}
function seedLine(l,scenario){const c=lines[l];if(c&&c.seed)c.seed(S,api,CXGeo,scenario||'normal')}
function seed(){S=base();LINE_ORDER.forEach(l=>seedLine(l));modules.forEach(m=>m.seed&&m.seed(S,api,CXGeo));S.activity.sort((a,b)=>b.at-a.at);return S}
function load(){try{const j=localStorage.getItem(KEY);S=j?JSON.parse(j):null}catch(e){S=null} if(!S||S.version!==VERSION)seed(); return S}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){console.warn('save failed',e)}}
function emit(){subs.forEach(f=>{try{f(S)}catch(e){console.error(e)}})}
function update(fn){load();const r=fn(S);save();emit();return r}
window.addEventListener('storage',e=>{if(e.key===KEY){load();emit()}});
const task=id=>S.tasks.find(t=>t.id===id),driver=id=>S.drivers.find(d=>d.id===id);
const OPEN=t=>t.state==='assigned'||t.state==='active';
const route=wid=>S.tasks.filter(t=>t.workerId===wid&&OPEN(t)).sort((a,b)=>a.seq-b.seq);
const routeAll=wid=>S.tasks.filter(t=>t.workerId===wid).sort((a,b)=>a.seq-b.seq);
function tl(t,text,actor){t.timeline.push({at:S.clock,text,actor})}
function iev(t,type,where,actor,filter){t.items.forEach(p=>{if(!filter||filter(p))p.events.push(ev(type,S.clock,where,actor))})}
function reseq(wid){S.tasks.filter(t=>t.workerId===wid).sort((a,b)=>a.seq-b.seq).forEach((t,i)=>t.seq=i)}
const L=t=>lines[t.line]||{};
function etas(wid){const d=driver(wid);if(!d)return{};const cfg=lines[d.line]||{};if(cfg.etas)return cfg.etas(S,wid,api);
  const r=route(wid);if(!r.length)return{};const svc=cfg.serviceMin||4;let c=d.route&&d.route.stage==='on_road'?S.clock:Math.max(S.clock+20,(d.route&&d.route.startAt)||0),prev=d.loc;const out={};
  r.forEach(t=>{const km=prev?dist(prev,t.ll):3;c+=km*2.2+1;if(cfg.waitForWindow&&c<t.window[0])c=t.window[0];out[t.id]={eta:c,risk:c>t.window[1]};c+=svc*(t.x.svcFactor||1);prev=t.ll});return out}
function nn(startLL,arr){const rem=arr.slice(),out=[];let cur=startLL;while(rem.length){rem.sort((a,b)=>dist(cur,a.ll)-dist(cur,b.ll));const n=rem.shift();out.push(n);cur=n.ll}return out}
function applySeq(wid,openOrdered){const doneT=S.tasks.filter(t=>t.workerId===wid&&!OPEN(t)).sort((a,b)=>a.seq-b.seq);[...doneT,...openOrdered].forEach((t,i)=>t.seq=i)}

function routeId(t){return (t.x&&t.x.routeId)||String(t.id||'').replace(/-\d+$/,'')}
function routeTasks(rid){return S.tasks.filter(t=>routeId(t)===rid).sort((a,b)=>(a.seq||0)-(b.seq||0))}
function pathKm(lls){let k=0;for(let i=1;i<lls.length;i++)k+=dist(lls[i-1],lls[i]);return k}
function claimOn(line){return !!(S.settings&&S.settings.claimEnabled&&S.settings.claimEnabled[line])}
function capOf(d){if(!d)return null;const v=S.vehicles.find(x=>x.line===d.line&&(x.name===d.vehicle||(d.vehicle&&x.name.indexOf((d.vehicle.split('·')[0]||'').trim())>=0)));const m=String((v&&v.capacity)||'').match(/(\d{2,4})/);return m?+m[1]:null}
function loadOf(wid){return route(wid).reduce((a,t)=>a+t.items.length,0)}
function nn2opt(stops,firstId,lastId,opts){
  opts=opts||{};if(!stops||!stops.length)return{order:[],km:0,miles:0,minutes:0};
  let first=stops.find(s=>s.id===firstId)||stops[0];
  let last=stops.find(s=>s.id===lastId)||stops[stops.length-1];
  if(first.id===last.id&&stops.length>1) last=stops[stops.length-1]===first?stops[0]:stops[stops.length-1];
  const locked=new Set(opts.locked||[]);
  const mid=stops.filter(s=>s.id!==first.id&&s.id!==last.id);
  const speed=opts.speed||2.2,svc=opts.serviceMin||3,clock0=opts.clock||0;
  const startLL=opts.startLL||null,endLL=opts.endLL||null;
  function costOf(arr){
    let c=0,tm=clock0,prev=startLL||arr[0].ll;
    if(startLL)c+=dist(startLL,arr[0].ll);else prev=arr[0].ll;
    for(let i=1;i<arr.length;i++){
      const km=dist(prev,arr[i].ll);c+=km;tm+=km*speed+svc*((arr[i].x&&arr[i].x.svcFactor)||1);
      const w=arr[i].window;if(w){if(tm<w[0])tm=w[0];if(tm>w[1])c+=(tm-w[1])*0.08}
      prev=arr[i].ll;
    }
    if(endLL)c+=dist(arr[arr.length-1].ll,endLL);
    return c;
  }
  let cur=first.ll,t=clock0,rem=mid.slice(),ordered=[first];
  while(rem.length){
    rem.sort((a,b)=>{
      const da=dist(cur,a.ll),db=dist(cur,b.ll);
      const etaA=t+da*speed,etaB=t+db*speed;
      const pen=(x,eta)=>{if(!x.window)return 0;if(eta>x.window[1])return (eta-x.window[1])*4;if(eta<x.window[0])return (x.window[0]-eta)*0.12;return 0};
      return (da+pen(a,etaA))-(db+pen(b,etaB));
    });
    const n=rem.shift();ordered.push(n);
    const km=dist(cur,n.ll);t+=km*speed+svc;if(n.window&&t<n.window[0])t=n.window[0];cur=n.ll;
  }
  ordered.push(last);
  let best=ordered,bestC=costOf(best),improved=true,guard=0;
  while(improved&&guard++<120){
    improved=false;
    for(let i=1;i<best.length-2;i++){
      for(let j=i+1;j<best.length-1;j++){
        let blocked=false;for(let k=i;k<=j;k++)if(locked.has(best[k].id)){blocked=true;break}
        if(blocked)continue;
        const cand=best.slice(0,i).concat(best.slice(i,j+1).reverse(),best.slice(j+1));
        const c=costOf(cand);
        if(c+1e-9<bestC){best=cand;bestC=c;improved=true}
      }
    }
  }
  const minutes=bestC*speed+best.length*svc;
  return{order:best,km:bestC,miles:bestC*0.621371,minutes};
}
const ops={
  assign(id,wid,teamId,index,actor='Dispatcher'){const t=task(id);if(!t)return;const prev=t.workerId;
    if(wid&&wid!==prev&&window.CX&&CX.eligibility){const e=CX.eligibility(wid,t.line);if(!e.ok){const msg=`Blocked: ${driver(wid).name} can't take ${t.id} · ${e.reasons.join('; ')}`;tl(t,msg,actor);log(msg,'exception',t.line);ops.lastBlock=e.reasons;return false}}ops.lastBlock=null;t.workerId=wid||null;t.teamId=wid?driver(wid).team:(teamId||null);
    if(['unassigned','assigned','active'].includes(t.state))t.state=wid?(t.state==='active'&&prev===wid?'active':'assigned'):'unassigned';
    if(wid){const r=routeAll(wid).filter(x=>x.id!==id);const i=index==null?r.length:Math.max(0,Math.min(index,r.length));r.splice(i,0,t);r.forEach((x,k)=>x.seq=k)}
    const who=wid?driver(wid).name:(teamId?(S.teams.find(x=>x.id===teamId)||{}).name:'Unassigned');
    if(prev!==wid){tl(t,wid?`Assigned to ${who}`:`Moved to ${who}`,actor);log(`${t.name} → ${who}`,'desk',t.line)}else if(wid){tl(t,`Resequenced to stop ${t.seq+1}`,actor)}
    if(prev&&prev!==wid)reseq(prev);return true},
  setClaim(line,on){S.settings=S.settings||{claimEnabled:{}};S.settings.claimEnabled=S.settings.claimEnabled||{};S.settings.claimEnabled[line]=!!on;log(`Driver claiming ${on?'enabled':'disabled'} for ${(lines[line]&&lines[line].name)||line}`,'desk',line)},
  assignRoute(rid,wid,teamId,actor='Dispatcher'){const mine=routeTasks(rid).filter(t=>t.state==='unassigned'||!t.workerId||t.workerId===wid);
    if(wid&&window.CX&&CX.eligibility){const e=CX.eligibility(wid,mine[0]&&mine[0].line);if(!e.ok){ops.lastBlock=e.reasons;log(`Blocked: ${driver(wid).name} can't take route ${rid} · ${e.reasons.join('; ')}`,'exception',mine[0]&&mine[0].line);return false}}ops.lastBlock=null;
    let n=0;mine.forEach(t=>{const ok=ops.assign(t.id,wid,teamId,null,actor);if(ok!==false)n++});
    if(wid){const d=driver(wid);if(d){d.route=d.route||{};d.route.id=rid;if(d.route.stage==='closed'){d.route.stage='not_started';d.route.checkin='none'}}}
    const who=wid?driver(wid).name:(teamId?(S.teams.find(x=>x.id===teamId)||{}).name:'Unassigned');
    log(`Route ${rid} → ${who} · ${n} stops`,'desk',mine[0]&&mine[0].line);return n},

  optimize(wid){const d=driver(wid),cfg=lines[d.line]||{};if(cfg.optimize){cfg.optimize(S,wid,api,{applySeq,nn,route});log(`${cfg.optLabel||'Optimized'} · ${d.route.id} (${d.name})`,'desk',d.line);return}
    const act=route(wid).filter(t=>t.state==='active'),rem=route(wid).filter(t=>t.state!=='active');applySeq(wid,[...act,...nn(act.length?act[act.length-1].ll:d.loc,rem)]);log(`Optimized ${d.route.id} (${d.name})`,'desk',d.line)},
  autoAssign(line){const cfg=lines[line];if(cfg&&cfg.autoAssign){const before=S.tasks.filter(t=>t.line===line&&t.state==='unassigned').length;cfg.autoAssign(S,api,ops,{route,routeAll,applySeq,nn});const n=before-S.tasks.filter(t=>t.line===line&&t.state==='unassigned').length;log(`${cfg.autoLabel||'Auto-assign'}: ${n} ${cfg.stopWord||'stops'} placed`,'desk',line);return n}return 0},
  setState(id,st,actor='Dispatcher',extra={}){const t=task(id);t.state=st;
    if(st==='active'){tl(t,(extra.label||'On my way')+(extra.eta?` · ETA ${fmt(extra.eta)}`:''),actor);iev(t,extra.itemEvent||'Out for delivery · en route','Driver app',actor)}
    if(st==='completed'){t.completedAt=S.clock;t.pod=extra.pod||t.pod||{summary:'Completed by dispatcher'};iev(t,extra.itemEvent||'Delivered','Stop GPS',actor);tl(t,extra.text||'Completed',actor);log(`${actor} · ${extra.text||'Completed'} · ${t.name}`,'driver',t.line)}},
  completeStep(id,step,data,actor){const t=task(id),cfg=L(t);t.stepData[step.id]=Object.assign({at:S.clock,by:actor},data||{});
    if(step.effect==='active'){const e=etas(t.workerId)[t.id];ops.setState(id,'active',actor,{eta:e&&e.eta,label:step.label,itemEvent:step.itemEvent});const d=driver(t.workerId);if(d&&step.moveDriver!==false){d.loc=[d.loc[0]+(t.ll[0]-d.loc[0])*.6,d.loc[1]+(t.ll[1]-d.loc[1])*.6]}log(`${actor} · ${step.label} · ${t.name}`,'driver',t.line)}
    else if(step.effect==='arrive'){if(t.state==='assigned')t.state='active';t.arrivedAt=S.clock;tl(t,step.label||'Arrived',actor);iev(t,step.itemEvent||'Arrived at stop','Stop GPS',actor);const d=driver(t.workerId);if(d)d.loc=t.ll.slice();S.clock+=2}
    else{if(t.state==='assigned')t.state='active';tl(t,`${step.label}${data&&data.summary?' · '+data.summary:''}`,actor);if(step.itemEvent)iev(t,step.itemEvent,'Driver app',actor)}
    if(cfg.onStep)cfg.onStep(t,step,data||{},S,api);
    const steps=cfg.steps?cfg.steps(t,S):[];const last=steps[steps.length-1];
    if(last&&last.id===step.id){const sd=Object.values(t.stepData);const pod={summary:sd.map(v=>v.summary).filter(Boolean).join(' · '),photo:sd.some(v=>v.photos),signature:sd.some(v=>v.signature),receivedBy:(data&&data.receivedBy)||'',notes:(data&&data.notes)||''};
      ops.setState(id,'completed',actor,{pod,text:cfg.completeText?cfg.completeText(t):'Delivered',itemEvent:cfg.completeItemEvent?cfg.completeItemEvent(t):'Delivered'});S.clock+=Math.max(1,Math.round((cfg.serviceMin||3)/3));if(cfg.onComplete)cfg.onComplete(t,S,api);modules.forEach(m=>m.onComplete&&m.onComplete(t,S,api))}},
  fail(id,reason,next,notes,actor){const t=task(id),cfg=L(t),R=cfg.rules||{},c=S.contracts[t.contract]||{maxAttempts:3,sameDay:false,name:'—'};t.attempts++;t.failReason=reason;t.nextAction=next;t.completedAt=S.clock;t.notes=notes||t.notes;
    iev(t,`Exception · ${reason}`,'Stop GPS',actor);let msg=`${cfg.exceptionLabel||"Can't deliver"} · ${reason} → ${next} (attempt ${t.attempts} of ${c.maxAttempts})`;const add=x=>{if(!t.tags.includes(x))t.tags.push(x)};
    const counts=(R.counts||[]).includes(next);
    if(R.continue&&R.continue.includes(next)){t.state=t.state==='assigned'?'assigned':'active';t.completedAt=null;t.attempts--;add('DELAY');msg=`Delay · ${reason} → ${next}`}
    else if(next===R.rts){t.state='failed';add('RTS');msg+=` · ${String(R.rts).toLowerCase()}`}
    else if(counts&&t.attempts>=c.maxAttempts){t.state='failed';t.nextAction=R.rts||next;add('RTS');msg+=` · attempt limit reached → ${R.rts}`}
    else if(next===R.requeue&&c.sameDay&&t.workerId){t.state='assigned';add('REATTEMPT');t.seq=999;reseq(t.workerId);t.stepData={};t.arrivedAt=null;msg+=' · re-queued at end of same route'}
    else if(next===R.requeue){t.state='failed';msg+=' · next business day per contract'}
    else if(next===R.station){t.state='failed';add('TO STATION');msg+=' · return to station'}
    else t.state='failed';
    tl(t,msg,actor);log(`${actor} · ${reason} at ${t.name}`,'exception',t.line)},
  redeliver(id){const t=task(id);t.state=t.workerId?'assigned':'unassigned';t.failReason=null;if(!t.tags.includes('REATTEMPT'))t.tags.push('REATTEMPT');if(t.workerId){t.seq=999;reseq(t.workerId)}t.stepData={};t.arrivedAt=null;tl(t,'Redelivery queued','Dispatcher');log(`Redelivery queued: ${t.name}`,'desk',t.line)},
  rts(id){const t=task(id),R=L(t).rules||{};t.state='failed';t.nextAction=R.rts||'Return to shipper';if(!t.tags.includes('RTS'))t.tags.push('RTS');tl(t,`Marked ${t.nextAction}`,'Dispatcher');log(`${t.nextAction}: ${t.name}`,'desk',t.line)},
  forceComplete(id){const t=task(id),cfg=L(t);ops.setState(id,'completed','Dispatcher',{text:(cfg.completeText?cfg.completeText(t):'Delivered')+' (force-completed by dispatcher)'})},
  // CRUD
  createTask(line,f){const cfg=lines[line];const id=f.id||`${cfg.prefix||'CX'}-N${String(S.tasks.filter(t=>t.line===line).length+1).padStart(3,'0')}`;
    const t=mk(line,id,f.name||'New stop',f.address||'',f.ll||(cfg.defaultLL||[-122.2,47.62]),{contract:f.contract||Object.values(S.contracts).find(c=>c.line===line)?.id,window:f.window||[S.clock,S.clock+240],tags:f.tags||['NEW'],x:f.x||{}});
    t.timeline=[{at:S.clock,text:'Created on desk',actor:'Dispatcher'}];t.items=cfg.makeItems?cfg.makeItems(t,f,api):Array.from({length:Math.max(1,+f.units||1)},(_,k)=>({id:`${id}-${k+1}`,label:cfg.unit||'Package',loaded:false,events:[ev('Created on desk',S.clock,'Desk','Dispatcher')]}));
    if(cfg.onCreate)cfg.onCreate(t,f,S,api);S.tasks.push(t);if(f.workerId)ops.assign(id,f.workerId);log(`New ${cfg.stopWord1||'stop'} ${id} · ${t.name}`,'desk',line);return t},
  editTask(id,f){const t=task(id);['name','address','contract','notes'].forEach(k=>{if(f[k]!=null)t[k]=f[k]});if(f.window)t.window=f.window;if(f.ll)t.ll=f.ll;if(f.x)Object.assign(t.x,f.x);if(f.tags)t.tags=f.tags;const cfg=L(t);if(cfg.onEdit)cfg.onEdit(t,f,S,api);tl(t,'Edited on desk','Dispatcher');log(`Edited ${t.id}`,'desk',t.line)},
  deleteTask(id){const t=task(id);if(!t)return;S.tasks=S.tasks.filter(x=>x.id!==id);if(t.workerId)reseq(t.workerId);S.manifests.forEach(m=>m.taskIds=m.taskIds.filter(x=>x!==id));log(`Deleted ${id} · ${t.name}`,'desk',t.line)},
  bulk(ids,action,arg){ids.forEach(id=>{const t=task(id);if(!t)return;if(action==='assign')ops.assign(id,arg||null);else if(action==='unassign')ops.assign(id,null);else if(action==='team')ops.assign(id,null,arg);else if(action==='delete')ops.deleteTask(id);else if(action==='complete'&&OPEN(t))ops.forceComplete(id);else if(action==='rts')ops.rts(id);else if(action==='redeliver'&&t.state==='failed')ops.redeliver(id)});log(`Bulk ${action}: ${ids.length} task(s)`,'desk',ids.length?task(ids[0])?.line:null)},
  saveDriver(f){let d=f.id&&driver(f.id);const line=f.line;if(!d){const cfg=lines[line];const id=uid('drv').toLowerCase();d={id,name:f.name,driverId:f.driverId||('CX-'+Math.floor(2000+Math.random()*7000)),line,team:f.team,duty:false,loc:(S.hubs[f.hub]||{ll:cfg.defaultLL||[-122.2,47.62]}).ll.slice(),home:(S.hubs[f.hub]||{ll:cfg.defaultLL||[-122.2,47.62]}).ll.slice(),hub:f.hub,hubName:(S.hubs[f.hub]||{}).name,vehicle:f.vehicle||'',helper:f.helper||'',skills:f.skills||[],route:{id:f.routeId||(cfg.prefix||'RT')+'-'+String(S.drivers.filter(x=>x.line===line).length+1).padStart(2,'0'),stage:'not_started',checkin:'none'},sos:false};S.drivers.push(d);log(`New driver ${d.name} (${d.route.id})`,'desk',line)}
    else{['name','team','vehicle','helper','driverId'].forEach(k=>{if(f[k]!=null)d[k]=f[k]});if(f.skills)d.skills=f.skills;if(f.routeId)d.route.id=f.routeId;if(f.hub&&S.hubs[f.hub]){d.hub=f.hub;d.hubName=S.hubs[f.hub].name;d.home=S.hubs[f.hub].ll.slice()}log(`Edited driver ${d.name}`,'desk',d.line)}return d},
  deleteDriver(id){const d=driver(id);routeAll(id).forEach(t=>{if(OPEN(t)){t.workerId=null;t.state='unassigned'}});S.drivers=S.drivers.filter(x=>x.id!==id);log(`Removed driver ${d.name}; open tasks returned to Unassigned`,'desk',d.line)},
  saveTeam(f){let t=S.teams.find(x=>x.id===f.id);if(!t){t={id:uid('tm').toLowerCase(),name:f.name,line:f.line,hub:f.hub};S.teams.push(t);log(`New team ${t.name}`,'desk',f.line)}else{t.name=f.name??t.name;t.hub=f.hub??t.hub;log(`Edited team ${t.name}`,'desk',t.line)}return t},
  deleteTeam(id){const t=S.teams.find(x=>x.id===id);const other=S.teams.find(x=>x.line===t.line&&x.id!==id);if(!other)return false;S.drivers.forEach(d=>{if(d.team===id)d.team=other.id});S.tasks.forEach(x=>{if(x.teamId===id)x.teamId=null});S.teams=S.teams.filter(x=>x.id!==id);log(`Removed team ${t.name}`,'desk',t.line);return true},
  saveVehicle(f){let v=S.vehicles.find(x=>x.id===f.id);if(!v){v=Object.assign({id:uid('VH')},f);S.vehicles.push(v);log(`New vehicle ${v.name}`,'desk',f.line)}else{Object.assign(v,f);log(`Edited vehicle ${v.name}`,'desk',v.line)}return v},
  deleteVehicle(id){const v=S.vehicles.find(x=>x.id===id);S.vehicles=S.vehicles.filter(x=>x.id!==id);log(`Removed vehicle ${v.name}`,'desk',v.line)},
  saveHub(f){const id=f.id||uid('HUB');const ex=S.hubs[id];S.hubs[id]=Object.assign(ex||{id,line:f.line},{name:f.name,address:f.address,ll:f.ll||(ex&&ex.ll)||[-122.2,47.62],line:f.line||(ex&&ex.line)});log(`${ex?'Edited':'New'} hub ${f.name}`,'desk',S.hubs[id].line);return S.hubs[id]},
  deleteHub(id){const h=S.hubs[id];delete S.hubs[id];log(`Removed hub ${h.name}`,'desk',h.line)},
  saveContract(f){const id=f.id||uid('CT');const ex=S.contracts[id];S.contracts[id]=Object.assign(ex||{id,tracking:false},{name:f.name,kind:f.kind,line:f.line||(ex&&ex.line),maxAttempts:+f.maxAttempts||1,sameDay:!!f.sameDay,sla:f.sla});if(f.tracking!=null)S.contracts[id].tracking=!!f.tracking;log(`${ex?'Edited':'New'} contract ${f.name}`,'desk',S.contracts[id].line);return S.contracts[id]},
  deleteContract(id){const c=S.contracts[id];const used=S.tasks.some(t=>t.contract===id);if(used)return false;delete S.contracts[id];log(`Removed contract ${c.name}`,'desk',c.line);return true},
  // route tools
  newRoute(line,f){const d=ops.saveDriver(Object.assign({line},f));return d},
  splitRoute(wid,newWid){const r=route(wid).filter(t=>t.state==='assigned');const half=r.slice(Math.ceil(r.length/2));half.forEach(t=>ops.assign(t.id,newWid,null,null));log(`Split ${driver(wid).route.id}: ${half.length} stops → ${driver(newWid).route.id}`,'desk',driver(wid).line);return half.length},
  mergeRoute(fromWid,intoWid){const r=route(fromWid);r.forEach(t=>ops.assign(t.id,intoWid,null,null));log(`Merged ${driver(fromWid).route.id} into ${driver(intoWid).route.id} (${r.length} stops)`,'desk',driver(intoWid).line);return r.length},
  reverseRoute(wid){const r=route(wid);const act=r.filter(t=>t.state==='active'),rest=r.filter(t=>t.state!=='active').reverse();applySeq(wid,[...act,...rest]);log(`Reversed ${driver(wid).route.id}`,'desk',driver(wid).line)},
  importManifest(line,rows,o){const cfg=lines[line];const n=S.manifests.length+1;const id='MF-'+String(100+n);const slaDue=o.target!=null?o.target:null;
    const m={id,line,name:o.name||('Manifest '+id),contract:o.contract,importedAt:S.clock,slaDue,source:o.source||'pasted CSV',taskIds:[]};
    rows.forEach((r,i)=>{const tid=`${cfg.prefix||'CX'}-${id.slice(3)}-${String(i+1).padStart(2,'0')}`;const t=mk(line,tid,r.name,r.address,[r.lng,r.lat],{contract:o.contract,window:[r.start??S.clock,Math.min(r.end??(slaDue??S.clock+360),slaDue??1e9)],tags:['IMPORTED'],manifest:id,x:{}});
      t.items=cfg.makeItems?cfg.makeItems(t,r,api):Array.from({length:Math.max(1,Math.min(+r.units||1,12))},(_,k)=>({id:`${tid}-${k+1}`,label:cfg.unit||'Package',loaded:false,events:[ev('Manifest imported',S.clock,'Desk','Dispatcher')]}));
      t.timeline=[{at:S.clock,text:`Imported from ${m.source} · ${id}${slaDue!=null?` · target ${fmt(slaDue)}`:''}`,actor:'Dispatcher'}];if(cfg.onCreate)cfg.onCreate(t,r,S,api);S.tasks.push(t);m.taskIds.push(tid)});
    S.manifests.push(m);log(`Manifest ${id} imported (${rows.length} ${cfg.stopWord||'stops'})${slaDue!=null?`, target ${fmt(slaDue)}`:''}`,'manifest',line);return m},
  tracking(cid){const c=S.contracts[cid];c.tracking=!c.tracking;log(`Recipient tracking ${c.tracking?'ON':'OFF'} for ${c.name}`,'desk',c.line)},
  // driver-side
  duty(wid,on){const d=driver(wid);d.duty=on;log(`${d.name} is ${on?'on':'off'} duty`,'driver',d.line)},
  checkin(wid,step){const d=driver(wid);d.route.checkin=step;if(step==='arrived'&&d.home)d.loc=d.home.slice();log(`${d.name} · ${step==='on_my_way'?'On my way to '+(d.hubName||'hub'):'Arrived at '+(d.hubName||'hub')}`,'driver',d.line)},
  claim(wid,offerId){const o=S.offers.find(x=>x.id===offerId);if(!o||o.claimedBy)return;if(CX.eligibility){const e=CX.eligibility(wid,o.line);if(!e.ok){log(`Offer ${o.id} blocked for ${driver(wid).name}: ${e.reasons.join('; ')}`,'exception',o.line);return false}}o.claimedBy=wid;o.taskIds.forEach(id=>{const t=task(id);if(t){t.offerId=null;ops.assign(id,wid,null,null,driver(wid).name)}});log(`${driver(wid).name} claimed offer ${o.id} (${o.taskIds.length} stops)`,'driver',driver(wid).line)},
  loadScan(wid,ids,label='Loaded to vehicle'){const d=driver(wid);let n=0;const set=new Set([].concat(ids));for(const t of route(wid))for(const p of t.items)if(set.has(p.id)&&!p.loaded){p.loaded=true;p.events.push(ev(label,S.clock,'Load-out scan',d.name));n++}if(n&&d.route.stage==='not_started')d.route.stage='loading';return n},
  startRoute(wid){const d=driver(wid);d.route.stage='on_road';d.route.startAt=S.clock;if(!d.duty)d.duty=true;route(wid).forEach(t=>{if(t.state==='assigned')iev(t,'Out for delivery','Route start',d.name)});log(`${d.name} · load-out complete, ${d.route.id} departed`,'driver',d.line)},
  sos(wid,on){const d=driver(wid);d.sos=on;log(on?`SOS from ${d.name} · ${d.route.id}`:`SOS cleared for ${d.name}`,on?'sos':'desk',d.line)},
  returnHub(wid){const d=driver(wid);d.route.stage='returning';log(`${d.name} · returning to ${d.hubName||'hub'}`,'driver',d.line)},
  returnScan(wid,ids){const d=driver(wid);let n=0;const set=new Set([].concat(ids));for(const t of routeAll(wid))for(const p of t.items)if(set.has(p.id)&&!p.returned){p.returned=true;p.events.push(ev(`Returned to ${d.hubName||'hub'}`,S.clock,'Return scan',d.name));n++}return n},
  closeRoute(wid){const d=driver(wid);route(wid).forEach(t=>{t.state='failed';t.failReason='Not attempted (route closed)';t.nextAction=(L(t).rules||{}).station||'Return to station';tl(t,'Not attempted · returned at route close',d.name)});d.route.stage='closed';d.duty=false;modules.forEach(m=>m.onRouteClosed&&m.onRouteClosed(d,S,api));if(d.home)d.loc=d.home.slice();log(`${d.name} · return scan complete, ${d.route.id} closed`,'driver',d.line)},
  reopenRoute(wid){const d=driver(wid);d.route.stage='not_started';d.route.checkin='none';log(`${d.route.id} reopened`,'desk',d.line)},
  tick(m){S.clock+=m;modules.forEach(x=>x.onTick&&x.onTick(S,api,m));LINE_ORDER.forEach(l=>{const c=lines[l];if(c&&c.onTick)c.onTick(S,api,m)})},
  // test tools
  resetLine(line){S.tasks=S.tasks.filter(t=>t.line!==line);S.drivers=S.drivers.filter(d=>d.line!==line);S.teams=S.teams.filter(t=>t.line!==line);S.vehicles=S.vehicles.filter(v=>v.line!==line);S.manifests=S.manifests.filter(m=>m.line!==line);S.offers=S.offers.filter(o=>o.line!==line);
    Object.keys(S.contracts).forEach(k=>{if(S.contracts[k].line===line)delete S.contracts[k]});Object.keys(S.hubs).forEach(k=>{if(S.hubs[k].line===line)delete S.hubs[k]});if(line==='shuttle'){S.lanes=[];S.facilities={}}S.activity=S.activity.filter(a=>a.line!==line);seedLine(line);modules.forEach(m=>m.onLineSeed&&m.onLineSeed(line,S,api));log(`Reset ${lines[line].name} sample data`,'desk',line)},
  scenario(name,line){const ls=line&&line!=='all'?[line]:LINE_ORDER;S.clock=T(10,40);
    ls.forEach(l=>{ops.resetLine(l);const c=lines[l];const R=(c.reasons||['Other']),N=(c.nextActions||['Hold']);const rnd=CXGeo.rng(77);
      if(name==='heavy'&&c.heavy)c.heavy(S,api,CXGeo);
      if(name==='late'){S.drivers.filter(d=>d.line===l&&d.route.stage!=='on_road').forEach(d=>{d.route.lateBy=60});if(c.late)c.late(S,api);S.tasks.filter(t=>t.line===l&&t.state==='assigned').forEach(t=>{t.window=[t.window[0],Math.max(t.window[0]+30,t.window[1]-90)]});log(`Scenario: late trucks / late start for ${c.name}`,'desk',l)}
      if(name==='exceptions'){S.tasks.filter(t=>t.line===l&&t.workerId&&t.state==='assigned').forEach((t,i)=>{if(rnd()<0.18){const wid=t.workerId;ops.fail(t.id,R[Math.floor(rnd()*R.length)],N[Math.floor(rnd()*N.length)],'Scenario seed',driver(wid)?driver(wid).name:'Driver')}});
        const ds=S.drivers.filter(d=>d.line===l&&d.duty);if(ds[1])ds[1].sos=true;log(`Scenario: many exceptions for ${c.name}`,'exception',l)}});
    if(name==='normal')log('Scenario: normal day','desk')},
  simulate(wid){const d=driver(wid);if(!d)return false;const cfg=lines[d.line];const t=route(wid)[0];
    if(d.route.stage!=='on_road'){if(!d.duty)d.duty=true;d.route.checkin='arrived';route(wid).forEach(x=>x.items.forEach(p=>{if(!p.loaded){p.loaded=true;p.events.push(ev('Loaded to vehicle',S.clock,'Simulated',d.name))}}));ops.startRoute(wid);return true}
    if(!t)return false;const steps=cfg.steps?cfg.steps(t,S):[];const next=steps.find(s=>!t.stepData[s.id]);if(!next)return false;
    const data={summary:'simulated',sim:true};if(next.kind==='scan')t.items.forEach(p=>{p.stopScanned=true});if(next.kind==='photo'||next.kind==='pod')data.photos=1;if(next.kind==='sign'||next.kind==='pod')data.signature=true;
    ops.completeStep(t.id,next,data,d.name+' (sim)');return true},
};
window.CX={KEY,LINE_ORDER,lines,registerLine(cfg){lines[cfg.id]=cfg;if(cfg.ops)Object.assign(ops,cfg.ops(api,ops))},registerModule(m){modules.push(m);if(m.ops)Object.assign(ops,m.ops(api,ops))},fmt,T,load,save,update,subscribe:f=>subs.push(f),
  reset(){seed();save();emit()},exportJSON:()=>JSON.stringify(S,null,1),importJSON(txt){const o=JSON.parse(txt);if(!o||o.version!==VERSION||!Array.isArray(o.tasks))throw new Error('Not a ChainEx pilot state file');S=o;save();emit()},
  get S(){return S},task,driver,route,routeAll,etas,dist,nn,nn2opt,pathKm,routeId,routeTasks,claimOn,capOf,loadOf,ops,api,OPEN,
  lineOf:t=>lines[t.line],stateLabel:(s,line)=>{const c=line&&lines[line];return (c&&c.stateLabels&&c.stateLabels[s])||({unassigned:'Unassigned',assigned:'Assigned',active:'En route',completed:'Completed',failed:'Exception'})[s]},
  toast(msg){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2400)},
  esc:s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),
  csvParse(txt){const rows=[];let row=[],cur='',q=false;for(let i=0;i<txt.length;i++){const ch=txt[i];if(q){if(ch==='"'&&txt[i+1]==='"'){cur+='"';i++}else if(ch==='"')q=false;else cur+=ch}else if(ch==='"')q=true;else if(ch===','){row.push(cur);cur=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(cur);if(row.some(x=>x.trim()!==''))rows.push(row);row=[];cur=''}else cur+=ch}row.push(cur);if(row.some(x=>x.trim()!==''))rows.push(row);return rows},
  csvCell:v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},
  download(name,text,type='text/csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)},
  hm:s=>{if(s==null||s==='')return null;const m=String(s).trim().match(/^(\d{1,2}):(\d{2})/);return m?+m[1]*60+ +m[2]:null},
  toHM:m=>m==null?'':`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.round(m)%60).padStart(2,'0')}`,
  init(){load();save();return S}};
})();
