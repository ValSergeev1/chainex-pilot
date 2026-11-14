/* ChainEx V06 · Driver app. Phone-first, installable (manifest + service worker scoped to v06/).
   P&D + Bulky: on duty -> route map editable at once (Best route for me / I'll set the order / Pick my first and last stop)
   -> warehouse check-in -> mandatory load-out scan ("Stop 14 of 80" + shelf hint, missing/damaged -> Dispatch ticket) gates Start
   -> one-screen navigation (turn banner + map + sheet; arrival scan, POD / can't-deliver sheets, auto-advance) -> return scan -> close.
   White glove, LTL, Shuttle keep their V02 operational flows (check-in, load or skip, step-by-step stop sheets) in the V06 look.
   Shared state (assets/store.js) so Dispatch, Dashboard and every other version see each scan live. */
(function(){
const C=window.CX,V=window.V5,esc=V.esc,ic=V.ic,fmt=C.fmt,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LN={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};
const DEMO={pd:'CX-PILOT-001',bulky:'CX-PILOT-002',wg:'CX-PILOT-003',ltl:'CX-PILOT-004',shuttle:'CX-PILOT-005'};
const UK='cx.v06.driver';
const UI0=()=>({wid:null,tab:'today',plan:{mode:null,seq:[],ends:[]},sheet:'peek',autoNav:true,last:null,planOpen:false,set:{voice:true,haptics:true,autoScan:false,sound:true,autoLight:true},lc:null,self:false});
let ui=(()=>{let o={};try{o=JSON.parse(localStorage.getItem(UK)||'{}')||{}}catch(e){o={}}const u=Object.assign(UI0(),o);const z=UI0();
 if(!u.plan||typeof u.plan!=='object')u.plan=z.plan;['seq','ends'].forEach(k=>{if(!Array.isArray(u.plan[k]))u.plan[k]=[]});if(!u.set||typeof u.set!=='object')u.set=z.set;['autoScan','sound','autoLight'].forEach(k=>{if(u.set[k]==null)u.set[k]=z.set[k]});
 if(!['today','route','inbox','me'].includes(u.tab))u.tab='today';return u})();
const save=()=>{try{localStorage.setItem(UK,JSON.stringify(ui))}catch(e){}};
const D=()=>ui.wid&&C.driver(ui.wid),W=()=>ui.wid,K=()=>C.lines[(D()||{}).line]||C.lines.pd,DC=()=>K().driver||{};
const R=()=>C.routeAll(W()),openT=()=>R().filter(t=>C.OPEN(t)),cur=()=>openT()[0];
const special=()=>{const d=D();return !!d&&(C.routeEditLines||['pd','bulky']).includes(d.line)};
const stage=()=>(D()&&D().route.stage)||'not_started',pre=()=>['not_started','loading'].includes(stage());
const no=t=>R().findIndex(x=>x.id===t.id)+1,tot=()=>R().length;
const word=()=>{const w=K().stopWord1||'stop';return w[0].toUpperCase()+w.slice(1)};
const stepsOf=t=>K().steps?K().steps(t,C.S):[],nextStep=t=>stepsOf(t).find(s=>!t.stepData[s.id]);
const elig=()=>C.eligibility?C.eligibility(W(),D().line):{ok:true,reasons:[],warnings:[]};
const hub=()=>{const d=D();return C.S.hubs[d.hub]||{name:d.hubName||'hub',ll:d.loc}};
const byId=id=>C.S.drivers.filter(d=>!d.dspSlot&&(d.driverId||'').toUpperCase()===String(id||'').trim().toUpperCase());
const toast=(m,i)=>V.toast(m,i);
const units=()=>(K().units||'items').toLowerCase();
function haptic(){try{ui.set.haptics&&navigator.vibrate&&navigator.vibrate(18)}catch(e){}}
function slot(t){const ds=R().filter(x=>x.kind!=='pickup'),n=ds.length||1,i=Math.max(0,ds.findIndex(x=>x.id===t.id));const part=i<n/3?'Rear, by the door':i<2*n/3?'Middle':'Front, behind the seat';
 if(D().line==='bulky')return{big:`Floor · ${i<n/3?'rear':i<2*n/3?'middle':'front'}`,txt:part};
 if(!special())return{big:(t.items[0]&&t.items[0].label)||'Load',txt:part};
 const per=Math.max(1,Math.ceil(n/6)),sh=String.fromCharCode(65+Math.min(5,Math.floor(i/per)));return{big:`Shelf ${sh}`,txt:`${part} · ${i%2?'right':'left'} side`}}
let map=null,meMk=null,fitKey='',leg=null,navTimer=null,openLoad=false,modal=null,cap={photos:{},sig:false};
function isClean(){try{return document.documentElement.classList.contains('cx-clean')}catch(e){return false}}
function applyClean(on){try{document.documentElement.classList.toggle('cx-clean',!!on);document.body.classList.toggle('cx-clean',!!on);localStorage.setItem('cx.v06.demoMode',on?'clean':'off')}catch(e){}}
function fitShell(){try{const root=document.documentElement,vv=window.visualViewport;const h=Math.max(1,Math.round((vv&&vv.height)||window.innerHeight||root.clientHeight));const top=Math.max(0,Math.round((vv&&vv.offsetTop)||0));root.style.setProperty('--app-h',h+'px');root.style.setProperty('--app-top',top+'px');
  const probe=s=>{const e=document.createElement('div');e.style.cssText='position:fixed;visibility:hidden;padding-'+s+':env(safe-area-inset-'+s+',0px)';document.body.appendChild(e);const n=parseFloat(getComputedStyle(e)['padding'+s[0].toUpperCase()+s.slice(1)])||0;e.remove();return n};
  let sat=0,sab=0;try{sat=probe('top');sab=probe('bottom')}catch(e){}
  const standalone=!!((window.navigator&&navigator.standalone)||(window.matchMedia&&matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches));
  root.classList.toggle('cx-standalone',standalone);
  /* If the PWA is edge-to-edge but WebKit reports 0 inset, keep content out from under the status bar. */
  if(standalone&&sat<20)sat=47;if(sat)root.style.setProperty('--sat',sat+'px');else root.style.removeProperty('--sat');
  if(sab)root.style.setProperty('--sab',sab+'px');else root.style.removeProperty('--sab');
 }catch(e){}}
function mount(){document.documentElement.classList.add('dv-shell');document.body.classList.add('dv5','dv-toastz');if(isClean())document.body.classList.add('cx-clean');fitShell();$('#app').innerHTML=`<div class="dv-stage"><aside class="dv-side"><div class="dv-eyebrow">ChainEx · V06</div><h1>Driver</h1><p>Phone-first app. Open this page on your phone and choose <b>Add to Home Screen</b> to install it. Every scan and delivery syncs live to Dispatch and the Dashboard.</p><div class="dv-card" style="font-size:12.5px"><b style="color:var(--t1)">Sample drivers</b><span>Settings → Demo switches between P&amp;D, Bulky, White glove, LTL and Shuttle.</span></div><a class="btn" href="start.html">${ic('home',15)}V06 start page</a></aside>
 <div class="dv" id="dv"><div class="dv-map" id="dvmap"></div><div class="dv-top" id="dvtop"></div><main class="dv-scr" id="dvscr"></main><div class="dv-sheet" id="dvsheet" hidden><button class="dv-grab" data-a="grab" aria-label="Resize"><i></i></button><div class="dv-sb" id="dvsb"></div></div><nav class="dv-tabs" id="dvtabs"></nav><div class="dv-modal" id="dvmodal"><div class="scrim" data-a="mclose"></div><div class="dv-mb" id="dvmb"></div></div></div></div>`;
 map=new V.Map($('#dvmap'),{pad:{top:90,bottom:300,left:40,right:40},zoom:11})}
function me(ll){if(!map||!map.m||!map.ready||!ll)return;if(!meMk){const e=document.createElement('div');e.className='mk me';meMk=new maplibregl.Marker({element:e}).setLngLat(ll).addTo(map.m)}else meMk.setLngLat(ll)}
function tabs(){const d=D();const unread=(C.S.msgs||[]).filter(m=>m.wid===W()&&!m.readDriver).length;const drive=special()&&stage()==='on_road';const rl=!d?'Route':special()&&pre()&&d.duty?'Plan':drive?'Drive':'Route';
 $('#dvtabs').innerHTML=[['today','Today','home'],['route',rl,drive?'nav':'route'],['inbox','Inbox','chat',unread],['me','Settings','gear']].map(([k,l,i,b])=>`<button class="dv-tab${ui.tab===k?' on':''}" data-a="tab" data-v="${k}">${ic(i,21)}<span>${l}</span>${b?`<span class="bdg">${b}</span>`:''}</button>`).join('')}
function top(){const d=D();if(!d){$('#dvtop').innerHTML='';return}const a=R(),done=a.filter(t=>t.state==='completed').length;
 $('#dvtop').innerHTML=(ui.tab==='route'&&special()&&stage()==='on_road'&&cur()?`<div class="dv-turn" id="dvturn"></div>`:`<div class="dv-pill"><i class="dot${d.duty?' live':''}" style="background:${d.duty?'var(--ok)':'var(--t3)'}"></i><span>${esc(d.route.id)}</span><span class="mono">${done}/${a.length}</span></div><span style="flex:1"></span>`)+`<button class="dv-rb${d.sos?' sos':''}" data-a="sos" aria-label="SOS">${d.sos?'SOS ON':ic('sos',17)}</button>`;if($('#dvturn'))paintTurn()}
function render(){if(typeof sheetHold!=='undefined'&&sheetHold)return;try{C.load();const d=D();if(!d)ui.wid=null;
 const scr=$('#dvscr');tabs();top();$('#dvsheet').hidden=true;scr.className='dv-scr solid';$('#dvtabs').hidden=!d;
 if(!d){scr.className='dv-scr';scr.innerHTML=welcome();$('#dvtop').innerHTML='';return}
 const t=ui.tab;if(t==='today')scr.innerHTML=today();else if(t==='inbox'){scr.innerHTML=inbox();if((C.S.msgs||[]).some(m=>m.wid===W()&&!m.readDriver))setTimeout(()=>C.update(()=>C.ops.msgRead&&C.ops.msgRead(W(),'driver')),0);scr.scrollTop=scr.scrollHeight}else if(t==='me')scr.innerHTML=settings();else routeTab();
 if(t!=='route')stopNav();syncCam();try{map&&map.resize()}catch(e){}}catch(err){console.warn('driver render',err);try{recoverUi(err)}catch(e){}}}
function mapScreen(on){document.body.classList.toggle('dv-onmap',!!on);$('#dvscr').className='dv-scr '+(on?'over':'solid');const sh=$('#dvsheet');sh.hidden=!on;sh.classList.toggle('full',ui.sheet==='full');sh.classList.toggle('peek',ui.sheet!=='full');const topEl=$('#dvtop');if(topEl)topEl.hidden=!on;try{const pill=document.getElementById('rxpill');if(pill&&!on){/* visibility handled in CSS; keep hidden flag for duty-only when off-map */} }catch(e){}}
function routeTab(){const d=D(),scr=$('#dvscr');
 if(!d.duty&&stage()!=='closed'){scr.innerHTML=`<div class="dv-card" style="margin-top:40px;align-items:flex-start"><div class="dv-eyebrow">${esc(d.route.id)}</div><div class="dv-h1">Go on duty to open your route</div><div class="t2" style="font-size:13.5px">${special()?'Your route map opens right away, so you can plan the order before you reach the warehouse.':'Check-in, load and your stops unlock once you are on duty.'}</div><button class="dv-slide" data-a="duty">${ic('power',20)}Go on duty</button></div>`;return}
 if(stage()==='returning')return retScreen();if(stage()==='closed')return closedScreen();
 if(selfMode())return selfScreen();
 if(ui.lc==='confirm'&&pre()&&d.route.checkin==='arrived')return confirmScreen();
 if(special()){if(pre())return d.route.checkin==='arrived'&&!ui.planOpen?loadScreen():planScreen();return openT().length?driveScreen():finishScreen()}
 if(pre()){if(openLoad&&d.route.checkin==='arrived'&&!DC().skipLoad&&pk().some(x=>!x.p.loaded&&!x.p.loadFlag))return loadScreen();openLoad=false;return startOfDay()}
 return routeList()}
function welcome(){return `<div class="dv-wel"><div class="mark">Ex</div>
 <div style="margin-top:24px"><div class="dv-eyebrow">ChainEx Driver</div><h1 class="dv-h1" style="font-size:34px;margin-top:10px">Your route,<br>start to finish.</h1></div>
 <div style="display:flex;flex-direction:column;gap:10px;margin:6px 0">${[['route','Plan your own stop order the moment you go on duty'],['scan','Scan to load: every package shows its stop number, big'],['nav','Turn-by-turn on one screen, proof of delivery in two taps']].map(([i,t])=>`<div class="dv-feat">${ic(i,17)}<span>${t}</span></div>`).join('')}</div>
 <div style="flex:1"></div>
 <label class="dv-lbl" for="dvid">Driver ID</label><input class="in" id="dvid" placeholder="e.g. CX-1042" autocapitalize="characters" autocomplete="off" style="height:52px;font:600 17px var(--fm);letter-spacing:.04em;border-radius:14px">
 <label class="dv-chk"><input type="checkbox" id="dvterms"> <span style="font-size:12.5px;color:var(--t2)">I agree to the ChainEx driver terms and location sharing while on duty.</span></label>
 <button class="dv-slide" data-a="signin">Continue ${ic('chev',18)}</button>
 <div style="text-align:center;font-size:12px;color:var(--t3)">Trying the pilot? <button class="btn sm ghost" data-a="fillid" data-v="${DEMO.pd}" style="display:inline-flex">Use sample ID ${DEMO.pd}</button></div><div style="text-align:center;font-size:12px"><a href="../site-v05/drivers.html" style="color:var(--t3)">Drive with ChainEx · website</a></div></div>`}
function banners(){const d=D();let h='';if(window.CXL)CXL.notesFor(W()).slice(0,3).forEach(n=>{h+=`<div class="dv-card" style="flex-direction:row;align-items:center;border-color:${n.kind==='ok'?'var(--ok)':'var(--warn)'}">${ic(n.kind==='ok'?'check':'alert',18)}<div style="flex:1;font-size:13px"><b>${esc(n.text)}</b></div><button class="btn sm" data-a="lnote" data-v="${n.id}">OK</button></div>`});const n=d.route.notice;if(n&&!n.seen)h+=`<div class="dv-card" style="flex-direction:row;align-items:center;border-color:var(--acc)">${ic('bolt',18)}<div style="flex:1;font-size:13px"><b>Dispatch updated your stop order</b><div class="t3">${esc(n.text||'New order applied')}</div></div><button class="btn sm" data-a="noticeok">OK</button></div>`;
 const ed=d.route.edit;if(ed&&ed.status==='rejected')h+=`<div class="dv-card" style="flex-direction:row;align-items:center;border-color:var(--warn)">${ic('alert',18)}<div style="flex:1;font-size:13px"><b>Dispatch restored the planned order</b><div class="t3">${esc(ed.reviewNote||'')}</div></div></div>`;
 const e=elig();if(!e.ok)h+=`<div class="dv-card" style="border-color:var(--bad)"><b style="color:var(--bad);font-size:13px">${ic('lock',14)} Not cleared to drive</b><div class="t2" style="font-size:12.5px">${esc(e.reasons.join(' · '))}. Upload a new document in the driver portal or call your DSP.</div><a class="btn sm" href="portal-driver.html">Open driver portal</a></div>`;return h}
function today(){const d=D(),a=R(),done=a.filter(t=>t.state==='completed').length,fail=a.filter(t=>t.state==='failed').length,items=a.reduce((x,t)=>x+t.items.length,0),hb=hub();
 const offers=(DC().offers||d.line==='bulky')&&C.claimOn&&C.claimOn(d.line)?C.S.offers.filter(o=>o.line===d.line&&!o.claimedBy):[];const next=stage()==='on_road'?cur():null;
 const SL={not_started:'Not started',loading:'Loading',on_road:'On the road',returning:'Returning',closed:'Closed'};
 return `<div><div class="dv-eyebrow">${esc(new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'America/Los_Angeles'}))}</div><h1 class="dv-h1" style="margin-top:8px">Hi ${esc(d.name.split(' ')[0])}</h1></div>${banners()}
 <div class="dv-card"><div style="display:flex;align-items:center;gap:8px"><span class="chip acc">${esc(LN[d.line])}</span><span class="mono t3" style="font-size:12px">${esc(d.route.id)}</span><span style="flex:1"></span><span class="chip ${stage()==='on_road'?'acc':stage()==='closed'?'ok':''}">${esc(SL[stage()]||stage())}</span></div>
 <div class="dv-kv"><div><b>${a.length}</b><span>${esc(K().stopWord||'stops')}</span></div><div><b>${items}</b><span>${esc(units())}</span></div><div><b>${done}${fail?`<span class="bad" style="font-size:12px"> +${fail}</span>`:''}</b><span>done</span></div></div>
 <div class="dv-row" style="padding:4px 0"><span class="t3">${ic('warehouse',16)}</span><div class="grow"><div>${esc(hb.name||'')}</div><div class="sub">${esc(hb.address||'')}</div></div></div>
 ${a[0]?`<div class="dv-row" style="padding:4px 0"><span class="t3">${ic('clock',16)}</span><div class="grow"><div>First window ${fmt(a[0].window[0])}</div><div class="sub">Vehicle · ${esc(d.vehicle||'—')}</div></div></div>`:''}
 ${a.length?V.stack([[done,'var(--ok)'],[fail,'var(--bad)'],[a.length-done-fail,'var(--s3)']],200,6):''}</div>
 ${next?`<button class="dv-card" data-a="tab" data-v="route" style="text-align:left;color:inherit;cursor:pointer"><div class="dv-eyebrow">Next ${esc(word().toLowerCase())}</div><div style="display:flex;align-items:center;gap:10px"><span class="dv-n act">${no(next)}</span><div style="flex:1;min-width:0"><b style="font-size:15px">${esc(next.name)}</b><div class="t3" style="font-size:12.5px">${esc(next.address)}</div></div>${ic('chev',18)}</div></button>`:''}
 ${!a.length&&stage()!=='closed'?noRouteCard():''}${d.duty?(stage()==='closed'||!a.length?'':`<button class="btn xl pri block" data-a="tab" data-v="route">${ic(special()&&pre()?'route':'nav',19)}${special()&&pre()?'Plan my route':pre()?'Start of day':'Continue route'}</button>`)+`<button class="dv-slide off" data-a="duty">${ic('power',20)}Go off duty</button>`:`<button class="dv-slide${stage()==='closed'?' off':''}" data-a="duty"${stage()==='closed'?' disabled':''}>${ic('power',20)}${stage()==='closed'?'Route closed for today':'Go on duty'}</button>${stage()==='closed'?`<button class="btn block" data-a="resetday">${ic('route',16)}Start a new sample day</button>`:''}`}
 ${offers.length?`<div class="dv-eyebrow" style="margin-top:6px">Open work near you</div>${offers.map(o=>`<div class="dv-card" style="flex-direction:row;align-items:center"><div style="flex:1"><b style="font-size:14px">${esc(o.title)}</b><div class="t3" style="font-size:12px">${esc(o.zone)} · ${o.taskIds.length} stops · ${esc(o.pay)} · ${esc(o.pickup)}</div></div><button class="btn sm pri" data-a="claim" data-v="${o.id}">Claim</button></div>`).join('')}`:''}`}
/* ---------- plan (P&D + Bulky) ---------- */
const asg=()=>R().filter(t=>t.state==='assigned');
function planOrder(){const p=ui.plan,ids=asg().map(t=>t.id);if(p.mode==='manual'){const placed=p.seq.filter(id=>ids.includes(id));return placed.concat(ids.filter(id=>!placed.includes(id)))}return ids}
function optimize(firstId,lastId){const d=D(),live=asg().map(t=>({id:t.id,ll:t.ll,window:t.window,x:t.x}));if(live.length<3)return null;let f=firstId,l=lastId;
 if(!f){f=live.slice().sort((a,b)=>C.dist(d.loc,a.ll)-C.dist(d.loc,b.ll))[0].id}
 const o={clock:C.S.clock,serviceMin:K().serviceMin||3,startLL:d.loc};if(l){try{const r=C.nn2opt(live,f,l,o);return r&&r.order?r:null}catch(e){return null}}
 const fl=live.find(x=>x.id===f).ll,cand=live.filter(x=>x.id!==f).sort((a,b)=>C.dist(fl,b.ll)-C.dist(fl,a.ll));const pick=[...cand.slice(0,4),cand[Math.floor(cand.length/2)],cand[cand.length-1]].filter(Boolean);let best=null;
 pick.forEach(c=>{try{const r=C.nn2opt(live,f,c.id,o);if(r&&r.order&&(!best||r.km<best.km))best=r}catch(e){}});return best}
function km(ids){return C.pathKm([D().loc,...ids.map(id=>C.task(id).ll)])}
function applyOrder(ids,how){let ok;C.update(()=>{ok=C.ops.submitRouteEdit(W(),{order:ids,skipped:[],notes:{},pins:{},issues:[],first:ids[0],last:ids[ids.length-1],locked:[]});const d=C.driver(W());if(d.route.edit){d.route.edit.via=how;d.route.edit.applied=true}});ui.plan.saved=how;save();return ok}
function planScreen(){mapScreen(true);const d=D(),p=ui.plan,a=asg(),ids=planOrder(),e=elig();
 $('#dvscr').innerHTML=`<div style="display:flex;gap:6px;justify-content:flex-end"><button class="dv-rb" data-a="fit" aria-label="Fit">${ic('target',17)}</button></div>`;
 const title=p.mode==='manual'?'Tap stops in the order you want':p.mode==='ends'?(p.ends.length===0?'Tap your first stop':p.ends.length===1?'Now tap your last stop':'First and last set'):p.mode==='auto'?'Best route for me':'How do you want to run today?';
 const head=`<div style="display:flex;align-items:flex-end;gap:10px"><div style="flex:1"><div class="dv-eyebrow">Plan · ${a.length} ${esc(K().stopWord||'stops')}</div><div style="font-size:19px;font-weight:620;letter-spacing:-.02em;margin-top:6px">${title}</div></div><span class="mono t3" style="font-size:12px">${a.length?km(ids).toFixed(1)+' km':''}</span></div>`;
 let body='';
 if(p.mode==='manual'){const n=p.seq.filter(id=>a.some(t=>t.id===id)).length;body=`<div class="bar acc"><i style="width:${a.length?n/a.length*100:0}%"></i></div><span class="dv-big" style="font-size:30px">${n}<small> / ${a.length} placed</small></span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-a="pundo"${n?'':' disabled'}>${ic('back',15)}Undo</button><button class="btn" data-a="preset"${n?'':' disabled'}>Reset</button><button class="btn" data-a="pfill">${ic('bolt',15)}Auto-fill the rest</button></div><button class="btn xl pri block" data-a="psave"${n?'':' disabled'}>${ic('check',18)}Save this order</button><button class="btn ghost block" data-a="pmode" data-v="">Back to options</button>`}
 else if(p.mode==='ends'){const f=p.ends[0]&&C.task(p.ends[0]),l=p.ends[1]&&C.task(p.ends[1]);body=`<div class="dv-card" style="padding:6px 12px;gap:0"><div class="dv-row"><span class="dv-n act">A</span><div class="grow">${f?esc(f.name):'<span class="t3">Tap a stop on the map</span>'}</div></div><div class="dv-row"><span class="dv-n" style="background:var(--vio);color:#fff">B</span><div class="grow">${l?esc(l.name):'<span class="t3">'+(f?'Tap a stop on the map':'—')+'</span>'}</div></div></div><div style="display:flex;gap:8px"><button class="btn xl" data-a="pends0"${p.ends.length?'':' disabled'}>Clear</button><button class="btn xl pri" style="flex:1" data-a="pendsgo"${p.ends.length===2?'':' disabled'}>${ic('bolt',18)}Optimize between</button></div><button class="btn ghost block" data-a="pmode" data-v="">Back to options</button>`}
 else if(p.mode==='auto'){const r=optimize();body=r?`<div class="dv-kv" style="grid-template-columns:1fr 1fr"><div><b>${km(ids).toFixed(1)} km</b><span>current order</span></div><div><b class="ok">${r.km.toFixed(1)} km</b><span>best route</span></div></div><button class="btn xl pri block" data-a="pauto">${ic('check',18)}Use best route</button><button class="btn ghost block" data-a="pmode" data-v="">Back to options</button>`:'<div class="t3">Fewer than 3 stops, nothing to optimize.</div><button class="btn ghost block" data-a="pmode" data-v="">Back to options</button>'}
 else body=`<div class="dv-opts">${[['auto','bolt','Best route for me','We optimize the whole route from where you are'],['manual','hand',"I'll set the order",'Tap stops on the map one by one'],['ends','flag','Pick my first and last stop','We optimize everything in between']].map(([k,i,t,s])=>`<button class="dv-opt" data-a="pmode" data-v="${k}"><span class="ic">${ic(i,19)}</span><div><b>${t}</b><span>${s}</span></div></button>`).join('')}</div>`;
 const saved=p.saved&&!p.mode?`<div class="chip ok" style="align-self:flex-start">${ic('check',12)} Order saved · ${esc(p.saved)} · Dispatch sees it</div>`:'';
 const ck=d.route.checkin;const steps=`<div style="display:flex;gap:4px;align-items:center;font-size:11.5px;color:var(--t3);flex-wrap:wrap">${[['Plan',true],['Warehouse',ck==='arrived'],['Load',false],['Start',false]].map(([l,on],i)=>`<span class="chip ${on?'acc':''}">${i+1} ${l}</span>`).join(ic('chev',12))}</div>`;
 const cta=p.mode?'':!e.ok?`<div class="chip bad" style="align-self:flex-start">${ic('lock',12)} ${esc(e.reasons[0]||'Blocked')}</div>`:ck==='arrived'?`<button class="dv-slide" data-a="toload">${ic('scan',20)}Back to load-out scan</button>`:ck==='on_my_way'?`<button class="dv-slide" data-a="arrhub">${ic('warehouse',20)}I'm at the warehouse</button>`:`<button class="dv-slide" data-a="omwhub">${ic('nav',20)}Head to ${esc((hub().name||'warehouse').replace(/^ChainEx /,''))}</button>`;
 $('#dvsb').innerHTML=(p.mode?'':steps)+head+(p.mode?'':banners())+saved+body+cta;drawPlanMap()}
function drawPlanMap(){const d=D(),p=ui.plan,ids=planOrder(),a=asg();
 const placed=p.mode==='manual'?p.seq.filter(id=>a.some(t=>t.id===id)):[],lastId=placed[placed.length-1],from=lastId?C.task(lastId).ll:d.loc;const nxt=p.mode==='manual'?(a.filter(t=>!placed.includes(t.id)).sort((x,y)=>C.dist(from,x.ll)-C.dist(from,y.ll))[0]||{}).id:null;
 const pins=a.map(t=>{let label=String(no(t)),color='var(--acc)',cls='';if(p.mode==='manual'){const i=p.seq.indexOf(t.id);label=i<0?(t.id===nxt?String(placed.length+1):''):String(i+1);color=i<0?(t.id===nxt?'var(--acc)':'#64748B'):'var(--acc)';cls='big '+(i<0?(t.id===nxt?'nxt':'u2'):'on'+(t.id===lastId?' last':''))}else if(p.mode==='ends'){const i=p.ends.indexOf(t.id);label=i===0?'A':i===1?'B':'';color=i===0?'var(--acc)':i===1?'var(--vio)':'#64748B';cls='big '+(i<0?'u2':'on')}return{ll:t.ll,label,color,cls,id:t.id,title:t.name,onClick:x=>act('ppin',x.id)}});
 R().filter(t=>t.state!=='assigned').forEach(t=>pins.push({ll:t.ll,label:'',color:t.state==='completed'?'var(--ok)':'var(--bad)',cls:'u dim'}));
 const line=(p.mode==='manual'?p.seq:ids).map(id=>C.task(id)).filter(Boolean).map(t=>t.ll);
 map.set({pins,lines:line.length?[{coords:[d.loc,...line],color:'#3B82F6',width:3}]:[]},fitKey!=='plan');if(fitKey!=='plan'){fitKey='plan';setTimeout(()=>map.resize(),60)}me(d.loc)}
/* ---------- load-out scan ---------- */
function pk(){return R().filter(t=>t.kind!=='pickup'&&C.OPEN(t)).sort((a,b)=>b.seq-a.seq).flatMap(t=>t.items.map(p=>({p,t})))}
/* ---------- load-out scanning (all lines; P&D and Bulky share every option) ---------- */
let camWant=false,camSess=null,camBusy=false,camErr='',camEl=null;
const ENG={native:'Native scanner (ML Kit)',detector:'Camera · built-in decoder',zxing:'Camera · JS decoder (iPhone Safari)',none:'No camera'};
function stopCam(){const s=camSess;camSess=null;camBusy=false;if(s)try{s.stop()}catch(e){}if(camEl&&camEl.parentNode)camEl.remove()}
function paintTorch(info){const lo=$('#dvlo'),btn=$('#lotorch'),hint=$('#lohint');if(!lo)return;
 const capable=info?!!info.capable:!!(camSess&&camSess.torchCapable);const on=info?!!info.on:!!(camSess&&camSess.torchOn);
 const luma=info&&info.luma!=null?info.luma:(camSess&&camSess.luma);const auto=!!ui.set.autoLight;
 if(btn){if(capable){btn.hidden=false;btn.classList.toggle('on',on);btn.textContent=on?'Light on':'Light';btn.setAttribute('aria-pressed',on?'true':'false')}else btn.hidden=true}
 if(hint)hint.hidden=!(!capable&&auto);lo.classList.toggle('boost',!capable&&auto&&luma!=null&&luma<55)}
function syncCam(){if(window.CXScan){CXScan.settings.sound=!!ui.set.sound;CXScan.settings.haptics=!!ui.set.haptics}
 const slot=$('#dvcamslot');const want=!!slot&&(ui.set.autoScan||camWant)&&!!window.CXScan;
 if(!want){if(camSess||camEl&&camEl.parentNode)stopCam();return}
 if(!camEl){camEl=document.createElement('video');camEl.id='dvcam';camEl.setAttribute('playsinline','');camEl.muted=true;camEl.autoplay=true}
 if(camEl.parentNode!==slot)slot.appendChild(camEl);if(camSess||camBusy){try{paintTorch()}catch(e){}return}camBusy=true;camErr='';
 const cont=!!ui.set.autoScan;CXScan.start(camEl,code=>{if(modal)return;if(!cont)camWant=false;scanCode(code,'camera')},{continuous:cont,sameMs:6000,gapMs:700,autoTorch:()=>!!ui.set.autoLight,onLight:paintTorch}).then(s=>{camSess=s;camBusy=false;const e=$('#dvcameng');if(e)e.innerHTML=`<i></i>${esc(ENG[s.engine]||s.engine)}`;window.__cxCamEngine=s.engine;try{paintTorch({capable:!!s.torchCapable,on:!!s.torchOn,luma:s.luma})}catch(e){}}).catch(err=>{camBusy=false;camErr=err&&err.message||'Camera unavailable';camWant=false;const e=$('#dvcameng');if(e)e.textContent='Camera unavailable · type it or use a handheld scanner';toast('Camera unavailable · type the barcode or use a handheld scanner','alert');try{paintTorch({capable:false,on:false,luma:null})}catch(e){}})}
function selfMode(){if(!window.CXL||!pre())return false;const r=CXL.selfReq(W());return !R().length||(r&&r.status==='building')}
function loCount(){const sm=CXL.summary(W());return `${sm.scanned}/${sm.expected}`}
function loBox(L,opts){const k=ui.last&&ui.last.kind,hit=ui.hit;const n=L?no(L):null;const auto=ui.set.autoScan||camWant;
 const res=L&&k==='ok'?`<div class="lo-w">${esc(word())}</div><div class="lo-n" id="dvstopno">${n}</div><div class="lo-id">${esc(ui.last.pid)}</div>`
  :L&&k==='dup'?`<div class="lo-tag">Already scanned</div><div class="lo-n" id="dvstopno">${n}</div><div class="lo-id">${esc(word())} ${n} · ${esc(ui.last.pid)}</div>`
  :`<div style="color:rgba(255,255,255,.65);font-size:14px">${auto?'Hold a label in front of the camera':'Scan a label'}</div>`;
 return `<div class="dv-lo ${k==='dup'?'dup':L&&k==='ok'?'ok':''}${hit?' hit':''}" id="dvlo"><div id="dvcamslot" style="position:absolute;inset:0"></div>${auto?`<span class="lo-e" id="dvcameng"><i></i>${esc(ENG[(window.CXScan&&CXScan.engine())||'none'])}</span><button type="button" class="lo-torch" id="lotorch" data-a="torch" hidden>Light</button><div class="lo-hint" id="lohint" hidden>Flashlight isn't available on this phone. The viewfinder is brightened when it's dark.</div>`:''}<span class="lo-c" id="dvlocount">${opts&&opts.count||loCount()}</span><div class="lo-res">${res}</div></div>`}
function scanRow(self){return `<div style="display:flex;gap:8px">${ui.set.autoScan?`<button class="btn xl" style="flex:1" data-a="tab" data-v="me">${ic('scan',18)}Auto-scan on</button>`:`<button class="btn xl" style="flex:1" data-a="lcam">${ic('camera',18)}${camWant?'Stop camera':'Camera'}</button>`}${self?`<button class="btn xl" style="flex:1" data-a="selfsample">${ic('plus',18)}Sample label</button>`:`<button class="btn xl pri" style="flex:1" data-a="lscan">${ic('scan',19)}Scan next</button>`}</div>
 <div style="display:flex;gap:8px"><input class="in" id="dvlbc" placeholder="Type or wedge-scan a barcode" autocomplete="off" autocapitalize="characters" style="flex:1;min-width:0"><button class="btn" data-a="lscan" data-v="typed">Enter</button>${!self&&DC().groupBy?`<button class="btn" data-a="lgroup">${esc(DC().groupScan||'Scan group')}</button>`:''}</div>`}
function loadScreen(){mapScreen(false);const all=pk(),left=all.filter(x=>!x.p.loaded&&!x.p.loadFlag),fl=all.filter(x=>x.p.loadFlag&&!x.p.loaded),done=all.filter(x=>x.p.loaded).length;const L=ui.last&&C.task(ui.last.tid);const pct=all.length?Math.round(done/all.length*100):100;const conf=CXL.confirmed(W()),cs=CXL.canStart(W());
 $('#dvscr').innerHTML=`<div style="display:flex;align-items:center;gap:8px">${special()?`<button class="btn sm ghost" data-a="planopen">${ic('back',15)}Plan</button>`:`<button class="btn sm ghost" data-a="sod">${ic('back',15)}Back</button>`}<div style="flex:1"><div class="dv-eyebrow">Load-out · ${esc((hub().name||'').replace(/^ChainEx /,''))}</div><div style="font-size:19px;font-weight:620;letter-spacing:-.02em;margin-top:6px">Scan every ${esc(units().replace(/s$/,''))}</div></div></div>
 ${banners()}${loBox(L)}${scanRow(false)}
 <div><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px"><span><b class="mono">${done}</b> of ${all.length} ${esc(units())}${fl.length?` · <span class="warn">${fl.length} flagged</span>`:''}</span><span class="mono t3">${pct}%</span></div><div class="bar ok"><i style="width:${pct}%"></i></div></div>
 ${conf?(cs.ok?`<button class="dv-slide" data-a="start" id="dvstart">${ic('nav',20)}${D().line==='shuttle'?'Start shift':'Start route'}</button>`:`<div class="dv-lockc">${ic('clock',18)}<span>${esc(cs.why)}. You can keep loading.</span></div><button class="dv-slide off" data-a="start" id="dvstart">${ic('lock',19)} Start route</button>`)
   :`<button class="dv-slide${left.length?' off':''}" data-a="lconfirm" id="dvdone">${ic('check',20)}Done scanning${left.length?` · ${left.length} left`:''}</button>`}
 ${left.length?`<div class="dv-card" style="padding:4px 14px"><div class="dv-eyebrow" style="padding-top:10px">Still to scan · ${left.length}</div>${left.slice(0,60).map(x=>`<div class="dv-pk"><span class="dv-n">${no(x.t)}</span><div class="grow"><b class="mono" style="font-size:12px">${esc(x.p.id)}</b><small>${esc(x.t.name)}</small></div><button class="btn sm ghost" data-a="lflag" data-v="missing|${esc(x.p.id)}">Missing</button><button class="btn sm ghost" data-a="lflag" data-v="damaged|${esc(x.p.id)}">Damaged</button></div>`).join('')}${left.length>60?`<div class="t3" style="padding:10px 0;font-size:12px">+${left.length-60} more</div>`:''}</div>`:''}
 ${fl.length?`<div class="dv-card" style="padding:4px 14px"><div class="dv-eyebrow" style="padding-top:10px">Flagged · sent to Dispatch</div>${fl.map(x=>`<div class="dv-pk"><span class="dv-n fail">${no(x.t)}</span><div class="grow"><b class="mono" style="font-size:12px">${esc(x.p.id)}</b><small>${x.p.loadFlag==='missing'?'Missing':'Damaged'} · ${esc(x.t.name)}</small></div><button class="btn sm" data-a="lunflag" data-v="${esc(x.p.id)}">Found it</button></div>`).join('')}</div>`:''}`;ui.hit=false}
const REASONS_SHORT=['Not at the station','Damaged','Mis-sorted','Dispatch said go','Other'];
function keepConfirm(){const n=$('#dvlnote'),v=n&&n.value;render();const m=$('#dvlnote');if(m&&v)m.value=v}
function confirmScreen(){mapScreen(false);const sm=CXL.summary(W()),miss=sm.missing,short=miss.length,deg=Math.round(sm.pct*3.6);const r=CXL.selfReq(W());
 $('#dvscr').innerHTML=`<div style="display:flex;align-items:center;gap:8px"><button class="btn sm ghost" data-a="lback">${ic('back',15)}Scan</button><div style="flex:1"><div class="dv-eyebrow">Load-out check · ${esc(D().route.id)}</div><div style="font-size:19px;font-weight:620;letter-spacing:-.02em;margin-top:6px" id="dvlctitle">${short?`${short} not scanned`:'Everything is scanned'}</div></div></div>
 <div class="dv-card" style="align-items:center"><div class="dv-ring" id="dvring" style="background:conic-gradient(${short?'var(--warn)':'var(--ok)'} ${deg}deg,var(--s3) 0)"><div style="width:122px;height:122px;border-radius:50%;background:var(--s1);display:grid;place-items:center"><div><b id="dvpct">${sm.pct}%</b><span>scanned</span></div></div></div>
  <div class="dv-kv" style="width:100%"><div><b id="dvlcscanned">${sm.scanned}</b><span>scanned</span></div><div><b class="${short?'bad':''}" id="dvlcmiss">${short}</b><span>missing</span></div><div><b>${sm.expected}</b><span>expected</span></div></div></div>
 ${r&&r.status==='pending'?`<div class="dv-lockc">${ic('clock',18)}<span>Your route is waiting for dispatch approval. Confirm the load now; you can start once it's approved.</span></div>`:''}
 ${short?`<div class="dv-card" style="padding:4px 14px" id="dvmisslist"><div class="dv-eyebrow" style="padding-top:10px;color:var(--bad)">Missing · ${short}</div>${miss.slice(0,80).map(m=>`<div class="dv-pk"><span class="dv-n fail">${m.stop}</span><div class="grow"><b class="mono" style="font-size:12px">${esc(m.pid)}</b><small>${esc(m.name)}${m.flag?' · flagged '+esc(m.flag):''}</small></div></div>`).join('')}${short>80?`<div class="t3" style="padding:10px 0;font-size:12px">+${short-80} more</div>`:''}</div>
  <div class="dv-card"><div class="dv-eyebrow">Leaving short? Tell Dispatch why</div><div class="dv-chips">${REASONS_SHORT.map(x=>`<button class="${ui.lreason===x?'on':''}" data-a="lreason" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><input class="in" id="dvlnote" placeholder="Note (optional)" autocomplete="off"></div>
  <button class="btn xl pri block" data-a="lback">${ic('scan',18)}Keep scanning</button>
  <button class="dv-slide" style="background:var(--bad);box-shadow:none" data-a="lshort" id="dvlshort">${ic('alert',19)}Leave short · ${short} missing</button>
  <div class="t3" style="text-align:center;font-size:12px">Dispatch${CXL.dspOf(D())?' and your DSP are':' is'} alerted right away with the missing list.</div>`
 :`<button class="dv-slide" data-a="lok" id="dvlok">${ic('check',20)}Confirm load · ${sm.expected} of ${sm.expected}</button>`}`}
function noRouteCard(){const d=D(),pm=CXL.perm(W(),'selfBuild');
 return `<div class="dv-card" id="dvnoroute"><div class="dv-eyebrow">Today</div><div class="dv-h1" style="font-size:24px">No route assigned</div><div class="t2" style="font-size:13px">${d.duty?'You are on duty. Scan packages and the app builds your route from them.':'You can still go on duty, then scan packages to build your own route.'}</div>
 ${pm.mode==='off'?`<div class="dv-lockc" id="dvselflock">${ic('lock',18)}<span><b>Build route by scanning</b> is off for you. Ask your dispatcher${CXL.dspOf(d)?' or your DSP':''} to turn it on.</span></div><button class="btn block locked" data-a="waskacc" data-v="selfBuild">${ic('lock',15)}Ask your dispatcher</button>`
  :d.duty?`<button class="btn xl pri block" data-a="selfgo" id="dvselfgo">${ic('scan',19)}Scan packages anyway</button><div class="t3" style="font-size:12px">${pm.mode==='approval'?'Dispatch approves your route before you leave.':'Allowed · your route goes live as you scan.'}</div>`:''}</div>`}
function selfScreen(){mapScreen(false);const d=D(),r=CXL.selfReq(W());if(!(ui.self||(r&&r.status==='building'))||CXL.perm(W(),'selfBuild').mode==='off'){$('#dvscr').innerHTML=banners()+noRouteCard();return}
 const L=ui.last&&C.task(ui.last.tid);const a=R();const pm=CXL.perm(W(),'selfBuild');
 $('#dvscr').innerHTML=`<div><div class="dv-eyebrow">No route assigned · ${esc((hub().name||'').replace(/^ChainEx /,''))}</div><div style="font-size:19px;font-weight:620;letter-spacing:-.02em;margin-top:6px">Scan packages to build your route</div><div style="margin-top:6px"><span class="chip ${pm.mode==='auto'?'ok':'warn'}">${pm.mode==='auto'?'Allowed':'Needs dispatch approval'}</span></div></div>
 ${banners()}${loBox(L&&L.workerId===W()?L:null,{count:`${a.length} ${a.length===1?'stop':'stops'}`})}${scanRow(true)}
 <button class="dv-slide${a.length?'':' off'}" data-a="selfbuild" id="dvselfbuild"${a.length?'':' disabled'}>${ic('route',20)}Build my route · ${a.length} ${a.length===1?'stop':'stops'}</button>
 ${a.length?`<div class="dv-card" style="padding:4px 14px"><div class="dv-eyebrow" style="padding-top:10px">Scanned · ${a.length}</div>${a.slice().reverse().map(t=>`<div class="dv-pk"><span class="dv-n">${no(t)}</span><div class="grow"><b class="mono" style="font-size:12px">${esc((t.items[0]||{}).id||t.id)}</b><small>${esc(t.name)}</small></div></div>`).join('')}</div>`:''}`;ui.hit=false}
function scanSettings(){const d=D(),w=W();const p1=CXL.perm(w,'selfBuild'),p2=CXL.perm(w,'takeOwnership');const PM={off:'Off · ask your dispatcher',approval:'On · dispatch approves',auto:'On'};
 return `<div class="dv-card" style="padding:4px 14px" id="dvscanset"><div class="dv-eyebrow" style="padding-top:10px">Load-out &amp; scanning · ${esc(LN[d.line])}</div>
 <div class="dv-row"><div class="grow">Auto-scan<div class="sub">Camera keeps scanning · move package to package without tapping</div></div>${sw(ui.set.autoScan,'set','autoScan')}</div>
 <div class="dv-row"><div class="grow">Beep on scan<div class="sub">Different sound for a wrong label</div></div>${sw(ui.set.sound,'set','sound')}</div>
 <div class="dv-row"><div class="grow">Vibrate on scan<div class="sub">Long buzz for a wrong label</div></div>${sw(ui.set.haptics,'set','haptics')}</div>
 <div class="dv-row"><div class="grow">Auto flashlight<div class="sub">Turns the torch on in the dark while you scan. On phones without a torch, the viewfinder is brightened instead.</div></div>${sw(ui.set.autoLight,'set','autoLight')}</div>
 <div class="dv-row"><div class="grow">Confirm the load before leaving<div class="sub">Shows % scanned and anything missing</div></div><span class="chip ok">Always on</span></div>
 <div class="dv-row"><div class="grow">Build route by scanning<div class="sub">When no route is assigned · set by ${esc(p1.from)}</div></div><span class="chip ${p1.mode==='off'?'':'ok'}">${p1.mode==='off'?ic('lock',11)+' ':''}${PM[p1.mode]}</span></div>
 <div class="dv-row"><div class="grow">Take ownership<div class="sub">Add a package from another route · set by ${esc(p2.from)}</div></div><span class="chip ${p2.mode==='off'?'':'ok'}">${p2.mode==='off'?ic('lock',11)+' ':''}${PM[p2.mode]}</span></div>
 <div class="dv-row cx-pilot"><div class="grow">Scanner<div class="sub">${esc(ENG[(window.CXScan&&CXScan.engine())||'none'])}</div></div></div></div>`}
function fb(k){if(window.CXScan)CXScan.feedback(k);else if(k!=='ok')try{ui.set.haptics&&navigator.vibrate&&navigator.vibrate([200,80,200])}catch(e){}else haptic()}
function openWrong(cls){fb('wrong');modal={type:'wrong',cls};cap={photos:{},sig:false};drawModal();$('#dvmodal').classList.add('on');window.__cxLastWrong=cls}
function scanCode(code,src,addr){const w=W();if(!w||!window.CXL)return;
 if(selfMode()){const r=CXL.selfScan(w,code,addr);
  if(r.status==='added'){ui.last={pid:r.cls.pkg||r.cls.code,tid:r.task||r.cls.task,kind:'ok'};ui.hit=true;fb('ok');save();render();return r}
  if(r.status==='dup'){ui.last={pid:r.cls.pkg,tid:r.cls.task,kind:'dup'};fb('dup');save();render();return r}
  if(r.status==='need_address'){fb('dup');modal={type:'addr',code:r.cls.code,cls:r.cls};cap={photos:{},sig:false};drawModal();$('#dvmodal').classList.add('on');return r}
  if(r.status==='locked'){toast('Ask your dispatcher to turn on Build route by scanning','lock');return r}
  openWrong(r.cls);return r}
 const cls=CXL.classify(w,code);
 if(cls.kind==='ok'){C.update(()=>{const T=C.task(cls.task),q=T&&T.items.find(p=>p.id===cls.pkg);if(q&&q.loadFlag)delete q.loadFlag;C.ops.loadScan(w,cls.pkg)});ui.last={pid:cls.pkg,tid:cls.task,kind:'ok'};ui.hit=true;fb('ok');save();render();return cls}
 if(cls.kind==='dup'){ui.last={pid:cls.pkg,tid:cls.task,kind:'dup'};fb('dup');save();render();return cls}
 openWrong(cls);return cls}
/* ---------- start of day (White glove / LTL / Shuttle: V02 flow) ---------- */
function startOfDay(){mapScreen(false);const d=D(),ck=d.route.checkin,e=elig(),skip=DC().skipLoad,all=pk(),left=all.filter(x=>!x.p.loaded&&!x.p.loadFlag);
 const row=(n,t,s,done,btn)=>`<div class="dv-row"><span class="dv-n ${done?'done':''}">${done?ic('check',14):n}</span><div class="grow"><div style="font-weight:550">${t}</div><div class="sub">${s}</div></div>${btn||''}</div>`;
 const ready=ck==='arrived'&&(skip||!left.length);
 $('#dvscr').innerHTML=`<div><div class="dv-eyebrow">${esc(LN[d.line])} · ${esc(d.route.id)}</div><h1 class="dv-h1" style="margin-top:8px">Start of day</h1></div>${banners()}
 <div class="dv-card" style="padding:4px 14px">${row(1,'On my way to '+esc(hub().name||'hub'),'Lets the dock stage your load',ck!=='none',ck==='none'?`<button class="btn sm pri" data-a="omwhub"${e.ok?'':' disabled'}>Go</button>`:'')}
 ${row(2,esc(DC().checkinTitle||'Check in'),esc(hub().address||''),ck==='arrived',ck==='on_my_way'?`<button class="btn sm pri" data-a="arrhub">Check in</button>`:'')}
 ${skip?'':row(3,'Load-out scan',`${all.length-left.length} of ${all.length} ${esc(units())}`,!left.length&&all.length,ck==='arrived'&&left.length?`<button class="btn sm pri" data-a="toload">Scan</button>`:'')}
 ${row(skip?3:4,d.line==='shuttle'?'Start shift':'Start route',`${R().length} ${esc(K().stopWord||'stops')}`,false,'')}</div>
 <button class="dv-slide${ready?'':' off'}" data-a="${ck==='arrived'&&!skip&&left.length?'toload':'start'}">${ic('nav',20)}${d.line==='shuttle'?'Start shift':'Start route'}</button>
 <div class="dv-card" style="padding:4px 14px"><div class="dv-eyebrow" style="padding-top:10px">Today's ${esc(K().stopWord||'stops')}</div>${R().map(stopRow).join('')}</div>`}
/* ---------- drive: one screen (P&D + Bulky) ---------- */
function driveScreen(){mapScreen(true);const t=cur();if(!t)return finishScreen();const s=nextStep(t),et=(C.etas(W())||{})[t.id];
 $('#dvscr').innerHTML=`<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:22px"><button class="dv-rb" data-a="fit" aria-label="Overview">${ic('target',17)}</button><button class="dv-rb" data-a="recenter" aria-label="Follow">${ic('nav',17)}</button></div>`;
 const nav=!!navTimer,arrived=!!t.stepData.arrive;
 $('#dvsb').innerHTML=`<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0"><div class="dv-eyebrow">${esc(word())}</div><div class="dv-big" style="font-size:38px">${no(t)}<small> of ${tot()}</small></div></div><div style="text-align:right"><div class="mono" id="dvdist" style="font-size:20px;font-weight:600">${leg&&leg.total?CXNav.fmtD(Math.max(0,leg.total-(leg.cum[leg.i]||0))):'—'}</div><div class="t3" style="font-size:11.5px">${et?'ETA '+fmt(et.eta):''}${et&&et.risk?' · <span class="warn">late</span>':''}</div></div></div>
 <div><b style="font-size:16px">${esc(t.name)}</b><div class="t2" style="font-size:13px">${esc(t.address)}</div></div>
 ${['pd','bulky','wg'].includes(D().line)?instrCard(t,true):''}
 <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${fmt(t.window[0])}–${fmt(t.window[1])}</span><span class="chip">${t.items.length} ${esc(units())}</span>${(t.tags||[]).slice(0,3).map(x=>`<span class="chip">${esc(x.toLowerCase())}</span>`).join('')}${t.driverNote?`<span class="chip warn">${esc(t.driverNote)}</span>`:''}</div>
 ${arrived?`<button class="btn xl pri block" data-a="arrive">${ic('scan',19)}${esc(s?s.label:'Continue')}</button>`:nav?`<div style="display:flex;gap:8px"><button class="btn xl" style="flex:1" data-a="navpause">Pause</button><button class="btn xl pri" style="flex:1.4" data-a="arrive">${ic('pin',18)}I've arrived</button></div>`:`<div style="display:flex;gap:8px"><button class="btn xl pri" style="flex:1.4" data-a="navgo">${ic('nav',18)}Start navigation</button><button class="btn xl" style="flex:1" data-a="arrive">Arrived</button></div>`}
 <div style="display:flex;gap:6px"><button class="btn ghost" style="flex:1" data-a="cant" data-v="${t.id}">${esc(K().exceptionLabel||"Can't deliver")}</button><button class="btn ghost" style="flex:1" data-a="stop" data-v="${t.id}">Details</button><button class="btn ghost" style="flex:1" data-a="call">${ic('phone',15)}Call</button></div>
 ${ui.sheet==='full'?`<div class="dv-eyebrow">Up next</div><div>${openT().slice(1,15).map(stopRow).join('')}</div>`:''}`;
 drawDriveMap(t);if(!leg||leg.tid!==t.id)planLeg(t)}
function drawDriveMap(t){const d=D(),pins=[];R().forEach(x=>{if(x.state==='completed'||x.state==='failed')pins.push({ll:x.ll,color:x.state==='completed'?'var(--ok)':'var(--bad)',cls:'u dim',title:x.name});else pins.push({ll:x.ll,label:String(no(x)),color:x.id===t.id?'var(--acc)':'#4E6280',cls:x.id===t.id?'nx':'',id:x.id,title:x.name,onClick:p=>act('stop',p.id)})});
 const lines=[{coords:openT().map(x=>x.ll),color:'#8495AD',width:1.5,opacity:.5}];lines.push(leg&&leg.path?{coords:leg.path,color:'#3B82F6',width:5}:{coords:[d.loc,t.ll],color:'#3B82F6',width:4});
 const k='drive:'+t.id;map.set({pins,lines},false);if(fitKey!==k){fitKey=k;setTimeout(()=>{map.resize();map.fit([d.loc,t.ll])},60)}me(leg&&leg.pos||d.loc)}
async function planLeg(t){const d=D(),L={tid:t.id,i:0};leg=L;let rt=null;try{rt=window.CXNav?await CXNav.route(d.loc,t.ll):null}catch(e){}if(leg!==L)return;if(!rt)rt={coords:[d.loc,t.ll],steps:[{text:'Head to the stop',arrow:'↑',loc:d.loc},{text:'Arrive at the stop',arrow:'⚑',loc:t.ll}]};
 L.rt=rt;L.path=window.CXNav?CXNav.densify(rt.coords):rt.coords;L.cum=[0];for(let i=1;i<L.path.length;i++)L.cum.push(L.cum[i-1]+(window.CXNav?CXNav.hav(L.path[i-1],L.path[i]):C.dist(L.path[i-1],L.path[i])*1000));L.total=L.cum[L.cum.length-1];L.pos=L.path[0];
 L.si=(rt.steps||[]).map(s=>{let b=0,bd=1e12;L.path.forEach((p,i)=>{const dd=Math.abs(p[0]-s.loc[0])+Math.abs(p[1]-s.loc[1]);if(dd<bd){bd=dd;b=i}});return b});
 if(ui.tab==='route'&&special()&&stage()==='on_road'&&cur()&&cur().id===t.id){drawDriveMap(t);paintTurn();const el=$('#dvdist');if(el)el.textContent=CXNav.fmtD(L.total);if(ui.autoGo){ui.autoGo=false;navGo()}}}
function paintTurn(){const el=$('#dvturn');if(!el)return;const t=cur();if(!leg||!leg.rt){el.innerHTML=`<span class="ar">↑</span><div style="min-width:0;flex:1"><b>${t?esc(t.address.split(',')[0]):'Route'}</b><span>Finding the best way…</span></div>`;return}
 let k=leg.si.findIndex(ix=>ix>leg.i);if(k<0)k=leg.rt.steps.length-1;const st=leg.rt.steps[k]||{},toMan=Math.max(0,(leg.cum[leg.si[k]]||0)-(leg.cum[leg.i]||0));
 el.innerHTML=`<span class="ar">${esc(st.arrow||'↑')}</span><div style="min-width:0;flex:1"><b>${esc(st.text||'Continue')}</b><span>${window.CXNav?CXNav.fmtD(toMan):''} · ${esc(t?t.address.split(',')[0]:'')}</span></div>`}
function navGo(){const t=cur();if(!t)return;const s=nextStep(t);if(s&&s.kind==='confirm'&&s.effect==='active')C.update(()=>{C.ops.completeStep(t.id,s,{},D().name);C.ops.tick(1)});
 if(!leg||!leg.path||leg.tid!==t.id){ui.autoGo=true;if(!leg||leg.tid!==t.id)planLeg(t);return}stopNav();const inc=Math.max(1,Math.floor(leg.path.length/45));
 navTimer=setInterval(()=>{if(!leg||!leg.path){stopNav();return}leg.i=Math.min(leg.path.length-1,leg.i+inc);leg.pos=leg.path[leg.i];me(leg.pos);paintTurn();if(map.m&&map.ready)map.m.easeTo({center:leg.pos,duration:110,zoom:Math.max(map.m.getZoom(),14)});
  const el=$('#dvdist');if(el)el.textContent=CXNav.fmtD(Math.max(0,leg.total-leg.cum[leg.i]));if(leg.i>=leg.path.length-1){stopNav();arrive()}},120);render()}
function stopNav(){if(navTimer){clearInterval(navTimer);navTimer=null}}
function arrive(){const t=cur();if(!t)return;stopNav();C.update(()=>{const d=C.driver(W());d.loc=t.ll.slice();for(let s=nextStep(C.task(t.id));s&&s.kind==='confirm';s=nextStep(C.task(t.id))){C.ops.completeStep(t.id,s,{},d.name);C.ops.tick(1)}});haptic();runNext(t.id)}
function runNext(id){const t=C.task(id);if(!t)return;if(!C.OPEN(t)||!nextStep(t)){afterStop(id);return}const s=nextStep(t);
 if(s.kind==='confirm'){C.update(()=>{C.ops.completeStep(id,s,{},D().name);C.ops.tick(s.effect==='active'?3:2)});toast(s.effect==='active'?`Dispatch notified · ${s.label}`:`✓ ${s.label}`,'check');if(special()&&stage()==='on_road')return runNext(id);render();return}
 openModal('step',id)}
function afterStop(id,failed){const t=C.task(id);closeModal();leg=null;fitKey='';if(special()&&stage()==='on_road'){const n=cur();toast(failed?(C.OPEN(t)?'Logged · moved to the end of your route':'Logged · Dispatch notified'):`${K().completeText?K().completeText(t):'Done'} ✓${n?` · next: ${word()} ${no(n)}`:''}`,failed?'alert':'check');if(n&&ui.autoNav)ui.autoGo=true}else toast(t.state==='completed'?`${K().completeText?K().completeText(t):'Completed'} ✓ · synced to Dispatch`:'Logged · Dispatch notified',t.state==='completed'?'check':'alert');render()}
function finishScreen(){mapScreen(true);const a=R(),done=a.filter(t=>t.state==='completed').length,fail=a.filter(t=>t.state==='failed').length;$('#dvscr').innerHTML='';
 $('#dvsb').innerHTML=`<div class="dv-eyebrow">All ${esc(K().stopWord||'stops')} attempted</div><div class="dv-big" style="font-size:38px">${done}<small> delivered${fail?` · ${fail} not`:''}</small></div><button class="dv-slide" data-a="returnhub">${ic('warehouse',20)}${esc(DC().returnTitle||'Return to hub')}</button>`;
 map.set({pins:a.map(t=>({ll:t.ll,color:t.state==='completed'?'var(--ok)':'var(--bad)',cls:'u'})),lines:[]},fitKey!=='fin');fitKey='fin';me(D().loc)}
/* ---------- route list (White glove / LTL / Shuttle on the road) ---------- */
function stopRow(t){const c=t.state==='completed'?'done':t.state==='failed'?'fail':t.state==='active'?'act':'';return `<div class="dv-row" data-a="stop" data-v="${t.id}" style="cursor:pointer"><span class="dv-n ${c}">${no(t)}</span><div class="grow"><div style="font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${D().line==='shuttle'&&t.x&&t.x.dep?fmt(t.x.dep)+' · ':''}${esc(t.name)}</div><div class="sub">${esc(C.stateLabel(t.state,D().line))} · ${fmt(t.window[0])}–${fmt(t.window[1])}</div></div>${ic('chev',16)}</div>`}
function routeList(){mapScreen(true);const t=cur(),d=D();$('#dvscr').innerHTML=`<div style="display:flex;gap:6px;justify-content:flex-end"><button class="dv-rb" data-a="fit" aria-label="Fit">${ic('target',17)}</button></div>`;
 const s=t&&nextStep(t);const lanes=d.line==='shuttle'?C.S.lanes.filter(l=>l.standing&&l.standing.driver===d.id):[];
 $('#dvsb').innerHTML=(t?`<div class="dv-eyebrow">Current ${esc(word().toLowerCase())} · ${no(t)} of ${tot()}</div><div><b style="font-size:16px">${d.line==='shuttle'&&t.x&&t.x.dep?fmt(t.x.dep)+' · ':''}${esc(t.name)}</b><div class="t2" style="font-size:13px">${esc(t.address)}</div></div>
 <div style="display:flex;gap:4px;flex-wrap:wrap">${stepsOf(t).map(x=>`<span class="chip ${t.stepData[x.id]?'ok':s&&x.id===s.id?'acc':''}">${t.stepData[x.id]?ic('check',11):''}${esc(x.label)}</span>`).join('')}</div>
 <button class="btn xl pri block" data-a="step" data-v="${t.id}">${esc(s?s.label:'Continue')}</button><div style="display:flex;gap:6px"><button class="btn ghost" style="flex:1" data-a="cant" data-v="${t.id}">${esc(K().exceptionLabel||"Can't deliver")}</button><button class="btn ghost" style="flex:1" data-a="stop" data-v="${t.id}">Details</button><button class="btn ghost" style="flex:1" data-a="call">${ic('phone',15)}Call</button></div>`:`<div class="dv-eyebrow">All done</div><button class="dv-slide" data-a="returnhub">${ic('warehouse',20)}${esc(DC().returnTitle||'Return to hub')}</button>`)
 +(lanes.length?`<div class="dv-card" style="padding:10px 12px"><div class="dv-eyebrow">Repeat a trip</div>${lanes.map(l=>`<div class="dv-row" style="padding:6px 0"><div class="grow">${esc(l.name)}</div><button class="btn sm" data-a="repeat" data-v="${l.id}">Add trip</button></div>`).join('')}</div>`:'')
 +`<div class="dv-eyebrow" style="margin-top:4px">${esc(DC().manifestLabel?DC().manifestLabel.replace(/^\W+/,''):'Manifest')}</div><div>${R().map(stopRow).join('')}</div>`;
 const pins=R().map(x=>({ll:x.ll,label:String(no(x)),color:x.state==='completed'?'var(--ok)':x.state==='failed'?'var(--bad)':t&&x.id===t.id?'var(--acc)':'#4E6280',cls:t&&x.id===t.id?'nx':'',id:x.id,onClick:p=>act('stop',p.id)}));
 map.set({pins,lines:[{coords:[d.loc,...openT().map(x=>x.ll)],color:'#3B82F6',width:3}]},fitKey!=='list');if(fitKey!=='list'){fitKey='list';setTimeout(()=>map.resize(),60)}me(d.loc)}
/* ---------- return + close ---------- */
function retItems(){return R().filter(t=>t.state!=='completed'&&t.kind!=='pickup').flatMap(t=>t.items.map(p=>({p,t})))}
/* close-out: every leftover is scanned (or marked missing) and gets an outcome; non-P&D lines also need a photo or note */
const CO=[['return','Return to warehouse','warehouse'],['retry','Re-attempt tomorrow','clock'],['damaged','Damaged','box'],['refused','Refused','x'],['handoff','Hand to another driver','swap'],['missing','Lost / missing','alert']];
const COL=Object.fromEntries(CO.map(x=>[x[0],x[1]]));
const co=p=>p.co||{},needEv=()=>D().line!=='pd',coVeh=()=>D().route.coVeh||{};
const coDone=x=>{const c=co(x.p);return !!c.out&&(c.out==='missing'||!!c.scan)&&(c.out!=='handoff'||!!c.to)};
const coEv=x=>{const c=co(x.p);return !!(c.photo||(c.note||'').trim())};
function coEvOk(all){if(!needEv()||!all.length)return true;const v=coVeh();return !!(v.photo||(v.note||'').trim())||all.every(coEv)}
function coPic(label){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="180"><rect width="240" height="180" fill="#2A3B55"/><text x="120" y="86" text-anchor="middle" fill="#fff" font-size="13" font-family="sans-serif">${esc(label)}</text><text x="120" y="108" text-anchor="middle" fill="#9FB3CF" font-size="11" font-family="monospace">${esc(fmt(C.S.clock))} · close-out</text></svg>`)}
function coSet(list,patch){C.update(()=>{[].concat(list).forEach(([tid,pid])=>{const T=C.task(tid),q=T&&T.items.find(p=>p.id===pid);if(q)q.co=Object.assign({},q.co||{},patch)})})}
function coSum(all){const a=R(),by=k=>all.filter(x=>co(x.p).out===k).length;return{delivered:a.filter(t=>t.state==='completed').length,failed:a.filter(t=>t.state==='failed'||C.OPEN(t)).length,returned:by('return')+by('retry')+by('damaged')+by('refused'),missing:by('missing'),handed:by('handoff'),left:all.length}}
function coBtn(all){const done=all.filter(coDone).length,pend=(window.CXI&&CXI.pendingCount&&CXI.pendingCount())||0,ready=done===all.length&&coEvOk(all)&&pend===0;return `<button class="dv-slide${ready?'':' off'}" data-a="closeroute" id="dvclose">${ready?ic('check',20)+(D().line==='shuttle'?'Close out shift':'Close route'):ic('lock',19)+' '+(pend?`Sync ${pend} pending scan${pend>1?'s':''} to close`:done<all.length?`Resolve ${all.length-done} more to close`:'Add a photo or note to close')}</button>`}
function coRefresh(){const b=$('#dvclose');if(b)b.outerHTML=coBtn(retItems())}
function retScreen(){mapScreen(false);const all=retItems(),done=all.filter(coDone).length,s=coSum(all),v=coVeh(),open=ui.coOpen;
 const scanned=all.filter(x=>co(x.p).scan&&!co(x.p).out),d=D(),others=C.S.drivers.filter(o=>!o.dspSlot&&o.id!==d.id&&o.line===d.line);
 const row=x=>{const c=co(x.p),ok=coDone(x),k=x.t.id+'|'+x.p.id,exp=open===x.p.id||(c.scan&&!c.out)||(c.out==='handoff'&&!c.to)||!c.out;
  return `<div class="dv-co${ok?' co-ok':''}" id="co-${esc(x.p.id)}"><div class="dv-coh" data-a="coopen" data-v="${esc(x.p.id)}"><span class="dv-n ${ok&&c.out!=='missing'?'done':c.out==='missing'?'fail':''}">${no(x.t)}</span><div class="grow"><b class="mono" style="font-size:12.5px">${esc(x.p.id)}</b><small>${esc(x.t.name)} · ${esc(x.t.failReason||(C.OPEN(x.t)?'not attempted':'not delivered'))}</small></div><span class="chip ${ok?(c.out==='missing'?'bad':'ok'):c.scan?'acc':''}">${c.out?esc(COL[c.out]):c.scan?'Scanned':'Not scanned'}</span></div>
  ${exp?`<div class="dv-cob">${!c.scan&&c.out!=='missing'?`<div style="display:flex;gap:8px"><button class="btn pri" style="flex:1" data-a="coscan" data-v="${k}">${ic('scan',15)}Scan</button><button class="btn" data-a="coout" data-v="${k}|missing">${ic('alert',15)}Missing</button></div>`:''}
  ${c.scan?`<div class="dv-coopts">${CO.filter(o=>o[0]!=='missing').map(([o,l,i])=>`<button class="${c.out===o?'on':''}" data-a="coout" data-v="${k}|${o}">${ic(i,15)}<span>${l}</span></button>`).join('')}</div>`:''}
  ${c.out==='handoff'?`<select class="in" data-cohand="${k}" style="height:44px"><option value="">Hand to which driver?</option>${others.map(o=>`<option value="${esc(o.name)}"${c.to===o.name?' selected':''}>${esc(o.name)} · ${esc(o.route.id)}</option>`).join('')}</select>`:''}
  ${c.out==='missing'?`<div class="t3" style="font-size:12px">Dispatch gets a ticket when you close the route.</div><button class="btn sm ghost" style="align-self:flex-start" data-a="coundo" data-v="${k}">Found it · scan instead</button>`:''}
  ${c.scan||c.out==='missing'?`<div style="display:flex;gap:8px;align-items:center"><button class="btn sm${c.photo?' ok':''}" data-a="cophoto" data-v="${k}">${ic(c.photo?'check':'camera',14)}${c.photo?'Photo added':'Photo'}</button><input class="in" data-cono="${k}" placeholder="${needEv()?'Note (or add a photo)':'Note (optional)'}" value="${esc(c.note||'')}" style="flex:1;height:40px"></div>`:''}</div>`:''}</div>`};
 $('#dvscr').innerHTML=`<div><div class="dv-eyebrow">End of route · ${esc(d.route.id)}</div><h1 class="dv-h1" style="margin-top:8px">Close out</h1><div class="t2" style="font-size:13px;margin-top:6px">${all.length?`Scan everything still in the vehicle and choose what happens to each one.${needEv()?' Add a photo or a note of what is left.':''}`:'Nothing is left in the vehicle.'}</div></div>
 ${all.length?`<div class="dv-scan"><i></i><div class="res"><div class="dv-big" id="dvcodone">${done}<small style="color:rgba(255,255,255,.5)"> / ${all.length}</small></div><div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:6px">resolved</div></div></div>
 <button class="btn xl pri block" data-a="coscan"${all.some(x=>!co(x.p).scan&&co(x.p).out!=='missing')?'':' disabled'}>${ic('scan',19)}Scan next</button>
 <div style="display:flex;gap:8px"><input class="in" id="dvcobc" placeholder="Type a barcode" autocomplete="off" style="flex:1"><button class="btn" data-a="coscan" data-v="typed">Enter</button></div>
 ${scanned.length>1?`<button class="btn block" data-a="coall" data-v="return">${ic('warehouse',15)}Set ${scanned.length} scanned to Return to warehouse</button>`:''}
 <div>${all.map(row).join('')}</div>
 <div class="dv-card"><div class="dv-eyebrow">What's left in the vehicle · ${needEv()?'required':'optional'}</div><div class="t3" style="font-size:12px">${needEv()?'A photo or a note here covers everything, or add one on each item above.':'Optional for P&amp;D.'}</div><div style="display:flex;gap:8px;align-items:center"><button class="btn sm${v.photo?' ok':''}" data-a="cophoto" data-v="veh">${ic(v.photo?'check':'camera',14)}${v.photo?'Photo added':'Vehicle photo'}</button><input class="in" data-cono="veh" placeholder="Note about the vehicle" value="${esc(v.note||'')}" style="flex:1;height:40px"></div></div>`:''}
 <div class="dv-card" id="dvcosum"><div class="dv-eyebrow">Summary</div><div class="dv-kv"><div><b class="ok">${s.delivered}</b><span>delivered</span></div><div><b class="${s.failed?'bad':''}">${s.failed}</b><span>not delivered</span></div><div><b>${s.returned}</b><span>returning</span></div></div><div class="dv-kv"><div><b class="${s.missing?'bad':''}">${s.missing}</b><span>missing</span></div><div><b>${s.handed}</b><span>handed off</span></div><div><b>${all.length-done}</b><span>to resolve</span></div></div></div>
 ${coBtn(all)}`}
function closedScreen(){mapScreen(false);const a=R(),done=a.filter(t=>t.state==='completed').length,fail=a.filter(t=>t.state==='failed').length;
 $('#dvscr').innerHTML=`<div style="margin-top:30px;text-align:center"><div style="width:64px;height:64px;border-radius:20px;background:color-mix(in srgb,var(--ok) 16%,transparent);color:var(--ok);display:grid;place-items:center;margin:0 auto">${ic('check',30,2)}</div><h1 class="dv-h1" style="margin-top:16px">Route closed</h1><div class="t2" style="margin-top:6px">${esc(D().route.id)} · thanks, ${esc(D().name.split(' ')[0])}</div></div>
 <div class="dv-kv"><div><b class="ok">${done}</b><span>delivered</span></div><div><b class="${fail?'bad':''}">${fail}</b><span>not delivered</span></div><div><b>${a.length?Math.round(done/a.length*100):0}%</b><span>completion</span></div></div><button class="btn block" data-a="tab" data-v="today">Back to Today</button>${(()=>{const r=D().route.closeout;if(!r||!r.summary)return '';const x=r.summary;return `<div class="dv-card"><div class="dv-eyebrow">Close-out · sent to Dispatch and the warehouse</div><div class="dv-kv"><div><b>${x.returned}</b><span>returning</span></div><div><b class="${x.missing?'bad':''}">${x.missing}</b><span>missing</span></div><div><b>${x.handed}</b><span>handed off</span></div></div></div>`})()}`}
/* ---------- inbox ---------- */
function inbox(){const th=(C.S.msgs||[]).filter(m=>m.wid===W()).slice(-60),tk=(C.S.tickets||[]).filter(t=>t.wid===W()).slice(0,6);const IS=[['late','Running late','clock'],['address','Address problem','pin'],['access',"Can't get in",'lock'],['damaged','Damaged item','box'],['vehicle','Vehicle problem','truck'],['toomany','Too many stops','list'],['break','Need a break','clock'],['other','Something else','chat']];
 return `<div><div class="dv-eyebrow">Inbox</div><h1 class="dv-h1" style="margin-top:8px">Dispatch</h1></div>
 ${notifBlock()}
 <div class="dv-card"><div class="dv-eyebrow">Report a problem</div><div class="dv-reasons">${IS.map(([k,l,i])=>`<button data-a="issue" data-v="${k}">${ic(i,14)} ${l}</button>`).join('')}</div></div>
 ${tk.length?`<div class="dv-card" style="padding:4px 14px">${tk.map(t=>`<div class="dv-row"><div class="grow"><div style="font-weight:550">${esc(t.label)}</div><div class="sub">${esc((t.fixes||[]).map(f=>f.desc).join('; ')||t.text||'')}</div></div><span class="chip ${t.status==='pending'?'warn':t.status==='approved'?'ok':''}">${esc(t.status)}</span></div>`).join('')}</div>`:''}
 <div class="dv-chat" id="dvchat">${th.length?th.map(m=>`<div class="dv-bub ${m.from==='driver'?'me':''}"><small>${m.from==='driver'?'You':m.from==='bot'?'ChainEx bot':esc(m.actor||'Dispatch')} · ${fmt(m.at)}</small>${esc(m.text)}</div>`).join(''):'<div class="t3" style="text-align:center;font-size:13px;padding:20px">No messages yet today.</div>'}</div>
 <div style="display:flex;gap:8px;position:sticky;bottom:-96px;padding:8px 0 4px;background:var(--bg)"><input class="in" id="dvmsg" placeholder="Message Dispatch…" style="height:44px;border-radius:22px;flex:1"><button class="btn pri" data-a="send" style="height:44px;border-radius:22px">${ic('chat',16)}Send</button></div>`}
/* ---------- settings (demo line switch lives here) ---------- */
function sw(on,a,v){return `<button data-a="${a}"${v?` data-v="${v}"`:''} role="switch" aria-checked="${!!on}" style="width:44px;height:26px;border-radius:13px;border:0;background:${on?'var(--acc)':'var(--s3)'};position:relative;cursor:pointer;flex:none"><i style="position:absolute;top:3px;left:${on?'21px':'3px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s"></i></button>`}
function settings(){const d=D(),e=elig();
 return `<div><div class="dv-eyebrow">Settings</div><h1 class="dv-h1" style="margin-top:8px">${esc(d.name)}</h1><div class="t3 mono" style="font-size:12px;margin-top:4px">${esc(d.driverId||'')} · ${esc(LN[d.line])} · ${esc(d.vehicle||'')}</div></div>
 <div class="dv-card"><div class="dv-eyebrow">Clearance</div>${e.ok?`<span class="chip ok" style="align-self:flex-start">${ic('check',12)} Cleared to drive</span>`:`<span class="chip bad" style="align-self:flex-start">${esc(e.reasons.join(' · '))}</span>`}${(e.warnings||[]).map(w=>`<div class="t3" style="font-size:12px">${esc(w)}</div>`).join('')}<a class="btn sm" href="portal-driver.html" style="align-self:flex-start">Documents &amp; pay · driver portal</a></div>
 <div class="dv-card"><div class="dv-eyebrow">Appearance</div>${V.themeSeg()}</div>
 <div class="dv-card" style="padding:4px 14px"><div class="dv-row"><div class="grow">Start navigation to the next stop automatically</div>${sw(ui.autoNav,'autonav')}</div><div class="dv-row"><div class="grow">Voice guidance</div>${sw(ui.set.voice,'set','voice')}</div></div>
 ${scanSettings()}
 <div class="dv-card"><div class="dv-eyebrow">Install</div><div class="t2" style="font-size:12.5px">Add ChainEx Driver to your home screen. It opens full screen and keeps working on weak signal.</div><button class="btn" data-a="install" style="align-self:flex-start">${ic('plus',15)}Install app</button></div>
 <div class="dv-card dv-demo cx-pilot"><div class="dv-eyebrow">Demo · service line</div><div class="t3" style="font-size:12px">Signs in as the sample driver for that line. Pilot only.</div><div class="seg" style="flex-wrap:wrap;height:auto">${C.LINE_ORDER.map(l=>`<button class="${d.line===l?'on':''}" data-a="demo" data-v="${l}">${LN[l]}</button>`).join('')}</div><button class="btn sm ghost" data-a="reset" style="align-self:flex-start">Reset sample day</button></div>
 ${window.CXTT&&CXTT.settingsHtml?CXTT.settingsHtml():''}${integSettings()}
 <button class="btn block" data-a="signout">${ic('logout',15)}Sign out</button><div class="t3" id="dvver">ChainEx Driver · V06</div>`}
/* ---------- modals ---------- */
function openModal(type,id){modal={type,id};cap={photos:{},sig:false,reason:null};drawModal();$('#dvmodal').classList.add('on')}
function closeModal(){modal=null;$('#dvmodal').classList.remove('on');setTimeout(()=>{if(!modal)$('#dvmb').innerHTML=''},260)}
const opts=(f,t)=>typeof f.options==='function'?f.options(t,C.S):(f.options||[]);
function fld(f,t){const v=f.value?f.value(t,C.S):(f.type==='checks'?[]:'');const id='sf_'+f.id,req=f.required?' *':'';
 if(f.type==='check')return `<label class="dv-chk"><input type="checkbox" id="${id}" ${v?'checked':''}> ${esc(f.label)}${req}</label>`;
 if(f.type==='checks')return `<div class="dv-lbl">${esc(f.label)}</div><div>${opts(f,t).map(o=>`<label class="dv-chk"><input type="checkbox" name="${id}" value="${esc(o)}" ${(v||[]).includes(o)?'checked':''}> ${esc(o)}</label>`).join('')}</div>`;
 if(f.type==='select')return `<div class="dv-lbl">${esc(f.label)}${req}</div><select class="in" id="${id}">${opts(f,t).map(o=>`<option${String(o)===String(v)?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
 return `<div class="dv-lbl">${esc(f.label)}${req}</div><input class="in" id="${id}" type="${f.type==='number'?'number':f.type==='time'?'time':'text'}" value="${esc(v==null?'':v)}">`}
function readF(fs){const o={};let miss=null;(fs||[]).forEach(f=>{const id='sf_'+f.id;let v;if(f.type==='check')v=$('#'+id).checked;else if(f.type==='checks')v=$$(`[name="${id}"]:checked`).map(x=>x.value);else{v=$('#'+id).value;if(f.type==='number'&&v!=='')v=+v}if(f.required&&(v===''||v===false||v==null))miss=miss||f.label;o[f.id]=v});return{o,miss}}
function sigHTML(req){return `<div class="dv-lbl">Signature ${req?'(required)':'(optional)'}</div><canvas class="dv-sig" id="dvsig" width="700" height="260"></canvas><div style="display:flex;gap:8px"><button class="btn sm ghost" data-a="sigclr">Clear</button><button class="btn sm ghost" data-a="sigdemo">Sign (demo)</button></div>`}
/* ---- delivery outcomes (delivery6.js · CXDO) ---- */
const DO=()=>window.CXDO;
function instrCard(t,compact){const X=DO();if(!X||!t)return '';const ins=X.instructions(t)||{};const a=ins.access||{};const pl=X.placement(ins.prefer);const show=!!cap.showCodes;
 const codes=[a.gate&&['Gate',a.gate],a.door&&['Door',a.door],a.lockbox&&['Lockbox',a.lockbox],a.fob&&['Key fob',a.fob]].filter(Boolean);
 const flags=[ins.age21&&'<span class="chip bad">ID · 21+</span>',ins.pin&&'<span class="chip warn">PIN on delivery</span>',ins.signature&&'<span class="chip warn">Signature</span>',ins.noKnock&&'<span class="chip">No knock / no bell</span>',ins.callAhead&&'<span class="chip">Call on arrival</span>',a.garage&&'<span class="chip acc">In-garage OK</span>'].filter(Boolean).join('');
 const ex=(ins.extras||[]).map(e=>`<span class="chip acc">${esc((X.EXTRAS.find(x=>x.id===e)||{}).label||e)}</span>`).join('');
 return `<div class="dv-card dv-instr" id="dvinstr" style="padding:10px 14px;gap:6px"><div class="dv-eyebrow" style="display:flex;align-items:center;gap:6px">${ic('pin',13)}Before you arrive${ins.sample?' <span class="t3 cx-pilot" style="font-weight:500">· sample</span>':''}</div>
 ${pl?`<div style="font-size:14px"><span class="t3">Customer prefers</span> <b id="dvprefer">${esc(pl.label)}</b></div>`:''}${ins.notes?`<div class="t2" style="font-size:13px" id="dvinotes">“${esc(ins.notes)}”</div>`:''}
 ${codes.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center" id="dvcodes">${codes.map(c=>`<span class="chip mono">${esc(c[0])} ${show?esc(c[1]):'••••'}</span>`).join('')}<button class="btn sm ghost" data-a="showcodes">${show?'Hide':'Show'} codes</button></div>`:''}
 ${flags||ex?`<div style="display:flex;gap:6px;flex-wrap:wrap">${flags}${ex}</div>`:''}</div>`}
function podDO(t,s){const X=DO();const ins=X.instructions(t)||{};const d=D();
 const def=ins.age21||ins.pin||ins.signature?'recipient':(ins.prefer||'front_door');const pid=cap.place&&X.placements(D().line).some(x=>x.id===cap.place)?cap.place:(X.placements(D().line).some(x=>x.id===def)?def:X.placements(D().line)[0].id);cap.place=pid;
 const rq=X.required(t,pid);const need=rq.proofs;const pl=X.placement(pid)||{};const g=X.geofence(t,d.loc);const grp=['Door','Building','Person'];
 let h=instrCard(t)+`<div class="dv-lbl">Where did it go?</div>${grp.filter(G=>X.placements(D().line).some(x=>x.grp===G)).map(G=>`<div class="dv-eyebrow" style="margin-top:2px">${G==='Door'?'At the home':G==='Building'?'In the building':'To a person'}</div><div class="dv-reasons dv-place">${X.placements(D().line).filter(x=>x.grp===G).map(x=>`<button class="${pid===x.id?'on':''}${ins.prefer===x.id?' pref':''}" data-a="place" data-v="${x.id}">${esc(x.label)}${ins.prefer===x.id?' ★':''}</button>`).join('')}</div>`).join('')}
 <div class="dv-proofs" id="dvproofs"><span class="t3" style="font-size:12px">Needed:</span> ${need.map(x=>`<span class="chip" data-proof="${x}">${esc((X.PROOFS.find(p=>p.id===x)||{}).label||x)}</span>`).join('')||'<span class="chip">Nothing extra</span>'} <span class="t3" style="font-size:11px">· ${esc(rq.policy.from)} rules</span></div>`;
 if(need.includes('photo')||s.photoReq)h+=`<div class="dv-lbl">Photo (required)</div><div class="dv-capture${cap.photos.pod?' ok':''}" data-a="cap" data-v="pod">${cap.photos.pod?ic('check',22)+'<br>Photo captured · GPS + time stamped':ic('camera',22)+'<br>'+esc(s.photoHint||'Photo shows the package and the door / unit number')}</div>`;
 if(need.includes('name')||pl.attended)h+=`<input class="in" id="dvpodname" placeholder="${pl.neighbor?'Neighbor name (required)':pid==='receptionist'?'Receptionist name (required)':pid==='leasing_office'?'Name at the desk':'Recipient name'+(need.includes('name')?' (required)':'')}">`;
 if(pl.neighbor)h+=`<input class="in" id="dvnbaddr" placeholder="Neighbor address / unit (required)">`;
 if(need.includes('signature')||s.sigReq)h+=sigHTML(true);
 if(need.includes('id21'))h+=`<div class="dv-card" style="padding:10px 14px;gap:6px;border-color:var(--bad)" id="dvidc"><div class="dv-eyebrow" style="color:var(--bad)">ID / age check · ${rq.policy.ageMin}+</div><label class="dv-chk"><input type="checkbox" data-a="idchk" ${cap.idChecked?'checked':''}> I checked a government photo ID and the face matches</label><input class="in" id="dvdob" placeholder="Date of birth on the ID (YYYY-MM-DD)" inputmode="numeric"></div>`;
 if(need.includes('pin'))h+=`<input class="in mono" id="dvpin" placeholder="Customer's PIN / one-time code" inputmode="numeric" maxlength="8">`;
 if(need.includes('geofence'))h+=`<div class="dv-geo ${g.ok?'ok':'bad'}" id="dvgeo">${ic(g.ok?'check':'alert',15)} ${g.ft==null?'GPS not available':g.ok?`At the address · ${g.ft} ft`:`${g.ft} ft from the address · max ${g.limit} ft`}${!g.ok?`<label class="dv-chk" style="margin-left:auto"><input type="checkbox" data-a="geoov" ${cap.geoOverride?'checked':''}> GPS is off, I'm at the door</label>`:''}</div>`;
 if((ins.extras||[]).length)h+=`<div class="dv-lbl">Service extras · confirm each</div><div id="dvextras">${ins.extras.map(e=>`<label class="dv-chk"><input type="checkbox" data-a="extra" data-v="${e}" ${(cap.extras||[]).includes(e)?'checked':''}> ${esc((X.EXTRAS.find(x=>x.id===e)||{}).label||e)}</label>`).join('')}</div>`;
 h+=`<input class="in" id="dvpodnotes" placeholder="Notes (optional)">`;return h}
function cantDO(t,k){const X=DO();const line=D().line;const RS=X.reasons(line);const r=cap.reason&&X.reason(cap.reason);const v=r?X.validateAttempt(t,{reason:r.id,photo:true,name:'x',loc:D().loc,geoOverride:true}):null;const nx=r?X.nextAction(t,r):null;
 const pol=X.policy(t.contract,line);const needPhoto=r&&(pol.attempt.includes('photo')||(r.proofs||[]).includes('photo'));const needName=r&&(r.proofs||[]).includes('name');
 return instrCard(t)+`<div class="dv-lbl">What happened?</div><div class="dv-reasons" id="dvreasons">${RS.map(x=>`<button class="${r&&r.id===x.id?'on':''}" data-a="reason" data-v="${x.id}">${esc(x.label)}</button>`).join('')}</div>
 ${nx?`<div class="dv-card dv-next" id="dvnext" style="padding:10px 14px;gap:4px"><div class="dv-eyebrow">Next · set by the rules</div><b style="font-size:16px" id="dvnexta">${esc(nx.next)}</b><div class="t3" style="font-size:12px">${esc(nx.why)}</div>${r.notice?'<label class="dv-chk"><input type="checkbox" checked disabled> Leave a delivery notice</label>':''}</div>`:''}
 <div class="dv-capture${cap.photos.exc?' ok':''}" data-a="cap" data-v="exc" style="height:70px">${cap.photos.exc?ic('check',18)+' Photo attached':ic('camera',18)+(needPhoto?' Photo of the door / address (required)':' Attach a photo')}</div>
 ${needName?'<input class="in" id="dvcname" placeholder="Name of who refused (required)">':''}<input class="in" id="dvcn" placeholder="Notes">`}
function drawModal(){if(!modal)return;const t=modal.id&&C.task(modal.id),k=K();let h='',f='';const hdr=(title,sub)=>`<div class="dv-mh"><div style="flex:1;min-width:0"><div class="dv-eyebrow">${sub||''}</div><h2 style="margin-top:6px">${esc(title)}</h2></div><button class="dv-rb" data-a="mclose" aria-label="Close">${ic('x',17)}</button></div>`;
 if(modal.type==='step'){const s=nextStep(t);if(!s){closeModal();return}const st=stepsOf(t),si=st.findIndex(x=>x.id===s.id)+1,sub=`${esc(word())} ${no(t)} · step ${si} of ${st.length}`;const exc=`<button class="btn ghost" data-a="cant" data-v="${t.id}">${esc(k.exceptionLabel||"Can't deliver")}</button>`;
  h=hdr(s.label,sub)+`<div class="dv-mc"><div class="t2" style="font-size:13px;margin-top:-6px">${esc(t.name)} · ${esc(t.address.split(',')[0])}</div>${s.desc?`<div class="t3" style="font-size:12.5px">${esc(s.desc)}</div>`:''}`;
  if(s.kind==='scan'){const n=t.items.filter(p=>p.stopScanned).length,all=t.items.length;h+=`<div class="dv-scan" style="height:150px"><i style="animation-duration:1.4s"></i><div class="res"><div class="dv-big">${n}<small style="color:rgba(255,255,255,.5)"> / ${all}</small></div><div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:4px">scanned at the door</div></div></div><div style="display:flex;gap:8px"><button class="btn xl pri" style="flex:1" data-a="sscan"${n<all?'':' disabled'}>${ic('scan',18)}Scan</button><button class="btn xl" data-a="sscanall"${n<all?'':' disabled'}>All</button></div>${t.items.map(p=>`<div class="dv-pk"><span class="${p.stopScanned?'ok':'t3'}">${ic(p.stopScanned?'check':'box',15)}</span><div class="grow mono" style="font-size:12px">${esc(p.id)}</div><span class="t3" style="font-size:11.5px">${esc(p.label||'')}</span></div>`).join('')}`;f=exc+`<button class="btn pri" data-a="dostep"${n===all?'':' disabled'}>Continue</button>`}
  else if(s.kind==='pod'&&DO()){h+=podDO(t,s);f=exc+`<button class="btn pri" data-a="dostep">${ic('check',16)}Complete</button>`}
  else if(s.kind==='pod'){const PL=s.placements||['Front door','Handed to recipient'];h+=`<div class="dv-lbl">Photo ${s.photoReq?'(required)':''}</div><div class="dv-capture${cap.photos.pod?' ok':''}" data-a="cap" data-v="pod">${cap.photos.pod?ic('check',22)+'<br>Photo captured · GPS + time stamped':ic('camera',22)+'<br>'+esc(s.photoHint||'Tap to take a photo')}</div>${sigHTML(s.sigReq)}<div class="dv-lbl">Left at / received by</div><div class="dv-reasons">${PL.map(x=>`<button class="${(cap.place||PL[0])===x?'on':''}" data-a="place" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><input class="in" id="dvpodname" placeholder="Recipient name (optional)"><input class="in" id="dvpodnotes" placeholder="Notes (optional)">`;f=exc+`<button class="btn pri" data-a="dostep">${ic('check',16)}Complete</button>`}
  else if(s.kind==='photo'){h+=(s.photos||['Photo']).map((p,i)=>`<div class="dv-lbl">${esc(p)} (required)</div><div class="dv-capture${cap.photos['p'+i]?' ok':''}" data-a="cap" data-v="p${i}" style="height:80px">${cap.photos['p'+i]?ic('check',18)+' '+esc(p):ic('camera',18)+' Tap to capture'}</div>`).join('')+(s.fields||[]).map(x=>fld(x,t)).join('');f=exc+`<button class="btn pri" data-a="dostep">Save · next</button>`}
  else if(s.kind==='sign'){h+=sigHTML(true)+`<input class="in" id="dvpodname" placeholder="Signed by (full name)">${s.survey?`<div class="dv-lbl">Customer rating</div><div class="seg">${[1,2,3,4,5].map(n=>`<button class="${cap.survey===n?'on':''}" data-a="rate" data-v="${n}">${n}★</button>`).join('')}</div>`:''}<input class="in" id="dvpodnotes" placeholder="Notes (optional)">`;f=exc+`<button class="btn pri" data-a="dostep">${ic('check',16)}Submit</button>`}
  else{h+=(s.fields||[]).map(x=>fld(x,t)).join('');f=exc+`<button class="btn pri" data-a="dostep">${s.effect==='arrive'?'Arrived · next':'Save · next'}</button>`}
  h+='</div>'}
 else if(modal.type==='cant'){const c=C.S.contracts[t.contract]||{name:'—',maxAttempts:2};const RS=k.reasons||['No answer','Address issue','Refused','Access issue','Damaged','Unsafe'];const NA=k.nextActions||['Reattempt','Return to station','Contact shipper'];
  if(DO()&&['pd','bulky','wg'].includes(D().line)){h=hdr(k.exceptionLabel||"Can't deliver",`${esc(word())} ${no(t)} · ${esc(t.name)}`)+`<div class="dv-mc">${cantDO(t,k)}<div class="t3" style="font-size:11.5px">${esc(c.name)} · up to ${DO().policy(t.contract,D().line).maxAttempts} attempt(s) · this is attempt ${t.attempts+1}</div></div>`;f=`<button class="btn ghost" data-a="mclose">Back</button><button class="btn danger" data-a="dofail"${cap.reason?'':' disabled'}>Log &amp; continue</button>`}else{h=hdr(k.exceptionLabel||"Can't deliver",`${esc(word())} ${no(t)} · ${esc(t.name)}`)+`<div class="dv-mc"><div class="dv-lbl">What happened?</div><div class="dv-reasons">${RS.map(r=>`<button class="${cap.reason===r?'on':''}" data-a="reason" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div><div class="dv-lbl">Next action for Dispatch</div><select class="in" id="dvna">${NA.map(r=>`<option>${esc(r)}</option>`).join('')}</select><div class="dv-capture${cap.photos.exc?' ok':''}" data-a="cap" data-v="exc" style="height:70px">${cap.photos.exc?ic('check',18)+' Photo attached':ic('camera',18)+' Attach a photo'}</div><input class="in" id="dvcn" placeholder="Notes"><div class="t3" style="font-size:11.5px">${esc(c.name)} · up to ${c.maxAttempts} attempt(s) · this is attempt ${t.attempts+1}</div></div>`;f=`<button class="btn ghost" data-a="mclose">Back</button><button class="btn danger" data-a="dofail"${cap.reason?'':' disabled'}>Log &amp; continue</button>`}}
 else if(modal.type==='stop'){h=hdr(t.name,`${esc(word())} ${no(t)} of ${tot()}`)+`<div class="dv-mc"><div class="t2" style="font-size:13px">${esc(t.address)}</div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${esc(C.stateLabel(t.state,D().line))}</span><span class="chip">${fmt(t.window[0])}–${fmt(t.window[1])}</span>${(t.tags||[]).map(x=>`<span class="chip">${esc(x.toLowerCase())}</span>`).join('')}</div>${k.fields?`<div class="dv-card" style="padding:4px 14px">${k.fields(t,C.S).slice(0,8).map(x=>`<div class="dv-row" style="padding:8px 0"><span class="t3 grow">${esc(x[0])}</span><span>${esc(x[1])}</span></div>`).join('')}</div>`:''}<div class="dv-eyebrow">${esc(k.units||'Items')}</div>${t.items.map(p=>`<div class="dv-pk"><div class="grow mono" style="font-size:12px">${esc(p.id)}</div><span class="chip ${p.stopScanned||t.state==='completed'?'ok':p.loaded?'acc':''}">${p.stopScanned||t.state==='completed'?'scanned':p.loaded?'loaded':'not scanned'}</span></div>`).join('')}<div class="dv-eyebrow">Steps</div>${stepsOf(t).map(s=>`<div class="dv-pk"><span class="${t.stepData[s.id]?'ok':'t3'}">${ic(t.stepData[s.id]?'check':'dot',15)}</span><div class="grow">${esc(s.label)}</div><span class="mono t3" style="font-size:11px">${t.stepData[s.id]?fmt(t.stepData[s.id].at):''}</span></div>`).join('')}${t.failReason?`<div class="chip bad" style="align-self:flex-start">${esc(t.failReason)} → ${esc(t.nextAction||'')}</div>`:''}</div>`;
  f=C.OPEN(t)&&stage()==='on_road'&&!(special()&&cur()&&cur().id!==t.id)?`<button class="btn ghost" data-a="call">${ic('phone',15)}Call</button><button class="btn pri" data-a="step" data-v="${t.id}">${esc((nextStep(t)||{}).label||'Open')}</button>`:`<button class="btn" data-a="mclose">Close</button>`}
 else if(modal.type==='sos'){const d=D();h=hdr(d.sos?'SOS is on':'Emergency','Dispatch sees your live location')+`<div class="dv-mc">${d.sos?`<div class="chip bad" style="align-self:flex-start">Dispatch alerted · ${esc(d.name)}</div>`:'<div class="t2" style="font-size:13px">Sends an alert with your location to Dispatch and your DSP.</div>'}<button class="btn xl ${d.sos?'':'danger'} block" data-a="${d.sos?'sosoff':'soson'}">${d.sos?'Cancel SOS':'Send SOS'}</button><button class="btn xl block" data-a="call911">Call 911</button></div>`}
 else if(modal.type==='wrong'){const c=modal.cls||{};const takeable=['other_route','unrouted'].includes(c.kind);const pm=takeable?CXL.perm(W(),'takeOwnership'):null;
  h=hdr('','Hold up · check this label')+`<div class="dv-mc"><div class="dv-wrong" id="dvwrong"><div class="wi">${ic('alert',38)}</div><h2 id="dvwtitle">${esc(c.title||'Not on your route')}</h2><div class="t2" style="font-size:14px">${esc(c.sub||'')}</div><div class="mono t3" style="font-size:12px">${esc(c.code||'')}</div></div>
  <button class="btn xl pri block" data-a="wskip" id="dvwskip">${ic('scan',18)}Skip &amp; keep scanning</button>
  ${takeable?(pm.mode==='off'?`<button class="btn xl block locked" data-a="waskacc" data-v="takeOwnership" id="dvwtake">${ic('lock',16)}Take ownership · Ask your dispatcher</button>`:`<button class="btn xl block" data-a="wtake" id="dvwtake">${ic('user',17)}Take ownership${pm.mode==='approval'?' · needs approval':''}</button>`):''}
  <input class="in" id="dvwnote" placeholder="Note for Dispatch (optional)" autocomplete="off"><button class="btn block ghost" data-a="wreport" id="dvwreport">${ic('flag',15)}Report to Dispatch</button></div>`}
 else if(modal.type==='addr'){const c=modal.cls||{};h=hdr('New package','Label not in the system')+`<div class="dv-mc"><div class="t2" style="font-size:13px">Type what the label says. The stop is added to your route and looked up on the map.</div><div class="mono t3" style="font-size:12px">${esc(c.code||'')}</div>
  <div class="dv-lbl">Recipient name</div><input class="in" id="dvan" autocomplete="off" placeholder="e.g. A. Sample"><div class="dv-lbl">Address</div><input class="in" id="dvaa" autocomplete="off" placeholder="Street, city, ZIP"><div class="t3" id="dvageo" style="font-size:12px"></div></div>`;
  f=`<button class="btn ghost" data-a="addrlook">${ic('search',15)}Look up</button><button class="btn pri" data-a="addrgo" id="dvaddrgo">Add stop</button>`}
 $('#dvmb').innerHTML=h+(f?`<div class="dv-mf">${f}</div>`:'');bindSig()}
function bindSig(){const cv=$('#dvsig');if(!cv)return;const x=cv.getContext('2d');x.lineWidth=4;x.lineCap='round';x.strokeStyle=getComputedStyle(document.body).color;let dn=false;const P=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]};
 cv.addEventListener('pointerdown',e=>{dn=true;x.beginPath();x.moveTo(...P(e));e.preventDefault()});cv.addEventListener('pointermove',e=>{if(!dn)return;x.lineTo(...P(e));x.stroke();cap.sig=true});addEventListener('pointerup',()=>dn=false);
 cv._demo=()=>{x.beginPath();x.moveTo(60,180);for(let i=0;i<14;i++)x.quadraticCurveTo(80+i*40,40+(i%2)*200,100+i*40,150);x.stroke();cap.sig=true}}
function stampPic(label,bg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="'+(bg||'#1E3860')+'"/><text x="160" y="118" text-anchor="middle" fill="#fff" font-size="14" font-family="system-ui,sans-serif">'+String(label||'POD').replace(/[<&>]/g,s=>({ '<':'&lt;','&':'&amp;','>':'&gt;'}[s]))+'</text><text x="160" y="142" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="11" font-family="system-ui,sans-serif">Sample POD · not a real photo</text></svg>')}
function sigImg(name){const cv=document.getElementById('dvsig');if(window.CXO&&CXO.svgSig)return CXO.svgSig(name||'Signed');if(cv&&cap.sig){try{return cv.toDataURL('image/jpeg',.5)}catch(e){return ''}}return ''}
function enrichPod(T,kind,data,d){if(!T)return;const photos=[];const put=(k,kind,label)=>{const src=cap.photos[k];if(!src)return;photos.push({src:src===true?stampPic(label):src,kind,label,at:C.S.clock})};
  put('pod','pod','Delivery photo');put('exc','fail','Attempt / exception');Object.keys(cap.photos||{}).forEach(k=>{if(k[0]==='p'&&k!=='pod')put(k,'pod','Photo')});
  const pl=data&&data.placement||cap.place||((data&&data.receivedBy)||'').split('·')[0].trim();
  const signer=(data&&data.signer)||(((data&&data.receivedBy)||'').includes('·')?(data.receivedBy||'').split('·').slice(1).join('·').trim():'')||'';
  const dropLL=(d&&d.loc)||T.ll;const toRad=x=>x*Math.PI/180;
  const dist=(T.ll&&dropLL)?Math.round((()=>{const R=6371,dLat=toRad(dropLL[1]-T.ll[1]),dLon=toRad(dropLL[0]-T.ll[0]),h=Math.sin(dLat/2)**2+Math.cos(toRad(T.ll[1]))*Math.cos(toRad(dropLL[1]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))})()*3280.84):0;
  T.pod=Object.assign({},T.pod||{},data||{},{placement:pl,signer,photos,signatureImg:sigImg(signer)||(T.pod&&T.pod.signatureImg)||'',photo:photos.some(x=>x.kind==='pod'),signature:!!(cap.sig||(data&&data.signature)),dropLL,addressLL:T.ll,distanceFt:dist,far:dist>150,at:C.S.clock,scan:(T.items&&T.items[0]&&T.items[0].id)||T.id,notes:(data&&data.notes)||(T.pod&&T.pod.notes)||''});
  if(!T.pod.summary)T.pod.summary=T.pod.receivedBy||pl}
function doStep(){const t=C.task(modal.id),s=nextStep(t),d=D();if(!s)return;let data={};
 if(s.kind==='scan'){if(t.items.some(p=>!p.stopScanned)){toast('Scan every one first');return}data={summary:`${t.items.length} scanned`}}
 else if(s.kind==='pod'&&DO()){const X=DO();const pid=cap.place||'front_door';const pl=X.placement(pid);const nm=($('#dvpodname')||{}).value||'',nb=($('#dvnbaddr')||{}).value||'';
  const vv={placement:pid,photo:!!cap.photos.pod||!(X.required(t,pid).proofs.includes('photo')||s.photoReq),signature:!!cap.sig,name:nm,neighborAddr:nb,dob:($('#dvdob')||{}).value||'',idChecked:!!cap.idChecked,pin:($('#dvpin')||{}).value||'',loc:d.loc,geoOverride:!!cap.geoOverride,extrasDone:cap.extras||[]};
  if(s.sigReq&&!cap.sig){toast('Signature required');return}const res=X.validate(t,vv);if(!res.ok){toast(res.missing[0]+(res.missing.length>1?` · +${res.missing.length-1} more`:''),'alert');window.__cxDOLast=res;return}
  const g=X.geofence(t,d.loc);data={photos:cap.photos.pod?1:0,signature:cap.sig,placement:pid,placementLabel:pl.label,outcome:res.required.kind,proofs:res.required.proofs,receivedBy:pl.label+(nm?` · ${nm}`:'')+(nb?` · ${nb}`:''),neighbor:pl.neighbor?{name:nm,address:nb}:null,
   idCheck:res.required.proofs.includes('id21')?{checked:true,age:X.ageOn(vv.dob),min:res.required.policy.ageMin}:null,pin:res.required.proofs.includes('pin')?((window.__cxPinEntry=window.__cxPinEntry||{})[t.id]=vv.pin,'verified'):null,geofence:res.required.proofs.includes('geofence')?{ft:g.ft,limit:g.limit,override:!g.ok&&!!cap.geoOverride}:null,extras:(cap.extras||[]).slice(),notes:$('#dvpodnotes').value};data.summary=data.receivedBy}
 else if(s.kind==='pod'){if(s.photoReq&&!cap.photos.pod){toast('Photo required','camera');return}if(s.sigReq&&!cap.sig){toast('Signature required');return}const pl=cap.place||(s.placements||['Front door'])[0],nm=$('#dvpodname').value;data={photos:cap.photos.pod?1:0,signature:cap.sig,receivedBy:pl+(nm?` · ${nm}`:''),notes:$('#dvpodnotes').value};data.summary=data.receivedBy}
 else if(s.kind==='photo'){const need=(s.photos||['Photo']).length,got=Object.keys(cap.photos).filter(k=>k[0]==='p'&&k!=='pod').length;if(got<need){toast(`${need-got} photo(s) still required`,'camera');return}const r=readF(s.fields);if(r.miss){toast(r.miss+' is required');return}data=Object.assign(r.o,{photos:need})}
 else if(s.kind==='sign'){if(!cap.sig){toast('Signature required');return}if(s.survey&&!cap.survey){toast('Ask for a 1–5 rating');return}data={signature:true,receivedBy:$('#dvpodname').value,survey:cap.survey,notes:$('#dvpodnotes').value}}
 else if(s.kind==='form'){const r=readF(s.fields);if(r.miss){toast(r.miss+' is required');return}data=r.o}
 if(s.summary)try{data.summary=s.summary(data,t)}catch(e){}
 const id=t.id;C.update(()=>{C.ops.completeStep(id,s,data,d.name);C.ops.tick(2);if(s.kind==='pod'||s.kind==='sign'||s.kind==='photo')enrichPod(C.task(id),s.kind,data,d)});if(window.CXI)cxEmitScan(C.task(id),s,d);haptic();const T=C.task(id);
 if(!C.OPEN(T)||!nextStep(T)){afterStop(id);return}
 if(special()&&stage()==='on_road'){runNext(id);return}
 closeModal();toast(`✓ ${s.label}`,'check');render()}
function keepInputs(fn){const keep={};$$('#dvmb input.in,#dvmb select.in').forEach(i=>keep[i.id]=i.value);const sig=cap.sig;fn();Object.entries(keep).forEach(([k,v])=>{const e=document.getElementById(k);if(e)e.value=v});if(sig&&$('#dvsig'))$('#dvsig')._demo()}
/* ---------- actions ---------- */
function act(a,v){const d=D(),w=W();switch(a){
 case 'tab':ui.tab=v;save();fitKey='';render();break;
 case 'fillid':$('#dvid').value=v;$('#dvterms').checked=true;break;
 case 'signin':{const id=($('#dvid').value||'').trim();if(!$('#dvterms').checked){toast('Please accept the driver terms');break}const h=byId(id);if(!h.length){toast('Driver ID not found · check with your DSP or ChainEx','alert');break}ui.wid=h[0].id;ui.tab=h[0].duty&&h[0].route.stage!=='closed'?'route':'today';ui.plan={mode:null,seq:[],ends:[]};save();fitKey='';leg=null;render();if(window.CXI&&CXI.needsTerms('driver',h[0].id))CXI.showTermsOverlay('driver',h[0].id,h[0].name);toast('Signed in · '+h[0].name,'check');break}
 case 'demo':{const h=byId(DEMO[v]);if(!h.length)break;ui.wid=h[0].id;ui.tab='today';ui.plan={mode:null,seq:[],ends:[]};ui.last=null;openLoad=false;save();leg=null;fitKey='';render();toast('Demo · '+h[0].name+' · '+LN[v],'user');break}
 case 'signout':ui.wid=null;save();stopNav();render();break;
 case 'reset':if(window.CXTT){CXTT.resetAll();break}if(confirm('Reset the shared sample day for every version?')){C.reset();ui.plan={mode:null,seq:[],ends:[]};ui.last=null;ui.scanLog=[];save();leg=null;render();toast('Sample day reset')}break;
 case 'resetday':if(window.CXTT){CXTT.resetDriverDay();break}break;
 case 'duty':{if(!d.duty&&!elig().ok){toast('Blocked · '+elig().reasons.join(' · '),'lock');break}const was=!!d.duty;C.update(()=>C.ops.duty(w,!was));C.load();const on=!!(D()&&D().duty);if(on===was){render();toast("Couldn't save on this phone (browser storage is full). Settings → Reset sample day, then try again.",'alert');break}if(on){ui.tab='route';ui.planOpen=false;if(window.CXI){startGps();CXI.emit('out_for_delivery',{actor:(D()||d).name,payload:{route:(D()||d).route&&(D()||d).route.id,wid:w},ll:(D()||d).loc});CXI.offerOnDemand(w)}}save();fitKey='';render();toast(on?(special()&&pre()?'On duty · plan your route now':'You are on duty'):'You are off duty',on?'check':'power');break}
 case 'claim':{let ok;C.update(()=>{ok=C.ops.claim(w,v)});toast(ok===false?'Blocked · '+elig().reasons.join(' · '):'Claimed · added to your route',ok===false?'lock':'check');render();break}
 case 'noticeok':C.update(()=>C.ops.noticeSeen(w));render();break;
 case 'pmode':ui.plan.mode=v||null;ui.plan.seq=[];ui.plan.ends=[];save();planScreen();break;
 case 'ppin':{const p=ui.plan;if(p.mode==='manual'){const i=p.seq.indexOf(v);if(i<0){p.seq.push(v);haptic()}else p.seq.splice(i,1)}else if(p.mode==='ends'){if(p.ends.includes(v))p.ends=p.ends.filter(x=>x!==v);else if(p.ends.length<2)p.ends.push(v);else p.ends=[p.ends[0],v]}else{openModal('stop',v);break}save();planScreen();break}
 case 'pundo':ui.plan.seq.pop();save();planScreen();break;
 case 'preset':ui.plan.seq=[];save();planScreen();break;
 case 'pfill':{const p=ui.plan,rest=asg().filter(t=>!p.seq.includes(t.id));let from=p.seq.length?C.task(p.seq[p.seq.length-1]).ll:d.loc;while(rest.length){rest.sort((x,y)=>C.dist(from,x.ll)-C.dist(from,y.ll));const n=rest.shift();p.seq.push(n.id);from=n.ll}save();planScreen();toast('Filled the rest by nearest stop','bolt');break}
 case 'psave':{applyOrder(planOrder(),'set by me');ui.plan.mode=null;ui.plan.seq=[];save();fitKey='';render();toast('Your order is saved · Dispatch sees it live','check');break}
 case 'pauto':{const r=optimize();if(!r)break;applyOrder(r.order.map(x=>x.id),'best route');ui.plan.mode=null;save();fitKey='';render();toast(`Best route · ${r.km.toFixed(1)} km`,'bolt');break}
 case 'pends0':ui.plan.ends=[];save();planScreen();break;
 case 'pendsgo':{const [f,l]=ui.plan.ends;const r=optimize(f,l);if(!r){toast('Need at least three stops');break}applyOrder(r.order.map(x=>x.id),'first + last picked');ui.plan.mode=null;ui.plan.ends=[];save();fitKey='';render();toast('Optimized between your first and last stop','bolt');break}
 case 'omwhub':if(!elig().ok){toast('Blocked · '+elig().reasons.join(' · '),'lock');break}C.update(()=>C.ops.checkin(w,'on_my_way'));render();toast(`${hub().name||'Hub'} notified · staging your load`,'nav');break;
 case 'arrhub':C.update(()=>C.ops.checkin(w,'arrived'));ui.planOpen=false;save();render();toast(`Checked in at ${hub().name||'hub'}`,'check');break;
 case 'toload':ui.planOpen=false;ui.tab='route';openLoad=true;save();render();break;
 case 'sod':openLoad=false;render();break;
 case 'planopen':ui.planOpen=true;save();fitKey='';render();break;
 case 'lscan':{const inp=$('#dvlbc'),val=v==='typed'?(inp&&inp.value.trim()):'';if(v==='typed'){if(!val)break;if(inp)inp.value='';scanCode(val,'typed');break}
  const x=pk().find(y=>!y.p.loaded&&!y.p.loadFlag);if(!x){toast('All scanned','check');break}scanCode(x.p.id,'sample');break}
 case 'lcam':camWant=!camWant;render();break;
 case 'lconfirm':stopCam();ui.lc='confirm';save();render();break;
 case 'lback':ui.lc=null;save();render();break;
 case 'lreason':ui.lreason=v;save();keepConfirm();break;
 case 'lshort':{const r=ui.lreason;if(!r){toast('Pick a reason first','alert');break}const note=($('#dvlnote')||{}).value||'';const rec=CXL.confirmLoad(w,{reason:r,note});if(!rec||rec.error){toast('Pick a reason first','alert');break}ui.lreason=null;save();toast(`Short load sent to Dispatch${CXL.dspOf(d)?' and your DSP':''}`,'alert');act('start');break}
 case 'lok':{const rec=CXL.confirmLoad(w,{});if(!rec||rec.error)break;toast('Load confirmed · '+rec.scanned+' of '+rec.expected,'check');act('start');break}
 case 'wskip':closeModal();toast('Skipped · keep scanning','scan');break;
 case 'wtake':{const cls=modal&&modal.cls;if(!cls)break;const r=CXL.takeOwnership(w,cls);closeModal();if(r.status==='locked'){toast('Ask your dispatcher to turn on Take ownership','lock');break}
  if(r.status==='applied'){ui.last={pid:cls.pkg,tid:cls.task,kind:'ok'};ui.hit=true;save();render();toast(`Yours now · Stop ${no(C.task(cls.task))} · Dispatch notified`,'check')}else if(r.status==='pending'){toast('Ownership requested · Dispatch will confirm','clock');render()}else toast("This one can't move to your route",'alert');break}
 case 'wreport':{const cls=modal&&modal.cls;if(!cls)break;CXL.report(w,cls,{note:($('#dvwnote')||{}).value||''});closeModal();toast('Reported to Dispatch · keep scanning','flag');break}
 case 'waskacc':{const k=v||'takeOwnership';CXL.requestAccess(w,k);if(modal)closeModal();toast('Request sent · ask your dispatcher to approve','lock');break}
 case 'selfgo':{const pm=CXL.perm(w,'selfBuild');if(pm.mode==='off'){toast('Ask your dispatcher to turn on Build route by scanning','lock');break}ui.self=true;ui.tab='route';save();render();break}
 case 'selfsample':{const code='CX'+Math.random().toString(36).slice(2,12).toUpperCase().padEnd(10,'7').slice(0,10);scanCode(code,'sample');break}
 case 'selfbuild':{const r=CXL.buildSelf(w);if(!r){toast('Scan at least one package','alert');break}ui.self=false;ui.lc=null;save();fitKey='';render();toast(r.status==='approved'?`Route built · ${r.stops} stops · ready to go`:`Route built · ${r.stops} stops · sent to Dispatch for approval`,'check');break}
 case 'addrgo':{const code=modal&&modal.code;const n=($('#dvan')||{}).value||'',ad=($('#dvaa')||{}).value||'';if(!ad.trim()){toast('Type the address from the label','alert');break}closeModal();scanCode(code,'typed',{name:n.trim(),address:ad.trim()});break}
 case 'addrlook':{const ad=($('#dvaa')||{}).value||'';if(!ad.trim()||!window.CXI||!CXI.geocode)break;const o=$('#dvageo');if(o)o.textContent='Looking up…';CXI.geocode(ad).then(r=>{const e=$('#dvageo');if(e)e.textContent=r&&r.source!=='sample'?`Found · ${r.label||ad}`:'Not found on the map · the stop goes on the hub pin until Dispatch moves it'});break}
 case 'lnote':CXL.noteSeen(v);render();break;
 case 'lgroup':{const L=pk().filter(x=>!x.p.loaded&&!x.p.loadFlag);if(!L.length)break;const g=DC().groupBy(L[0].p);const ids=L.filter(x=>DC().groupBy(x.p)===g).map(x=>x.p.id);let n=0;C.update(()=>{n=C.ops.loadScan(w,ids)});ui.last={pid:L[0].p.id,tid:L[0].t.id};ui.hit=true;save();render();toast(`✓ ${g} · ${n} loaded`,'check');break}
 case 'lflag':{const [kind,pid]=v.split('|');const x=pk().find(y=>y.p.id===pid);if(!x)break;const n=no(x.t);C.update(()=>{const q=C.task(x.t.id).items.find(p=>p.id===pid);q.loadFlag=kind;(q.events=q.events||[]).push({type:(kind==='missing'?'Missing':'Damaged')+' at load-out',at:C.S.clock,where:'Load-out scan',actor:d.name});C.ops.botIssue(w,kind==='damaged'?'damaged':'other',x.t.id,`${kind==='missing'?'Missing':'Damaged'} at load-out: ${pid} (${word().toLowerCase()} ${n}, ${x.t.name})`)});render();toast(`${kind==='missing'?'Missing':'Damaged'} · ticket sent to Dispatch`,'alert');break}
 case 'lunflag':C.update(()=>{const x=pk().find(y=>y.p.id===v);if(x){delete x.p.loadFlag;C.ops.loadScan(w,v)}});render();toast('Found · loaded','check');break;
 case 'start':{if(d.route.checkin!=='arrived'){toast('Check in at the hub first','alert');break}if(!DC().skipLoad&&!CXL.confirmed(w)){stopCam();ui.lc='confirm';save();render();break}{const cs=CXL.canStart(w);if(!cs.ok){toast(cs.why,'lock');render();break}}ui.lc=null;stopCam();
  C.update(()=>{if(DC().skipLoad)C.routeAll(w).forEach(t=>t.items.forEach(p=>p.loaded=true));C.ops.startRoute(w)});ui.planOpen=false;openLoad=false;leg=null;fitKey='';if(special()&&ui.autoNav)ui.autoGo=true;save();render();toast(d.line==='shuttle'?'Shift started · next trip ready':'Route started · drive safe','nav');break}
 case 'navgo':navGo();break;
 case 'navpause':stopNav();render();break;
 case 'arrive':{const t=cur();if(!t)break;if(t.stepData.arrive)runNext(t.id);else arrive();break}
 case 'recenter':if(map.m&&map.ready)map.m.easeTo({center:(leg&&leg.pos)||d.loc,zoom:15});break;
 case 'fit':map.fit();break;
 case 'grab':if(Date.now()-sheetTapped<450)break;toggleSheet();break;
 case 'torch':if(!camSess||!camSess.setTorch)break;camSess.torchManual=!camSess.torchOn;camSess.setTorch(camSess.torchManual).then(()=>paintTorch({capable:!!camSess.torchCapable,on:!!camSess.torchOn,luma:camSess.luma})).catch(()=>{});break;
 case 'step':closeModal();runNext(v);break;
 case 'dostep':doStep();break;
 case 'sscan':C.update(S=>{const T=C.task(modal.id),p=T.items.find(p=>!p.stopScanned);if(p){p.stopScanned=true;p.events.push({type:'Scanned at stop',at:S.clock,where:'Driver app',actor:d.name})}});haptic();drawModal();break;
 case 'sscanall':C.update(S=>{C.task(modal.id).items.forEach(p=>{if(!p.stopScanned){p.stopScanned=true;p.events.push({type:'Scanned at stop',at:S.clock,where:'Driver app',actor:d.name})}})});drawModal();break;
 case 'cap':cap.photos[v]=stampPic(v==='exc'?'Attempt photo':(v==='pod'?'Delivery photo':'Photo'),v==='exc'?'#6B3A2A':'#1E3860');keepInputs(drawModal);break;
 case 'place':cap.place=v;keepInputs(drawModal);break;
 case 'showcodes':cap.showCodes=!cap.showCodes;if(modal)keepInputs(drawModal);else render();break;
 case 'idchk':cap.idChecked=!cap.idChecked;keepInputs(drawModal);break;
 case 'geoov':cap.geoOverride=!cap.geoOverride;keepInputs(drawModal);break;
 case 'extra':{cap.extras=cap.extras||[];const i=cap.extras.indexOf(v);if(i<0)cap.extras.push(v);else cap.extras.splice(i,1);keepInputs(drawModal);break}
 case 'rate':cap.survey=+v;keepInputs(drawModal);break;
 case 'reason':cap.reason=v;keepInputs(drawModal);break;
 case 'sigclr':{const cv=$('#dvsig');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);cap.sig=false;break}
 case 'sigdemo':$('#dvsig')._demo();break;
 case 'cant':openModal('cant',v);break;
 case 'dofail':{if(DO()&&!$('#dvna')){const id=modal.id,t0=C.task(id),X=DO();const nt=$('#dvcn').value,nm=($('#dvcname')||{}).value||'';const vr=X.validateAttempt(t0,{reason:cap.reason,photo:!!cap.photos.exc,name:nm,loc:d.loc,geoOverride:true});
   if(!vr.ok){toast(vr.missing[0],'alert');window.__cxDOLast=vr;break}const rl=vr.reason.label,nx=vr.next;
   C.update(()=>{C.ops.fail(id,rl,nx.next,nt+(nm?` · ${nm}`:''),d.name);C.ops.tick(3);const T=C.task(id);if(T){T.x=T.x||{};T.x.attempt={reason:vr.reason.id,edi:vr.reason.edi,next:nx.code,why:nx.why,photo:!!cap.photos.exc,at:C.S.clock}}enrichPod(C.task(id),'fail',{notes:nt,placement:rl,receivedBy:rl},d)});
   if(window.CXI)CXI.emit({type:'attempted',taskId:id,actor:d.name,extra:{reason:rl,reason_code:vr.reason.id,next_action:nx.code,notes:nt},ll:d.loc});toast(`${rl} → ${nx.next}`,'alert');afterStop(id,true);break}
  const id=modal.id,r=cap.reason,n=$('#dvna').value,nt=$('#dvcn').value;if(!r){toast('Choose what happened');break}C.update(()=>{C.ops.fail(id,r,n,nt,d.name);C.ops.tick(3);enrichPod(C.task(id),'fail',{notes:nt,placement:r,receivedBy:r},d)});if(window.CXI)CXI.emit({type:'attempted',taskId:id,actor:d.name,extra:{reason:r,notes:nt},ll:d.loc});afterStop(id,true);break}
 case 'stop':openModal('stop',v);break;
 case 'mclose':closeModal();break;
 case 'call':toast('Calling through a masked number (pilot)','phone');break;
 case 'call911':toast('Pilot: would dial 911','phone');break;
 case 'sos':openModal('sos');break;
 case 'soson':C.update(()=>C.ops.sos(w,true));drawModal();top();toast('SOS sent · Dispatch alerted','sos');break;
 case 'sosoff':C.update(()=>C.ops.sos(w,false));drawModal();top();toast('SOS cancelled');break;
 case 'coopen':ui.coOpen=ui.coOpen===v?null:v;render();break;
 case 'coscan':{const all=retItems();let x;if(v==='typed'){const val=(($('#dvcobc')||{}).value||'').trim().toUpperCase();x=all.find(y=>y.p.id.toUpperCase()===val);if(!x){toast(val?'Not on your leftover list':'Type a barcode','alert');break}}else if(v){const pid=v.split('|')[1];x=all.find(y=>y.p.id===pid)}else x=all.find(y=>!co(y.p).scan&&co(y.p).out!=='missing');if(!x)break;
  const was=co(x.p).out;coSet([[x.t.id,x.p.id]],{scan:true,scanAt:C.S.clock,out:was==='missing'?null:(was||null)});ui.coOpen=x.p.id;haptic();render();toast(`✓ ${x.p.id} · ${word()} ${no(x.t)} · choose what happens`,'scan');setTimeout(()=>{const e=document.getElementById('co-'+x.p.id);e&&e.scrollIntoView({block:'center',behavior:'smooth'})},40);break}
 case 'coout':{const [tid,pid,o]=v.split('|');coSet([[tid,pid]],o==='missing'?{out:'missing',scan:false}:{out:o});if(o!=='handoff'&&ui.coOpen===pid)ui.coOpen=null;render();if(o==='missing')toast('Marked missing · Dispatch gets a ticket at close','alert');break}
 case 'coundo':{const [tid,pid]=v.split('|');coSet([[tid,pid]],{out:null});ui.coOpen=pid;render();break}
 case 'coall':{const l=retItems().filter(x=>co(x.p).scan&&!co(x.p).out).map(x=>[x.t.id,x.p.id]);coSet(l,{out:v});render();toast(`${l.length} set to ${COL[v]}`,'check');break}
 case 'cophoto':{if(v==='veh')C.update(()=>{const dd=C.driver(w);dd.route.coVeh=Object.assign({},dd.route.coVeh||{},{photo:coPic('Vehicle · what is left')})});else{const [tid,pid]=v.split('|');coSet([[tid,pid]],{photo:coPic(pid)})}haptic();render();toast('Photo added','camera');break}
 case 'returnhub':stopNav();ui.coOpen=null;C.update(()=>C.ops.returnHub(w));render();break;
 case 'closeroute':{const all=retItems();if(all.some(x=>!coDone(x))){toast('Scan or mark every item and choose what happens to it','lock');break}if(!coEvOk(all)){toast('Add a photo or a note of what is left','camera');break}
  let rec;C.update(S=>{const dd=C.driver(w),left=retItems(),sum=coSum(left),items=[],miss=[],dmg=[];
   left.forEach(x=>{const T=C.task(x.t.id),q=T.items.find(p=>p.id===x.p.id),c=q.co||{},lbl=COL[c.out]||c.out;(q.events=q.events||[]).push({type:'Close-out · '+lbl+(c.to?' → '+c.to:''),at:S.clock,where:'Route close-out',actor:dd.name});
    if(['return','retry','damaged','refused'].includes(c.out))C.ops.returnScan(w,q.id);if(c.out==='missing')miss.push(q.id);if(c.out==='damaged')dmg.push(q.id);if(c.out==='handoff')q.handedTo=c.to;
    T.nextAction=c.out==='retry'?'Re-attempt next business day':c.out==='handoff'?'Handed to '+c.to:c.out==='missing'?'Lost / missing · Dispatch investigating':c.out==='damaged'?'Damaged · claim review':c.out==='refused'?'Refused · return to shipper':'Return to warehouse';
    items.push({pid:q.id,tid:T.id,stop:no(x.t),name:T.name,outcome:c.out,label:lbl,scanned:!!c.scan,photo:!!c.photo,note:c.note||'',to:c.to||''})});
   rec={id:'CO-'+dd.route.id+'-D'+(S.dayOffset||0),wid:w,driver:dd.name,route:dd.route.id,line:dd.line,hub:dd.hub||'',hubName:dd.hubName||'',at:S.clock,day:S.dayOffset||0,summary:sum,items,vehicle:{photo:!!(dd.route.coVeh||{}).photo,note:(dd.route.coVeh||{}).note||''},status:miss.length?'Needs dispatch':items.some(i=>i.outcome!=='handoff')?'Awaiting warehouse check-in':'Closed'};
   S.closeouts=(S.closeouts||[]).filter(r=>r.id!==rec.id);S.closeouts.unshift(rec);S.closeouts.length=Math.min(S.closeouts.length,60);dd.route.closeout={id:rec.id,at:rec.at,summary:sum,status:rec.status};
   if(miss.length&&C.ops.botIssue)C.ops.botIssue(w,'other',null,`Close-out: ${miss.length} missing (${miss.join(', ')})`);
   if(dmg.length&&C.ops.botIssue)C.ops.botIssue(w,'damaged',null,`Close-out: ${dmg.length} damaged (${dmg.join(', ')})`);
   C.ops.closeRoute(w)});
  ui.coOpen=null;save();if(window.CXI&&rec){CXI.emit({type:'closed_out',actor:d.name,extra:{route:d.route.id,id:rec.id,summary:rec.summary}});(rec.items||[]).forEach(it=>{if(['return','retry','refused'].includes(it.outcome))CXI.emit({type:'returned',taskId:it.tid,pkg:it.pid,actor:d.name,extra:{outcome:it.outcome}})})}render();toast(d.line==='shuttle'?'Shift closed out':'Route closed · close-out sent to Dispatch','check');break}
 case 'repeat':{let id;C.update(()=>{id=DC().repeat(D(),C.S,v)});const t=id&&C.task(id);toast(t?`Repeat trip added · departs ${fmt(t.x.dep)}`:'Could not add trip',t?'check':'alert');render();break}
 case 'issue':C.update(()=>C.ops.botIssue(w,v,cur()&&cur().id,''));render();toast('Sent to Dispatch','check');break;
 case 'send':{const i=$('#dvmsg'),txt=i&&i.value.trim();if(!txt)break;C.update(()=>C.ops.msgSend(w,'driver',txt,d.name));render();break}
 case 'set':ui.set[v]=!ui.set[v];if(v==='autoLight'&&!ui.set.autoLight&&camSess){camSess.torchManual=null;if(camSess.torchOn&&camSess.setTorch)camSess.setTorch(false).catch(()=>{})}save();render();break;
 case 'autonav':ui.autoNav=!ui.autoNav;save();render();break;
 case 'install':if(window.__bip){__bip.prompt();window.__bip=null}else toast(/iPhone|iPad/.test(navigator.userAgent)?'Tap Share, then Add to Home Screen':'Use the browser menu: Install app / Add to Home Screen','plus');break;
 case 'nact':{if(!window.CXI)break;const [id,act]=(v||'').split('|');const n=CXI.notesFor(W()).find(x=>x.id===id);if(n&&n.kind==='ondemand'){const a=CXI.answerOnDemand(id,act||'accept');toast(a==='accepted'?'Offer accepted':'Offer declined',a==='accepted'?'check':'power')}else CXI.markRead(id);render();break}
 case 'pushask':if(window.CXI)CXI.requestPush().then(s=>toast(s==='granted'?'Notifications allowed':'Notifications '+s,'bell')).then(()=>render());break
 case 'flushout':if(window.CXI){const r=CXI.flushOutbox(),n=r&&r.flushed;toast(n?'Synced '+n+' scan'+(n>1?'s':''):'No pending scans','check');render()}break
}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled||b.tagName==='A')return;e.preventDefault();act(b.dataset.a,b.dataset.v)});
let coT=null;document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||t.dataset.cono==null)return;const k=t.dataset.cono,val=t.value.slice(0,280);clearTimeout(coT);coT=setTimeout(()=>{if(k==='veh')C.update(()=>{const dd=C.driver(W());dd.route.coVeh=Object.assign({},dd.route.coVeh||{},{note:val})});else{const [tid,pid]=k.split('|');coSet([[tid,pid]],{note:val})}coRefresh()},350)});
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.cohand==null)return;const [tid,pid]=t.dataset.cohand.split('|');coSet([[tid,pid]],{to:t.value});if(t.value&&ui.coOpen===pid)ui.coOpen=null;render()});
document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(e.target.id==='dvcobc'){act('coscan','typed');return}if(e.target.id==='dvmsg')act('send');else if(e.target.id==='dvlbc')act('lscan','typed');else if(e.target.id==='dvaa')act('addrgo');else if(e.target.id==='dvid')act('signin')});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__bip=e});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});
C.subscribe(()=>{if(modal||navTimer)return;const ae=document.activeElement;if(ae&&ae.matches&&ae.matches('input.in'))return;render()});
addEventListener('v5-theme',()=>{if(D())render()});
let fullT=0;addEventListener('cx-storage-full',()=>{if(Date.now()-fullT<8000)return;fullT=Date.now();toast("This phone's browser storage is full, so changes may not save. Settings → Reset sample day.",'alert')});
/* ---------- sheet drag, iOS scroll lock, resume, error recovery ---------- */
let sheetHold=false,sheetDrag=null,sheetTapped=0;
function toggleSheet(to){const sh=$('#dvsheet');if(!sh||sh.hidden)return;ui.sheet=to||(ui.sheet==='full'?'peek':'full');sh.classList.toggle('full',ui.sheet==='full');sh.classList.toggle('peek',ui.sheet!=='full');sh.style.transform='';sh.classList.remove('drag');save();try{map&&map.resize()}catch(e){}}
function endSheetPtr(){if(!sheetDrag){sheetHold=false;return}const d=sheetDrag;sheetDrag=null;sheetHold=false;const sh=$('#dvsheet');if(sh){sh.classList.remove('drag');sh.style.transform='';try{if(d.pid!=null)sh.releasePointerCapture(d.pid)}catch(e){}}
  if(d.pending&&!d.moved)return;
  if(d.moved&&Math.abs(d.dy)>28)toggleSheet(d.dy<0?'full':'peek');else if(!d.moved){toggleSheet();sheetTapped=Date.now()}else toggleSheet(ui.sheet)}
