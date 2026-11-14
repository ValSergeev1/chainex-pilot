/* ChainEx V06 · Pilot test tools (sample data only). Not used on the live ChainEx server.
   Floating "Test" button + panel on the driver app, and the same "Reset pilot data" control on
   Dispatch and the Dashboard so a reset stays consistent across the shared store. */
(function(){
const C=window.CX;if(!C)return;
const LABEL='Pilot test tools — sample data';
const LS_KEEP=/^(cx\.themePref|cx\.v06\.demoMode|cx\.v06\.appVersion)$/;
const LS_PILOT=/^(chainex\.pilot|cx\.v06|cx\.session|cx\.sessions|cx\.scan\.|cx\.bot\.min)/;
const page=()=>(location.pathname.split('/').pop()||'');
const CLEAN_KEY='cx.v06.demoMode';
function readQueryDemo(){try{return new URLSearchParams(location.search).get('demo')}catch(e){return null}}
function isClean(){try{return document.documentElement.classList.contains('cx-clean')}catch(e){return false}}
function setClean(on,opts){
  on=!!on;
  try{localStorage.setItem(CLEAN_KEY,on?'clean':'off')}catch(e){}
  document.documentElement.classList.toggle('cx-clean',on);
  if(document.body)document.body.classList.toggle('cx-clean',on);
  const fab=$('#cxttfab');if(fab)fab.hidden=on;
  if(on)try{close()}catch(e){}
  if(window.__v5drv){try{if(__v5drv.applyClean)__v5drv.applyClean(on);else if(__v5drv.render)__v5drv.render()}catch(e){}}
  if(!(opts&&opts.silent))toast(on?'Clean driver view · this is what a driver sees':'Pilot tools are back on');
  paint();
  return on;
}
function bootClean(){
  const q=readQueryDemo();
  if(q==='clean')setClean(true,{silent:true});
  else if(q==='off'||q==='full'||q==='tools')setClean(false,{silent:true});
  else {let saved=false;try{saved=localStorage.getItem(CLEAN_KEY)==='clean'}catch(e){}setClean(saved,{silent:true})}
}
const isDriver=()=>page()==='driver.html';
const isStaff=()=>page()==='dashboard.html'||page()==='dispatch.html';
const $=s=>document.querySelector(s);
const drv=()=>window.__v5drv||null;
const toast=(m,i)=>{if(window.V5&&V5.toast)V5.toast(m,i);else if(drv()&&window.V5)V5.toast(m,i)};
const widOf=()=>{const d=drv();if(d&&d.ui&&d.ui.wid)return d.ui.wid;try{return (JSON.parse(localStorage.getItem('cx.v06.driver')||'{}')||{}).wid||null}catch(e){return null}};
const DEMO={pd:'CX-PILOT-001',bulky:'CX-PILOT-002',wg:'CX-PILOT-003',ltl:'CX-PILOT-004',shuttle:'CX-PILOT-005'};
const LN={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};

function driverByDemo(line){const id=DEMO[line];if(!id||!C.S)return null;return (C.S.drivers||[]).find(d=>!d.dspSlot&&(d.driverId||'').toUpperCase()===id)}

/* ---------- storage / cache wipe ---------- */
function lsKeys(store){const o=[];try{for(let i=0;i<store.length;i++)o.push(store.key(i))}catch(e){}return o}
function clearPilotStorage(){
  try{lsKeys(localStorage).filter(k=>k&&LS_PILOT.test(k)&&!LS_KEEP.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
  try{lsKeys(sessionStorage).filter(k=>k&&(/^(cx\.|chainex\.)/.test(k))).forEach(k=>sessionStorage.removeItem(k))}catch(e){}
}
function clearIdb(){
  return Promise.resolve().then(()=>{
    if(!window.indexedDB)return;
    if(typeof indexedDB.databases==='function'){
      return indexedDB.databases().then(list=>Promise.all((list||[]).map(d=>{
        const n=d&&d.name;if(!n)return;return new Promise(res=>{const r=indexedDB.deleteDatabase(n);r.onsuccess=r.onerror=r.onblocked=()=>res()});
      }))).catch(()=>{});
    }
  }).catch(()=>{});
}
function clearSwCaches(){
  const jobs=[];
  try{if(window.caches)jobs.push(caches.keys().then(ks=>Promise.all(ks.filter(k=>/^cx-v06-|^cx-/.test(k)).map(k=>caches.delete(k)))).catch(()=>{}))}catch(e){}
  try{if(navigator.serviceWorker)jobs.push(navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>{
    try{if(r.waiting)r.waiting.postMessage({type:'SKIP_WAITING'})}catch(e){}
    return Promise.resolve();
  }))).catch(()=>{}))}catch(e){}
  return Promise.all(jobs);
}

/* ---------- store helpers ---------- */
function inventedSelf(t){return !!(t&&t.x&&t.x.selfBuilt&&(t.tags||[]).includes('DRIVER_BUILT')&&(t.tags||[]).includes('GEO_SAMPLE'))}
function resetPkg(p,scans){if(!p)return;if(scans){p.loaded=false;delete p.loadFlag}delete p.returned;delete p.co;delete p.stopScanned;
  if(scans&&Array.isArray(p.events))p.events=p.events.filter(e=>!/Load-out scan|Loaded to vehicle|Driver scan|Take ownership|Returned to /i.test((e.type||'')+' '+(e.where||'')))}
function resetTask(t,opts){if(!t)return;opts=opts||{};
  t.state='assigned';delete t.completedAt;delete t.pod;t.stepData=t.stepData||{};
  if(opts.clearAttempts){t.attempts=0;delete t.failReason;delete t.nextAction;t.stepData={}}
  else{/* retry: keep attempts, drop in-progress proof so the stop can be tried again */t.stepData={};delete t.pod;delete t.completedAt}
  (t.items||[]).forEach(p=>resetPkg(p,!!opts.clearScans));
}
function wipeLoadoutFor(s,wid,kinds){
  const L=s.v06&&s.v06.loadout;if(!L)return;const d=C.driver(wid),rt=d&&d.route&&d.route.id;
  if(L.confirms)delete L.confirms[wid];
  const hit=(x)=>x.wid===wid&&(!kinds||kinds.includes(x.kind));
  L.reqs=(L.reqs||[]).filter(r=>!hit(r));
  L.alerts=(L.alerts||[]).filter(a=>!hit(a));
  L.notes=(L.notes||[]).filter(n=>n.wid!==wid);
  if(rt&&L.confirms&&L.confirms[wid]&&L.confirms[wid].route!==rt)delete L.confirms[wid];
}
function clearSelfBuilt(s,wid){
  const mine=C.routeAll(wid).filter(t=>t.x&&t.x.selfBuilt);
  mine.forEach(t=>{
    if(inventedSelf(t))s.tasks=(s.tasks||[]).filter(x=>x.id!==t.id);
    else{C.ops.assign(t.id,null);if(t.x){delete t.x.selfBuilt;delete t.x.routeId}t.tags=(t.tags||[]).filter(x=>x!=='DRIVER_BUILT'&&x!=='TAKEN');(t.items||[]).forEach(p=>resetPkg(p,true))}
  });
  wipeLoadoutFor(s,wid,['self_route']);
}
function resetDriverMem(){
  const D=drv();if(!D)return;
  try{if(typeof D.resetMem==='function')return D.resetMem()}catch(e){}
  const ui=D.ui;if(!ui)return;
  ui.plan={mode:null,seq:[],ends:[]};ui.last=null;ui.hit=false;ui.planOpen=false;ui.lc=null;ui.self=false;ui.coOpen=null;ui.scanLog=[];
  try{D.closeUi&&D.closeUi()}catch(e){}
}

/* ---------- public actions ---------- */
async function resetAll(opts){
  opts=opts||{};
  if(opts.confirm!==false){
    const ok=confirm('Reset all V06 pilot data? This restores the original sample day on the Driver app, Dispatch and the Dashboard (shared storage). Sample data only.');
    if(!ok)return false;
  }
  await clearSwCaches();
  await clearIdb();
  clearPilotStorage();
  try{if(typeof C.reset==='function')C.reset()}catch(e){}
  try{localStorage.removeItem('cx.v06.seeded')}catch(e){}
  resetDriverMem();
  if(opts.reload===false){try{C.init()}catch(e){}try{drv()&&drv().render&&drv().render()}catch(e){}paint();toast('Pilot sample data reset','check');return true}
  location.reload();return true;
}
function resetDriverDay(wid,opts){
  opts=opts||{};wid=wid||widOf();if(!wid||!C.driver(wid)){toast('Sign in as a sample driver first','alert');return false}
  C.update(s=>{
    const d=C.driver(wid);if(!d)return;
    clearSelfBuilt(s,wid);
    C.routeAll(wid).forEach(t=>resetTask(t,{clearAttempts:true,clearScans:true}));
    d.duty=false;d.sos=false;
    d.route=d.route||{};d.route.stage='not_started';d.route.checkin='none';
    delete d.route.startAt;delete d.route.closeout;delete d.route.coVeh;delete d.route.edit;delete d.route.coAt;
    if(d.home)d.loc=d.home.slice();
    wipeLoadoutFor(s,wid,['short_load','self_route','wrong_label','ownership']);
    s.closeouts=(s.closeouts||[]).filter(r=>r.wid!==wid);
    s.tickets=(s.tickets||[]).filter(t=>!(t.wid===wid&&/short load|close-out|close out/i.test((t.label||'')+' '+(t.text||''))));
  });
  try{localStorage.removeItem('cx.v06.flow');sessionStorage.removeItem('cx.v06.gpsbuf')}catch(e){}
  const D=drv();if(D&&D.ui&&D.ui.wid===wid){const ui=D.ui;ui.tab='today';ui.scanLog=[];resetDriverMem();try{localStorage.setItem('cx.v06.driver',JSON.stringify(ui))}catch(e){}}
  if(D&&D.render)D.render();paint();toast('Your sample driver day was reset','check');return true;
}
function restartLoadout(wid){
  wid=wid||widOf();if(!wid||!C.driver(wid)){toast('Sign in first','alert');return false}
  C.update(s=>{
    const d=C.driver(wid);
    C.routeAll(wid).filter(t=>C.OPEN(t)).forEach(t=>(t.items||[]).forEach(p=>resetPkg(p,true)));
    if(d){if(['on_road','returning','closed'].includes(d.route.stage))d.route.stage='loading';
      if(d.route.checkin!=='arrived')d.route.checkin='arrived';if(!d.duty)d.duty=true;
      delete d.route.startAt;delete d.route.closeout;delete d.route.coVeh}
    if(s.v06&&s.v06.loadout&&s.v06.loadout.confirms)delete s.v06.loadout.confirms[wid];
    wipeLoadoutFor(s,wid,['short_load']);
  });
  const D=drv();if(D&&D.ui){D.ui.tab='route';D.ui.planOpen=false;D.ui.lc=null;D.ui.last=null;D.ui.scanLog=[];D.ui.self=false;if(D.setOpenLoad)D.setOpenLoad(true)}
  after('loadout');toast('Load-out scans cleared · scan again','scan');return true;
}
function undoLastScan(wid){
  wid=wid||widOf();const D=drv();const ui=D&&D.ui;const log=(ui&&ui.scanLog)||[];
  let rec=log.length?log[log.length-1]:(ui&&ui.last&&ui.last.kind==='ok'?ui.last:null);
  if(!rec||!rec.pid){toast('Nothing to undo','alert');return false}
  let undone=false;
  C.update(s=>{
    const t=rec.tid&&C.task(rec.tid)||(C.S.tasks||[]).find(x=>(x.items||[]).some(p=>p.id===rec.pid));
    const p=t&&(t.items||[]).find(x=>x.id===rec.pid);
    if(p&&p.loaded){p.loaded=false;if(Array.isArray(p.events)&&p.events.length)p.events=p.events.slice(0,-1);undone=true}
    if(t&&t.x&&t.x.selfBuilt&&inventedSelf(t)&&!(t.items||[]).some(x=>x.loaded)){
      s.tasks=s.tasks.filter(x=>x.id!==t.id);undone=true;
    }
    if(s.v06&&s.v06.loadout&&s.v06.loadout.confirms)delete s.v06.loadout.confirms[wid];
  });
  if(!undone){toast('Nothing to undo','alert');return false}
  if(ui){if(ui.scanLog&&ui.scanLog.length)ui.scanLog=ui.scanLog.slice(0,-1);ui.last=ui.scanLog&&ui.scanLog[ui.scanLog.length-1]||null;ui.tab='route';ui.planOpen=false;ui.lc=null;if(D.setOpenLoad)D.setOpenLoad(true)}
  after('loadout');toast('Last scan undone','check');return true;
}
function reopenShort(wid){
  wid=wid||widOf();if(!wid||!C.driver(wid)){toast('Sign in first','alert');return false}
  C.update(s=>{
    const d=C.driver(wid);
    if(s.v06&&s.v06.loadout&&s.v06.loadout.confirms)delete s.v06.loadout.confirms[wid];
    if(d){if(['on_road','returning','closed'].includes(d.route.stage))d.route.stage='loading';
      d.route.checkin='arrived';if(!d.duty)d.duty=true;delete d.route.startAt}
  });
  const D=drv();if(D&&D.ui){D.ui.tab='route';D.ui.planOpen=false;D.ui.lc='confirm';if(D.setOpenLoad)D.setOpenLoad(true)}
  after('confirm');toast('Short load-out reopened','check');return true;
}
function resetStop(tid,opts){
  opts=opts||{};let found=false;
  C.update(()=>{const t=C.task(tid);if(!t)return;found=true;resetTask(t,{clearAttempts:opts.clearAttempts!==false,clearScans:!!opts.clearScans})});
  if(!found){toast('No stop to reset','alert');return false}
  after('route');toast(opts.clearAttempts===false?'Retry this attempt':'Stop is pending again','check');return true;
}
function resetAllStops(wid,opts){
  wid=wid||widOf();if(!wid)return false;
  let n=0;C.update(()=>{C.routeAll(wid).filter(t=>t.state==='completed'||t.state==='failed').forEach(t=>{resetTask(t,{clearAttempts:opts&&opts.clearAttempts!==false,clearScans:false});n++})});
  after('route');toast(n?n+' stop'+(n>1?'s':'')+' are pending again':'No delivered or attempted stops','check');return n;
}
function retryAttempt(tid){
  const t=tid?C.task(tid):null;
  if(!t){const w=widOf();const failed=w&&C.routeAll(w).filter(x=>x.state==='failed');if(!failed||!failed.length){toast('No failed attempt to retry','alert');return false}return resetStop(failed[failed.length-1].id,{clearAttempts:false})}
  return resetStop(tid,{clearAttempts:false});
}
function reopenCloseout(wid){
  wid=wid||widOf();if(!wid||!C.driver(wid)){toast('Sign in first','alert');return false}
  C.update(s=>{
    const d=C.driver(wid);
    C.routeAll(wid).forEach(t=>(t.items||[]).forEach(p=>{delete p.co;delete p.returned}));
    if(d){d.duty=true;d.route.stage='returning';delete d.route.closeout;delete d.route.coVeh;
      if(d.route.checkin!=='arrived')d.route.checkin='arrived';
      if(!['on_road','returning','closed','loading'].includes(d.route.stage));
    }
    s.closeouts=(s.closeouts||[]).filter(r=>r.wid!==wid);
  });
  const D=drv();if(D&&D.ui){D.ui.tab='route';D.ui.coOpen=null}
  after('closeout');toast('Close-out reopened','check');return true;
}
function clearSelfRoute(wid){
  wid=wid||widOf();if(!wid){toast('Sign in first','alert');return false}
  C.update(s=>clearSelfBuilt(s,wid));
  const D=drv();if(D&&D.ui){D.ui.self=false;D.ui.last=null;D.ui.scanLog=[];D.ui.tab='today'}
  after('today');toast('Driver-built route and its approval were cleared','check');return true;
}
function setRushMode(mode,wid){
  wid=wid||widOf();if(!wid){toast('Sign in first','alert');return false}
  if(!window.CXR||!CXR.setMode){toast('Rush is not on this page','alert');return false}
  CXR.setMode(wid,mode);after();toast({routes:'Routes only',rush:'Rush only',both:'Routes + Rush'}[mode]||mode,'check');return true;
}
function switchDriver(line){
  const D=drv();if(D&&D.act){D.act('demo',line);paint();return true}
  const h=driverByDemo(line);if(!h)return false;
  try{const ui=Object.assign({wid:h.id,tab:'today',plan:{mode:null,seq:[],ends:[]}},JSON.parse(localStorage.getItem('cx.v06.driver')||'{}'));ui.wid=h.id;ui.tab='today';localStorage.setItem('cx.v06.driver',JSON.stringify(ui))}catch(e){}
  if(D&&D.render)D.render();paint();return true;
}
function toggleAutoScan(){
  const D=drv();if(D&&D.act){D.act('set','autoScan');paint();return true}
  try{const ui=JSON.parse(localStorage.getItem('cx.v06.driver')||'{}');ui.set=Object.assign({autoScan:false},ui.set||{});ui.set.autoScan=!ui.set.autoScan;localStorage.setItem('cx.v06.driver',JSON.stringify(ui));if(D&&D.render)D.render();toast(ui.set.autoScan?'Auto-scan on':'Auto-scan off','scan');paint();return true}catch(e){return false}
}
function duty(on){
  const D=drv();const w=widOf();if(!w||!C.driver(w)){toast('Sign in first','alert');return false}
  const now=!!C.driver(w).duty;if(on==null)on=!now;if(!!now===!!on){toast(on?'Already on duty':'Already off duty');return true}
  if(D&&D.act){D.act('duty');paint();return true}
  C.update(()=>C.ops.duty(w,on));if(D&&D.render)D.render();paint();return true;
}
function jump(step){
  const w=widOf();if(!w||!C.driver(w)){toast('Sign in first','alert');return false}
  const D=drv();
  if(step==='loadout'){
    C.update(()=>{const d=C.driver(w);if(!d.duty)d.duty=true;d.route.checkin='arrived';if(!['not_started','loading'].includes(d.route.stage))d.route.stage='loading'});
    if(D&&D.ui){D.ui.tab='route';D.ui.planOpen=false;D.ui.lc=null;D.ui.self=false;if(D.setOpenLoad)D.setOpenLoad(true)}
    after('loadout');toast('Jumped to load-out','scan');return true;
  }
  if(step==='first'){
    C.update(()=>{const d=C.driver(w);if(!d.duty)d.duty=true;d.route.checkin='arrived';
      C.routeAll(w).forEach(t=>(t.items||[]).forEach(p=>{if(!p.loaded)p.loaded=true}));
      if(d.route.stage==='closed'||d.route.stage==='returning')d.route.stage='loading';
      if(d.route.stage!=='on_road')C.ops.startRoute(w);
    });
    if(window.CXL&&CXL.confirmLoad&&!CXL.confirmed(w))try{CXL.confirmLoad(w,{})}catch(e){}
    if(D&&D.ui){D.ui.tab='route';D.ui.planOpen=false;D.ui.lc=null;if(D.setOpenLoad)D.setOpenLoad(false)}
    after('route');toast('Jumped to the first stop','nav');return true;
  }
  if(step==='closeout'){
    C.update(()=>{const d=C.driver(w);if(!d.duty)d.duty=true;d.route.checkin='arrived';
      C.routeAll(w).forEach(t=>(t.items||[]).forEach(p=>{if(!p.loaded)p.loaded=true}));
      if(['not_started','loading','closed'].includes(d.route.stage)){if(d.route.stage==='closed')d.route.stage='loading';C.ops.startRoute(w)}
      d.route.stage='returning';delete d.route.closeout;delete d.route.coVeh;
    });
    if(D&&D.ui){D.ui.tab='route';D.ui.coOpen=null}
    after('closeout');toast('Jumped to route close-out','check');return true;
  }
  return false;
}
function after(){const D=drv();if(D&&D.afterReset)D.afterReset();else if(D&&D.render)D.render();paint()}

/* ---------- UI ---------- */
function css(){
  if($('#cxtt-css'))return;
  const s=document.createElement('style');s.id='cxtt-css';s.textContent=`
  .cx-tt-fab{position:fixed;z-index:80;left:12px;right:auto;bottom:calc(12px + env(safe-area-inset-bottom,0px));height:36px;padding:0 12px;border:0;border-radius:18px;background:#1B4E9C;color:#fff;font:650 12px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 8px 24px rgba(8,17,28,.35);cursor:pointer}
  body.dv5 .cx-tt-fab{left:12px;right:auto;bottom:calc(var(--dv-tabs, 62px) + 8px)}
  .cx-tt-fab:hover{filter:brightness(1.08)}
  .cx-tt{position:fixed;inset:0;z-index:90;display:none;align-items:flex-end;justify-content:center}
  .cx-tt.on{display:flex}
  .cx-tt-scrim{position:absolute;inset:0;background:rgba(8,17,28,.55)}
  .cx-tt-panel{position:relative;z-index:1;width:min(440px,100%);max-height:min(88vh,760px);overflow:auto;background:var(--s1,#0F1B2C);color:var(--t1,#E8EEF7);border:1px solid var(--line,rgba(255,255,255,.1));border-radius:20px 20px 0 0;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -12px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px}
  .cx-tt-kicker{font:650 11px/1.3 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--acc,#3B82F6)}
  .cx-tt-panel h2{margin:2px 0 0;font:650 20px/1.2 system-ui,sans-serif;letter-spacing:-.02em}
  .cx-tt-hd{display:flex;align-items:flex-start;gap:10px}
  .cx-tt-hd .grow{flex:1}
  .cx-tt-sec{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;background:var(--s2,rgba(255,255,255,.03))}
  .cx-tt-sec .k{font:650 11px/1 system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--t3,#8495AD)}
  .cx-tt-row{display:flex;flex-wrap:wrap;gap:8px}
  .cx-tt-row button,.cx-tt-sec > button{min-height:40px}
  .cx-tt-note{font-size:12px;color:var(--t2,#9FB3CF);line-height:1.4}
  .cx-tt-stops{display:flex;flex-direction:column;gap:4px;max-height:160px;overflow:auto}
  .cx-tt-stops button{text-align:left;justify-content:flex-start}
  @media(min-width:800px){body:not(.dv5) .cx-tt{align-items:center}.cx-tt-panel{border-radius:18px;max-height:80vh}}
  `;document.head.appendChild(s);
}
function settingsHtml(){
  return `<div class="dv-card" id="cxtt-settings"><div class="dv-eyebrow">${esc(LABEL)}</div>
    <div class="t3" style="font-size:12px">Pilot only. Reset or jump to any step and try it again. The same reset is on Dispatch and the Dashboard because they share this sample data.</div>
    <div class="cx-tt-row">${btnsDriver(true)}</div></div>`;
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function btn(tt,label,cls){return `<button type="button" class="btn sm ${cls||''}" data-tt="${esc(tt)}">${label}</button>`}
function btnsDriver(compact){
  const w=widOf(),d=w&&C.driver(w);
  const stops=d?C.routeAll(w).filter(t=>t.state==='completed'||t.state==='failed'):[];
  const failed=stops.filter(t=>t.state==='failed');
  const mode=(window.CXR&&d&&CXR.mode(w))||'routes';
  const auto=!!(drv()&&drv().ui&&drv().ui.set&&drv().ui.set.autoScan);
  const lines=(C.LINE_ORDER||Object.keys(DEMO)).map(l=>btn('demo:'+l,LN[l],d&&d.line===l?'pri':'')).join('');
  return `${isDriver()?btn('clean','Switch to clean driver view','pri'):''}
    ${btn('all','Reset everything','')}
    ${btn('day','Reset just my driver day','')}
    ${compact?'':`<div class="cx-tt-note">Resets go back to the original sample data. Reset everything also clears this browser's V06 storage and cached files, and resets the Dispatch approval queue.</div>`}
    <div class="k" style="margin-top:4px">Jump to a step</div>
    <div class="cx-tt-row">${btn('jump:loadout','Load-out','pri')}${btn('jump:first','First stop')}${btn('jump:closeout','Close-out')}</div>
    <div class="k">Retry a step</div>
    <div class="cx-tt-row">${btn('off',d&&d.duty?'Go off duty':'Already off duty')}${btn('on',d&&d.duty?'Already on duty':'Back on duty')}</div>
    <div class="cx-tt-row">${btn('loadout','Restart warehouse load-out')}${btn('undo','Undo last scan')}${btn('short','Reopen a closed-short load-out')}</div>
    <div class="cx-tt-row">${btn('stops','Reset all stops to pending')}${btn('retry','Retry a failed attempt')}${btn('closeout','Reopen route close-out')}${btn('self','Clear scan-anyway route')}</div>
    ${stops.length?`<div class="cx-tt-stops">${stops.map(t=>`<button type="button" class="btn sm ghost" data-tt="stop:${esc(t.id)}">Reset stop · ${esc(t.name)} (${t.state==='completed'?'delivered':'attempted'})</button>`).join('')}${failed.map(t=>`<button type="button" class="btn sm ghost" data-tt="retry:${esc(t.id)}">Retry failed · ${esc(t.name)}</button>`).join('')}</div>`:`<div class="cx-tt-note">No delivered or attempted stops yet.</div>`}
    <div class="k" style="margin-top:4px">Work mode</div>
    <div class="cx-tt-row">${['routes','rush','both'].map(m=>btn('mode:'+m,m==='both'?'Both':m[0].toUpperCase()+m.slice(1),mode===m?'pri':'')).join('')}${btn('autoscan',auto?'Auto-scan on':'Toggle auto-scan',auto?'pri':'')}</div>
    <div class="k">Sample driver</div>
    <div class="cx-tt-row">${lines}</div>`;
}
function panelBody(){
  if(isStaff())return `<div class="cx-tt-hd"><div class="grow"><div class="cx-tt-kicker">${esc(LABEL)}</div><h2>Reset pilot data</h2></div><button type="button" class="btn sm ghost" data-tt="close" id="cxttclose">Close</button></div>
    <p class="cx-tt-note">The Driver app, Dispatch and this page share one sample-data store. Resetting here restores the original sample day, clears the Dispatch approval queue, and drops cached V06 files in this browser.</p>
    ${btn('all','Reset pilot data','pri')}`;
  return `<div class="cx-tt-hd"><div class="grow"><div class="cx-tt-kicker">${esc(LABEL)}</div><h2>Retry any step</h2></div><button type="button" class="btn sm ghost" data-tt="close" id="cxttclose">Close</button></div>
    <div class="cx-tt-sec"><div class="k">Reset</div>${btnsDriver(false)}</div>`;
}
function mount(){
  css();
  if(!$('#cxttfab')){const b=document.createElement('button');b.type='button';b.id='cxttfab';b.className='cx-tt-fab';b.setAttribute('data-tt','open');b.setAttribute('aria-label',LABEL);b.textContent='Test';b.hidden=isClean();document.body.appendChild(b)}
  if(!$('#cxtt')){const el=document.createElement('div');el.id='cxtt';el.className='cx-tt';el.hidden=true;el.innerHTML=`<div class="cx-tt-scrim" data-tt="close"></div><div class="cx-tt-panel" role="dialog" aria-label="${esc(LABEL)}"></div>`;document.body.appendChild(el)}
  paint();
}
function paint(){const el=$('#cxtt');if(!el)return;const p=el.querySelector('.cx-tt-panel');if(p)p.innerHTML=panelBody();const set=$('#cxtt-settings');if(set&&isDriver()){const wrap=document.createElement('div');wrap.innerHTML=settingsHtml();set.replaceWith(wrap.firstChild)}}
function open(){mount();const el=$('#cxtt');el.hidden=false;el.classList.add('on');paint();$('#cxttfab')&&$('#cxttfab').setAttribute('aria-expanded','true')}
function close(){const el=$('#cxtt');if(!el)return;el.classList.remove('on');el.hidden=true;$('#cxttfab')&&$('#cxttfab').setAttribute('aria-expanded','false')}
function isOpen(){const el=$('#cxtt');return !!(el&&el.classList.contains('on'))}

function handle(tt){
  if(!tt)return;
  if(tt==='open'){isOpen()?close():open();return}
  if(tt==='close'){close();return}
  if(tt==='clean'){setClean(true);return}
  if(tt==='all'){resetAll({confirm:true});return}
  if(tt==='day'){resetDriverDay();return}
  if(tt==='off'){duty(false);return}
  if(tt==='on'){duty(true);return}
  if(tt==='loadout'){restartLoadout();return}
  if(tt==='undo'){undoLastScan();return}
  if(tt==='short'){reopenShort();return}
  if(tt==='stops'){resetAllStops();return}
  if(tt==='retry'){retryAttempt();return}
  if(tt==='closeout'){reopenCloseout();return}
  if(tt==='self'){clearSelfRoute();return}
  if(tt==='autoscan'){toggleAutoScan();return}
  if(tt.startsWith('demo:')){switchDriver(tt.slice(5));return}
  if(tt.startsWith('mode:')){setRushMode(tt.slice(5));return}
  if(tt.startsWith('jump:')){jump(tt.slice(5));return}
  if(tt.startsWith('stop:')){resetStop(tt.slice(5),{clearAttempts:true});return}
  if(tt.startsWith('retry:')){retryAttempt(tt.slice(6));return}
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-tt]');if(!b)return;e.preventDefault();e.stopPropagation();handle(b.getAttribute('data-tt'))},true);

window.CXTT={LABEL,resetAll,resetDriverDay,restartLoadout,undoLastScan,reopenShort,resetStop,resetAllStops,retryAttempt,reopenCloseout,clearSelfRoute,setRushMode,switchDriver,toggleAutoScan,duty,jump,open,close,isOpen,mount,paint,settingsHtml,handle,widOf,isClean,setClean};
function boot(){bootClean();mount();try{const D=drv();if(isDriver()&&D&&D.render)D.render()}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
