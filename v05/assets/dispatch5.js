/* ChainEx V05 · Dispatch. Map-first with ONE sidebar (Needs you → Unassigned → Drivers), Map/Table toggle, right inspector,
   phone: full-screen map + 3-detent bottom sheet. Logic reuses the shared ops layer (assign + eligibility gate, ticketDecide,
   reviewRouteEdit, reoptPreview/Apply staff-only, msgSend, mergeRoute, redeliver). Shared state: syncs with every version + driver app. */
(function(){
const C=window.CX,V=window.V5,esc=V.esc,ic=V.ic,fmt=C.fmt,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LN={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};
let scope,actor,blocked;
function loadScope(){blocked=false;scope={lines:C.LINE_ORDER.slice(),all:true,role:'Ops manager',reopt:true};actor='Dispatcher';if(!window.CXS)return;const s=CXS.get&&CXS.get();if(s&&s.kind!=='staff'){blocked=`Signed in as ${s.role||s.kind}. Dispatch is for ChainEx staff.`;return}
 const st=CXS.staff();if(!CXS.can('dispatch',st)){blocked=`${st.role} can't open Dispatch.`;return}scope={lines:CXS.lines(st),all:CXS.can('dispatch.all',st),role:st.role,name:st.name,reopt:CXS.can('reopt',st)};actor=st.name&&st.name!==st.role?`${st.name} (${st.role})`:st.role}
loadScope();
const UK='cx.v05.dispatch';let ui=Object.assign({line:'all',view:'map',sel:null,checked:[],q:'',sheet:'peek',seg:'needs',open:{},kb:-1},JSON.parse(localStorage.getItem(UK)||'{}'));ui.checked=[];
const save=()=>{const {checked,...r}=ui;localStorage.setItem(UK,JSON.stringify(r))};
const mob=()=>matchMedia('(max-width:899px)').matches;
const lines=()=>ui.line==='all'?scope.lines:[ui.line].filter(l=>scope.lines.includes(l));
const inL=x=>lines().includes(x.line);
const drivers=()=>C.S.drivers.filter(inL);
const prog=d=>{const a=C.routeAll(d.id),done=a.filter(t=>t.state==='completed').length,fail=a.filter(t=>t.state==='failed').length;return{all:a.length,done,fail,open:a.length-done-fail,pct:a.length?Math.round((done+fail)/a.length*100):0}};
const risk=d=>{const e=C.etas(d.id)||{};return C.route(d.id).filter(t=>e[t.id]&&e[t.id].risk).length};
const elig=d=>C.eligibility?C.eligibility(d.id,d.line):{ok:true,reasons:[]};
const qm=s=>!ui.q||String(s).toLowerCase().includes(ui.q.toLowerCase());
const dstat=d=>d.sos?['SOS','bad']:!d.duty?['Off duty','']:d.route.stage==='on_road'?(risk(d)?['Late','warn']:['Driving','acc']):d.route.stage==='closed'?['Closed','ok']:['Not started',''];
/* ---------- data ---------- */
function needs(){const S=C.S,o=[];
 (S.tickets||[]).filter(t=>t.status==='pending'&&lines().includes(t.line)).forEach(t=>o.push({k:'ticket',id:t.id,c:'var(--bad)',ttl:`${t.driver} · ${t.label}`,sub:(t.text?`“${t.text}” · `:'')+(t.fixes||[]).filter(f=>f.status==='pending').map(f=>f.desc).join('; '),line:t.line,o:t}));
 drivers().filter(d=>d.sos).forEach(d=>o.push({k:'sos',id:d.id,c:'var(--bad)',ttl:`SOS · ${d.name}`,sub:d.route.id,line:d.line,o:d}));
 drivers().filter(d=>d.route&&d.route.edit&&d.route.edit.status==='pending').forEach(d=>o.push({k:'edit',id:d.id,c:'var(--vio)',ttl:`${d.name} changed the stop order`,sub:d.route.edit.summary||d.route.id,line:d.line,o:d}));
 drivers().forEach(d=>{if(!d.dspSlot&&C.route(d.id).length&&!elig(d).ok)o.push({k:'blocked',id:d.id,c:'var(--bad)',ttl:`${d.name} not cleared · ${C.route(d.id).length} stops`,sub:elig(d).reasons.join('; '),line:d.line,o:d})});
 drivers().forEach(d=>{const r=risk(d);if(r&&d.route.stage==='on_road')o.push({k:'risk',id:d.id,c:'var(--warn)',ttl:`${d.route.id} · ${r} stops at risk`,sub:`${d.name} · ${prog(d).done}/${prog(d).all} done`,line:d.line,o:d})});
 ((S.whp&&S.whp.issues)||[]).filter(i=>i.dest==='dispatch'&&i.status==='Open').forEach(i=>o.push({k:'wh',id:i.id,c:'var(--cyan)',ttl:i.title||i.kind||'Warehouse issue',sub:i.text||i.detail||'',line:null,o:i}));
 S.tasks.filter(t=>t.state==='failed'&&inL(t)&&!(t.tags||[]).includes('REVIEWED')).slice(0,40).forEach(t=>o.push({k:'exc',id:t.id,c:'var(--warn)',ttl:`Not delivered · ${t.name}`,sub:`${t.failReason||'Exception'} → ${t.nextAction||'review'}`,line:t.line,o:t}));
 return o.filter(x=>qm(x.ttl+x.sub))}
function unassigned(){const g={};C.S.tasks.filter(t=>t.state==='unassigned'&&!t.workerId&&inL(t)&&qm(t.name+t.address+t.id)).forEach(t=>{const z=(t.items[0]&&t.items[0].sortCode||'').split('-').slice(0,2).join('-')||LN[t.line];const k=t.line+'|'+z;(g[k]=g[k]||{k,line:t.line,zone:z,tasks:[]}).tasks.push(t)});return Object.values(g)}
function drvList(){return drivers().filter(d=>qm(d.name+d.route.id)).sort((a,b)=>(b.sos-a.sos)||((b.route.stage==='on_road')-(a.route.stage==='on_road'))||risk(b)-risk(a)||a.name.localeCompare(b.name))}
/* ---------- render ---------- */
let map=null,fitted='';
function itemNeeds(x){const acts={ticket:`<button class="btn sm okb" data-a="tkok" data-v="${x.id}">${ic('check',14)}Approve</button><button class="btn sm ghost" data-a="tkno" data-v="${x.id}">Decline</button><button class="btn sm ghost" data-a="msg" data-v="${x.o.wid}">${ic('chat',14)}</button>`,
 sos:`<button class="btn sm pri" data-a="msg" data-v="${x.id}">${ic('chat',14)}Message</button><button class="btn sm ghost" data-a="drv" data-v="${x.id}">Locate</button>`,
 edit:`<button class="btn sm pri" data-a="edok" data-v="${x.id}">Keep driver order</button><button class="btn sm ghost" data-a="edno" data-v="${x.id}">Restore plan</button>`,
 blocked:`<button class="btn sm pri" data-a="reroute" data-v="${x.id}">${ic('swap',14)}Move stops</button>`,
 risk:`${scope.reopt?`<button class="btn sm" data-a="reopt" data-v="${x.id}">${ic('bolt',14)}Re-optimize</button>`:''}<button class="btn sm ghost" data-a="reroute" data-v="${x.id}">Reassign</button><button class="btn sm ghost" data-a="msg" data-v="${x.id}">${ic('chat',14)}</button>`,
 wh:`<button class="btn sm" data-a="whok" data-v="${x.id}">Resolve</button>`,
 exc:`<button class="btn sm" data-a="redo" data-v="${x.id}">Retry today</button><button class="btn sm ghost" data-a="assign" data-v="${x.id}">Reassign</button><button class="btn sm ghost" data-a="exok" data-v="${x.id}">Reviewed</button>`}[x.k];
 return `<div class="d5-it" data-item="n:${x.k}:${esc(x.id)}" data-open="${x.k==='exc'?'stop':x.k==='ticket'?'drv':x.k==='wh'?'':'drv'}" data-ov="${esc(x.k==='ticket'?x.o.wid:x.id)}"><span class="d5-sig" style="background:${x.c}"></span><div class="grow"><div class="ttl">${esc(x.ttl)}</div><div class="sub">${x.line?`<span class="mono">${esc(LN[x.line])}</span> · `:''}${esc(x.sub)}</div><div class="acts">${acts}</div></div></div>`}
function itemZone(z){const open=ui.open[z.k];const chk=z.tasks.every(t=>ui.checked.includes(t.id));return `<div class="d5-it" data-item="z:${esc(z.k)}" data-a="zone" data-v="${esc(z.k)}"><input type="checkbox" class="d5-cb" data-a="chkz" data-v="${esc(z.k)}"${chk?' checked':''} aria-label="Select zone"><div class="grow"><div class="ttl"><span class="mono">${esc(z.zone)}</span> · ${z.tasks.length} stop${z.tasks.length>1?'s':''}</div><div class="sub">${esc(LN[z.line])} · ${fmt(Math.min(...z.tasks.map(t=>t.window[0])))}–${fmt(Math.max(...z.tasks.map(t=>t.window[1])))}</div>
 <div class="acts"><button class="btn sm pri" data-a="assign" data-v="${esc(z.k)}">${ic('user',14)}Assign ${z.tasks.length>1?'all':''}</button><button class="btn sm ghost" data-a="zone" data-v="${esc(z.k)}">${open?'Hide':'Show'} stops</button></div>
 ${open?`<div style="margin-top:6px">${z.tasks.slice(0,30).map(t=>`<div class="d5-stop" data-a="stop" data-v="${t.id}"><input type="checkbox" class="d5-cb" data-a="chk" data-v="${t.id}"${ui.checked.includes(t.id)?' checked':''}><span class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</span><span class="mono t3">${esc(t.id.slice(-6))}</span></div>`).join('')}</div>`:''}</div></div>`}
function itemDrv(d){const p=prog(d),[s,k]=dstat(d);return `<button class="d5-it${ui.sel&&ui.sel.t==='drv'&&ui.sel.id===d.id?' sel':''}" data-item="d:${d.id}" data-a="drv" data-v="${d.id}">${V.av(d.name,d.id,30)}<div class="grow"><div class="ttl">${esc(d.name)} <span class="mono t3" style="font-weight:450">${esc(d.route.id)}</span></div><div class="sub">${esc(LN[d.line])} · ${p.done}/${p.all} done${p.fail?` · ${p.fail} exc`:''}${d.dspSlot?' · DSP':''}</div><div class="bar ok" style="margin-top:6px"><i style="width:${p.pct}%"></i></div></div><span class="chip ${k}">${s}</span></button>`}
function sideHTML(){const n=needs(),u=unassigned(),ds=drvList();const un=u.reduce((a,z)=>a+z.tasks.length,0);
 const seg=mob()?ui.seg:null;const show=k=>!seg||seg===k;
 return `<div class="d5-sh"><div class="d5-lines">${[...(scope.all?['all']:[]),...scope.lines].map(l=>{const c=(l==='all'?scope.lines:[l]).reduce((a,x)=>a+(C.S.tickets||[]).filter(t=>t.status==='pending'&&t.line===x).length+C.S.tasks.filter(t=>t.line===x&&t.state==='failed'&&!(t.tags||[]).includes('REVIEWED')).length,0);return `<button class="d5-ln${ui.line===l?' on':''}" data-a="line" data-v="${l}">${l==='all'?'All':esc(LN[l])}${c?`<span class="n">${c}</span>`:''}</button>`}).join('')}</div>
 <div style="display:flex;gap:8px"><input class="in" id="d5q" placeholder="Filter stops, drivers, routes" value="${esc(ui.q)}" style="height:32px"><div class="seg x-hide-m"><button data-a="view" data-v="map" class="${ui.view==='map'?'on':''}" title="Map (M)">${ic('map',15)}</button><button data-a="view" data-v="table" class="${ui.view==='table'?'on':''}" title="Table (M)">${ic('table',15)}</button></div></div>
 ${mob()?`<div class="seg" style="width:100%">${[['needs','Needs you',n.length],['un','Unassigned',un],['drv','Drivers',ds.length]].map(([k,l,c])=>`<button style="flex:1" class="${ui.seg===k?'on':''}" data-a="seg" data-v="${k}">${l} <span class="mono t3">${c}</span></button>`).join('')}</div>`:''}</div>
 <div class="d5-list" id="d5list">
 ${show('needs')?`<div class="d5-grp"><span class="micro" style="color:var(--bad)">Needs you</span><span class="c">${n.length}</span></div>${n.length?n.map(itemNeeds).join(''):`<div class="empty">${ic('check',20)}<br>Nothing needs you.</div>`}`:''}
 ${show('un')?`<div class="d5-grp"><span class="micro">Unassigned</span><span class="c">${un} stops</span></div>${u.length?u.map(itemZone).join(''):'<div class="empty">Every stop has a driver.</div>'}`:''}
 ${show('drv')?`<div class="d5-grp"><span class="micro">Drivers</span><span class="c">${ds.length}</span></div>${ds.map(itemDrv).join('')}`:''}</div>`}
function tableHTML(){const T=C.S.tasks.filter(t=>inL(t)&&qm(t.name+t.address+t.id)).slice(0,400);return `<table class="tbl"><thead><tr><th style="width:28px"></th><th>Stop</th><th>ID</th><th>Line</th><th>Status</th><th>Driver</th><th>Window</th><th>Seq</th></tr></thead><tbody>${T.map(t=>{const d=t.workerId&&C.driver(t.workerId);const k={completed:'ok',failed:'bad',active:'acc'}[t.state]||'';return `<tr data-a="stop" data-v="${t.id}" class="${ui.checked.includes(t.id)?'sel':''}"><td><input type="checkbox" class="d5-cb" data-a="chk" data-v="${t.id}"${ui.checked.includes(t.id)?' checked':''}></td><td>${esc(t.name)}</td><td class="mono t3">${esc(t.id)}</td><td>${esc(LN[t.line])}</td><td><span class="chip ${k}">${esc(C.stateLabel(t.state,t.line))}</span></td><td>${d?esc(d.name):'<span class="t3">—</span>'}</td><td class="mono">${fmt(t.window[0])}–${fmt(t.window[1])}</td><td class="mono num">${t.workerId?t.seq+1:''}</td></tr>`}).join('')}</tbody></table>`}
function hud(){const ds=drivers(),run=ds.filter(d=>d.route.stage==='on_road'&&C.route(d.id).length).length,T=C.S.tasks.filter(inL),done=T.filter(t=>t.state==='completed').length,n=needs().length,un=T.filter(t=>t.state==='unassigned').length;
 return `<div class="d5-stat glass"><div><b>${run}</b><span>routes live</span></div><div><b>${done}<span class="t3" style="font-size:12px">/${T.length}</span></b><span>stops done</span></div><div><b class="${n?'bad':''}">${n}</b><span>need you</span></div><div class="x-hide-m"><b>${un}</b><span>unassigned</span></div><div class="x-hide-m"><b>${ds.filter(d=>d.duty).length}</b><span>on duty</span></div></div>`}
function inspHTML(){const s=ui.sel;if(!s)return '';if(s.t==='drv'){const d=C.driver(s.id);if(!d)return '';const p=prog(d),e=elig(d),[st,k]=dstat(d),et=C.etas(d.id)||{},all=C.routeAll(d.id);
  return `<div class="d5-ih">${V.av(d.name,d.id,32)}<div style="flex:1;min-width:0"><b>${esc(d.name)}</b><div class="small t3"><span class="mono">${esc(d.route.id)}</span> · ${esc(LN[d.line])}</div></div><span class="chip ${k}">${st}</span><button class="x-ib" data-a="unsel" aria-label="Close">${ic('x',16)}</button></div>
  <div class="d5-ib"><div class="d5-kv"><div><b>${p.done}</b><span>delivered</span></div><div><b>${p.open}</b><span>to go</span></div><div><b class="${risk(d)?'warn':''}">${risk(d)}</b><span>at risk</span></div></div>
  <div>${e.ok?'<span class="chip ok">Cleared to drive</span>':`<span class="chip bad">${ic('lock',12)} ${esc(e.reasons.join('; '))}</span>`} <span class="chip">${esc((d.vehicle||'').split('·')[0])}</span> ${d.route.edit&&d.route.edit.status==='pending'?'<span class="chip vio">Driver edited order</span>':''}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-a="msg" data-v="${d.id}">${ic('chat',14)}Message</button>${scope.reopt&&d.line!=='shuttle'?`<button class="btn sm" data-a="reopt" data-v="${d.id}">${ic('bolt',14)}Re-optimize</button>`:''}<button class="btn sm" data-a="reroute" data-v="${d.id}">${ic('swap',14)}Reassign</button><button class="btn sm ghost" data-a="fit">${ic('target',14)}Fit</button></div>
  <div class="micro">Route · ${all.length} ${esc((C.lines[d.line]||{}).stopWord||'stops')}</div><div>${all.map((t,i)=>{const c=t.state==='completed'?'done':t.state==='failed'?'fail':t.state==='active'?'act':'';return `<div class="d5-stop" data-a="stop" data-v="${t.id}" style="cursor:pointer"><span class="d5-n ${c}">${i+1}</span><span style="flex:1;min-width:0"><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span><span class="small t3">${esc(C.stateLabel(t.state,t.line))}${et[t.id]?' · ETA '+fmt(et[t.id].eta):''}</span></span>${et[t.id]&&et[t.id].risk?'<span class="chip warn">late</span>':''}</div>`}).join('')}</div></div>`}
 const t=C.task(s.id);if(!t)return '';const d=t.workerId&&C.driver(t.workerId);
 return `<div class="d5-ih"><span class="t3">${ic('pin',18)}</span><div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</b><div class="small t3 mono">${esc(t.id)}</div></div><button class="x-ib" data-a="unsel" aria-label="Close">${ic('x',16)}</button></div>
 <div class="d5-ib"><div class="small t2">${esc(t.address)}</div><div><span class="chip">${esc(C.stateLabel(t.state,t.line))}</span> <span class="chip acc">${esc(LN[t.line])}</span> ${d?`<span class="chip">${esc(d.name)}</span>`:''} ${(t.tags||[]).slice(0,3).map(x=>`<span class="chip">${esc(x.toLowerCase())}</span>`).join(' ')}</div>
 <div class="d5-kv"><div><b>${fmt(t.window[0])}</b><span>from</span></div><div><b>${fmt(t.window[1])}</b><span>until</span></div><div><b>${t.items.length}</b><span>items</span></div></div>
 <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm pri" data-a="assign" data-v="${t.id}">${ic('user',14)}${t.workerId?'Reassign':'Assign'}</button>${t.state==='failed'?`<button class="btn sm" data-a="redo" data-v="${t.id}">Retry today</button>`:''}${d?`<button class="btn sm ghost" data-a="drv" data-v="${d.id}">Open route</button>`:''}</div>
 ${t.pod?`<div class="card pad small"><b>Proof of delivery</b><br>${esc(t.pod.summary||'')}${t.pod.photo?' · photo':''}${t.pod.signature?' · signature':''}</div>`:''}
 <div class="micro">Timeline</div>${t.timeline.slice().reverse().slice(0,20).map(x=>`<div class="d5-stop"><span class="mono t3" style="width:64px;flex:none">${fmt(x.at)}</span><span style="flex:1">${esc(x.text)}<span class="small t3"> · ${esc(x.actor||'')}</span></span></div>`).join('')}</div>`}
function bulkHTML(){return ui.checked.length?`<div class="d5-bulk glass"><span class="small"><b class="mono">${ui.checked.length}</b> selected</span><button class="btn sm pri" data-a="assignChecked">${ic('user',14)}Assign</button><button class="btn sm ghost" data-a="clearChk">Clear</button></div>`:''}
function mapData(){const ds=drivers().filter(d=>!d.dspSlot),pins=[],lns=[];const s=ui.sel;let selD=s&&s.t==='drv'?C.driver(s.id):s&&s.t==='stop'&&C.task(s.id)&&C.task(s.id).workerId?C.driver(C.task(s.id).workerId):null;
 ds.forEach(d=>{const r=C.route(d.id);if(r.length&&(!selD||selD.id===d.id))lns.push({coords:selD?[d.loc,...r.map(t=>t.ll)]:r.map(t=>t.ll),color:V.hue(d.id),width:selD?3.5:1.6,opacity:selD?1:.55})});
 if(selD){C.routeAll(selD.id).forEach((t,i)=>pins.push({ll:t.ll,label:String(i+1),color:t.state==='completed'?'var(--ok)':t.state==='failed'?'var(--bad)':V.hue(selD.id),id:t.id,cls:s&&s.t==='stop'&&s.id===t.id?'sel':'',title:t.name,onClick:p=>act('stop',p.id)}))}
 else C.S.tasks.filter(t=>t.state==='unassigned'&&inL(t)).slice(0,200).forEach(t=>pins.push({ll:t.ll,label:'',color:'#8A9099',id:t.id,title:t.name+' · unassigned',onClick:p=>act('stop',p.id),cls:'u'}));
 C.S.tasks.filter(t=>t.state==='failed'&&inL(t)&&!(t.tags||[]).includes('REVIEWED')).forEach(t=>pins.push({ll:t.ll,label:'!',color:'var(--bad)',id:t.id,title:'Not delivered · '+t.name,onClick:p=>act('stop',p.id)}));
 ds.forEach(d=>pins.push({ll:d.loc,label:'',color:d.sos?'#FF5C64':V.hue(d.id),cls:'drv'+(d.route.stage==='on_road'?' live':'')+(selD&&selD.id===d.id?' sel':''),id:d.id,title:`${d.name} · ${d.route.id}`,onClick:p=>act('drv',p.id)}));
 return{pins,lines:lns}}
function draw(){C.load();const app=document.getElementById('app');
 if(blocked){const m=V.shell({app:'Dispatch'});m.innerHTML=`<div class="empty" style="padding:80px 16px"><div style="font-size:16px;color:var(--t1);margin-bottom:12px">${esc(blocked)}</div><button class="btn pri" data-a="role" data-v="Ops manager">Use sample Ops manager</button></div>`;return}
 if(ui.line!=='all'&&!scope.lines.includes(ui.line))ui.line=scope.all?'all':scope.lines[0];if(ui.line==='all'&&!scope.all)ui.line=scope.lines[0];
 if(!$('#d5')){const n=needs().length;const main=V.shell({app:'Dispatch',full:true,badges:{'dispatch.html':n||''},tabs:[['#needs','Needs you','alert',n||''],['#un','Unassigned','box'],['#drv','Drivers','users'],['#cmd','Search','search'],['#more','More','menu']],tab:ui.seg,onRole:()=>{loadScope();ui.sel=null;$('#d5')&&$('#d5').remove();map=null;draw()},
  crumbHTML:`<span class="x-hide-m">ChainEx /</span> Dispatch <span class="x-live x-hide-m" style="margin-left:6px"><i class="dot live"></i>Live</span>`});
  main.innerHTML=`<div class="d5" id="d5"><aside class="d5-side" id="d5side"></aside><section class="d5-mapw"><div class="d5-map x-map" id="d5map"></div><div class="d5-table" id="d5table" hidden></div><div class="d5-hud" id="d5hud"></div><div class="d5-tools"><button class="x-ib" data-a="fit" title="Zoom to fit (Z)">${ic('target',16)}</button><button class="x-ib x-hide-m" data-a="view" data-v="${ui.view==='map'?'table':'map'}" id="d5vt" title="Map / table (M)">${ic('table',16)}</button><button class="x-ib" data-a="help" title="Shortcuts (?)">${ic('kbd',16)}</button></div><div id="d5bulk"></div></section><aside class="d5-insp" id="d5insp" hidden></aside></div>
  <div class="d5-sheet ${ui.sheet}" id="d5sheet"><button class="d5-grab" data-a="sheet" aria-label="Expand list"><i></i></button><div id="d5sheetb" style="display:flex;flex-direction:column;min-height:0;flex:1"></div></div>`;
  map=new V.Map($('#d5map'),{pad:70});fitted=''}
 const side=sideHTML();if(mob()){$('#d5sheetb').innerHTML=side;$('#d5side').innerHTML=''}else{$('#d5side').innerHTML=side;$('#d5sheetb').innerHTML=''}
 $$('.x-tab[data-tab]').forEach(t=>t.classList.toggle('on',t.dataset.tab===ui.seg));
 $('#d5hud').innerHTML=hud();$('#d5bulk').innerHTML=bulkHTML();
 const ins=$('#d5insp');const show=!!ui.sel&&!mob();ins.hidden=!show;$('#d5').classList.toggle('insp',show);ins.innerHTML=show?inspHTML():'';
 const tb=$('#d5table');tb.hidden=ui.view!=='table'||mob();tb.parentNode.classList.toggle('tv',!tb.hidden);if(!tb.hidden)tb.innerHTML=tableHTML();$('#d5vt').innerHTML=ic(ui.view==='map'?'table':'map',16);$('#d5vt').dataset.v=ui.view==='map'?'table':'map';
 const key=ui.line+'|'+(ui.sel?ui.sel.t+ui.sel.id:'');map.set(mapData(),fitted!==key);if(fitted!==key){fitted=key;setTimeout(()=>map.resize(),50)}
 const q=$('#d5q');if(q)q.oninput=()=>{ui.q=q.value;clearTimeout(q._t);q._t=setTimeout(()=>{const pos=q.selectionStart;draw();const n=$('#d5q');n.focus();n.setSelectionRange(pos,pos)},160)};
 kbPaint()}
/* ---------- panels ---------- */
function pickDriver(title,line,cb,exclude){const ds=C.S.drivers.filter(d=>d.line===line&&d.id!==exclude&&!d.dspSlot).map(d=>({d,e:elig(d),n:C.route(d.id).length})).sort((a,b)=>(b.e.ok-a.e.ok)||(b.d.duty-a.d.duty)||a.n-b.n);
 V.panel(title,`<div class="small t2">Drivers who aren't cleared (expired documents, suspension, wrong vehicle) are locked by the eligibility gate.</div><div class="card" style="overflow:hidden">${ds.map(({d,e,n})=>`<div class="row">${V.av(d.name,d.id,30)}<div class="grow"><div class="ttl">${esc(d.name)} <span class="mono t3" style="font-weight:450">${esc(d.route.id)}</span></div><div class="sub">${n} open · ${d.duty?'on duty':'off duty'}${e.ok?'':' · '+esc(e.reasons.join('; '))}</div></div>${e.ok?`<button class="btn sm pri" data-pick="${d.id}">Assign</button>`:`<span class="chip bad">${ic('lock',12)}Blocked</span>`}</div>`).join('')||'<div class="empty">No drivers on this line.</div>'}</div>`,{icon:'user',kind:'pick'});
 $$('[data-pick]').forEach(b=>b.onclick=()=>{V.close();cb(b.dataset.pick)})}
function assignIds(ids,wid){let n=0,bl=null;C.update(()=>{ids.forEach(id=>{const r=C.ops.assign(id,wid,null,null,actor);if(r===false)bl=C.ops.lastBlock;else{n++;const t=C.task(id);if(t&&t.state==='failed')C.ops.redeliver(id)}})});ui.checked=ui.checked.filter(x=>!ids.includes(x));draw();V.toast(bl&&!n?'Blocked · '+bl.join(', '):`${n} stop${n>1?'s':''} → ${C.driver(wid).name} · driver notified`,'check')}
function msgPanel(wid){const d=C.driver(wid);if(!d)return;C.update(()=>C.ops.msgRead&&C.ops.msgRead(wid,'desk'));const th=(C.S.msgs||[]).filter(m=>m.wid===wid).slice(-40);
 V.panel(d.name,`<div style="display:flex;flex-direction:column;gap:6px">${th.length?th.map(m=>`<div class="chatb ${m.from==='driver'?'':m.from==='bot'?'bot':'me'}"><small>${esc(m.from==='driver'?d.name:m.from==='bot'?'Dispatch bot':(m.actor||'Dispatch'))} · ${fmt(m.at)}</small>${esc(m.text)}</div>`).join(''):'<div class="empty">No messages today.</div>'}</div>
 <div style="display:flex;gap:6px;flex-wrap:wrap">${['On my way to help','Call me','Skip that stop for now','Take your break'].map(q=>`<button class="btn sm" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`,{icon:'chat',kind:'msg',foot:`<input class="in" id="d5msg" placeholder="Message ${esc(d.name.split(' ')[0])}…"><button class="btn pri" id="d5send">${ic('chat',14)}Send</button>`});
 const send=t=>{if(!t.trim())return;C.update(()=>C.ops.msgSend(wid,'desk',t.trim(),actor));V.toast('Sent','check');msgPanel(wid)};$('#d5send').onclick=()=>send($('#d5msg').value);$('#d5msg').onkeydown=e=>{if(e.key==='Enter')send(e.target.value)};$$('[data-q]').forEach(b=>b.onclick=()=>send(b.dataset.q));const pb=$('#x-panel .x-pb');pb&&setTimeout(()=>pb.scrollTop=pb.scrollHeight,20)}
function reoptPanel(wid){if(!scope.reopt){V.toast('Re-optimize is for ChainEx staff dispatch teams','lock');return}const d=C.driver(wid);const res=C.ops.reoptPreview({line:d.line,wids:[wid]}),r=res[0];
 if(!r){V.panel('Re-optimize '+d.route.id,'<div class="empty">Fewer than 3 stops left, or a fixed-schedule line (Shuttle).</div>',{icon:'bolt',kind:'reopt'});return}
 V.panel('Re-optimize '+r.routeId,`<div class="small t2">${esc(d.name)} · ${r.n} stops left. Keeps first/last stop${r.locked?` and ${r.locked} locked`:''} and time windows.</div>
 <div class="d5-kv" style="grid-template-columns:1fr 1fr"><div><b>${r.beforeKm} km</b><span>now · ~${r.beforeMin} min</span></div><div><b class="ok">${r.afterKm} km</b><span>after · ~${r.afterMin} min</span></div></div>
 <div class="small">${r.changed?`Saves <b class="mono">${(r.beforeKm-r.afterKm).toFixed(1)} km</b>. The driver gets a notice in the app.`:'Already the shortest order. Nothing to change.'}</div>`,{icon:'bolt',kind:'reopt',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="d5ro"${r.changed?'':' disabled'}>${ic('bolt',14)}Apply</button>`});
 $('#d5ro').onclick=()=>{let o;C.update(()=>{o=C.ops.reoptApply(res,actor)});V.close();draw();V.toast(o&&o.ok===false?o.why:'New order applied · driver notified','bolt')}}
/* ---------- actions ---------- */
const zoneIds=k=>{const z=unassigned().find(x=>x.k===k);return z?z.tasks.map(t=>t.id):[]};
function act(a,v,el){switch(a){
 case 'line':ui.line=v;ui.sel=null;save();draw();break;
 case 'view':ui.view=v;save();draw();break;
 case 'seg':ui.seg=v;if(ui.sheet==='peek')ui.sheet='half';$('#d5sheet').className='d5-sheet '+ui.sheet;save();draw();break;
 case 'sheet':ui.sheet=ui.sheet==='peek'?'half':ui.sheet==='half'?'full':'peek';$('#d5sheet').className='d5-sheet '+ui.sheet;save();break;
 case 'drv':ui.sel={t:'drv',id:v};save();if(mob()){ui.sheet='peek';$('#d5sheet').className='d5-sheet peek';draw();V.panel(C.driver(v).name,`<div style="margin:-16px">${inspHTML()}</div>`,{kind:'drv',scrim:false})}else draw();break;
 case 'stop':ui.sel={t:'stop',id:v};save();if(mob()){draw();V.panel(C.task(v).name,`<div style="margin:-16px">${inspHTML()}</div>`,{kind:'stop',scrim:false})}else draw();break;
 case 'unsel':ui.sel=null;save();V.close();draw();break;
 case 'fit':map&&map.fit();break;
 case 'zone':ui.open[v]=!ui.open[v];save();draw();break;
 case 'chk':{const i=ui.checked.indexOf(v);i<0?ui.checked.push(v):ui.checked.splice(i,1);draw();break}
 case 'chkz':{const ids=zoneIds(v),all=ids.every(id=>ui.checked.includes(id));ui.checked=all?ui.checked.filter(x=>!ids.includes(x)):[...new Set([...ui.checked,...ids])];draw();break}
 case 'clearChk':ui.checked=[];draw();break;
 case 'assignChecked':{const ids=ui.checked.slice();const t=C.task(ids[0]);if(t)pickDriver(`Assign ${ids.length} stops`,t.line,w=>assignIds(ids.filter(id=>C.task(id).line===t.line),w));break}
 case 'assign':{const ids=C.task(v)?[v]:zoneIds(v);const t=C.task(ids[0]);if(t)pickDriver(ids.length>1?`Assign ${ids.length} stops`:`Assign ${t.name}`,t.line,w=>assignIds(ids,w));break}
 case 'reroute':{const d=C.driver(v);pickDriver(`Move ${d.name}'s open stops to…`,d.line,to=>{let n=0;C.update(()=>{n=C.ops.mergeRoute(v,to)});draw();V.toast(C.ops.lastBlock?'Blocked · '+C.ops.lastBlock.join(', '):`${n} stops → ${C.driver(to).name}`,'swap')},v);break}
 case 'tkok':case 'tkno':{let r;C.update(()=>{r=C.ops.ticketDecide(v,a==='tkok',actor)});draw();V.toast(r&&r.ok===false?(r.why||'Not allowed'):a==='tkok'?'Approved · fixes applied · driver told':'Declined · driver told',a==='tkok'?'check':'x');break}
 case 'edok':case 'edno':C.update(()=>C.ops.reviewRouteEdit(v,a==='edok',actor));draw();V.toast(a==='edok'?"Driver's order kept":'Plan restored · driver notified');break;
 case 'exok':C.update(()=>{const t=C.task(v);t.tags.push('REVIEWED');t.timeline.push({at:C.S.clock,text:'Exception reviewed (V05 dispatch)',actor})});draw();V.toast('Marked reviewed','check');break;
 case 'redo':C.update(()=>C.ops.redeliver(v));draw();V.toast('Queued to retry today','refresh');break;
 case 'whok':C.update(S=>{C.whp&&C.whp.X.resolveIssue(S,actor,v)});draw();V.toast('Warehouse issue resolved','check');break;
 case 'reopt':reoptPanel(v);break;
 case 'msg':msgPanel(v);break;
 case 'help':V.help([['J / K','Move through the list'],['Enter','Open selected'],['A','Assign selected / checked'],['M','Map ⇄ table'],['Z','Zoom to fit'],['R','Re-optimize selected route'],['1–6','Service line'],['N','Simulate a driver ticket (demo)']]);break;
 case 'role':CXS.actAs(v);location.reload();break;
 case 'sim':{const ds=drivers().filter(d=>d.route.stage==='on_road'&&C.route(d.id).length);const d=ds[Math.floor(Math.random()*ds.length)];if(!d){V.toast('No driver on the road here');break}C.update(()=>C.ops.botIssue(d.id,['toomany','vehicle','address','access'][Math.floor(Math.random()*4)],null,''));draw();V.toast('New ticket · '+d.name,'alert');break}
}}
document.addEventListener('click',e=>{const tab=e.target.closest('.x-tab[data-tab]');if(tab){act('seg',tab.dataset.tab);return}
 const b=e.target.closest('[data-a]');if(b&&!b.disabled&&b.tagName!=='A'){if(b.tagName==='INPUT'){e.stopPropagation();act(b.dataset.a,b.dataset.v,b);return}e.preventDefault();e.stopPropagation();act(b.dataset.a,b.dataset.v,b);return}
 const it=e.target.closest('.d5-it[data-open]');if(it&&it.dataset.open&&!e.target.closest('button'))act(it.dataset.open,it.dataset.ov)},false);
/* keyboard */
function kbItems(){return $$('.d5-list .d5-it')}
function kbPaint(){kbItems().forEach((x,i)=>x.classList.toggle('kb',i===ui.kb))}
V.keys['j']=()=>{const n=kbItems().length;ui.kb=Math.min(n-1,ui.kb+1);kbPaint();kbItems()[ui.kb]?.scrollIntoView({block:'nearest'})};
V.keys['k']=()=>{ui.kb=Math.max(0,ui.kb-1);kbPaint();kbItems()[ui.kb]?.scrollIntoView({block:'nearest'})};
V.keys['Enter']=()=>{const it=kbItems()[ui.kb];if(!it)return;const b=it.dataset.open?null:it;if(it.dataset.open)act(it.dataset.open,it.dataset.ov);else if(it.dataset.a)act(it.dataset.a,it.dataset.v)};
V.keys['a']=()=>{if(ui.checked.length)return act('assignChecked');if(ui.sel&&ui.sel.t==='stop')return act('assign',ui.sel.id);const z=unassigned()[0];z&&act('assign',z.k)};
V.keys['m']=()=>act('view',ui.view==='map'?'table':'map');V.keys['z']=()=>act('fit');V.keys['?']=()=>act('help');V.keys['n']=()=>act('sim');
V.keys['r']=()=>{if(ui.sel&&ui.sel.t==='drv')act('reopt',ui.sel.id)};
['1','2','3','4','5','6'].forEach((k,i)=>V.keys[k]=()=>{const ids=[...(scope.all?['all']:[]),...scope.lines];ids[i]&&act('line',ids[i])});
V.setCmd(()=>{const o=[],go=(group,label,hint,icon,run,top,key)=>o.push({group,label,hint,icon,run,top,key});
 (C.S.tickets||[]).filter(t=>t.status==='pending'&&scope.lines.includes(t.line)).forEach(t=>go('Needs you',`Approve · ${t.driver}: ${t.label}`,t.id,'check',()=>act('tkok',t.id)));
 go('Dispatch','Toggle map / table','','table',()=>act('view',ui.view==='map'?'table':'map'),true,'M');go('Dispatch','Zoom to fit','','target',()=>act('fit'),true,'Z');go('Dispatch','Simulate a driver ticket (demo)','','alert',()=>act('sim'),true,'N');go('Dispatch','Keyboard shortcuts','','kbd',()=>act('help'),true,'?');
 [...(scope.all?['all']:[]),...scope.lines].forEach((l,i)=>go('Service line',l==='all'?'All lines':LN[l],'',  'filter',()=>act('line',l),true,String(i+1)));
 C.S.drivers.filter(d=>scope.lines.includes(d.line)).forEach(d=>{go('Drivers',`${d.name} · ${d.route.id}`,LN[d.line],'user',()=>act('drv',d.id),false);go('Drivers',`Message ${d.name}`,d.route.id,'chat',()=>act('msg',d.id),false);if(scope.reopt&&d.line!=='shuttle')go('Drivers',`Re-optimize ${d.route.id}`,d.name,'bolt',()=>act('reopt',d.id),false)});
 C.S.tasks.filter(t=>scope.lines.includes(t.line)).forEach(t=>go('Stops',`${t.name}`,`${t.id} · ${C.stateLabel(t.state,t.line)}`,'pin',()=>act('stop',t.id),false));return o});
C.subscribe(()=>{const ae=document.activeElement;if(ae&&ae.matches&&ae.matches('input.in,textarea'))return;const k=V.panelOpen();if(k==='pick'||k==='reopt'||k==='msg')return;draw()});
let mq=mob();addEventListener('resize',()=>{if(mob()!==mq){mq=mob();$('#d5')&&$('#d5').remove();map=null;draw()}else map&&map.resize()});
C.init();draw();window.__v5d={act,draw,get ui(){return ui},needs,unassigned,get scope(){return scope}};
})();