function bindSheet(){const host=$('#dv');if(!host||host._cxSheet)return;host._cxSheet=1;
  const arm=sh=>{sheetHold=true;sh.classList.add('drag');try{if(sheetDrag&&sheetDrag.pid!=null)sh.setPointerCapture(sheetDrag.pid)}catch(x){}};
  const onDown=e=>{const sh=$('#dvsheet');if(!sh||sh.hidden||!sh.contains(e.target))return;
    if(e.target.closest('button,a,input,textarea,select,label,canvas,.dv-sig')){
      const grab=!!e.target.closest('.dv-grab');if(!grab)return}
    const grab=!!e.target.closest('.dv-grab');const top=sh.getBoundingClientRect().top;const onHead=e.clientY<=top+48&&!e.target.closest('#dvsb button, #dvsb a, #dvsb input');
    const sb=$('#dvsb');const pullEdge=sb&&sb.contains(e.target)&&sb.scrollTop<=0;
    if(!grab&&!onHead&&!pullEdge)return;
    sheetDrag={y:e.clientY,dy:0,moved:false,pid:e.pointerId,grab,pending:!grab&&!onHead};
    if(!sheetDrag.pending)arm(sh)};
  const onMove=e=>{if(!sheetDrag)return;const dy=e.clientY-sheetDrag.y;if(Math.abs(dy)>8)sheetDrag.moved=true;sheetDrag.dy=dy;
    const sh=$('#dvsheet');if(!sh)return;
    if(sheetDrag.pending){if(Math.abs(dy)<10)return;sheetDrag.pending=false;arm(sh)}
    const cap=Math.max(-220,Math.min(220,dy));sh.style.transform='translateY('+cap+'px)';e.preventDefault()};
  const onUp=e=>{if(!sheetDrag)return;endSheetPtr()};
  host.addEventListener('pointerdown',onDown,{passive:true});
  host.addEventListener('pointermove',onMove,{passive:false});
  host.addEventListener('pointerup',onUp,{passive:true});
  host.addEventListener('pointercancel',onUp,{passive:true});
  host.addEventListener('lostpointercapture',()=>{if(sheetDrag)endSheetPtr()});
}
function recoverUi(err){try{endSheetPtr()}catch(e){}try{sheetHold=false;const sh=$('#dvsheet');if(sh){sh.classList.remove('drag');sh.style.transform=''}}catch(e){}
  try{if(modal){const m=$('#dvmodal');if(m&&!m.classList.contains('on'))modal=null}}catch(e){}
  try{map&&map.resize()}catch(e){}
  try{if(window.V5&&V5.toast&&err)V5.toast('The screen recovered. Try that again.','alert')}catch(e){}}
