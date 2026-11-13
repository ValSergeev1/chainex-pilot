/* ChainEx V03 driver experience for Parcel (P&D) and Bulky routes.
   Map-first: build the route (auto-optimize or hand-pick every stop on the map), load-scan, then Start driving (stop to stop):
   in-app navigation -> auto-arrive -> scan pops up -> deliver / can't deliver -> straight into the next stop on the map.
   Reuses the V02 driver engine (driver.js) for data, steps and sheets via window.__drvI. */
(function(){
const LINES=['pd','bulky'];
const $=s=>document.querySelector(s);
let host=null,map=null,fitK='',timer=null,lastTap=0;
const X=()=>window.__drvI,C=()=>window.CX,esc=s=>CX.esc(s),fmt=t=>CX.fmt(t);
const st=()=>{const u=X().ui;u.d3=u.d3||{view:'map',sel:null,filter:'all',q:'',seq:[],navSeq:false,offline:false,net:false,showNums:true};return u.d3};
const save=()=>X().save();
const SV={
 alert:'<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/>',today:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 pinset:'<path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
 target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6"/>',
 manifest:'<path d="M9 4h6l1 2h3v15H5V6h3l1-2z"/><path d="M8 11h8M8 15h6"/>',map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
 back:'<path d="M15 18 9 12l6-6"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',nav:'<path d="m3 11 19-9-9 19-2-8-8-2z"/>',box:'<path d="M21 8 12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',wifi:'<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',bolt:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',hand:'<path d="M8 13V5a2 2 0 1 1 4 0v6M12 11V4a2 2 0 1 1 4 0v7M16 11V6a2 2 0 1 1 4 0v8a8 8 0 0 1-8 8h-1a7 7 0 0 1-6-3.4L3 15a2 2 0 0 1 3.3-2.2L8 15"/>'};
const ic=(n,s=20)=>`<svg class="d3i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SV[n]||''}</svg>`;
function takes(s){const u=X()&&X().ui;if(!u||u.classic)return false;const d=X().D();return !!d&&LINES.includes(d.line)&&['shift','review','load','route'].includes(s)}
function stage(){return X().D().route.stage}
function pre(){return ['not_started','loading'].includes(stage())||!stage()}
function key(){const s=st();return s.view+'|'+(pre()?'pre':stage())}
const assigned=()=>X().R().filter(t=>t.state==='assigned');
const pkgCount=()=>X().R().filter(t=>t.kind!=='pickup').reduce((a,t)=>a+t.items.length,0);
const pickups=()=>X().R().filter(t=>t.kind==='pickup').length;
const loaded=()=>{const all=X().R().filter(t=>t.kind!=='pickup').flatMap(t=>t.items);return [all.filter(p=>p.loaded).length,all.length]};
function matches(t){const s=st(),q=(s.q||'').toLowerCase();const f=s.filter;if(f==='open'&&!CX.OPEN(t))return false;if(f==='done'&&t.state!=='completed')return false;if(f==='exc'&&t.state!=='failed')return false;if(f==='pickup'&&t.kind!=='pickup')return false;return !q||(t.name+' '+t.address+' '+t.id+' '+t.items.map(p=>p.id).join(' ')).toLowerCase().includes(q)}
/* ---------- optimizer (nearest neighbour + 2-opt) ---------- */
const km=(a,b)=>{const R=6371,r=x=>x*Math.PI/180;const dl=r(b[1]-a[1]),dn=r(b[0]-a[0]);const h=Math.sin(dl/2)**2+Math.cos(r(a[1]))*Math.cos(r(b[1]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
function optimize(start,ts){const left=ts.slice(),out=[];let p=start;while(left.length){let bi=0,bd=1e9;left.forEach((t,i)=>{const d=km(p,t.ll);if(d<bd){bd=d;bi=i}});p=left[bi].ll;out.push(left.splice(bi,1)[0])}
 const len=o=>o.reduce((a,t,i)=>a+km(i?o[i-1].ll:start,t.ll),0);let best=len(out),imp=true,g=0;while(imp&&g++<30){imp=false;for(let i=0;i<out.length-1;i++)for(let k=i+1;k<out.length;k++){const n=out.slice(0,i).concat(out.slice(i,k+1).reverse(),out.slice(k+1));const l=len(n);if(l<best-1e-6){out.splice(0,out.length,...n);best=l;imp=true}}}return out}
function startLL(){const d=X().D();const hub=(CX.S.hubs[d.hub]||{}).ll;return pre()?(hub||d.loc):(d.loc||hub)}
function applyOrder(ids,why){const w=X().W();let sum;CX.update(()=>{sum=CX.ops.submitRouteEdit(w,{order:ids,skipped:[],notes:{},pins:{},issues:[],first:ids[0],last:ids[ids.length-1],locked:[]});const d=CX.driver(w);if(d.route.edit){d.route.edit.via=why;d.route.edit.applied=true}});return sum}
function ensureCheckin(){const w=X().W(),d=X().D();if(!X().elig().ok){X().toast('Blocked · '+X().elig().reasons.join(' · '));return false}
 CX.update(()=>{const D2=CX.driver(w);if(!D2.duty)CX.ops.duty(w,true);if(D2.route.checkin!=='arrived')CX.ops.checkin(w,'arrived')});return true}
/* ---------- markers ---------- */
function pins(mode){const s=st(),r=X().R(),c=X().cur();
 if(mode==='seq'){const order=s.seq;const as=assigned();const fixed=r.filter(t=>t.state!=='assigned');
   return fixed.map(t=>({id:t.id,ll:t.ll,state:t.state,label:t.state==='completed'?'✓':'•',cls:'d3p d3-lock',title:t.name})).concat(as.map(t=>{const i=order.indexOf(t.id);return{id:t.id,ll:t.ll,state:'assigned',label:i>=0?String(i+1):'',cls:'d3p '+(i>=0?'d3-set':'d3-hollow')+(i===order.length-1&&i>=0?' d3-last':''),title:t.name}}))}
 return r.filter(t=>matches(t)||t.id===s.sel).map(t=>{const isC=c&&c.id===t.id;const nx=X().openT()[1];let cls='d3p';if(t.state==='completed')cls+=' d3-done';else if(t.state==='failed')cls+=' d3-fail';else if(isC)cls+=' d3-cur';else if(nx&&nx.id===t.id)cls+=' d3-nx';if(t.kind==='pickup')cls+=' d3-pick';
   return{id:t.id,ll:t.ll,state:t.state,label:t.state==='completed'?'✓':t.state==='failed'?'!':(s.showNums?String(t.seq+1):''),sel:s.sel===t.id,cls,title:t.name}})}
function mount(slot,mode){const d=X().D();if(!host){host=document.createElement('div');host.className='d3map-host';map=new CXMap(host,{center:startLL()||d.loc,zoom:12,controls:false,lineColor:'#2f6fe0',lineColor2:'#a9c3f5',pad:()=>({top:130,left:36,right:36,bottom:mode==='seq'?230:300}),onPin:id=>tapPin(id),onMap:()=>{}})}
 slot.appendChild(host);const r=X().R(),open=X().openT();const k=mode+'|'+X().W()+'|'+st().filter+'|'+st().q;const refit=k!==fitK;fitK=k;
 let line=[];if(mode==='seq'){const ids=st().seq;line=[startLL(),...ids.map(id=>CX.task(id).ll)]}else line=[d.loc||startLL(),...open.map(t=>t.ll)];
 map.set({pins:pins(mode),lines:[{sel:true,coords:line.filter(Boolean)}],drivers:[{id:d.id,ll:d.loc||startLL(),name:'You'}],fitTo:[d.loc,...r.map(t=>t.ll)].filter(Boolean),refit});
 requestAnimationFrame(()=>map&&map.resize())}
function tapPin(id){const s=st();if(s.view==='seq'){const t=CX.task(id);if(!t||t.state!=='assigned'){X().toast('Already '+(t?X().stLabel(t).toLowerCase():'done'));return}
   const i=s.seq.indexOf(id);if(i>=0){if(i===s.seq.length-1){s.seq.pop();X().toast('Removed position '+(i+1))}else{s.seq.splice(i);X().toast('Re-sequencing from position '+(i+1))}}else{s.seq.push(id);X().fx('ok')}save();X().render();return}
 s.sel=id;save();X().render()}
/* ---------- views ---------- */
/* ---------- views (ChainEx V03 look: navy status strip, map tools row, bottom route sheet with a segmented control) ---------- */
const SEGS=[['map','map','Map'],['manifest','manifest','Stops'],['today','today','Today'],['me','me','Me'],['settings','gear','Settings']];
function segs(){const v=st().view==='seq'||st().view==='scan'?'map':st().view;return `<nav class="d3-seg" role="tablist">${SEGS.map(x=>`<button role="tab" aria-selected="${v===x[0]}" class="${v===x[0]?'on':''}" data-d3="view" data-v="${x[0]}" id="d3t-${x[0]}">${ic(x[1],18)}<span>${x[2]}</span></button>`).join('')}</nav>`}
function tabs(){return segs()}
function counts(){const r=X().R();return {done:r.filter(t=>t.state==='completed').length,fail:r.filter(t=>t.state==='failed').length,tot:r.length}}
function risk(){const et=CX.etas(X().W());return X().openT().some(t=>et[t.id]&&et[t.id].risk)}
function strip(title){const d=X().D(),c=counts(),s=st();return `${d.sos?`<div class="d3-sosbar" id="d3sosbar">${ic('alert',14)} SOS sent to Dispatch · ${fmt(CX.S.clock)}<button data-a="cancelsos">Cancel</button></div>`:''}<header class="d3-strip"><span class="d3-wm">Chain<b>Ex</b></span><span class="d3-sr">${title?esc(title):`${esc(X().K().name)} · ${esc(d.route.id)}`}</span>${!pre()&&!title?`<span class="d3-pg"><b>${c.done}</b>/${c.tot}</span><span class="d3-rk ${risk()?'bad':''}">${risk()?'At risk':'On time'}</span>`:''}<span class="d3-duty ${d.duty?'on':''}" title="${d.duty?'On duty':'Off duty'}"></span><button class="d3-sos" id="d3sos" data-a="sos" aria-label="Emergency SOS">SOS</button></header>${netHdr()}`}
function tools(){const s=st();return `<div class="d3-tools" role="toolbar" aria-label="Map tools"><button id="d3center" data-d3="center" aria-label="Recenter">${ic('target',17)}<span>Fit</span></button><button id="d3pinset" data-d3="pinset" aria-label="Stop labels">${ic('pinset',17)}<span>Labels</span></button><button id="d3flt" data-d3="filters" aria-label="Filter stops">${ic('filter',16)}<span>Filter</span>${s.filter!=='all'?'<i class="d3-dot"></i>':''}</button><button id="d3sync" data-d3="sync" aria-label="Refresh">${ic('refresh',17)}</button><button id="d3chat" data-d3="chat" aria-label="Chat with Dispatch">${ic('chat',17)}${unread()?`<i class="d3-dot"></i>`:''}</button></div>`}
function unread(){return (CX.S.msgs||[]).filter(m=>m.wid===X().W()&&!m.readDriver).length}
function fab(){return ''}
function rail(){return ''}
function stopCard(t){const et=CX.etas(X().W())[t.id];const hrs=et?fmt(et.eta):'—';const can=CX.OPEN(t);const isCur=X().cur()&&X().cur().id===t.id;const ns=can&&X().nextStep(t);
 return `<div class="d3-card" id="d3card"><div class="d3-ch"><b class="d3-tag ${t.state==='completed'?'done':t.state==='failed'?'fail':isCur?'cur':''}">${t.state==='completed'?'✓':t.seq+1}</b><div class="d3-ct"><b>${esc(t.name)}</b><small>${esc(t.address)}</small></div><button class="d3-x" data-d3="unsel" aria-label="Close">${ic('x',16)}</button></div>
 <div class="d3-meta"><span>${ic('box',14)} ${t.items.length} ${esc(X().unitW())}</span><span>${ic('clock',14)} ${fmt(t.window[0])}–${fmt(t.window[1])}</span><span>ETA ${hrs}</span><span class="d3-stl st-${t.state}">${esc(X().stLabel(t))}</span>${t.kind==='pickup'?'<span>Pickup</span>':''}</div>
 <div class="d3-ca">${can?`<button class="d3-btn ghost" data-d3="details" data-v="${t.id}">Details</button>${t.arrivedAt||isCur&&ns&&ns.kind!=='confirm'?`<button class="d3-btn ghost" data-a="cant" data-v="${t.id}">${esc(X().K().exceptionLabel||"Can't deliver")}</button>`:''}<button class="d3-btn ghost" data-d3="scanstop" data-v="${t.id}">${ic('scan',16)} ${ns&&ns.kind!=='confirm'?esc(ns.label):'Scan'}</button><button class="d3-btn pri" data-d3="navone" data-v="${t.id}">${ic('nav',15)} Drive</button>`:`<button class="d3-btn ghost" data-d3="details" data-v="${t.id}">Proof &amp; details</button>`}</div></div>`}
function nextCard(){const open=X().openT(),c=X().cur(),s=st();if(!open.length)return `<div class="d3-card d3-nextc"><div class="d3-eb">ALL STOPS DONE</div><b class="d3-big2">Head back to the station</b><p class="d3-mut">Return anything undelivered and scan it in to close the route.</p><div class="d3-ca"><button class="d3-btn pri wide" id="d3ret" data-d3="return">${ic('nav',15)} ${esc(X().DC().returnTitle||'Return to station')}</button></div></div>`;
 const et=CX.etas(X().W())[c.id];return `<div class="d3-card d3-nextc" id="d3card"><div class="d3-eb">UP NEXT · STOP ${c.seq+1} OF ${X().R().length}</div><div class="d3-ch"><b class="d3-tag cur">${c.seq+1}</b><div class="d3-ct"><b>${esc(c.name)}</b><small>${esc(c.address)}${et?' · ETA '+fmt(et.eta):''}</small></div></div>
 <div class="d3-ca"><button class="d3-btn ghost" data-d3="details" data-v="${c.id}">Details</button><button class="d3-btn ghost" id="d3scan" data-d3="scan">${ic('scan',16)} Scan</button><button class="d3-btn pri" id="d3go" data-d3="go">${ic('nav',15)} ${s.navSeq?'Resume driving':'Start driving'}</button></div>${c.arrivedAt||c.state==='active'?(()=>{const ns=X().nextStep(c);return `<div class="d3-ca"><button class="d3-btn ghost" data-a="cant" data-v="${c.id}">${esc(X().K().exceptionLabel||"Can't deliver")}</button><button class="d3-btn pri" data-d3="scanstop" data-v="${c.id}">${esc(ns?ns.label:'Continue')}</button></div>`})():''}</div>`}
function planCard(){const d=X().D(),[l,n]=loaded(),P=pickups();return `<div class="d3-card d3-plan" id="d3new"><div class="d3-eb">ROUTE ${esc(d.route.id)} · ${esc(X().hubName())}</div><h3>Today: ${pkgCount()} ${esc(X().unitW())} · ${P} pickup${P===1?'':'s'} · ${X().R().length} stops</h3>
 <p>Choose how your stops get ordered, then load-scan before you leave the station.</p>${d.duty?'':`<div class="d3-note">${ic('clock',14)} You're off duty. Planning puts you on duty and checks you in at the station.</div>`}
 ${l?`<div class="d3-prog"><i style="width:${n?Math.round(l/n*100):0}%"></i></div><small class="d3-mut">${l} / ${n} loaded</small>`:''}
 <div class="d3-choice"><button id="d3auto" data-d3="auto">${ic('bolt',20)}<span><b>Let ChainEx order it</b><small>Fastest order. You can still change it.</small></span></button><button id="d3manual" data-d3="manual">${ic('hand',20)}<span><b>Plan my route</b><small>Tap stops on the map in your order.</small></span></button></div>
 ${X().canEdit()?`<button class="d3-link2" data-a="reditopen" data-v="shift">${ic('manifest',15)} Full route planner: skip, notes, pin fixes, issues</button>`:''}
 ${X().elig().ok?'':`<div class="d3-warn">Not eligible for dispatch · ${esc(X().elig().reasons.join('; '))}</div>`}</div>`}
function vMap(){const s=st(),sel=s.sel&&CX.task(s.sel);const cu=X().cur();const body=pre()?planCard():sel&&!(cu&&cu.id===sel.id)?stopCard(sel):nextCard();
 return `<div class="d3 d3-mapv">${strip()}<div class="d3-mapslot" id="d3slot"></div>${tools()}<div class="d3-bs"><i class="d3-grab"></i>${body}${segs()}</div>${countdown()}${netModal()}</div>`}
function countdown(){const s=st();if(!s.next)return '';const t=CX.task(s.next);if(!t)return '';return `<div class="d3-next" id="d3nextban"><div class="d3-eb">UP NEXT · STOP ${t.seq+1}</div><b>${esc(t.name)}</b><small>${esc(t.address)}</small><div class="d3-nb"><span class="d3-ring" id="d3ring">3</span><button class="d3-btn ghost" data-d3="nextcancel">Stay here</button><button class="d3-btn pri" data-d3="nextgo">Drive now</button></div></div>`}
function vSeq(){const s=st(),as=assigned(),n=as.length,k=s.seq.length;return `<div class="d3 d3-seqv">${strip('Plan my route')}<div class="d3-mapslot" id="d3slot"></div><div class="d3-hdr"><button class="d3-ib" data-d3="seqback" aria-label="Back">${ic('back',20)}</button><b>Tap stops in your order</b><button class="d3-link" id="d3clear" data-d3="seqclear">Start over</button></div>
 <div class="d3-bs"><div class="d3-card"><p class="d3-seqp">${k?`<b>${k}</b> in order so far. Tap the next stop. Tap the highest number again to take it back.`:'Tap the stop you will drive to first. Numbers appear in the order you tap.'}</p><div class="d3-ca">${k?`<button class="d3-btn ghost" data-d3="sequndo">${ic('undo',15)} Undo</button>`:''}<button class="d3-btn pri wide" id="d3calc" data-d3="calc">${ic('check',16)} Set order · ${k} of ${n}</button></div><small class="d3-mut">${k<n?'Stops you skip are ordered by ChainEx after your last one.':'Every stop is placed.'} Dispatch sees your order right away.</small></div></div>${netModal()}</div>`}
function vManifest(){const s=st(),r=X().R().filter(matches);const c=counts();
 return `<div class="d3 d3-list">${strip()}<div class="d3-scroll"><div class="d3-lh"><div><div class="d3-eb">${esc(X().K().name)} · ${esc(X().D().route.id)}</div><h2>Stops</h2></div><span class="d3-pill">${c.done}/${c.tot} done${c.fail?` · ${c.fail} exc.`:''}</span></div>
 <div class="d3-lsearch"><label class="d3-search">${ic('search',17)}<input id="d3q" placeholder="Find a stop, address or package" value="${esc(s.q)}" autocomplete="off"></label>${X().canEdit()?`<button class="d3-btn ghost" data-a="reditopen" data-v="shift" id="d3edit">${ic('manifest',15)} Edit</button>`:''}</div>
 <div class="d3-chips">${[['all','All'],['open','To do'],['done','Delivered'],['exc','Exceptions'],['pickup','Pickups']].map(f=>`<button class="${s.filter===f[0]?'on':''}" data-d3="filter" data-v="${f[0]}">${f[1]}</button>`).join('')}</div>
 ${s.q?`<div class="d3-results">${r.slice(0,6).map(t=>`<button data-d3="pick" data-v="${t.id}"><b class="d3-tag">${t.seq+1}</b><span>${esc(t.name)}<small>${esc(t.address)}</small></span></button>`).join('')||'<div class="d3-none">No matching stops</div>'}</div>`:''}
 <div class="d3-rows">${r.map(t=>`<button class="d3-row ${t.state}" data-d3="pick" data-v="${t.id}"><b class="d3-tag ${t.state==='completed'?'done':t.state==='failed'?'fail':X().cur()&&X().cur().id===t.id?'cur':''}">${t.state==='completed'?'✓':t.seq+1}</b><span class="d3-rt"><b>${esc(t.name)}</b><small>${esc(t.address)}</small><span class="d3-rm">${t.items.length} ${esc(X().unitW())} · ${fmt(t.window[0])}–${fmt(t.window[1])}${t.kind==='pickup'?' · Pickup':''}${t.items.every(p=>p.loaded)||t.kind==='pickup'?'':' · not loaded'}</span></span><span class="d3-stl st-${t.state}">${esc(X().stLabel(t))}</span></button>`).join('')||'<div class="d3-none">Nothing matches</div>'}</div></div>${segs()}${netModal()}</div>`}
function vToday(){let h='';try{h=X().screens.shift()}catch(e){h='<div class="d3-none">Today is unavailable</div>'}
 return `<div class="d3 d3-list d3-today">${strip('Today')}<div class="d3-scroll">${X().edBan?X().edBan(X().D()):''}${h}</div>${segs()}${netModal()}</div>`}
function money(n){return '$'+(Math.round((n||0)*100)/100).toFixed(2)}
function meHTML(){const d=X().D(),e=X().elig(),k=X().K(),ids=new Set(X().R().map(t=>t.id));const S=CX.S;const P=CX.portal||{};
 const pay=(S.ledger||[]).filter(l=>l.kind==='pay'&&ids.has(l.taskId));const tot=pay.reduce((a,l)=>a+(l.amount||0),0);
 const sc=(S.scores||[]).filter(x=>ids.has(x.taskId)),ok=sc.filter(x=>!x.exc);const pct=v=>v==null?'—':Math.round(v*100)+'%';
 const onT=ok.length?ok.filter(x=>x.onTime).length/ok.length:null,fst=ok.length?ok.filter(x=>x.first).length/ok.length:null;
 const tk=(S.tickets||[]).filter(t=>t.wid===X().W()).slice(0,4);const notes=[];if(d.route.notice)notes.push(['Route re-optimized by Dispatch',d.route.notice.seen?'Seen':'New']);if(d.route.edit)notes.push(['Your route changes: '+d.route.edit.status,d.route.edit.via||'']);tk.forEach(t=>notes.push([`Ticket ${t.id} · ${t.status}`,(t.fixes||[]).map(f=>f.desc).join('; ')]));if(unread())notes.push([`${unread()} unread message${unread()>1?'s':''} from Dispatch`,'Open chat']);
 const docs=(e.partner&&e.partner.docs)||[];const portal=`portal-driver.html?id=${encodeURIComponent(d.driverId)}`;const rate=(P.RATES&&P.RATES[d.line]||{}).label||'';
 return `<section class="d3-me" id="d3me"><div class="d3-prof"><span class="d3-av">${esc(d.name.split(' ').map(x=>x[0]).join(''))}</span><div><b>${esc(d.name)}</b><small>${esc(d.driverId)} · ${esc(k.long||k.name)}</small><small>${esc(X().hubName())}${d.vehicle?' · '+esc(d.vehicle):''}${e.partner?' · '+esc(e.partner.name):''}</small></div></div>
 <div class="d3-mc" id="d3pay"><div class="d3-mh"><b>${ic('bolt',15)} Today's pay</b><span>${money(tot)}</span></div><div class="d3-mut">${pay.length} paid stop${pay.length===1?'':'s'} so far${rate?' · '+esc(rate):''} · sample amounts</div>${pay.slice(0,5).map(l=>`<div class="d3-kv"><span>${esc(l.desc)}</span><b>${money(l.amount)}</b></div>`).join('')}<a class="d3-more" href="${portal}&view=pay" target="_blank" rel="noopener">Pay &amp; settlements ›</a></div>
 <div class="d3-mc" id="d3score"><div class="d3-mh"><b>${ic('check',15)} Scorecard · this route</b></div><div class="d3-stats"><div><b>${ok.length}</b><span>delivered</span></div><div><b>${sc.length-ok.length+counts().fail-(sc.length-ok.length)}</b><span>exceptions</span></div><div><b>${pct(onT)}</b><span>on time</span></div><div><b>${pct(fst)}</b><span>first try</span></div></div></div>
 <div class="d3-mc" id="d3docs"><div class="d3-mh"><b>${ic('manifest',15)} Documents</b><span class="${e.ok?'okt':'badt'}">${e.ok?'Eligible':'Blocked'}</span></div>${e.ok?'':`<div class="d3-warn">${esc(e.reasons.join('; '))}</div>`}${(e.warnings||[]).map(w=>`<div class="d3-mut">⚠ ${esc(w)}</div>`).join('')}${docs.slice(0,6).map(x=>`<div class="d3-kv"><span>${esc((P.DOC_LBL&&P.DOC_LBL[x.type])||x.type||'Document')}</span><b>${esc(x.status||'')}${x.exp?' · exp '+esc(x.exp):''}</b></div>`).join('')}<a class="d3-more" href="${portal}&view=docs" target="_blank" rel="noopener">Documents ›</a></div>
 <div class="d3-mc" id="d3notifs"><div class="d3-mh"><b>${ic('chat',15)} Notifications</b><span>${notes.length}</span></div>${notes.map(n=>`<div class="d3-kv"><span>${esc(n[0])}</span><small>${esc(n[1])}</small></div>`).join('')||'<div class="d3-mut">Nothing new.</div>'}<a class="d3-more" href="${portal}&view=notifs" target="_blank" rel="noopener">All notifications ›</a></div>
 <div class="d3-mc" id="d3help"><div class="d3-mh"><b>${ic('chat',15)} Help</b></div><div class="d3-ca wrap"><button class="d3-btn ghost" data-d3="chat">Chat with Dispatch (AI + dispatcher)</button><button class="d3-btn ghost" data-a="msgdisp">Message Dispatch</button><button class="d3-btn danger" data-a="sos">SOS</button></div>
 <ul class="d3-tips"><li>Plan: tap <b>Plan my route</b> and tap stops in your order, or let ChainEx order them.</li><li>Drive: <b>Start driving</b> goes stop to stop. Arriving opens the scan.</li><li>No signal: keep working. Everything waits on your phone and sends later.</li><li>Problem at a stop: use <b>${esc(k.exceptionLabel||"Can't deliver")}</b> and pick a reason.</li></ul></div>
 <div class="d3-mc"><div class="d3-mh"><b>${ic('gear',15)} Account</b></div><a class="d3-more" href="${portal}&view=profile" target="_blank" rel="noopener">Profile ›</a><button class="d3-btn ghost wide" data-a="signout" id="d3out">Sign out</button></div></section>`}
function vMe(){return `<div class="d3 d3-list">${strip('Me')}<div class="d3-scroll">${meHTML()}</div>${segs()}${netModal()}</div>`}
function vSettings(){const s=st();return `<div class="d3 d3-list d3-set">${strip('Settings')}<div class="d3-scroll"><div class="d3-setblk"><div class="sethead">This app</div><div class="setrow"><div>Practice offline mode<small>Pilot: see how the app works with no signal. Your work waits on the phone and sends when you reconnect.</small></div><button class="toggle${s.offline?' on':''}" data-d3="offline" id="d3off"></button></div>
 <div class="setrow"><div>Classic list view<small>Switch to the V02 list-first driver app.</small></div><button class="toggle" data-d3="classic" id="d3classic"></button></div>
 <div class="setrow"><div>Stop numbers on map<small>Show the order number on every stop tag.</small></div><button class="toggle${s.showNums?' on':''}" data-d3="nums"></button></div>
 <div class="setrow"><div>On duty<small>${X().D().duty?'Your route is open.':'Go on duty to start.'}</small></div><button class="toggle${X().D().duty?' on':''}" data-a="duty" id="d3duty"></button></div></div>
 ${X().settings().replace('data-a="nav" data-v="shift"','data-d3="view" data-v="today"')}</div>${segs()}${netModal()}</div>`}
function vScan(){const [l,n]=loaded();const preR=pre();const rec=X().R().flatMap(t=>t.items.map(p=>({p,t}))).filter(x=>x.p.loaded).slice(-4).reverse();
 return `<div class="d3 d3-scanv">${netHdr()}<div class="d3-hdr dark"><button class="d3-ib" data-d3="view" data-v="map" aria-label="Back">${ic('back',20)}</button><b>${preR?'Load-scan your vehicle':'Scan a package'}</b><span class="d3-cnt" id="d3cnt">${preR?`${l}/${n}`:''}</span></div>
 <div class="d3-cam"><div class="d3-ret"><span class="d3-laser"></span></div><p>${preR?'Hold the label inside the frame. Each package is checked against today\'s stops.':'Scan any package to open its stop.'}</p></div>
 <div class="d3-scanpanel">${preR?`<div class="d3-prog big"><i style="width:${n?Math.round(l/n*100):0}%"></i></div><div class="d3-mut">${l} of ${n} ${esc(X().unitW())} loaded · ${n-l} left</div>`:''}
  <div class="d3-scanrow"><input id="d3bc" placeholder="Scan or type a package ID" autocomplete="off"><button class="d3-btn pri" data-d3="bc">Add</button></div>
  <div class="d3-ca">${preR?`<button class="d3-btn ghost" data-d3="scannext" id="d3next1">Scan next (camera)</button><button class="d3-btn ghost" data-d3="scanall" id="d3all">Scan all (pilot)</button>`:''}</div>
  ${rec.length&&preR?`<div class="d3-rec">${rec.map(x=>`<div><b>✓ ${esc(x.p.id)}</b><span>Stop ${x.t.seq+1} · ${esc(x.t.name)}</span></div>`).join('')}</div>`:''}
  ${preR?`<button class="d3-btn pri wide" id="d3start" data-d3="start" ${l===n?'':'disabled'}>${l===n?'Start route':`Scan ${n-l} more to start`}</button>`:''}</div>${netModal()}</div>`}
function netHdr(){const s=st();return s.offline?`<div class="d3-offbar" id="d3offbar">${ic('wifi',14)} Offline · saving your work${s.queued?` · ${s.queued} waiting to send`:''}</div>`:''}
function netModal(){return st().net?`<div class="d3-modal" id="d3net"><div class="d3-mbox"><div class="d3-mic">${ic('wifi',26)}</div><h3>Offline, saving your work</h3><p>No signal right now. Keep scanning and delivering. ChainEx keeps everything on this phone and sends it to Dispatch when you're back online.</p><div class="d3-ca"><button class="d3-btn ghost" data-d3="netdismiss">Keep working</button><button class="d3-btn pri" data-d3="netretry">Check again</button></div></div></div>`:''}
function html(){const v=st().view;return v==='seq'?vSeq():v==='manifest'?vManifest():v==='settings'?vSettings():v==='scan'?vScan():v==='today'?vToday():v==='me'?vMe():vMap()}
let lastScr=null;
function paint(scr){const s=st();const cs=X().ui.screen;if(cs!==lastScr){if(lastScr!==null){if(cs==='route'||cs==='review')s.view='map';else if(cs==='load')s.view='scan'}lastScr=cs}if(pre()&&s.view==='map'&&!X().D().duty&&false){}
 // keep map host alive across repaints
 if(host&&host.parentNode)host.parentNode.removeChild(host);
 scr.innerHTML=html();const slot=scr.querySelector('#d3slot');if(slot)mount(slot,s.view==='seq'?'seq':'map');
 const q=scr.querySelector('#d3q');if(q)q.oninput=e=>{s.q=e.target.value;save();const pos=e.target.selectionStart;X().render();const n=document.querySelector('#d3q');if(n){n.focus();n.setSelectionRange(pos,pos)}};
 const bc=scr.querySelector('#d3bc');if(bc){bc.onkeydown=e=>{if(e.key==='Enter')act('bc')};if(s.view==='scan')setTimeout(()=>{if(document.activeElement===document.body)bc.focus({preventScroll:true})},50)}
 if(s.next&&!timer)startCountdown()}
function leave(){if(host&&host.parentNode)host.parentNode.removeChild(host)}
/* ---------- navigation in sequence ---------- */
function navTo(t,seq){const d=X().D();if(!t||!window.CXNav)return;const s=st();if(s.offline)s.queued=(s.queued||0)+1;
 s.navSeq=!!seq;s.sel=t.id;s.next=null;save();
 const ns=X().nextStep(t);if(ns&&ns.id==='omw')CX.update(()=>{CX.ops.completeStep(t.id,ns,{via:'navigate in sequence'},d.name);CX.ops.tick(1)});
 const hub=(CX.S.hubs[d.hub]||{}).ll;const from=(d.loc&&d.loc.length===2)?d.loc:hub;
 CXNav.open({host:$('#phone'),from,to:t.ll,title:`Stop ${t.seq+1} · ${t.name}`,address:t.address,label:String(t.seq+1),speed:4,autoArrive:true,
  onMove:ll=>{CX.update(()=>{const x=CX.driver(X().W());if(x)x.loc=ll})},
  onClose:()=>{const s2=st();s2.navSeq=false;save();X().render()},
  onArrive:()=>arrive(t.id)});
 X().toast('Navigating · stop '+(t.seq+1))}
function arrive(id){const w=X().W();CX.update(()=>{const x=CX.driver(w);const T=CX.task(id);if(x)x.loc=T.ll.slice();let s=X().nextStep(T),g=0;while(s&&s.kind==='confirm'&&/omw|arrive|depart|enroute/.test(s.id)&&g++<4){CX.ops.completeStep(id,s,{via:'auto-arrive'},x?x.name:'Driver');s=X().nextStep(CX.task(id))}CX.task(id).arrivedAt=CX.task(id).arrivedAt||CX.S.clock});
 const s=st();s.view='map';s.sel=id;save();X().render();X().toast('Arrived · scan the packages');setTimeout(()=>X().openSheet('step',id),250)}
function afterStep(id,failed){const s=st();const t=CX.task(id);if(!t)return;if(s.offline){s.queued=(s.queued||0)+1;save()}
 if(CX.OPEN(t)&&!failed&&t.state!=='failed'){const ns=X().nextStep(t);if(ns&&ns.kind!=='confirm'&&s.navSeq!==undefined){setTimeout(()=>{if(!X().sheet)X().openSheet('step',id)},300)}return}
 if(!s.navSeq&&!s.autoNext)return;const nx=X().cur();if(!nx){s.navSeq=false;save();X().render();X().toast('✓ Last stop done · return to station');return}
 s.next=nx.id;s.sel=nx.id;save();X().render()}
function startCountdown(){let n=3;clearInterval(timer);timer=setInterval(()=>{n--;const r=document.getElementById('d3ring');if(r)r.textContent=Math.max(n,0);if(n<=0){clearInterval(timer);timer=null;const s=st();if(s.next){const t=CX.task(s.next);s.next=null;save();navTo(t,true)}}},1000)}
/* ---------- actions ---------- */
function act(a,v){const s=st(),w=X().W();
 switch(a){
 case 'view':s.view=v;if(v!=='map')s.sel=s.sel;save();X().render();break;
 case 'seq':if(!pre()&&!assigned().length){X().toast('No stops left to sequence');break}s.seq=[];s.view='seq';save();X().render();break;
 case 'seqback':s.view=pre()?'map':'map';save();X().render();break;
 case 'seqclear':s.seq=[];save();X().render();X().toast('Sequence cleared');break;
 case 'sequndo':s.seq.pop();save();X().render();break;
 case 'calc':{const as=assigned();const picked=s.seq.map(id=>CX.task(id)).filter(t=>t&&t.state==='assigned');const rest=as.filter(t=>!s.seq.includes(t.id));
   const tail=optimize(picked.length?picked[picked.length-1].ll:startLL(),rest);const ids=picked.concat(tail).map(t=>t.id);if(!ids.length){X().toast('No stops to sequence');break}
   if(s.offline)s.queued=(s.queued||0)+1;
   applyOrder(ids,picked.length?'hand-picked on map':'auto-optimized');s.seq=[];s.view=pre()?'scan':'map';save();X().render();X().toast(`✓ Route saved · ${picked.length} hand-picked${tail.length?' + '+tail.length+' optimized':''} · Dispatch updated`);break}
 case 'auto':{if(!ensureCheckin())break;const as=assigned();const ids=optimize(startLL(),as).map(t=>t.id);applyOrder(ids,'auto-optimized');s.view='scan';save();X().render();X().toast('✓ Route optimized · scan to load');break}
 case 'manual':{if(!ensureCheckin())break;s.seq=[];s.view='seq';save();X().render();break}
 case 'scan':s.view='scan';save();X().render();break;
 case 'scannext':X().act('loadscan');X().render();break;
 case 'scanall':{const ids=X().R().filter(t=>t.kind!=='pickup').flatMap(t=>t.items).filter(p=>!p.loaded).map(p=>p.id);if(ids.length){CX.update(()=>CX.ops.loadScan(w,ids));X().toast(`✓ ${ids.length} loaded`)}X().render();break}
 case 'bc':{const inp=$('#d3bc');const val=(inp&&inp.value.trim())||'';if(!val){if(pre())act('scannext');break}
   if(pre()){let n;CX.update(()=>{n=CX.ops.loadScan(w,val)});X().toast(n?`✓ ${val} loaded`:`${val} isn't on this route`)}
   else{const t=X().R().find(t=>t.items.some(p=>p.id.toUpperCase()===val.toUpperCase())||t.id.toUpperCase()===val.toUpperCase());if(!t){X().toast(`${val} isn't on this route`);break}s.view='map';s.sel=t.id;save();X().toast('✓ Stop '+(t.seq+1)+' · '+t.name)}
   X().render();break}
 case 'start':X().act('startroute');s.view='map';s.sel=null;save();X().render();break;
 case 'go':{const c=X().cur();if(!c)break;s.autoNext=true;navTo(c,true);break}
 case 'navone':{const t=CX.task(v);s.autoNext=true;navTo(t,true);break}
 case 'nextgo':{clearInterval(timer);timer=null;const t=CX.task(s.next);s.next=null;save();navTo(t,true);break}
 case 'nextcancel':clearInterval(timer);timer=null;s.next=null;s.navSeq=false;save();X().render();break;
 case 'scanstop':{const t=CX.task(v);const ns=X().nextStep(t);if(ns&&ns.kind==='confirm'){arrive(v)}else X().openSheet('step',v);break}
 case 'details':X().openSheet('stop',v);break;
 case 'pick':s.sel=v;s.view='map';s.q='';save();X().render();break;
 case 'unsel':s.sel=null;save();X().render();break;
 case 'filters':X().openSheet('d3filter');break;
 case 'filter':s.filter=v;save();X().closeSheet();X().render();break;
 case 'pinset':X().openSheet('d3pinset');break;
 case 'nums':s.showNums=!s.showNums;save();X().render();break;
 case 'sync':if(s.offline){s.net=true;save();X().render();break}CX.load();X().render();X().toast('✓ Synced with Dispatch · '+fmt(CX.S.clock));break;
 case 'center':fitK='';X().render();break;
 case 'offline':{const q=s.queued||0;s.offline=!s.offline;s.net=s.offline;if(!s.offline){s.queued=0;X().toast(q?`✓ Back online · ${q} queued update${q>1?'s':''} synced to Dispatch`:'✓ Back online')}save();X().render();break}
 case 'netdismiss':s.net=false;save();X().render();break;
 case 'netretry':if(s.offline){X().toast('Still offline · try again shortly');}else{s.net=false;save();X().render();X().toast('✓ Connected')}break;
 case 'classic':X().ui.classic=true;save();X().render();X().toast('Classic view · turn V03 back on in Settings');break;
 case 'return':X().act('returnhub');break;
 case 'mesheet':X().openSheet('d3me');break;
 case 'chat':{const f=document.getElementById('ccFab');if(f)f.click();break}
 }}
function sheetHTML(type){const s=st();if(type==='d3filter')return `<div class="sh-h"><h3>Show stops</h3><button class="closebtn" data-a="close">Close</button></div><div class="sh-b d3-shb">${[['all','All stops'],['open','To do'],['done','Delivered'],['exc','Exceptions'],['pickup','Pickups']].map(f=>`<button class="d3-opt${s.filter===f[0]?' on':''}" data-d3="filter" data-v="${f[0]}">${f[1]}<span>${X().R().filter(t=>{const o=s.filter;s.filter=f[0];const m=matches(t);s.filter=o;return m}).length}</span></button>`).join('')}</div>`;
 if(type==='d3pinset')return `<div class="sh-h"><h3>Stop labels</h3><button class="closebtn" data-a="close">Close</button></div><div class="sh-b d3-shb"><div class="setrow"><div>Order numbers<small>Show the order number on every stop tag</small></div><button class="toggle${s.showNums?' on':''}" data-d3="nums"></button></div><div class="d3-legend"><span><b class="d3-tag cur">7</b> Driving to</span><span><b class="d3-tag nxt">8</b> After that</span><span><b class="d3-tag">9</b> Later</span><span><b class="d3-tag done">✓</b> Delivered</span><span><b class="d3-tag fail">!</b> Exception</span><span><i class="d3-me2"></i> You</span></div><div class="d3-mut">Map style is in Settings.</div></div>`;
 if(type==='d3me')return `<div class="sh-h"><h3>Me</h3><button class="closebtn" data-a="close">Close</button></div><div class="sh-b">${meHTML()}</div>`;return ''}
document.addEventListener('click',e=>{const b=e.target.closest('[data-d3]');if(!b||!document.getElementById('phone').contains(b))return;e.preventDefault();act(b.dataset.d3,b.dataset.v)});
window.CXD3={takes,paint,key,leave,afterStep,act,sheetHTML,optimize,get state(){return st()},navTo,arrive};
})();
