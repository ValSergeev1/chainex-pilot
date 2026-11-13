/* ChainEx driver app (V03, built on the V02 app) · extra flow for P&D and Bulky only.
   plan  · the route map opens right after going on duty: Best route for me / I'll set the order / Pick my first and last stop.
   load  · mandatory load-out scan: every package scanned (or flagged missing/damaged -> Dispatch ticket) before Start route.
           Each scan shows "Stop 14 of 80" and where it goes in the vehicle so the driver loads in delivery order.
   drive · one-screen in-app navigation: turn banner + map + bottom sheet. Arrival opens the V02 delivery steps as sheets
           over the same map, then it routes straight to the next stop. White glove, LTL and Shuttle never reach this file. */
(function(){
const LINES=['pd','bulky'];
const X=()=>window.__drvI,esc=s=>CX.esc(s),fmt=t=>CX.fmt(t);
const I=(n,s)=>X().I(n,s||18);
let host=null,map=null,fitK='',leg=null,timer=null,cd=null,locTick=0;
const st=()=>{const u=X().ui;u.dp=u.dp||{mode:'menu',seq:[],ends:[],near:null,last:null,sim:true,follow:true,next:null,paused:false};return u.dp};
const save=()=>X().save();
const drives=l=>LINES.includes(l);
const D=()=>X().D(),R=()=>X().R(),W=()=>X().W();
function takes(s){const x=X();if(!x)return false;const d=x.D();return !!d&&drives(d.line)&&['plan','load','drive'].includes(s)}
function key(){return X().ui.screen+'|'+st().mode}
const pre=()=>['not_started','loading'].includes(D().route.stage)||!D().route.stage;
const assigned=()=>R().filter(t=>t.state==='assigned');
const deliv=()=>R().filter(t=>t.kind!=='pickup').sort((a,b)=>a.seq-b.seq);
const pk=()=>deliv().flatMap(t=>t.items.map(p=>({p,t})));
const hubLL=()=>(CX.S.hubs[D().hub]||{}).ll;
const startLL=()=>pre()?(hubLL()||D().loc):(D().loc||hubLL());
const toast=m=>X().toast(m);
/* ---------- ordering ---------- */
const km=(a,b)=>{const r=x=>x*Math.PI/180;const dl=r(b[1]-a[1]),dn=r(b[0]-a[0]);const h=Math.sin(dl/2)**2+Math.cos(r(a[1]))*Math.cos(r(b[1]))*Math.sin(dn/2)**2;return 12742*Math.asin(Math.sqrt(h))};
function optimize(start,ts,end){const left=ts.slice(),out=[];let p=start;while(left.length){let bi=0,bd=1e9;left.forEach((t,i)=>{const d=km(p,t.ll);if(d<bd){bd=d;bi=i}});p=left[bi].ll;out.push(left.splice(bi,1)[0])}
 const len=o=>o.reduce((a,t,i)=>a+km(i?o[i-1].ll:start,t.ll),0)+(end&&o.length?km(o[o.length-1].ll,end):0);let best=len(out),imp=true,g=0;
 while(imp&&g++<25){imp=false;for(let i=0;i<out.length-1;i++)for(let k=i+1;k<out.length;k++){const n=out.slice(0,i).concat(out.slice(i,k+1).reverse(),out.slice(k+1));const l=len(n);if(l<best-1e-6){out.splice(0,out.length,...n);best=l;imp=true}}}return out}
function applyOrder(ids,why){const w=W();CX.update(()=>{CX.ops.submitRouteEdit(w,{order:ids,skipped:[],notes:{},pins:{},issues:[],first:ids[0],last:ids[ids.length-1],locked:[]});const d=CX.driver(w);if(d.route.edit){d.route.edit.via=why;d.route.edit.applied=true}});st().how=why;save()}
function checkin(){const w=W();if(!X().elig().ok){toast('Blocked · '+X().elig().reasons.join(' · '));return false}CX.update(()=>{const d=CX.driver(w);if(!d.duty)CX.ops.duty(w,true);if(d.route.checkin!=='arrived')CX.ops.checkin(w,'arrived')});return true}
/* ---------- vehicle position for the load scan ---------- */
function slot(t){const ds=deliv(),n=ds.length||1,i=Math.max(0,ds.findIndex(x=>x.id===t.id));const part=i<n/3?'Rear, by the door':i<2*n/3?'Middle':'Front, behind the seat';
 if(D().line==='bulky')return {big:`Floor ${i<n/3?'rear':i<2*n/3?'middle':'front'}`,txt:`${part} · ${i<n/3?'goes on last':'goes on early'}`};
 const per=Math.max(1,Math.ceil(n/6)),shelf=String.fromCharCode(65+Math.min(5,Math.floor(i/per)));return {big:`Shelf ${shelf}`,txt:`${part} · ${i%2?'right':'left'} side`}}
/* ---------- map ---------- */
function mount(slotEl,mode){const d=D();if(!host){host=document.createElement('div');host.className='dp-maphost';map=new CXMap(host,{center:startLL()||d.loc,zoom:12,controls:false,pad:()=>({top:mode==='drive'?150:96,left:28,right:56,bottom:mode==='drive'?250:330}),onPin:id=>tapPin(id),onMap:()=>{}})}
 slotEl.appendChild(host);const s=st(),r=R(),k=mode+'|'+W()+'|'+s.mode+'|'+(leg?leg.id:'');const refit=k!==fitK;fitK=k;
 if(mode==='drive')drawDrive(refit);else map.set(planData(refit));requestAnimationFrame(()=>map&&map.resize())}
function planData(refit){const s=st(),r=R(),d=D();let pins,line=[];
 if(s.mode==='seq'){pins=r.map(t=>{const i=s.seq.indexOf(t.id);return t.state!=='assigned'?{id:t.id,ll:t.ll,state:t.state,label:'✓',cls:'dp-pin dp-lock'}:{id:t.id,ll:t.ll,state:'assigned',label:i>=0?String(i+1):'',cls:'dp-pin '+(i>=0?'dp-set':'dp-hollow')+(i>=0&&i===s.seq.length-1?' dp-lastset':''),title:t.name}});line=[startLL(),...s.seq.map(id=>CX.task(id).ll)]}
 else if(s.mode==='ends'){pins=r.map(t=>{const f=s.ends[0]===t.id,l=s.ends[1]===t.id;return{id:t.id,ll:t.ll,state:t.state,label:f?'1st':l?'Last':'',cls:'dp-pin '+(f?'dp-first':l?'dp-lastp':'dp-hollow'),title:t.name}})}
 else{pins=r.map(t=>({id:t.id,ll:t.ll,state:t.state,label:String(t.seq+1),cls:'dp-pin',title:t.name}));line=[startLL(),...assigned().map(t=>t.ll)]}
 return {pins,lines:line.length>1?[{sel:true,coords:line.filter(Boolean)}]:[],drivers:[{id:d.id,ll:d.loc||startLL(),name:'You'}],fitTo:[hubLL(),...r.map(t=>t.ll)].filter(Boolean),refit}}
function tapPin(id){const s=st(),scr=X().ui.screen;if(scr==='drive'){X().openSheet('stop',id);return}
 if(s.mode==='menu'){X().openSheet('stop',id);return}
 const t=CX.task(id);if(!t)return;if(t.state!=='assigned'){toast('Already '+X().stLabel(t).toLowerCase());return}
 const near=assigned().filter(x=>x.id!==id&&km(x.ll,t.ll)<0.03);if(near.length&&!s.near){s.near=[id,...near.map(x=>x.id)];save();X().render();return}
 pick(id)}
function pick(id){const s=st();s.near=null;
 if(s.mode==='seq'){const i=s.seq.indexOf(id);if(i>=0){s.seq.splice(i,1);toast('Took out · '+(s.seq.length)+' placed')}else{s.seq.push(id);X().fx('ok')}}
 else if(s.mode==='ends'){const e=s.ends;if(e[0]===id)e[0]=null;else if(e[1]===id)e[1]=null;else if(!e[0])e[0]=id;else e[1]=id;s.ends=e;X().fx('ok')}
 save();X().render()}
/* ---------- views ---------- */
function top(title,sub,back,right){return `<div class="dp-top"><button class="dp-ib" data-p="${back}" aria-label="Back">${I('back',18)}</button><div class="dp-tt"><b>${title}</b><small>${sub}</small></div>${right||''}</div>`}
function vPlan(){const d=D(),s=st(),all=R(),as=assigned(),n=as.length,P=all.filter(t=>t.kind==='pickup').length,ci=d.route.checkin,stg=d.route.stage;let body='';
 if(s.mode==='seq'){const k=s.seq.length;body=`<div class="eyebrow">I'll set the order</div><h3 class="dp-h">Tap stops in the order you'll drive</h3>
  <p class="dp-p" id="dpSeqMsg">${k?`<b>${k} of ${n}</b> placed. Tap a numbered stop again to take it out.`:'Tap your first stop. Numbers fill in as you tap.'}</p><div class="dp-bar"><i style="width:${n?Math.round(k/n*100):0}%"></i></div>
  <div class="dp-row"><button class="pillbtn out" data-p="undo" id="dpUndo" ${k?'':'disabled'}>Undo</button><button class="pillbtn out" data-p="clear" id="dpClear" ${k?'':'disabled'}>Clear</button><button class="pillbtn out" data-p="list" id="dpList">Pick from list</button></div>
  <button class="pillbtn" id="dpSave" data-p="saveseq" ${k?'':'disabled'}>${k&&k<n?`Save · ChainEx orders the other ${n-k}`:'Save my order'}</button><button class="linkbtn" data-p="menu">Cancel</button>`}
 else if(s.mode==='ends'){const f=s.ends[0]&&CX.task(s.ends[0]),l=s.ends[1]&&CX.task(s.ends[1]);body=`<div class="eyebrow">Pick my first and last stop</div><h3 class="dp-h" id="dpEndsMsg">${!f?'Tap your first stop':!l?'Now tap your last stop':'Ready to plan the middle'}</h3>
  <div class="dp-ends"><div class="${f?'on':''}"><span>First</span><b>${f?esc(f.name):'—'}</b>${f?`<small>${esc(f.address)}</small>`:''}</div><div class="${l?'on':''}"><span>Last</span><b>${l?esc(l.name):'—'}</b>${l?`<small>${esc(l.address)}</small>`:''}</div></div>
  <div class="dp-row"><button class="pillbtn out" data-p="list" id="dpList">Pick from list</button><button class="pillbtn out" data-p="endsclear" ${f||l?'':'disabled'}>Clear</button></div>
  <button class="pillbtn" id="dpPlanMid" data-p="planmid" ${f&&l?'':'disabled'}>Plan the middle</button><button class="linkbtn" data-p="menu">Cancel</button>`}
 else{const ed=d.route.edit;const note=ed&&ed.applied?`<div class="dp-ok" id="dpOrderOk">${I('check',15)} Your order is saved (${esc(ed.via||s.how||'your plan')}) · Dispatch sees it</div>`:`<div class="dp-note">Stops are in Dispatch's order. Change it any time before you leave.</div>`;
  const next=stg==='loading'||ci==='arrived'?`<button class="pillbtn big" id="dpToLoad" data-p="toload">${I('box',17)} Start load scan</button>`:ci==='on_my_way'?`<button class="pillbtn big" id="dpArr" data-p="arrhub">I'm at ${esc(X().hubName())}</button>`:`<button class="pillbtn big" id="dpOmw" data-p="omw">On my way to ${esc(X().hubName().replace(/^ChainEx /,''))}</button>`;
  body=`<div class="eyebrow">Plan your route</div><h3 class="dp-h">How do you want to run today?</h3>${note}
  <div class="dp-opts"><button class="dp-opt" id="dpBest" data-p="best">${I('bolt',20)}<span><b>Best route for me</b><small>ChainEx puts every stop in the fastest order.</small></span></button>
  <button class="dp-opt" id="dpMine" data-p="mine">${I('pin',20)}<span><b>I'll set the order</b><small>Tap stops on the map, one by one, in the order you'll drive.</small></span></button>
  <button class="dp-opt" id="dpEnds" data-p="ends">${I('nav',20)}<span><b>Pick my first and last stop</b><small>Choose where you start and finish. ChainEx plans the middle.</small></span></button></div>
  ${X().elig().ok?'':`<div class="policy bad" style="margin-top:8px">Not eligible for dispatch · ${esc(X().elig().reasons.join('; '))}</div>`}
  ${next}<button class="linkbtn" data-a="reditopen" data-v="plan" id="dpAdv">More tools: skip a stop, notes, fix a pin</button>`}
 const near=s.near?`<div class="dp-near" id="dpNear"><div class="dp-nh"><b>${s.near.length} stops at this spot</b><button class="closebtn" data-p="nearx">Close</button></div>${s.near.map(id=>{const t=CX.task(id),i=s.seq.indexOf(id);return `<button data-p="pickid" data-v="${id}"><span class="dp-no">${s.mode==='seq'&&i>=0?i+1:'+'}</span><span><b>${esc(t.name)}</b><small>${esc(t.address)} · ${t.items.length} ${esc(X().unitW())}</small></span></button>`}).join('')}</div>`:'';
 return `<div class="dp dp-plan">${top(`Route ${esc(d.route.id)}`,`${all.length} stops · ${pk().length} ${esc(X().unitW())}${P?` · ${P} pickup${P>1?'s':''}`:''} · ${esc(X().hubName())}`,'today',`<button class="dp-ib" data-p="fit" aria-label="Show whole route">${I('map',18)}</button><button class="dp-ib" data-a="openset" id="gearBtn" aria-label="Settings">${I('gear',18)}</button>`)}<div class="dp-map" id="dpslot"></div>${near}<div class="dp-sheet" id="dpSheet"><i class="dp-grab"></i>${body}</div></div>`}
function vLoad(){const s=st(),all=pk(),ok=all.filter(x=>x.p.loaded),fl=all.filter(x=>!x.p.loaded&&x.p.loadFlag),left=all.filter(x=>!x.p.loaded&&!x.p.loadFlag),n=all.length,pct=n?Math.round((ok.length+fl.length)/n*100):100,ready=!left.length,ds=deliv();
 const L=s.last&&CX.task(s.last.tid);const sl=L&&slot(L);
 const last=L?`<div class="dp-last" id="dpLast"><div class="dp-stopno">Stop <b>${ds.findIndex(t=>t.id===L.id)+1}</b> of ${ds.length}</div><div class="dp-lname">${esc(L.name)} · ${esc(L.address)}</div><div class="dp-slot"><b>${esc(sl.big)}</b><span>${esc(sl.txt)}</span></div><small>✓ ${esc(s.last.pid)} loaded · ${L.items.filter(p=>p.loaded).length} of ${L.items.length} for this stop</small></div>`
  :`<div class="dp-last empty" id="dpLast"><div class="dp-stopno">Scan your first package</div><div class="dp-lname">Its stop number and where it goes in your vehicle show here, so you load in delivery order.</div></div>`;
 const rows=left.slice().sort((a,b)=>b.t.seq-a.t.seq);
 return `${X().appH()}<div class="body tight dp-load"><div class="eyebrow">Load-out scan · ${esc(X().hubName())}</div><div class="h1" style="font-size:22px">Scan every package before you leave</div>
 ${last}
 <div class="scanbox"><div class="r"><input class="input" id="dpbc" placeholder="Scan or type a package ID" autocomplete="off"><button class="btn blue" data-p="bc" id="dpScanBtn">Scan</button></div>
  <div class="dp-row" style="margin-top:8px"><button class="btn" data-p="cam" id="dpCam">${I('box',14)} Use camera</button><button class="btn" data-p="all" id="dpAll">Scan all (pilot)</button></div></div>
 <div class="prog" id="dpProg">${ok.length} of ${n} loaded${fl.length?` · ${fl.length} flagged`:''} · ${left.length} left<div class="bar"><i style="width:${pct}%"></i></div></div>
 ${rows.length?`<div class="shsec"><h4 style="font-size:13px">Still to scan (${rows.length}) · load in this order</h4>${rows.slice(0,40).map(x=>{const z=slot(x.t);return `<div class="dp-pk" data-pid="${esc(x.p.id)}"><span><b>${esc(x.p.id)}</b><small>Stop ${ds.findIndex(t=>t.id===x.t.id)+1} · ${esc(x.t.name)} · ${esc(z.big)}</small></span><button class="btn" data-p="flag" data-v="missing|${esc(x.p.id)}">Missing</button><button class="btn" data-p="flag" data-v="damaged|${esc(x.p.id)}">Damaged</button></div>`}).join('')}${rows.length>40?`<div class="tiny muted">+${rows.length-40} more</div>`:''}</div>`:''}
 ${fl.length?`<div class="shsec" id="dpFlagged"><h4 style="font-size:13px">Flagged · sent to Dispatch</h4>${fl.map(x=>`<div class="dp-pk flag"><span><b>${esc(x.p.id)}</b><small>${x.p.loadFlag==='missing'?'Missing':'Damaged'} · Stop ${ds.findIndex(t=>t.id===x.t.id)+1} · ${esc(x.t.name)}</small></span><button class="btn" data-p="unflag" data-v="${esc(x.p.id)}">Found it</button></div>`).join('')}</div>`:''}
 ${R().some(t=>t.kind==='pickup')?`<div class="hint">${R().filter(t=>t.kind==='pickup').length} pickup(s) on this route are scanned at the shipper.</div>`:''}</div>
 <div class="bottom"><button class="pillbtn big" id="dpStart" data-p="start" ${ready?'':'disabled'}>${ready?'Start route':`Scan ${left.length} more to start`}</button><button class="linkbtn" data-p="tomap">Back to route map</button></div>`}
function vDrive(){const d=D(),s=st(),r=R(),open=X().openT(),c=X().cur(),done=r.filter(t=>!CX.OPEN(t)).length;let sheet='';
 const ban=`<div class="dp-ban" id="dpBan"><div class="dp-arw" id="dpArw">↑</div><div class="dp-bt"><b id="dpDist">—</b><span id="dpIns">${leg?'':'Finding the best route…'}</span></div><button class="dp-ib dark" data-p="tolist" aria-label="Stop list" id="dpToList">${I('list',18)}</button></div><div class="dp-then" id="dpThen" hidden></div>`;
 const arr=c&&s.arrived===c.id;
 if(!c)sheet=`<div class="eyebrow">All stops done</div><h3 class="dp-h">Head back to ${esc(X().hubName())}</h3><p class="dp-p">Return anything undelivered and scan it in to close the route.</p><button class="pillbtn big" data-a="returnhub" id="dpReturn">${I('nav',16)} Return to station</button>`;
 else if(s.next&&s.next.prev){const p=CX.task(s.next.prev);sheet=`<div class="dp-done ${p&&p.state==='failed'?'bad':''}">${p&&p.state==='failed'?'Not delivered · logged':'Delivered ✓'} · Stop ${p?p.seq+1:''}</div><div class="eyebrow">Next · stop ${c.seq+1} of ${r.length}</div><h3 class="dp-h">${esc(c.name)}</h3><p class="dp-p">${esc(c.address)}</p>
  <div class="dp-row"><button class="pillbtn out" data-p="pause" id="dpPause">Pause</button><button class="pillbtn" data-p="gonow" id="dpGoNow">Go now · <span id="dpCd">3</span>s</button></div>`}
 else if(arr){const ns=X().nextStep(c);sheet=`<div class="eyebrow">You're at stop ${c.seq+1} of ${r.length}</div><h3 class="dp-h">${esc(c.name)}</h3><p class="dp-p">${esc(c.address)} · ${c.items.length} ${esc(X().unitW())}</p>
  <div class="dp-row"><button class="pillbtn peach" data-a="cant" data-v="${c.id}" id="dpCant">${esc(X().K().exceptionLabel||"Can't deliver")}</button><button class="pillbtn" data-p="stepnow" id="dpStep">${esc(ns?ns.label:'Continue')}</button></div>`}
 else if(s.paused){sheet=`<div class="eyebrow">Paused · next is stop ${c.seq+1} of ${r.length}</div><h3 class="dp-h">${esc(c.name)}</h3><p class="dp-p">${esc(c.address)}</p><button class="pillbtn big" data-p="resume" id="dpResume">${I('nav',16)} Start driving</button>`}
 else{const et=CX.etas(W())[c.id];sheet=`<div class="dp-eta"><b id="dpEta">${et?fmt(et.eta):'—'}</b><span id="dpRem">—</span><span class="dp-cnt">${done}/${r.length} done</span></div>
  <div class="dp-dest"><span class="dp-no">${c.seq+1}</span><div><b>${esc(c.name)}</b><small>${esc(c.address)}</small><small>${c.items.length} ${esc(X().unitW())} · ${fmt(c.window[0])}–${fmt(c.window[1])}${c.kind==='pickup'?' · Pickup':''}</small></div></div>
  <div class="dp-row"><button class="pillbtn out" data-p="details" id="dpDetails">Stop details</button><button class="pillbtn" data-p="arrive" id="dpArrive">I'm here</button></div>`}
 const ctl=`<div class="dp-ctl"><button data-a="openset" id="gearBtn" aria-label="Settings">${I('gear',18)}</button><button data-p="recenter" aria-label="Recenter" id="dpRec">◎</button><button data-p="sim" id="dpSim" class="${s.sim?'on':''}" title="Simulated driving (pilot)" aria-label="Simulated driving">${s.sim?'❚❚':'▶'}</button><button data-a="sos" class="sos" aria-label="SOS">SOS</button></div>`;
 return `<div class="dp dp-drive">${d.sos?`<div class="sosactive"><span>⚠ SOS sent to Dispatch · ${fmt(CX.S.clock)}</span><button class="closebtn" data-a="cancelsos">Cancel</button></div>`:''}${ban}<div class="dp-map" id="dpslot"></div>${ctl}<div class="dp-sheet drive" id="dpSheet"><i class="dp-grab"></i>${sheet}</div></div>`}
/* ---------- driving engine (simulated GPS in the pilot) ---------- */
async function startLeg(t){const s=st();if(!t||!window.CXNav)return;const d=D();
 if(leg&&leg.id===t.id)return;
 const from=(d.loc&&d.loc.length===2)?d.loc.slice():hubLL();const L={id:t.id,i:0,ready:false};leg=L;s.navId=t.id;s.arrived=null;s.paused=false;save();
 const ns=X().nextStep(t);if(ns&&ns.id==='omw')CX.update(()=>{CX.ops.completeStep(t.id,ns,{via:'in-app navigation'},d.name);CX.ops.tick(1)});
 let rt=null;try{rt=await CXNav.route(from,t.ll)}catch(e){}if(leg!==L)return;if(!rt)rt={coords:[from,t.ll],steps:[{text:'Head to the stop',arrow:'↑',loc:from},{text:'Arrive at the stop',arrow:'⚑',loc:t.ll}],src:'straight'};
 L.rt=rt;L.path=CXNav.densify(rt.coords);L.cum=[0];for(let i=1;i<L.path.length;i++)L.cum.push(L.cum[i-1]+CXNav.hav(L.path[i-1],L.path[i]));L.total=L.cum[L.cum.length-1];
 L.stepIdx=rt.steps.map(x=>{let b=0,bd=1e12;L.path.forEach((p,i)=>{const dd=CXNav.hav(p,x.loc);if(dd<bd){bd=dd;b=i}});return b});L.speed=Math.max(1,Math.ceil(L.path.length/40));L.ready=true;fitK='';
 if(X().ui.screen==='drive')X().render();tick()}
function tick(){if(!timer)timer=setInterval(()=>{const s=st();if(X().ui.screen!=='drive'||!leg||!leg.ready)return;if(s.sim&&!s.arrived&&!s.next&&!s.paused&&!X().sheet){const o=leg.i;leg.i=Math.min(leg.path.length-1,leg.i+leg.speed);if(leg.i!==o){drawDrive(false);if(++locTick%8===0){const ll=leg.path[leg.i];CX.update(()=>{const x=CX.driver(W());if(x)x.loc=ll})}}}},250)}
function legRem(){return leg&&leg.ready?leg.total-leg.cum[leg.i]:null}
function drawDrive(refit){if(!map)return;const s=st(),d=D(),r=R(),c=X().cur();const pos=leg&&leg.ready?leg.path[leg.i]:(d.loc||hubLL());
 const pins=r.map(t=>({id:t.id,ll:t.ll,state:t.state,label:t.state==='completed'?'✓':t.state==='failed'?'!':String(t.seq+1),sel:c&&c.id===t.id,cls:'dp-pin'+(c&&c.id===t.id?' dp-cur':''),title:t.name}));
 const ahead=leg&&leg.ready&&c&&leg.id===c.id?leg.path.slice(leg.i):[];
 map.set({pins,lines:ahead.length>1?[{sel:true,coords:ahead}]:[],drivers:[{id:d.id,ll:pos,name:'You'}],fitTo:refit?[pos,c?c.ll:pos].filter(Boolean):null,refit:!!refit});
 if(s.follow&&!refit&&map.mode==='gl'&&leg&&leg.ready&&s.sim&&!s.arrived){const nb=leg.path[Math.min(leg.path.length-1,leg.i+3)];try{map.map.easeTo({center:pos,zoom:15.6,bearing:CXNav.hav(pos,nb)>1?CXNav.bearing(pos,nb):map.map.getBearing(),pitch:0,duration:240})}catch(e){}}
 const rem=legRem();const $=id=>document.getElementById(id);
 if(rem!=null&&$('dpBan')){let k=leg.stepIdx.findIndex(ix=>ix>leg.i);if(k<0)k=leg.rt.steps.length-1;const stp=leg.rt.steps[k],nx=leg.rt.steps[k+1];const toMan=Math.max(0,leg.cum[leg.stepIdx[k]]-leg.cum[leg.i]);
  const here=rem<25||s.arrived;$('dpArw').textContent=here?'⚑':stp.arrow;$('dpDist').textContent=here?'You\'re here':CXNav.fmtD(toMan);$('dpIns').textContent=here?(c?c.address:''):stp.text;
  const th=$('dpThen');if(th){th.hidden=!(nx&&!here);th.textContent=nx?'Then '+nx.arrow+' '+nx.text:''}
  const min=Math.max(1,Math.round(rem/9.5/60));if($('dpRem'))$('dpRem').textContent=`${min} min · ${CXNav.fmtD(rem)}`;if($('dpEta'))$('dpEta').textContent=fmt(CX.S.clock+min);
  document.querySelector('.dp-drive')&&(document.querySelector('.dp-drive').dataset.remaining=Math.round(rem));
  if(rem<25&&!s.arrived&&c&&leg.id===c.id&&!s.next)arrive(c.id)}}
function arrive(id){const w=W(),s=st();if(s.arrived===id)return;s.arrived=id;save();if(leg&&leg.ready&&leg.id===id)leg.i=leg.path.length-1;CX.update(()=>{const x=CX.driver(w),T=CX.task(id);if(x)x.loc=T.ll.slice();let n=X().nextStep(T),g=0;while(n&&n.kind==='confirm'&&/omw|arrive|depart|enroute/.test(n.id)&&g++<4){CX.ops.completeStep(id,n,{via:'in-app navigation · arrived'},x?x.name:'Driver');n=X().nextStep(CX.task(id))}T.arrivedAt=T.arrivedAt||CX.S.clock});
 X().render();toast('Arrived · '+CX.task(id).name);setTimeout(()=>{if(X().ui.screen==='drive'&&st().arrived===id&&!X().sheet)openStep(id)},350)}
function openStep(id){const t=CX.task(id),ns=X().nextStep(t);if(!ns)return;if(ns.kind==='confirm'){X().act('step',id)}else X().openSheet('step',id)}
function afterStep(id,failed){const s=st(),t=CX.task(id);if(!t||X().ui.screen!=='drive')return;
 if(CX.OPEN(t)&&!failed&&t.state!=='failed'){setTimeout(()=>{if(!X().sheet&&st().arrived===id)openStep(id)},300);return}
 s.arrived=null;leg=null;const nx=X().cur();if(!nx){s.next=null;save();X().render();toast('✓ Last stop done · head back to the station');return}
 s.next={prev:id,id:nx.id};s.paused=false;save();X().render();countdown()}
function countdown(){clearInterval(cd);let n=3;cd=setInterval(()=>{n--;const e=document.getElementById('dpCd');if(e)e.textContent=Math.max(n,0);if(n<=0){clearInterval(cd);cd=null;goNext()}},1000)}
function goNext(){const s=st();clearInterval(cd);cd=null;if(!s.next)return;const t=CX.task(s.next.id);s.next=null;save();X().render();startLeg(t)}
/* ---------- paint ---------- */
function paint(scr){const v=X().ui.screen;if(host&&host.parentNode)host.parentNode.removeChild(host);
 if(v==='drive'){const c=X().cur(),s=st();if(c&&!s.next&&!s.paused&&(!leg||leg.id!==c.id)&&s.arrived!==c.id)startLeg(c);tick()}
 scr.innerHTML=v==='plan'?vPlan():v==='load'?vLoad():vDrive();
 const sl=scr.querySelector('#dpslot');if(sl)mount(sl,v==='drive'?'drive':'plan');
 const bc=scr.querySelector('#dpbc');if(bc){bc.onkeydown=e=>{if(e.key==='Enter')act('bc')};setTimeout(()=>{if(document.activeElement===document.body)bc.focus({preventScroll:true})},50)}}
function leave(){if(host&&host.parentNode)host.parentNode.removeChild(host)}
/* ---------- hooks into the V02 screens ---------- */
function money(n){return '$'+(Math.round((n||0)*100)/100).toFixed(2)}
function post(s,scr){const d=D();if(!d||!drives(d.line))return;const b=scr.querySelector('.bottom');
 if(s==='shift'&&d.duty&&R().length&&pre()&&b){b.insertAdjacentHTML('afterbegin',`<button class="pillbtn big" data-p="toplan" id="dpOpenMap">${I('map',17)} Open route map</button>`);const rv=b.querySelector('[data-v="review"]');if(rv)rv.className='linkbtn'}
 if(s==='shift'&&d.route.stage==='on_road'&&b)b.insertAdjacentHTML('afterbegin',`<button class="pillbtn big" data-p="todrive" id="dpBackDrive">${I('nav',17)} Back to driving</button>`);
 if(s==='route'&&d.route.stage==='on_road'){const bd=scr.querySelector('.body');if(bd)bd.insertAdjacentHTML('afterbegin',`<button class="pillbtn dp-todrive" data-p="todrive" id="dpBackDrive">${I('nav',16)} Back to driving map</button>`)}
 if(s==='closed'){const ids=new Set(R().map(t=>t.id));const pay=(CX.S.ledger||[]).filter(l=>l.kind==='pay'&&ids.has(l.taskId));const tot=pay.reduce((a,l)=>a+(l.amount||0),0);const bd=scr.querySelector('.body');
  if(bd)bd.insertAdjacentHTML('beforeend',`<div class="dcard dp-pay" id="dpPay"><div class="eyebrow">Today's pay line</div><div class="dp-payt"><b>${money(tot)}</b><span>${pay.length} paid stop${pay.length===1?'':'s'} · sample amounts</span></div>${pay.slice(0,4).map(l=>`<div class="kvrow"><span>${esc(l.desc)}</span><span>${money(l.amount)}</span></div>`).join('')}<a class="tiny" href="portal-driver.html?id=${encodeURIComponent(d.driverId)}&view=pay" target="_blank" rel="noopener">Pay &amp; settlements in the driver portal ›</a></div>`)}}
function onDuty(){const d=D();if(!d||!drives(d.line)||!pre()||!R().length)return;st().mode='menu';save();X().go('plan');toast("You're on duty · your route map is ready")}
function sheetHTML(type){const s=st();if(type!=='d3list')return '';const as=assigned().filter(t=>s.mode!=='seq'||!s.seq.includes(t.id));
 return `<div class="sh-h"><h3>${s.mode==='ends'?(!s.ends[0]?'Pick your first stop':'Pick your last stop'):'Pick your next stop'}</h3><button class="closebtn" data-a="close">Close</button></div><div class="sh-b dp-listsheet">${as.map(t=>`<button data-p="pickid" data-v="${t.id}" class="${s.ends.includes(t.id)?'on':''}"><span class="dp-no">${t.seq+1}</span><span><b>${esc(t.name)}</b><small>${esc(t.address)} · ${t.items.length} ${esc(X().unitW())}</small></span></button>`).join('')||'<div class="muted">Every stop is placed.</div>'}</div>`}
/* ---------- actions ---------- */
function act(a,v){const s=st(),w=W();
 switch(a){
 case 'today':s.mode='menu';s.near=null;save();X().go('shift');break;
 case 'fit':fitK='';X().render();break;
 case 'menu':s.mode='menu';s.near=null;save();X().render();break;
 case 'best':{const ids=optimize(startLL(),assigned()).map(t=>t.id);if(!ids.length){toast('No stops to order');break}applyOrder(ids,'Best route for me');s.mode='menu';save();fitK='';X().render();toast(`✓ Best route set · ${ids.length} stops · Dispatch updated`);break}
 case 'mine':s.mode='seq';s.seq=[];s.near=null;save();X().render();break;
 case 'ends':s.mode='ends';s.ends=[];s.near=null;save();X().render();break;
 case 'undo':s.seq.pop();save();X().render();break;
 case 'clear':s.seq=[];save();X().render();toast('Cleared');break;
 case 'endsclear':s.ends=[];save();X().render();break;
 case 'list':X().openSheet('d3list');break;
 case 'pickid':{const sh=X().sheet;if(sh&&sh.type==='d3list'){X().closeSheet()}pick(v);break}
 case 'nearx':s.near=null;save();X().render();break;
 case 'saveseq':{const as=assigned(),picked=s.seq.map(id=>CX.task(id)).filter(t=>t&&t.state==='assigned'),rest=as.filter(t=>!s.seq.includes(t.id));const tail=optimize(picked.length?picked[picked.length-1].ll:startLL(),rest);const ids=picked.concat(tail).map(t=>t.id);
   applyOrder(ids,"I'll set the order");s.seq=[];s.mode='menu';save();fitK='';X().render();toast(`✓ Your order saved · ${picked.length} placed${tail.length?' + '+tail.length+' by ChainEx':''} · Dispatch updated`);break}
 case 'planmid':{const f=CX.task(s.ends[0]),l=CX.task(s.ends[1]);if(!f||!l)break;const mid=assigned().filter(t=>t.id!==f.id&&t.id!==l.id);const ids=[f,...optimize(f.ll,mid,l.ll),l].map(t=>t.id);
   applyOrder(ids,'Pick my first and last stop');s.ends=[];s.mode='menu';save();fitK='';X().render();toast(`✓ First and last set · ${mid.length} planned in between · Dispatch updated`);break}
 case 'omw':X().act('omwhub');break;
 case 'arrhub':X().act('arrhub');if(D().route.checkin==='arrived'){X().go('load')}break;
 case 'toload':if(!checkin())break;X().go('load');break;
 case 'tomap':s.mode='menu';save();X().go('plan');break;
 case 'toplan':s.mode='menu';save();X().go('plan');break;
 case 'bc':case 'cam':{const inp=document.getElementById('dpbc');let val=a==='bc'&&inp?inp.value.trim():'';if(!checkin())break;
   const all=pk();let x;if(!val){x=all.filter(y=>!y.p.loaded&&!y.p.loadFlag).sort((m,n)=>n.t.seq-m.t.seq)[0];if(!x){toast('Everything is scanned');break}}else x=all.find(y=>y.p.id.toUpperCase()===val.toUpperCase());
   if(!x){toast(`${val} isn't on this route`);break}if(x.p.loaded){s.last={pid:x.p.id,tid:x.t.id};save();X().render();toast('Already loaded · stop '+(x.t.seq+1));break}
   CX.update(()=>{CX.ops.loadScan(w,x.p.id);const q=CX.task(x.t.id).items.find(p=>p.id===x.p.id);if(q)delete q.loadFlag});s.last={pid:x.p.id,tid:x.t.id};save();X().render();toast(`✓ ${x.p.id} · stop ${deliv().findIndex(t=>t.id===x.t.id)+1}`);break}
 case 'all':{if(!checkin())break;const ids=pk().filter(y=>!y.p.loaded&&!y.p.loadFlag);if(!ids.length){toast('Everything is scanned');break}CX.update(()=>CX.ops.loadScan(w,ids.map(y=>y.p.id)));const l=ids.sort((m,n)=>m.t.seq-n.t.seq)[0];s.last={pid:l.p.id,tid:l.t.id};save();X().render();toast(`✓ ${ids.length} loaded`);break}
 case 'flag':{const [kind,pid]=v.split('|');const x=pk().find(y=>y.p.id===pid);if(!x)break;const no=deliv().findIndex(t=>t.id===x.t.id)+1;
   CX.update(()=>{const q=CX.task(x.t.id).items.find(p=>p.id===pid);q.loadFlag=kind;(q.events=q.events||[]).push({at:CX.S.clock,text:(kind==='missing'?'Missing':'Damaged')+' at load-out',where:'Load-out scan',by:D().name});CX.ops.botIssue(w,kind==='damaged'?'damaged':null,x.t.id,`${kind==='missing'?'Missing':'Damaged'} at load-out: ${pid} (stop ${no}, ${x.t.name})`)});
   X().render();toast(`${kind==='missing'?'Missing':'Damaged'} · ticket sent to Dispatch`);break}
 case 'unflag':{CX.update(()=>{pk().forEach(y=>{if(y.p.id===v){const q=CX.task(y.t.id).items.find(p=>p.id===v);delete q.loadFlag}})});X().render();break}
 case 'start':{const left=pk().filter(y=>!y.p.loaded&&!y.p.loadFlag);if(left.length){toast(`Scan every package first · ${left.length} left`);break}leg=null;s.arrived=null;s.next=null;s.paused=false;save();X().act('startroute');break}
 case 'tolist':X().ui.tab='manifest';X().go('route');break;
 case 'todrive':X().go('drive');break;
 case 'details':{const c=X().cur();if(c)X().openSheet('stop',c.id);break}
 case 'arrive':{const c=X().cur();if(c)arrive(c.id);break}
 case 'stepnow':{const c=X().cur();if(c)openStep(c.id);break}
 case 'gonow':goNext();break;
 case 'pause':clearInterval(cd);cd=null;s.next=null;s.paused=true;save();X().render();break;
 case 'resume':s.paused=false;save();leg=null;X().render();break;
 case 'recenter':s.follow=true;fitK='';X().render();break;
 case 'sim':s.sim=!s.sim;save();X().render();break;
 }}
document.addEventListener('click',e=>{const b=e.target.closest('[data-p]');const ph=document.getElementById('phone');if(!b||!ph||!ph.contains(b))return;e.preventDefault();e.stopPropagation();if(b.disabled)return;act(b.dataset.p,b.dataset.v)},true);
window.CXD3={takes,key,paint,leave,afterStep,sheetHTML,post,onDuty,drives};
window.CXDP={state:st,arriveNow(){const c=X().cur();if(c)arrive(c.id)},goNext,get leg(){return leg},slot,optimize};
})();