function lockIosScroll(){if(document._cxLock)return;document._cxLock=1;
  document.addEventListener('touchmove',e=>{if(sheetDrag){e.preventDefault();return}
    if(e.target.closest&&e.target.closest('#dvmap,.maplibregl-canvas,canvas.dv-sig,.dv-sig'))return;
    const sc=e.target.closest&&e.target.closest('.dv-sb,.dv-scr.solid,.dv-mc,.dv-wel,.cx-tt-panel,.cxi-terms-c,.cxi-terms-body,.rx-sheet,.rx-job,textarea,input.in');
    if(sc){if(sc.scrollHeight>sc.clientHeight+1)return;e.preventDefault();return}
    if(e.target.closest&&e.target.closest('.dv-sheet,.dv-modal.on,.dv-tabs'))return;
    e.preventDefault()},{passive:false});
}
function onResume(){try{endSheetPtr()}catch(e){}try{fitShell()}catch(e){}try{map&&map.resize()}catch(e){}try{if(camSess&&camEl&&camEl.srcObject)camEl.play().catch(()=>{})}catch(e){}}
addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onResume()});
addEventListener('pageshow',onResume);
addEventListener('orientationchange',()=>setTimeout(onResume,250));
addEventListener('focus',onResume);
addEventListener('error',e=>{try{recoverUi(e&&e.error||e)}catch(x){}});
addEventListener('unhandledrejection',e=>{try{recoverUi(e&&e.reason)}catch(x){}});
const _act=act;act=function(){try{return _act.apply(this,arguments)}catch(err){console.warn('driver act',err);try{recoverUi(err)}catch(x){}}};
mount();C.init();bindSheet();lockIosScroll();bindCleanExit();fitShell();render();
const _fit=()=>{fitShell();try{map&&map.resize()}catch(e){}};
addEventListener('resize',_fit);
if(window.visualViewport){visualViewport.addEventListener('resize',_fit);visualViewport.addEventListener('scroll',_fit)}



