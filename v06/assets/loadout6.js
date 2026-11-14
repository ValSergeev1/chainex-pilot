/* ChainEx V06 · load-out (loadout6.js). Shared by the driver app and every staff / DSP page.
   - Load-out confirmation: expected vs scanned, % scanned, missing list. Leaving short needs a reason and alerts Dispatch,
     the driver's DSP, the Control Tower and the warehouse supervisor right away.
   - Label check for every scan: on my route (stop number), already scanned, on another route / driver / hub, already delivered,
     unrouted in my hub, unknown label, or not a shipping label at all.
   - Driver-built routes ("Scan packages anyway") and "Take ownership" are always in the app, but each is off / needs approval / auto
     per driver, per DSP and per hub. ChainEx staff set hub defaults and driver overrides (hub-scoped); a DSP sets its own default
     and its own drivers. Resolution: ChainEx driver override > DSP driver override > DSP default > hub default.
   State lives in S.v06.loadout (shared store, sample data only). Live mode (web/live/loadout6.js) mirrors these calls to the API. */
(function(){
const C=window.CX;if(!C)return;
const HMAP={BEL1:'sea',SEA1:'sea',KNTB:'sea',WGH:'sea',KNT:'sea','KNT-DC':'sea','SEA-SODO':'sea','BEL-WH':'sea',TAC1:'tac','EVT-WH':'evt',EVT1:'evt',PDX1:'pdx'};
const HUBN={sea:'Seattle / Kent',tac:'Tacoma',evt:'Everett',pdx:'Portland'};
const MODES=['off','approval','auto'],KINDS=['selfBuild','takeOwnership'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const rid=p=>p+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
const nowIso=()=>new Date().toISOString();
const S=()=>C.S;
const P=()=>C.portal;
function opHub(d){if(!d)return 'sea';if(window.CXA&&CXA.opHub)return CXA.opHub(d);return d.opHub||HMAP[d.hub]||'sea'}
function dspOf(d){if(!d||!d.partnerId||!P())return null;const p=P().partner(d.partnerId);if(!p)return null;if(p.type==='DSP')return p.id;return p.parent||null}
function dspName(id){const p=id&&P()&&P().partner(id);return p?(P().short?P().short(p):p.name):''}
function blank(){return{alerts:[],reqs:[],confirms:{},perms:{hub:{},dsp:{},dspDriver:{},driver:{}},notes:[],seeded:0}}
function raw(){const s=S();if(!s)return blank();return (s.v06&&s.v06.loadout)||blank()}
function ensure(s){s.v06=s.v06||{};const L=s.v06.loadout=s.v06.loadout||blank();['alerts','reqs','notes'].forEach(k=>{if(!Array.isArray(L[k]))L[k]=[]});L.confirms=L.confirms||{};L.perms=Object.assign({hub:{},dsp:{},dspDriver:{},driver:{}},L.perms||{});
  if(!L.seeded){L.seeded=1;['sea','tac','evt','pdx'].forEach(h=>L.perms.hub[h]=L.perms.hub[h]||{selfBuild:'off',takeOwnership:'approval'});
    const eex=(s.partners||[]).find(p=>p.type==='DSP'&&/Eastside Express/i.test(p.name||''));if(eex)L.perms.dsp[eex.id]={selfBuild:'approval',takeOwnership:'approval'}}
  return L}
function mut(fn){let out;C.update(s=>{out=fn(ensure(s),s)});hooks.forEach(h=>{try{h('change')}catch(e){}});return out}
function desk(){const s=S();if(s&&!(s.v06&&s.v06.loadout&&s.v06.loadout.seeded)){C.update(x=>{ensure(x)})}return raw()}
const hooks=[];
/* ---- permissions ---- */
function perm(wid,kind){const d=C.driver(wid);const L=desk(),pm=L.perms;if(!d)return{mode:'off',from:'default'};const dsp=dspOf(d),hub=opHub(d);
  const sv=pm.server&&pm.server[wid];if(sv&&MODES.includes(sv[kind]))return{mode:sv[kind],from:sv[kind+'From']||'Server'};
  const pick=(o,from)=>o&&MODES.includes(o[kind])?{mode:o[kind],from}:null;
  return pick(pm.driver[wid],'ChainEx')||pick(pm.dspDriver[wid],'DSP')||(dsp&&pick(pm.dsp[dsp],'DSP default'))||pick(pm.hub[hub],'Hub default')||{mode:'off',from:'default'}}
function setPerm(scope,id,kind,mode,actor){if(!['hub','dsp','dspDriver','driver'].includes(scope)||!KINDS.includes(kind))return false;if(mode!=null&&mode!==''&&!MODES.includes(mode))return false;
  return mut((L,s)=>{const o=L.perms[scope][id]=Object.assign({},L.perms[scope][id]||{});if(mode==null||mode===''||mode==='inherit')delete o[kind];else o[kind]=mode;if(!Object.keys(o).length)delete L.perms[scope][id];
    (s.audit=s.audit||[]).unshift({at:'now',actor:actor||'Staff',action:'Load-out permission',target:scope+':'+id,detail:kind+' = '+(mode||'inherit'),area:'dispatch'});return true})}
/* ---- barcode formats (same families as the API's parseBarcode) ---- */
function format(input){let s=String(input||'').trim();if(!s)return{kind:'empty'};
  if(/^https?:\/\//i.test(s)){try{const u=new URL(s);const v=['tracking','tracknum','tn','t','id'].map(k=>u.searchParams.get(k)).find(Boolean);if(v)return format(v);}catch(e){}return{kind:'not_label',why:'a web link'}}
  if(s[0]==='{'){try{const j=JSON.parse(s);const v=j.tracking||j.tracking_number||j.tn||j.barcode;if(v){const f=format(String(v));f.hint={name:j.name||j.recipient||'',address:j.address||''};return f}}catch(e){}return{kind:'not_label',why:'a data code'}}
  const u=s.toUpperCase().replace(/\s+/g,'');
  if(/^CX[PB]?\d{8,10}$/.test(u)||/^CX[0-9A-Z]{10}$/.test(u))return{kind:'label',fmt:'chainex',code:u};
  if(/^1Z[0-9A-Z]{16}$/.test(u))return{kind:'label',fmt:'1z',code:u};
  if(/^TBA\d{9,15}$/.test(u))return{kind:'label',fmt:'amazon',code:u};
  if(/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(u))return{kind:'label',fmt:'usps',code:u};
  if(/^\d+$/.test(u)){const m=u.match(/^420(?:\d{5}|\d{9})(9[1-5]\d{18,24})$/);if(m)return{kind:'label',fmt:'usps',code:m[1]};if(/^9[1-5]\d{18,24}$/.test(u))return{kind:'label',fmt:'usps',code:u};
    if(u.length===34&&u.startsWith('96'))return{kind:'label',fmt:'c96',code:u.slice(-12)};if([12,15,20,22].includes(u.length))return{kind:'label',fmt:'c96',code:u};
    if(u.length===13||u.length===8)return{kind:'not_label',why:'a product barcode (UPC/EAN), not a shipping label'};return{kind:'not_label',why:'too short to be a tracking number'}}
  if(/^[A-Z0-9][A-Z0-9\-_.]{7,39}$/.test(u))return{kind:'label',fmt:'code128',code:u};
  return{kind:'not_label',why:'not a shipping label'}}
/* ---- where is this package? ---- */
function locate(code){const u=String(code||'').trim().toUpperCase();if(!u)return null;for(const t of S().tasks||[]){for(const p of t.items||[]){if(String(p.id).toUpperCase()===u)return{t,p}}}return null}
function stopNo(wid,t){const r=C.routeAll(wid);return r.findIndex(x=>x.id===t.id)+1}
function loadList(wid){return C.routeAll(wid).filter(t=>t.kind!=='pickup'&&C.OPEN(t)).flatMap(t=>t.items.map(p=>({p,t})))}
function summary(wid){const all=loadList(wid);const scanned=all.filter(x=>x.p.loaded).length;const miss=all.filter(x=>!x.p.loaded);const exp=all.length;
  return{expected:exp,scanned,pct:exp?Math.round(scanned/exp*100):100,missing:miss.map(x=>({pid:x.p.id,stop:stopNo(wid,x.t),name:x.t.name,flag:x.p.loadFlag||null,taskId:x.t.id})),short:miss.length>0}}
/* classify one scan for driver wid. Does not change state. */
function classify(wid,input){const d=C.driver(wid);const f=format(input);const code=f.code||String(input||'').trim().toUpperCase();const hit=locate(code)||locate(String(input||'').trim());
  const base={code,fmt:f.fmt||null,input:String(input||'')};const sm=summary(wid);base.count=sm.scanned;base.total=sm.expected;
  if(hit){const{t,p}=hit;const owner=t.workerId&&C.driver(t.workerId);const rt=owner&&owner.route?owner.route.id:(t.x&&t.x.routeId)||C.routeId(t);
    if(t.workerId===wid){const n=stopNo(wid,t);if(!C.OPEN(t))return Object.assign(base,{kind:'delivered',task:t.id,pkg:p.id,stop:n,title:'Already delivered',sub:`Stop ${n} · ${t.name} was closed out ${t.state==='failed'?'as not delivered':'as delivered'}.`});
      if(p.loaded)return Object.assign(base,{kind:'dup',task:t.id,pkg:p.id,stop:n,title:`Already scanned · Stop ${n}`,sub:t.name});
      return Object.assign(base,{kind:'ok',task:t.id,pkg:p.id,stop:n,name:t.name})}
    if(!C.OPEN(t)&&t.state!=='unassigned')return Object.assign(base,{kind:'delivered',task:t.id,pkg:p.id,title:'Already delivered',sub:`${t.name} · ${t.state==='failed'?'attempted':'delivered'} on ${rt||'another route'}.`});
    const myHub=opHub(d),theirHub=opHub(owner||{hub:t.x&&t.x.hub||t.opHub||(Object.values(S().hubs||{}).find(h=>h.line===t.line)||{}).id});
    if(owner&&theirHub!==myHub)return Object.assign(base,{kind:'other_hub',task:t.id,pkg:p.id,owner:owner.id,ownerName:owner.name,route:rt,title:'Wrong hub',sub:`This package belongs to ${HUBN[theirHub]||theirHub} (${rt}). Set it aside for the hub lead.`});
    if(owner)return Object.assign(base,{kind:'other_route',task:t.id,pkg:p.id,owner:owner.id,ownerName:owner.name,route:rt,title:'Not on your route',sub:`Belongs to ${rt} · ${owner.name.split(' ')[0]}${owner.name.split(' ')[1]?' '+owner.name.split(' ')[1][0]+'.':''}`});
    return Object.assign(base,{kind:'unrouted',task:t.id,pkg:p.id,title:'Not on your route',sub:`Not on any route yet · ${t.name}`})}
  if(f.kind==='not_label')return Object.assign(base,{kind:'not_label',title:'Not a shipping label',sub:`That barcode is ${f.why}. Find the tracking label on the box.`});
  if(f.kind==='empty')return Object.assign(base,{kind:'not_label',title:'Nothing scanned',sub:''});
  return Object.assign(base,{kind:'unknown',hint:f.hint||null,title:'Label not in the system',sub:`${f.fmt==='code128'?'Unrecognized':f.fmt.toUpperCase()} label · no order matches ${code}.`})}
/* ---- alerts ---- */
function addAlert(L,s,a){const d=C.driver(a.wid)||{};const al=Object.assign({id:rid('LA'),at:S().clock,atIso:nowIso(),status:'open',hub:opHub(d),dspId:dspOf(d),driver:d.name||'',route:d.route&&d.route.id||''},a);L.alerts.unshift(al);L.alerts=L.alerts.slice(0,150);return al}
function note(L,wid,text,kind){L.notes.unshift({id:rid('LN'),wid,text,kind:kind||'info',at:S().clock,seen:false});L.notes=L.notes.slice(0,60)}
function confirmLoad(wid,o={}){const sm=summary(wid);const d=C.driver(wid);if(!d)return null;if(sm.short&&!String(o.reason||'').trim())return{error:'reason_required'};
  return mut((L,s)=>{const rec={wid,route:d.route.id,at:s.clock,atIso:nowIso(),expected:sm.expected,scanned:sm.scanned,pct:sm.pct,missing:sm.missing,short:sm.short,reason:o.reason||'',note:o.note||''};L.confirms[wid]=rec;
    if(sm.short){const n=sm.missing.length;rec.alert=addAlert(L,s,{kind:'short_load',sev:'bad',wid,title:`Short load: Route ${d.route.id}, ${n} of ${sm.expected} missing`,text:`${d.name} left ${n} ${n===1?'package':'packages'} behind · ${sm.pct}% scanned · reason: ${o.reason}${o.note?' · “'+o.note+'”':''}`,missing:sm.missing,reason:o.reason,pct:sm.pct,expected:sm.expected,scanned:sm.scanned}).id;
      (s.tickets=s.tickets||[]).unshift({id:'TK-'+Math.random().toString(36).slice(2,6).toUpperCase(),wid,driver:d.name,line:d.line,route:d.route.id,kind:'other',label:'Short load',text:`Short load: ${n} of ${sm.expected} not scanned (${sm.missing.slice(0,8).map(m=>'stop '+m.stop+' '+m.pid).join(', ')}${n>8?' …':''}). Reason: ${o.reason}`,taskId:sm.missing[0]&&sm.missing[0].taskId,stop:sm.missing[0]&&sm.missing[0].name,at:C.fmt?C.fmt(s.clock):'',fixes:[],status:'open',results:[]})}
    return rec})}
function confirmed(wid){const r=desk().confirms[wid];const d=C.driver(wid);return r&&d&&r.route===d.route.id?r:null}
function report(wid,cls,o={}){const d=C.driver(wid);if(!d)return null;return mut((L,s)=>addAlert(L,s,{kind:'wrong_label',sev:'warn',wid,title:`Wrong label at load-out · ${d.route.id}`,text:`${d.name} scanned ${cls.code}: ${cls.title}${cls.sub?' · '+cls.sub:''}${o.note?' · “'+o.note+'”':''}`,code:cls.code,cls:cls.kind,owner:cls.owner||null,ownerRoute:cls.route||null}))}
function moveTo(s,taskId,wid){const t=C.task(taskId);if(!t)return false;const d=C.driver(wid);C.ops.assign(taskId,wid);const T=C.task(taskId);if(T.workerId!==wid)return false;T.x=T.x||{};T.x.routeId=d.route.id;T.items.forEach(p=>{p.loaded=true;(p.events=p.events||[]).push({type:'Loaded to vehicle',at:s.clock,where:'Take ownership',actor:d.name})});(T.tags=T.tags||[]).includes('TAKEN')||T.tags.push('TAKEN');return true}
function takeOwnership(wid,cls){const d=C.driver(wid);if(!d||!cls||!cls.task)return{status:'invalid'};const pm=perm(wid,'takeOwnership');if(pm.mode==='off')return{status:'locked',from:pm.from};
  if(cls.kind==='other_hub'||cls.kind==='delivered')return{status:'invalid'};
  return mut((L,s)=>{const req={id:rid('LR'),kind:'ownership',status:pm.mode==='auto'?'approved':'pending',wid,driver:d.name,route:d.route.id,hub:opHub(d),dspId:dspOf(d),at:s.clock,atIso:nowIso(),task:cls.task,pkg:cls.pkg,code:cls.code,from:{wid:cls.owner||null,name:cls.ownerName||'',route:cls.route||''}};
    if(pm.mode==='auto'){moveTo(s,cls.task,wid);req.decidedBy='Auto (permission)';req.decidedAt=s.clock}
    L.reqs.unshift(req);addAlert(L,s,{kind:'ownership',sev:pm.mode==='auto'?'info':'warn',wid,req:req.id,title:`${pm.mode==='auto'?'Took ownership':'Ownership request'} · ${cls.code}`,text:`${d.name} ${pm.mode==='auto'?'took':'wants'} ${cls.code}${cls.route?' from '+cls.route:''}${cls.ownerName?' ('+cls.ownerName+')':''} onto ${d.route.id}`});
    if(cls.owner&&pm.mode==='auto')note(L,cls.owner,`${cls.code} moved to ${d.name} (${d.route.id})`,'warn');
    return{status:pm.mode==='auto'?'applied':'pending',req:req.id}})}
/* ---- driver-built route ---- */
function selfReq(wid){const d=C.driver(wid);if(!d)return null;return desk().reqs.find(r=>r.kind==='self_route'&&r.wid===wid&&r.route===d.route.id&&r.status!=='rejected')||null}
function hubLL(d){const h=S().hubs[d.hub];return(h&&h.ll)||d.loc||[-122.3,47.6]}
function jitter(code,ll){let h=0;for(const c of String(code))h=(h*31+c.charCodeAt(0))|0;const a=((h>>>0)%360)*Math.PI/180,r=.01+((h>>>8)%100)/100*.05;return[+(ll[0]+Math.cos(a)*r*1.4).toFixed(5),+(ll[1]+Math.sin(a)*r).toFixed(5)]}
/* scan one package into the driver's own route. Returns {status:'added'|'dup'|'need_address'|'locked'|'rejected'|'invalid', stop, count, cls} */
function selfScan(wid,input,addr){const d=C.driver(wid);if(!d)return{status:'invalid'};const pm=perm(wid,'selfBuild');if(pm.mode==='off')return{status:'locked',from:pm.from};
  const cls=classify(wid,input);
  if(cls.kind==='ok'){C.update(()=>{C.ops.loadScan(wid,cls.pkg)});return{status:'added',stop:cls.stop,cls,count:C.routeAll(wid).length}}
  if(cls.kind==='dup')return{status:'dup',stop:cls.stop,cls};
  if(['not_label','delivered','other_hub'].includes(cls.kind))return{status:'rejected',cls};
  if(cls.kind==='other_route')return{status:'rejected',cls};
  if(cls.kind==='unknown'&&!(addr&&addr.address)&&!(cls.hint&&cls.hint.address))return{status:'need_address',cls};
  return mut((L,s)=>{const D=C.driver(wid);const rt=D.route.id;let t;
    if(cls.kind==='unrouted'){moveTo(s,cls.task,wid);t=C.task(cls.task)}
    else{const a=addr&&addr.address?addr:cls.hint;const n=C.routeAll(wid).length+1;const id=`${rt}-S${String(n).padStart(2,'0')}${Math.random().toString(36).slice(2,4).toUpperCase()}`;
      t=C.ops.createTask(D.line,{id,name:a.name||a.address.split(',')[0],address:a.address,ll:jitter(cls.code,hubLL(D)),units:1,tags:['DRIVER_BUILT','GEO_SAMPLE'],x:{routeId:rt,selfBuilt:true,hub:D.hub}});
      t=C.task(id);t.items=[{id:cls.code,label:(C.lines[D.line]||{}).unit||'Package',loaded:true,events:[{type:'Created from driver scan',at:s.clock,where:'Driver app',actor:D.name},{type:'Loaded to vehicle',at:s.clock,where:'Driver scan',actor:D.name}]}];
      t.timeline=[{at:s.clock,text:'Created from a driver scan · driver-built route',actor:D.name}];if(t.workerId!==wid)C.ops.assign(id,wid);t=C.task(id);t.x.routeId=rt}
    (t.tags=t.tags||[]).includes('DRIVER_BUILT')||t.tags.push('DRIVER_BUILT');t.x=t.x||{};t.x.selfBuilt=true;
    if(D.route.checkin!=='arrived')D.route.checkin='arrived';if(!D.duty)D.duty=true;
    let req=L.reqs.find(r=>r.kind==='self_route'&&r.wid===wid&&r.route===rt&&r.status!=='rejected');
    if(!req){req={id:rid('LR'),kind:'self_route',status:'building',mode:pm.mode,wid,driver:D.name,route:rt,hub:opHub(D),dspId:dspOf(D),at:s.clock,atIso:nowIso(),pkgs:[]};L.reqs.unshift(req);
      addAlert(L,s,{kind:'self_route',sev:'info',wid,req:req.id,title:`Driver-built route started · ${rt}`,text:`${D.name} has no assigned route and is scanning packages to build one${pm.mode==='auto'?' (auto-approved)':' · needs approval'}`})}
    if(!req.pkgs.includes(cls.code))req.pkgs.push(cls.code);req.stops=C.routeAll(wid).length;
    if(window.CXI&&CXI.maybeGeocode&&cls.kind!=='unrouted')setTimeout(()=>{try{CXI.maybeGeocode(C.task(t.id))}catch(e){}},0);
    return{status:'added',stop:stopNo(wid,t),cls,count:C.routeAll(wid).length,task:t.id,req:req.id}})}
/* sequence the driver-built route (nearest stop from the hub) and send it for approval */
function buildSelf(wid){const d=C.driver(wid);if(!d)return null;return mut((L,s)=>{const D=C.driver(wid);const open=C.routeAll(wid).filter(t=>C.OPEN(t));const ord=C.nn(hubLL(D),open.map(t=>({id:t.id,ll:t.ll})));const done=C.routeAll(wid).filter(t=>!C.OPEN(t));
    [...done.map(t=>t.id),...ord.map(o=>o.id)].forEach((id,i)=>{C.task(id).seq=i});
    const req=L.reqs.find(r=>r.kind==='self_route'&&r.wid===wid&&r.route===D.route.id&&r.status!=='rejected');if(!req)return null;req.stops=open.length;req.km=+C.pathKm([hubLL(D),...ord.map(o=>o.ll)]).toFixed(1);
    if(req.status==='building'){req.status=req.mode==='auto'?'approved':'pending';req.builtAt=s.clock;if(req.mode==='auto'){req.decidedBy='Auto (permission)';req.decidedAt=s.clock}
      addAlert(L,s,{kind:'self_route',sev:req.mode==='auto'?'info':'warn',wid,req:req.id,title:`Driver-built route ${req.mode==='auto'?'ready':'needs approval'} · ${D.route.id}`,text:`${D.name} built ${open.length} stops (${req.km} km) from scanned packages`})}
    return req})}
function canStart(wid){const r=selfReq(wid);if(!r)return{ok:true};if(r.status==='approved')return{ok:true};if(r.status==='building')return{ok:false,why:'Build your route first'};return{ok:false,why:'Waiting for dispatch to approve your route'}}
function decide(reqId,approve,actor,noteTxt){return mut((L,s)=>{const r=L.reqs.find(x=>x.id===reqId);if(!r||!['pending','building'].includes(r.status))return null;r.status=approve?'approved':'rejected';r.decidedBy=actor||'Dispatch';r.decidedAt=s.clock;r.note=noteTxt||'';
    if(r.kind==='ownership'){if(approve){moveTo(s,r.task,r.wid);if(r.from&&r.from.wid)note(L,r.from.wid,`${r.code} moved to ${r.driver} (${r.route})`,'warn');note(L,r.wid,`Dispatch approved: ${r.code} is on your route`,'ok')}else note(L,r.wid,`Dispatch declined ownership of ${r.code}${noteTxt?' · '+noteTxt:''}. Set it aside.`,'warn')}
    if(r.kind==='self_route'){if(approve)note(L,r.wid,`Dispatch approved your route ${r.route} · you can start`,'ok');else{C.routeAll(r.wid).filter(t=>C.OPEN(t)&&(t.x||{}).selfBuilt).forEach(t=>{C.ops.assign(t.id,null)});note(L,r.wid,`Dispatch declined your driver-built route${noteTxt?' · '+noteTxt:''}. Packages go back to the hub.`,'warn')}}
    L.alerts.filter(a=>a.req===reqId&&a.status==='open').forEach(a=>{a.status='done';a.by=actor});
    return r})}
function requestAccess(wid,kind){const d=C.driver(wid);if(!d)return null;return mut((L,s)=>addAlert(L,s,{kind:'access',sev:'info',wid,perm:kind,title:`Access request · ${d.name}`,text:`${d.name} asks to ${kind==='selfBuild'?'build a route by scanning (no route assigned)':'take ownership of packages at load-out'}`}))}
function ack(id,actor){return mut(L=>{const a=L.alerts.find(x=>x.id===id);if(a){a.status='ack';a.by=actor||'Staff';a.ackAt=S().clock}return a})}
function notesFor(wid){return desk().notes.filter(n=>n.wid===wid&&!n.seen)}
function noteSeen(id){mut(L=>{const n=L.notes.find(x=>x.id===id);if(n)n.seen=true})}
/* scope: {hubs:[..]|null (all), dsp:id|null} */
function inScope(x,sc){if(!sc)return true;if(sc.dsp)return x.dspId===sc.dsp;if(sc.hubs)return sc.hubs.includes(x.hub);return true}
function alerts(sc,open){return desk().alerts.filter(a=>inScope(a,sc)&&(!open||a.status==='open'))}
function reqs(sc,status){return desk().reqs.filter(r=>inScope(r,sc)&&(!status||r.status===status||(status==='pending'&&r.status==='building')))}
window.CXL={MODES,KINDS,HUBN,opHub,dspOf,dspName,desk,perm,setPerm,format,classify,summary,confirmLoad,confirmed,report,takeOwnership,selfScan,buildSelf,selfReq,canStart,decide,requestAccess,ack,notesFor,noteSeen,alerts,reqs,inScope,hooks,_ensure:ensure};
})();