function cxEmitScan(T,s,d){if(!window.CXI||!T)return;const type=s.kind==='pod'||s.kind==='sign'?'delivered':s.kind==='scan'&&(s.id==='arrive'||s.effect==='arrive'||/arriv/i.test(s.label||''))?'arrived':s.kind==='scan'?'loaded':s.kind==='photo'?'exception':null;if(!type)return;const ev={type,taskId:T.id,actor:d&&d.name,ll:d&&d.loc,payload:{step:s.kind,label:s.label},idem:'scan:'+T.id+':'+s.kind+':'+((s.label||'')+'')};
  if(typeof navigator!=='undefined'&&navigator.onLine===false){CXI.enqueueScan(ev);if(typeof toast==='function')toast('Saved offline · will sync when you are back online','scan');return}
  CXI.emit(type,ev)}
function notifBlock(){if(!window.CXI)return '';const notes=CXI.notesFor(W()).slice(-12).reverse();if(!notes.length)return '';
  return `<div class="dv-card" id="dvnotes"><div class="dv-eyebrow">Notifications</div>${notes.map(n=>`<div class="cx-note ${n.offerStatus||n.read&&'read'||''}" data-nid="${n.id}"><div><b>${esc(n.title)}</b><div class="t3" style="font-size:12px;margin-top:2px">${esc(n.body||'')}</div></div>${n.kind==='ondemand'&&n.offerId&&!n.offerStatus?`<div style="display:flex;gap:6px;margin-top:8px"><button class="btn sm pri" data-a="nact" data-v="${n.id}|accept">Accept</button><button class="btn sm" data-a="nact" data-v="${n.id}|decline">Decline</button></div>`:n.offerStatus?`<div class="t3" style="margin-top:6px">${esc(n.offerStatus)}</div>`:''}</div>`).join('')}</div>`}
function integSettings(){if(!window.CXI)return '';const p=CXI.pendingCount(),perm=(typeof Notification!=='undefined'&&Notification.permission)||'default';
  return `<div class="dv-card"><div class="dv-eyebrow">Notifications</div><div class="t2" style="font-size:13px">In-app alerts are on. Real push when the app is closed needs a ChainEx push server (not on this public pilot).</div><button class="btn sm" data-a="pushask" style="margin-top:8px">${perm==='granted'?'Notifications allowed':'Allow notifications'}</button></div>
  <div class="dv-card"><div class="dv-eyebrow">Offline scans</div><div class="t2" style="font-size:13px">${p?p+' pending · they will sync when you are back online.':'None pending.'}</div>${p?`<button class="btn sm" data-a="flushout" style="margin-top:8px">Sync now</button>`:''}</div>`}
let gpsWatch=null,gpsTimer=null;
function startGps(){if(!navigator.geolocation)return;const apply=pos=>{const fix={ll:[pos.coords.longitude,pos.coords.latitude],acc:pos.coords.accuracy,at:new Date().toISOString(),source:'live'};if(window.CXI&&W())CXI.setGps(W(),fix);try{const buf=JSON.parse(sessionStorage.getItem('cx.v06.gpsbuf')||'[]');buf.push(fix);sessionStorage.setItem('cx.v06.gpsbuf',JSON.stringify(buf.slice(-40)))}catch(e){}};
  const fail=()=>{};
  const interval=async()=>{try{if(navigator.getBattery){const b=await navigator.getBattery();return b.charging?10000:b.level<0.2?60000:30000}}catch(e){}return 30000};
  const arm=ms=>{if(gpsWatch!=null)try{navigator.geolocation.clearWatch(gpsWatch)}catch(e){}gpsWatch=navigator.geolocation.watchPosition(apply,fail,{enableHighAccuracy:true,maximumAge:ms,timeout:20000})};
  arm(15000);interval().then(arm)}
function tickDriverNotes(){if(!window.CXI||!D()||!D().duty)return;CXI.checkDriverNotes(D())}
if(!window.__cxDrvInteg){window.__cxDrvInteg=1;
  if(C.ops&&C.ops.msgSend&&!C.ops._cxiMsg){const _ms=C.ops.msgSend;C.ops._cxiMsg=1;C.ops.msgSend=function(wid,from,txt,who){const r=_ms.apply(this,arguments);try{if(window.CXI&&from&&from!=='driver')CXI.addNote({wid,kind:'dispatch',tag:'msg:'+Date.now(),title:'Message from dispatch',body:txt||''})}catch(e){}return r}}
  addEventListener('online',()=>{if(window.CXI){const r=CXI.flushOutbox(),n=r&&r.flushed;if(n)toast('Synced '+n+' offline scan'+(n>1?'s':''),'check')}});
  addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')try{localStorage.setItem('cx.v06.lastOpen',String(Date.now()))}catch(e){}});
  setInterval(tickDriverNotes,60000);
  C.init&&null;
  setTimeout(()=>{const d=D();if(d&&d.duty)startGps();if(d&&window.CXI){if(CXI.needsTerms('driver',d.id))CXI.showTermsOverlay('driver',d.id,d.name);CXI.offerOnDemand(d.id);if(navigator.onLine!==false)CXI.flushOutbox()}},400)}

function bindCleanExit(){const host=$('#dv');if(!host||host._cxVer)return;host._cxVer=1;let t=0;
  const clear=()=>{if(t){clearTimeout(t);t=0}};
  host.addEventListener('pointerdown',e=>{const v=e.target.closest&&e.target.closest('#dvver');if(!v)return;clear();t=setTimeout(()=>{t=0;if(!isClean())return;applyClean(false);if(window.CXTT&&CXTT.setClean)CXTT.setClean(false);try{render()}catch(x){}toast('Pilot tools are back on')},700)},{passive:true});
  host.addEventListener('pointerup',clear,{passive:true});host.addEventListener('pointercancel',clear,{passive:true});host.addEventListener('pointerleave',clear,{passive:true})}
function resetMem(){try{stopCam()}catch(e){}try{stopNav()}catch(e){}camWant=false;openLoad=false;leg=null;fitKey='';try{closeModal()}catch(e){}ui.plan={mode:null,seq:[],ends:[]};ui.last=null;ui.hit=false;ui.planOpen=false;ui.lc=null;ui.self=false;ui.coOpen=null;ui.scanLog=[];try{endSheetPtr()}catch(e){}}
window.__v5drv={act,toggleSheet,applyClean,isClean,fitShell,get sheetHold(){return sheetHold},get ui(){return ui},render,cur,pk,R,D,get modal(){return modal},resetMem,closeUi:()=>{try{stopCam()}catch(e){}try{stopNav()}catch(e){}camWant=false;try{closeModal()}catch(e){}leg=null;fitKey='';try{endSheetPtr()}catch(e){}},setOpenLoad:v=>{openLoad=!!v},afterReset:()=>{try{stopCam()}catch(e){}try{stopNav()}catch(e){}camWant=false;leg=null;fitKey='';try{closeModal()}catch(e){}try{endSheetPtr()}catch(e){}render();if(window.CXTT)CXTT.paint()}};
})();
