/* ChainEx V04 · Dispatch "Flow" board. Calm kanban per service line: Needs attention → Ready to assign → On the road → Done.
   Uses the shared pilot state (assets/store.js, localStorage chainex.pilot.v03) so it stays in sync with the driver app, V03 board and dashboards.
   Logic reused from the shared ops layer (assign + eligibility gate, ticketDecide, reoptPreview/Apply, msgSend, reviewRouteEdit, redeliver). */
(function(){
const C=window.CX,V=window.V4,esc=V.esc,ic=V.ic,fmt=C.fmt,$=s=>document.querySelector(s);
const LN={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'},LS={pd:'PD',bulky:'BK',wg:'WG',ltl:'LTL',shuttle:'SH'};
let scope,actor,blocked=false;
function loadScope(){blocked=false;scope={lines:C.LINE_ORDER.slice(),all:true,role:'Ops manager',reopt:true};actor='Dispatcher';if(!window.CXS)return;const sess=CXS.get&&CXS.get();if(sess&&sess.kind!=='staff'){blocked=`You're signed in as ${sess.role||sess.kind}. The dispatch board is for ChainEx staff.`;return}
 const st=CXS.staff();if(!CXS.can('dispatch',st)){blocked=`${st.role} can't open the dispatch board.`;return}scope={lines:CXS.lines(st),all:CXS.can('dispatch.all',st),role:st.role,name:st.name,reopt:CXS.can('reopt',st)};actor=st.name&&st.name!==st.role?`${st.name} (${st.role})`:st.role}
loadScope();
const UK='cx.v04.dispatch';let ui=Object.assign({line:'all',focus:0,col:0},JSON.parse(localStorage.getItem(UK)||'{}'));
const saveUI=()=>localStorage.setItem(UK,JSON.stringify(ui));
const mob=()=>matchMedia('(max-width:899px)').matches;
const lines=()=>ui.line==='all'?scope.lines:[ui.line].filter(l=>scope.lines.includes(l));
const inL=x=>lines().includes(x.line);
const drivers=()=>C.S.drivers.filter(inL);
const prog=d=>{const all=C.routeAll(d.id),done=all.filter(t=>t.state==='completed').length,fail=all.filter(t=>t.state==='failed').length;return{all:all.length,done,fail,open:all.length-done-fail,pct:all.length?Math.round((done+fail)/all.length*100):0}};
const risk=d=>{const et=C.etas(d.id)||{};return C.route(d.id).filter(t=>et[t.id]&&et[t.id].risk).length};
const elig=d=>C.eligibility?C.eligibility(d.id,d.line):{ok:true,reasons:[]};
/* ---------- build columns ---------- */
function columns(){const S=C.S,att=[],rdy=[],road=[],done=[];
 (S.tickets||[]).filter(t=>t.status==='pending'&&lines().includes(t.line)).forEach(t=>att.push({k:'ticket',id:t.id,pri:0,o:t}));
 drivers().filter(d=>d.sos).forEach(d=>att.push({k:'sos',id:d.id,pri:-1,o:d}));
 drivers().filter(d=>d.route&&d.route.edit&&d.route.edit.status==='pending').forEach(d=>att.push({k:'edit',id:d.id,pri:2,o:d}));
 drivers().forEach(d=>{const r=risk(d);if(r)att.push({k:'risk',id:d.id,pri:1,o:d,n:r})});
 drivers().forEach(d=>{if(!d.dspSlot&&C.route(d.id).length&&!elig(d).ok)att.push({k:'blocked',id:d.id,pri:1,o:d})});
 ((S.whp&&S.whp.issues)||[]).filter(i=>i.dest==='dispatch'&&i.status==='Open').forEach(i=>att.push({k:'wh',id:i.id,pri:3,o:i}));
 S.tasks.filter(t=>t.state==='failed'&&inL(t)&&!(t.tags||[]).includes('REVIEWED')).slice(0,30).forEach(t=>att.push({k:'exc',id:t.id,pri:4,o:t}));
 att.sort((a,b)=>a.pri-b.pri);
 const g={};S.tasks.filter(t=>t.state==='unassigned'&&!t.workerId&&inL(t)&&!t.offerId).forEach(t=>{const sc=(t.items[0]&&t.items[0].sortCode||'').split('-').slice(0,2).join(' · ');const key=t.line+'|'+(t.line==='pd'?sc:t.id);(g[key]=g[key]||{line:t.line,zone:t.line==='pd'?sc:'',ids:[],t}).ids.push(t.id)});
 Object.entries(g).forEach(([key,x])=>rdy.push({k:'group',id:key,o:x}));
 S.offers.filter(o=>!o.claimedBy&&lines().includes(o.line)).forEach(o=>rdy.push({k:'offer',id:o.id,o}));
 drivers().forEach(d=>{const p=prog(d);if(!p.all)return;if(p.open>0)road.push({k:'route',id:d.id,o:d,p});else done.push({k:'routeDone',id:d.id,o:d,p})});
 road.sort((a,b)=>(b.o.route.stage==='on_road')-(a.o.route.stage==='on_road')||risk(b.o)-risk(a.o));
 const dl=S.tasks.filter(t=>t.state==='completed'&&inL(t)).length;if(dl)done.unshift({k:'sum',id:'sum',n:dl});
 (S.tickets||[]).filter(t=>t.status!=='pending'&&t.decidedBy&&lines().includes(t.line)).slice(0,4).forEach(t=>done.push({k:'tkdone',id:t.id,o:t}));
 return[{id:'att',cls:'c-att',name:'Needs attention',items:att,empty:'All clear. Nothing needs you right now.',icon:'leaf'},{id:'rdy',cls:'c-rdy',name:'Ready to assign',items:rdy,empty:'Every stop has a driver.',icon:'check'},{id:'road',cls:'c-road',name:'On the road',items:road,empty:'No routes out yet.',icon:'truck'},{id:'done',cls:'c-done',name:'Done',items:done,empty:'Finished routes land here.',icon:'check'}]}
/* ---------- cards ---------- */
const lnTag=l=>`<span class="ln">${esc(LN[l]||l)}</span>`;
const B=(act,v,label,cls='',icn='',dis=false,title='')=>`<button class="v4-btn ${cls}" data-a="${act}" data-v="${esc(v)}"${dis?' disabled':''}${title?` title="${esc(title)}"`:''}>${icn?ic(icn,17):''}${esc(label)}</button>`;
const reBtn=d=>scope.reopt?B('reopt',d.id,'Re-optimize','', 'bolt'):'';
function card(it){const o=it.o;switch(it.k){
 case 'ticket':return `<div class="kind"><span class="v4-tag t-bad">${ic('chat',14)} Driver asked for help</span>${lnTag(o.line)}</div><h3>${esc(o.driver)} · ${esc(o.label)}</h3>${o.text?`<div class="q">“${esc(o.text)}”</div>`:''}<p>The Dispatch bot suggests: ${esc((o.fixes||[]).filter(f=>f.status==='pending').map(f=>f.desc).join('; ')||'review')}</p><div class="v4-meta"><span>${ic('clock',14)} ${fmt(o.at)}</span><span>${esc(o.route||'')}</span>${o.stop?`<span>${esc(o.stop)}</span>`:''}</div><div class="v4-acts">${B('tkok',o.id,'Approve','ok','check')}${B('tkno',o.id,'Decline','ghost')}${B('msg',o.wid,'Message','','chat')}</div>`;
 case 'sos':return `<div class="kind"><span class="v4-tag t-bad">SOS</span>${lnTag(o.line)}</div><h3>${esc(o.name)} pressed SOS</h3><p>${esc(o.route.id)} · call or message them now.</p><div class="v4-acts">${B('msg',o.id,'Message','pri','chat')}${B('map',o.id,'Show on map','','map')}</div>`;
 case 'edit':return `<div class="kind"><span class="v4-tag t-lav">Driver changed their order</span>${lnTag(o.line)}</div><h3>${esc(o.name)} reordered ${esc(o.route.id)}</h3><p>${esc(o.route.edit.summary||'New stop order, notes or pin fixes from the driver app.')}</p><div class="v4-acts">${B('edok',o.id,"Keep driver's order",'pri')}${B('edno',o.id,'Restore plan','ghost')}</div>`;
 case 'risk':{const p=prog(o);return `<div class="kind"><span class="v4-tag t-warn">${it.n} stop${it.n>1?'s':''} may be late</span>${lnTag(o.line)}</div><h3>${esc(o.name)} · ${esc(o.route.id)}</h3><div class="v4-bar"><i style="width:${p.pct}%"></i></div><p>${p.done} of ${p.all} done · ${p.open} to go</p><div class="v4-acts">${reBtn(o)}${B('reroute',o.id,'Reassign','','swap')}${B('msg',o.id,'Message','ghost','chat')}</div>`}
 case 'blocked':{const e=elig(o);return `<div class="kind"><span class="v4-tag t-bad">${ic('shield',14)} Not cleared to drive</span>${lnTag(o.line)}</div><h3>${esc(o.name)} has ${C.route(o.id).length} stops</h3><p>${esc(e.reasons.join('; '))}</p><div class="v4-acts">${B('reroute',o.id,'Move stops to someone else','pri','swap')}${B('msg',o.id,'Message','ghost','chat')}</div>`}
 case 'wh':return `<div class="kind"><span class="v4-tag t-info">${ic('box',14)} From the warehouse</span></div><h3>${esc(o.title||o.kind||'Warehouse issue')}</h3><p>${esc(o.text||o.detail||'')}</p><div class="v4-acts">${B('whok',o.id,'Mark resolved','pri','check')}</div>`;
 case 'exc':{const d=o.workerId&&C.driver(o.workerId);return `<div class="kind"><span class="v4-tag t-warn">Not delivered</span>${lnTag(o.line)}</div><h3>${esc(o.name)}</h3><p>${esc(o.failReason||'Exception')} → next: ${esc(o.nextAction||'review')}${d?' · '+esc(d.name):''}</p><div class="v4-acts">${B('redo',o.id,'Try again today','pri')}${B('assign',o.id,'Reassign','','swap')}${B('exok',o.id,'Reviewed','ghost','check')}</div>`}
 case 'group':{const n=o.ids.length,t=o.t;return `<div class="kind"><span class="v4-tag t-warn">${n} ${n>1?'stops':'stop'} waiting</span>${lnTag(o.line)}</div><h3>${o.zone?'Zone '+esc(o.zone):esc(t.name)}</h3><p>${o.zone?esc(`${n} stops sorted to ${o.zone}`):esc(t.address||'')}</p><div class="v4-meta"><span>${ic('clock',14)} ${fmt(t.window[0])}–${fmt(t.window[1])}</span>${(t.tags||[]).slice(0,2).map(x=>`<span>${esc(x.toLowerCase())}</span>`).join('')}</div><div class="v4-acts">${B('assign',it.id,n>1?`Assign all ${n}`:'Assign','pri','user')}${B('mapzone',it.id,'Map','ghost','map')}</div>`}
 case 'offer':return `<div class="kind"><span class="v4-tag t-acc">Open for drivers to claim</span>${lnTag(o.line)}</div><h3>${esc(o.title)}</h3><p>${esc(o.zone)} · ${o.taskIds.length} stops · ${esc(o.pay)}</p><div class="v4-acts">${B('assignOffer',o.id,'Assign directly','pri','user')}</div>`;
 case 'route':{const d=o,p=it.p,r=risk(d),nx=C.route(d.id)[0],et=nx&&(C.etas(d.id)||{})[nx.id];const st=d.route.stage==='on_road'?`<span class="v4-tag t-info">Driving</span>`:`<span class="v4-tag t-mute">Not started</span>`;
  return `<div class="kind">${st}${r?`<span class="v4-tag t-warn">${r} late</span>`:''}${d.dspSlot?'<span class="v4-tag t-lav">DSP</span>':''}${lnTag(d.line)}</div><div style="display:flex;gap:12px;align-items:center">${V.av(d.name,d.id)}<div style="min-width:0"><h3>${esc(d.name)}</h3><p>${esc(d.route.id)} · ${esc((d.vehicle||'').split('·')[0])}</p></div></div><div class="v4-bar"><i style="width:${p.pct}%"></i></div><div class="v4-meta"><span>${p.done}/${p.all} done</span>${p.fail?`<span>${p.fail} exception${p.fail>1?'s':''}</span>`:''}${nx?`<span>Next: ${esc(nx.name)}${et?' · '+fmt(et.eta):''}</span>`:''}</div><div class="v4-acts">${B('drv',d.id,'Open','sm','user')}${B('msg',d.id,'Message','sm ghost','chat')}${scope.reopt?B('reopt',d.id,'Re-optimize','sm ghost','bolt'):''}${B('map',d.id,'Map','sm ghost','map')}${B('reroute',d.id,'Reassign','sm ghost','swap')}</div>`}
 case 'routeDone':{const d=o,p=it.p;return `<div class="kind"><span class="v4-tag t-ok">${ic('check',14)} Route finished</span>${lnTag(d.line)}</div><div style="display:flex;gap:12px;align-items:center">${V.av(d.name,d.id)}<div><h3>${esc(d.name)}</h3><p>${esc(d.route.id)} · ${p.done} delivered${p.fail?` · ${p.fail} exceptions`:''}</p></div></div><div class="v4-acts">${B('drv',d.id,'Open','','user')}</div>`}
 case 'sum':return `<div class="kind"><span class="v4-tag t-ok">Today so far</span></div><h3>${it.n} stops delivered</h3><p>Across ${esc(ui.line==='all'?'your lines':LN[ui.line])}. Proof of delivery is saved on each stop.</p>`;
 case 'tkdone':return `<div class="kind"><span class="v4-tag ${o.status==='approved'?'t-ok':'t-mute'}">Ticket ${esc(o.status)}</span>${lnTag(o.line)}</div><h3>${esc(o.driver)} · ${esc(o.label)}</h3><p>${esc(o.decidedBy||'')} · ${fmt(o.decidedAt)}</p>`;
 }return ''}
/* ---------- render ---------- */
let cols=[];
function draw(){C.load();if(blocked){$('#app').innerHTML=`<div class="v4-empty" style="padding:80px 20px"><h2>${esc(blocked)}</h2><p><a href="../auth/signin.html">Sign in as staff</a> or <button class="v4-btn" data-a="role" data-v="Ops manager">Use sample Ops manager</button></p></div>`;return}
 if(ui.line!=='all'&&!scope.lines.includes(ui.line))ui.line=scope.all?'all':scope.lines[0];if(ui.line==='all'&&!scope.all)ui.line=scope.lines[0];
 cols=columns();const att=cols[0].items.length,running=drivers().filter(d=>d.route&&d.route.stage==='on_road'&&C.route(d.id).length).length;
 const tasks=C.S.tasks.filter(inL),doneN=tasks.filter(t=>t.state==='completed').length,ready=cols[1].items.reduce((a,x)=>a+(x.o.ids?x.o.ids.length:x.o.taskIds?x.o.taskIds.length:1),0),onDuty=drivers().filter(d=>d.duty).length;
 const say=`${running} route${running===1?'':'s'} running, ${att?`<em>${att} need${att===1?'s':''} you</em>`:'<b>nothing needs you</b>'}${ready?`, ${ready} stop${ready>1?'s':''} waiting for a driver`:''}.`;
 const rail=[...(scope.all?[['all','All','grid']]:[]),...scope.lines.map(l=>[l,LN[l],null])];
 const cnt=l=>{const ls=l==='all'?scope.lines:[l];return (C.S.tickets||[]).filter(t=>t.status==='pending'&&ls.includes(t.line)).length+C.S.tasks.filter(t=>t.state==='failed'&&ls.includes(t.line)&&!(t.tags||[]).includes('REVIEWED')).length};
 const hello=(()=>{const h=+new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',hourCycle:'h23'}).format(new Date());return h<12?'Good morning':h<17?'Good afternoon':'Good evening'})();
 $('#app').innerHTML=`<div class="v4">
 <nav class="v4-rail" aria-label="Service lines"><a class="v4-logo" href="../start.html" title="ChainEx pilot start">Ex</a>
  ${rail.map(([id,n,i])=>{const c=cnt(id);return `<button class="v4-ri${ui.line===id?' on':''}" data-a="line" data-v="${id}" title="${esc(n)}">${i?ic(i,22):`<span class="lt">${LS[id]}</span>`}<span>${esc(n.replace('White glove','W. glove'))}</span>${c?`<span class="dot">${c}</span>`:''}</button>`}).join('')}
  <div class="v4-sp"></div><button class="v4-ri" data-a="mappanel" title="Map (M)">${ic('map',22)}<span>Map</span></button><a class="v4-ri" href="dashboard.html" title="Dashboard (D)">${ic('dash',22)}<span>Dashboard</span></a><button class="v4-ri" data-a="settings" title="Settings">${ic('more',22)}<span>More</span></button></nav>
 <main class="v4-main"><header class="v4-top"><div><h1>${hello}${scope.name&&scope.name!==scope.role?', '+esc(scope.name.split(' ')[0]):''}</h1><div class="sub">Dispatch · ${esc(ui.line==='all'?'All service lines':LN[ui.line])} · ${esc(scope.role)} · ${fmt(C.S.clock)}</div></div>
  <button class="v4-search" data-a="cmd" aria-label="Search">${ic('search',18)}<span>Search anything</span><span style="margin-left:auto"><kbd>Ctrl K</kbd></span></button>
  <button class="v4-ib hide-m" data-a="mappanel" title="Map (M)" aria-label="Map">${ic('map')}</button><button class="v4-ib" data-a="themecycle" title="Theme (T)" aria-label="Theme">${ic(V.resolve(V.pref())==='night'?'moon':'sun')}</button><button class="v4-ib show-m" data-a="settings" aria-label="More">${ic('more')}</button></header>
 <section class="v4-today" aria-label="Today"><div class="say">${say}</div>
  <div class="v4-stat"><b>${doneN}/${tasks.length}</b><span>stops done</span></div><div class="v4-stat"><b>${onDuty}</b><span>drivers on duty</span></div><div class="v4-stat"><b>${(C.S.tickets||[]).filter(t=>t.status==='pending'&&lines().includes(t.line)).length}</b><span>driver tickets</span></div><div class="v4-stat hide-m"><b>${C.S.tasks.filter(t=>t.state==='failed'&&inL(t)).length}</b><span>exceptions</span></div></section>
 <div class="v4-chips show-m">${rail.map(([id,n])=>`<button class="v4-chip${ui.line===id?' on':''}" data-a="line" data-v="${id}">${esc(n)}${cnt(id)?` · ${cnt(id)}`:''}</button>`).join('')}</div>
 <div class="v4-board" id="board">${cols.map((c,ci)=>`<section class="v4-col ${c.cls}" data-col="${ci}" aria-label="${esc(c.name)}"><div class="v4-colh"><i></i><h2>${esc(c.name)}</h2><span class="n">${c.items.length}</span></div><div class="v4-colb">${c.items.length?c.items.slice(0,ci===1?40:60).map((it,ii)=>`<article class="v4-card" data-card="${ci}:${ii}" data-k="${it.k}" data-id="${esc(it.id)}">${card(it)}</article>`).join('')+(c.items.length>(ci===1?40:60)?`<div class="v4-empty">+${c.items.length-(ci===1?40:60)} more · use search</div>`:''):`<div class="v4-empty">${ic(c.icon,30)}${esc(c.empty)}</div>`}</div></section>`).join('')}</div>
 <div class="v4-foot">ChainEx Dispatch · V04 preview · sample data only · synced live with the driver app and the V03 board · <a href="../board.html">Open V03 board</a> · <a href="../index.html">Classic desk</a></div></main>
 <nav class="v4-tabs" aria-label="Columns">${cols.map((c,i)=>`<button class="v4-tab${ui.col===i?' on':''}" data-a="tab" data-v="${i}">${ic(['alert','inbox','truck','check'][i],22)}<span>${['Attention','Ready','Road','Done'][i]}</span>${i===0&&att?`<span class="dot">${att}</span>`:''}</button>`).join('')}<button class="v4-tab" data-a="mappanel">${ic('map',22)}<span>Map</span></button></nav></div>`;
 const bd=$('#board');if(mob()&&bd){bd.scrollLeft=ui.col*bd.clientWidth;bd.onscroll=()=>{const i=Math.round(bd.scrollLeft/bd.clientWidth);if(i!==ui.col){ui.col=i;saveUI();document.querySelectorAll('.v4-tab').forEach((t,k)=>t.classList.toggle('on',k===i))}}}
 focusCard(false)}
function focusCard(scroll){document.querySelectorAll('.v4-card.focus').forEach(e=>e.classList.remove('focus'));const all=[...document.querySelectorAll('.v4-card')];if(!all.length||!ui.kb)return;ui.focus=Math.max(0,Math.min(all.length-1,ui.focus));all[ui.focus].classList.add('focus');scroll&&all[ui.focus].scrollIntoView({block:'nearest',behavior:'smooth'})}
/* ---------- drawers ---------- */
function pickDriver(title,line,onPick,exclude){const ds=C.S.drivers.filter(d=>d.line===line&&d.id!==exclude&&!d.dspSlot).map(d=>({d,e:elig(d),n:C.route(d.id).length})).sort((a,b)=>(b.e.ok-a.e.ok)||(b.d.duty-a.d.duty)||a.n-b.n);
 V.openDrawer(title,`<p style="margin:0;color:var(--ink2)">Drivers who aren't cleared (expired documents, suspended, wrong vehicle) can't be picked. That's the eligibility gate.</p>${ds.map(({d,e,n})=>`<div class="v4-row${e.ok?'':' blocked'}">${V.av(d.name,d.id)}<div class="grow"><b>${esc(d.name)}</b><small>${esc(d.route.id)} · ${n} open stops · ${d.duty?'on duty':'off duty'}${e.ok?'':' · '+esc(e.reasons.join('; '))}</small></div>${e.ok?`<button class="v4-btn pri sm" data-pick="${d.id}">Choose</button>`:`<span class="v4-tag t-bad">Blocked</span>`}</div>`).join('')||'<div class="v4-empty">No drivers on this line.</div>'}`,{icon:'user',kind:'pick'});
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{V.closeDrawer();onPick(b.dataset.pick)})}
function assignIds(ids,wid){let n=0,bl=null;C.update(()=>{ids.forEach(id=>{const r=C.ops.assign(id,wid,null,null,actor);if(r===false)bl=C.ops.lastBlock;else n++})});draw();V.toast(bl&&!n?'Blocked · '+bl.join(', '):`${n} stop${n>1?'s':''} assigned to ${C.driver(wid).name}. Driver notified.`)}
function msgDrawer(wid){const d=C.driver(wid);if(!d)return;C.update(()=>C.ops.msgRead&&C.ops.msgRead(wid,'desk'));const th=(C.S.msgs||[]).filter(m=>m.wid===wid).slice(-30);
 V.openDrawer('Message '+d.name,`<div class="v4-chat" id="chat">${th.length?th.map(m=>`<div class="v4-msg ${m.from==='driver'?'':m.from==='bot'?'bot':'me'}"><small>${esc(m.from==='driver'?d.name:m.from==='bot'?'ChainEx Dispatch bot':(m.actor||'Dispatch'))} · ${fmt(m.at)}</small>${esc(m.text)}</div>`).join(''):'<div class="v4-empty">No messages yet today.</div>'}</div>
  <div class="v4-acts">${['On my way to help','Call me when you can','Skip that stop for now','Take your break'].map(q=>`<button class="v4-btn sm" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>
  <textarea class="v4-in" id="msgin" rows="2" placeholder="Write to ${esc(d.name)}…"></textarea><button class="v4-btn pri" id="msgsend">${ic('chat',17)} Send</button>`,{icon:'chat',kind:'msg'});
 const send=t=>{if(!t.trim())return;C.update(()=>C.ops.msgSend(wid,'desk',t.trim(),actor));V.toast('Sent to '+d.name);msgDrawer(wid)};
 $('#msgsend').onclick=()=>send($('#msgin').value);document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>send(b.dataset.quick));setTimeout(()=>{const c=$('#v4drawer .v4-db');c&&(c.scrollTop=c.scrollHeight)},30)}
function reoptDrawer(wid){if(!scope.reopt){V.toast('Only ChainEx staff dispatch teams can re-optimize');return}const d=C.driver(wid);const res=C.ops.reoptPreview({line:d.line,wids:[wid]});const r=res[0];
 if(!r){V.openDrawer('Re-optimize '+d.route.id,`<div class="v4-empty">Fewer than 3 stops left to reorder, or this line (Shuttle) runs fixed schedules.</div>`,{icon:'bolt',kind:'reopt'});return}
 V.openDrawer('Re-optimize '+r.routeId,`<p style="margin:0">${esc(d.name)} · ${r.n} stops left. Keeps the driver's first/last stop${r.locked?` and ${r.locked} locked stops`:''} and delivery windows.</p>
  <div class="v4-grid" style="grid-template-columns:1fr 1fr"><div class="v4-kpi"><span class="lbl">Now</span><span class="val">${r.beforeKm} km</span><span class="note">about ${r.beforeMin} min</span></div><div class="v4-kpi"><span class="lbl">After</span><span class="val" style="color:var(--ok)">${r.afterKm} km</span><span class="note">about ${r.afterMin} min</span></div></div>
  <p style="margin:0;color:var(--ink2)">${r.changed?`Saves ${(r.beforeKm-r.afterKm).toFixed(1)} km. The driver gets a notice in the app.`:'The current order is already the shortest. Nothing to change.'}</p>
  <div class="v4-acts"><button class="v4-btn pri" id="reoptgo"${r.changed?'':' disabled'}>${ic('bolt',17)} Apply new order</button><button class="v4-btn ghost" data-x="close">Cancel</button></div>`,{icon:'bolt',kind:'reopt'});
 $('#reoptgo').onclick=()=>{let o;C.update(()=>{o=C.ops.reoptApply(res,actor)});V.closeDrawer();draw();V.toast(o&&o.ok===false?o.why:'New order applied. Driver notified.')}}
function drvDrawer(wid){const d=C.driver(wid);if(!d)return;const all=C.routeAll(wid),et=C.etas(wid)||{},e=elig(d),p=prog(d);
 V.openDrawer(d.name,`<div style="display:flex;gap:14px;align-items:center">${V.av(d.name,d.id)}<div><b>${esc(d.route.id)} · ${esc(LN[d.line])}</b><small style="display:block;color:var(--mute)">${esc(d.vehicle||'')} · ${esc(d.hubName||'')}</small></div></div>
  <div>${e.ok?'<span class="v4-tag t-ok">Cleared to drive</span>':`<span class="v4-tag t-bad">Blocked · ${esc(e.reasons.join('; '))}</span>`} <span class="v4-tag t-mute">${d.duty?'On duty':'Off duty'}</span></div>
  <div class="v4-bar"><i style="width:${p.pct}%"></i></div><small style="color:var(--mute)">${p.done} delivered · ${p.fail} exceptions · ${p.open} to go</small>
  <div class="v4-acts">${B('msg',d.id,'Message','pri','chat')}${B('map',d.id,'Map','','map')}${reBtn(d)}${B('reroute',d.id,'Reassign','','swap')}</div>
  <h3 style="margin:6px 0 0;font-size:16px">Stops in order</h3>${all.map((t,i)=>`<div class="v4-row"><span class="v4-tag ${t.state==='completed'?'t-ok':t.state==='failed'?'t-warn':t.state==='active'?'t-info':'t-mute'}">${i+1}</span><div class="grow"><b>${esc(t.name)}</b><small>${esc(C.stateLabel(t.state,t.line))}${et[t.id]?' · ETA '+fmt(et[t.id].eta):''}${et[t.id]&&et[t.id].risk?' · may be late':''}</small></div></div>`).join('')}`,{icon:'user',kind:'drv'})}
function stopDrawer(id){const t=C.task(id);if(!t)return;const d=t.workerId&&C.driver(t.workerId);
 V.openDrawer(t.name,`<p style="margin:0">${esc(t.address)}</p><div><span class="v4-tag t-mute">${esc(C.stateLabel(t.state,t.line))}</span> <span class="v4-tag t-acc">${esc(LN[t.line])}</span> ${d?`<span class="v4-tag t-info">${esc(d.name)}</span>`:''}</div>
 <div class="v4-acts">${B('assign',t.id,t.workerId?'Reassign':'Assign','pri','user')}${t.state==='failed'?B('redo',t.id,'Try again today'):''}</div><h3 style="margin:6px 0 0;font-size:16px">Timeline</h3>${t.timeline.slice().reverse().map(x=>`<div class="v4-row"><div class="grow">${esc(x.text)}<small>${fmt(x.at)} · ${esc(x.actor||'')}</small></div></div>`).join('')}`,{icon:'box',kind:'stop'})}
function settings(){const roles=['Ops manager','Admin','P&D team','Bulky team','White glove team','LTL team','Shuttle team'];
 V.openDrawer('Settings',`<div><b>Theme</b><p style="margin:4px 0 8px;color:var(--ink2);font-size:15px">Auto follows Seattle daylight: light by day, soft dim at night.</p>${V.themeSeg()}</div>
 <div><b>See it as (sample staff roles)</b><p style="margin:4px 0 8px;color:var(--ink2);font-size:15px">Each team sees only its own line. Ops and Admin see all lines. Re-optimize is for staff dispatch teams.</p><div class="v4-acts">${roles.map(r=>`<button class="v4-btn sm${scope.role===r?' pri':''}" data-a="role" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>
 <div><b>Demo</b><div class="v4-acts"><button class="v4-btn sm" data-a="simtk">Simulate a driver ticket</button><a class="v4-btn sm" href="../driver.html" target="_blank">Open driver app ${ic('ext',14)}</a></div></div>
 <div><b>Other boards</b><div class="v4-acts"><a class="v4-btn sm" href="../board.html">V03 board</a><a class="v4-btn sm" href="../index.html">Classic desk</a><a class="v4-btn sm" href="../v02/board.html">V02</a></div></div>
 <button class="v4-btn" data-a="help">${ic('kbd',17)} Keyboard shortcuts</button>`,{icon:'more',kind:'settings'})}
/* ---------- map panel (slide-out) ---------- */
let gl=null;const MCOL={road:'#4a7fb8',ready:'#9aa3ad',sos:'#c4554f',risk:'#b7791f',stop:'#2f62c8',done:'#3f8f68',fail:'#c4554f'};
function mapPanel(focus){const ds=drivers().filter(d=>!d.dspSlot);let pins=ds.map(d=>({ll:d.loc,c:d.sos?MCOL.sos:risk(d)?MCOL.risk:d.route.stage==='on_road'?MCOL.road:MCOL.ready,l:d.name.split(' ').map(w=>w[0]).join('').slice(0,2),t:d.name+' · '+d.route.id,id:d.id,big:1}));
 let stops=[];if(focus&&focus.wid){stops=C.routeAll(focus.wid).map((t,i)=>({ll:t.ll,c:t.state==='completed'?MCOL.done:t.state==='failed'?MCOL.fail:MCOL.stop,l:String(i+1),t:t.name}))}else if(focus&&focus.ids){stops=focus.ids.map(id=>C.task(id)).filter(Boolean).map((t,i)=>({ll:t.ll,c:MCOL.risk,l:'•',t:t.name}))}
 const title=focus&&focus.wid?C.driver(focus.wid).name+' · route map':focus&&focus.ids?'Waiting stops':'Live map';
 V.openDrawer(title,`<div class="v4-map" id="v4map" style="min-height:${mob()?'52vh':'58vh'};margin:-18px -22px 0;border-radius:0"></div>
  <div class="v4-legend" style="margin:0 -22px"><span><i style="background:${MCOL.road}"></i>Driving</span><span><i style="background:${MCOL.ready}"></i>Not started</span><span><i style="background:${MCOL.risk}"></i>Running late</span><span><i style="background:${MCOL.sos}"></i>SOS</span>${stops.length?`<span><i style="background:${MCOL.stop}"></i>Stops</span>`:''}</div>
  ${ds.slice(0,12).map(d=>`<button class="v4-row" style="text-align:left;cursor:pointer" data-a="map" data-v="${d.id}">${V.av(d.name,d.id)}<div class="grow"><b>${esc(d.name)}</b><small>${esc(d.route.id)} · ${prog(d).done}/${prog(d).all} done${risk(d)?' · '+risk(d)+' late':''}</small></div>${ic('map',18)}</button>`).join('')}`,{icon:'map',wide:true,kind:'map'});
 const el=$('#v4map');const all=[...pins,...stops];setTimeout(()=>renderMap(el,stops.length?stops.concat(pins.filter(p=>p.id===(focus&&focus.wid))):pins,all.length?all:pins),60)}
function renderMap(el,pins){if(!el)return;const lls=pins.map(p=>p.ll).filter(Boolean);
 const svg=()=>{const W=el.clientWidth||600,Hh=el.clientHeight||400;const xs=lls.map(l=>l[0]),ys=lls.map(l=>l[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const sx=v=>30+(v-x0)/((x1-x0)||1)*(W-60),sy=v=>Hh-30-(v-y0)/((y1-y0)||1)*(Hh-60);
  el.innerHTML=`<svg width="100%" height="100%" viewBox="0 0 ${W} ${Hh}" style="position:absolute;inset:0"><defs><pattern id="g4" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="var(--line)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#g4)"/>${pins.map(p=>`<g><title>${esc(p.t)}</title><circle cx="${sx(p.ll[0])}" cy="${sy(p.ll[1])}" r="${p.big?14:11}" fill="${p.c}" stroke="#fff" stroke-width="3"/><text x="${sx(p.ll[0])}" y="${sy(p.ll[1])+4}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${esc(p.l)}</text></g>`).join('')}</svg><div style="position:absolute;left:10px;bottom:8px;font-size:12px;color:var(--mute)">Schematic view (map tiles unavailable)</div>`};
 if(!window.maplibregl||!lls.length){svg();return}
 try{const m=new maplibregl.Map({container:el,style:'https://tiles.openfreemap.org/styles/positron',bounds:bnd(lls),fitBoundsOptions:{padding:50,maxZoom:13},attributionControl:{compact:true}});gl=m;let ok=false;
  m.on('load',()=>{ok=true;pins.forEach(p=>{const e=document.createElement('div');e.className='mpin';e.style.background=p.c;e.textContent=p.l;e.title=p.t;new maplibregl.Marker({element:e}).setLngLat(p.ll).addTo(m)})});
  m.on('error',()=>{if(!ok){try{m.remove()}catch(e){}svg()}});setTimeout(()=>{if(!ok){try{m.remove()}catch(e){}svg()}},6000);
  if(document.documentElement.dataset.v4theme==='night')el.style.filter='invert(.9) hue-rotate(180deg) saturate(.5) brightness(.95)';}catch(e){svg()}}
function bnd(lls){let a=[180,90],b=[-180,-90];lls.forEach(l=>{a=[Math.min(a[0],l[0]),Math.min(a[1],l[1])];b=[Math.max(b[0],l[0]),Math.max(b[1],l[1])]});if(a[0]===b[0]){a[0]-=.02;b[0]+=.02}if(a[1]===b[1]){a[1]-=.02;b[1]+=.02}return[a,b]}
/* ---------- actions ---------- */
function groupIds(key){const c=cols[1].items.find(x=>x.id===key);return c?c.o.ids:[key]}
function act(a,v){switch(a){
 case 'line':ui.line=v;ui.focus=0;saveUI();draw();break;
 case 'tab':{ui.col=+v;saveUI();const bd=$('#board');if(mob()&&bd)bd.scrollTo({left:ui.col*bd.clientWidth,behavior:'smooth'});document.querySelectorAll('.v4-tab').forEach((t,k)=>t.classList.toggle('on',k===ui.col));break}
 case 'tkok':case 'tkno':{let r;C.update(()=>{r=C.ops.ticketDecide(v,a==='tkok',actor)});draw();V.toast(r&&r.ok===false?(r.why||'Not allowed'):a==='tkok'?'Approved. Fixes applied and the driver is told.':'Declined. The driver is told.');break}
 case 'edok':case 'edno':C.update(()=>C.ops.reviewRouteEdit(v,a==='edok',actor));draw();V.toast(a==='edok'?"Driver's order kept":'Plan restored. Driver notified.');break;
 case 'exok':C.update(()=>{const t=C.task(v);t.tags=t.tags||[];t.tags.push('REVIEWED');t.timeline.push({at:C.S.clock,text:'Exception reviewed on V04 dispatch',actor})});draw();V.toast('Marked reviewed');break;
 case 'redo':C.update(()=>C.ops.redeliver(v));draw();V.toast('Queued to try again today');break;
 case 'whok':C.update(S=>{C.whp&&C.whp.X.resolveIssue(S,actor,v)});draw();V.toast('Warehouse issue resolved');break;
 case 'assign':{const ids=C.task(v)?[v]:groupIds(v);const t=C.task(ids[0]);if(!t)break;pickDriver(ids.length>1?`Assign ${ids.length} stops`:`Assign ${t.name}`,t.line,wid=>{assignIds(ids,wid);const x=C.task(ids[0]);if(x&&x.state==='failed'){C.update(()=>ids.forEach(id=>C.ops.redeliver(id)));draw()}});break}
 case 'assignOffer':{const o=C.S.offers.find(x=>x.id===v);if(!o)break;pickDriver('Assign '+o.title,o.line,wid=>{C.update(()=>{o.claimedBy=wid});assignIds(o.taskIds,wid)});break}
 case 'reroute':{const d=C.driver(v);pickDriver(`Move ${d.name}'s open stops to…`,d.line,to=>{let n=0;C.update(()=>{n=C.ops.mergeRoute(v,to)});draw();V.toast(C.ops.lastBlock?'Blocked · '+C.ops.lastBlock.join(', '):`${n} stops moved to ${C.driver(to).name}`)},v);break}
 case 'reopt':reoptDrawer(v);break;
 case 'msg':msgDrawer(v);break;
 case 'drv':drvDrawer(v);break;
 case 'map':mapPanel({wid:v});break;
 case 'mapzone':mapPanel({ids:groupIds(v)});break;
 case 'mappanel':mapPanel();break;
 case 'cmd':V.openCmd();break;
 case 'themecycle':V.keys.t();draw();break;
 case 'settings':settings();break;
 case 'help':helpK();break;
 case 'role':if(window.CXS){CXS.actAs(v);loadScope();ui.line=scope.all?'all':scope.lines[0];saveUI();V.closeDrawer();draw();V.toast('Now viewing as '+v)}break;
 case 'simtk':{const ds=drivers().filter(d=>d.route&&d.route.stage==='on_road'&&C.route(d.id).length);const d=ds[Math.floor(Math.random()*ds.length)];if(!d){V.toast('No driver on the road in this view');break}const k=['toomany','vehicle','address','access'][Math.floor(Math.random()*4)];C.update(()=>C.ops.botIssue(d.id,k,null,''));V.closeDrawer();draw();V.toast('New ticket from '+d.name);break}
}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;if(b.tagName==='A')return;e.preventDefault();act(b.dataset.a,b.dataset.v)});
/* ---------- command bar + keys ---------- */
V.setCmd(()=>{const out=[];const go=(g,label,hint,icon,run,top)=>out.push({group:g,label,hint,icon,run,top});
 const pend=(C.S.tickets||[]).filter(t=>t.status==='pending'&&scope.lines.includes(t.line));pend.forEach(t=>go('Needs you',`Approve ticket · ${t.driver}: ${t.label}`,t.id,'check',()=>act('tkok',t.id)));
 [...(scope.all?[['all','All lines']]:[]),...scope.lines.map(l=>[l,LN[l]])].forEach(([id,n],i)=>go('Go to',`Show ${n}`,String(i+1),'grid',()=>act('line',id)));
 go('Go to','Open the map','M','map',()=>act('mappanel'));go('Go to','Dashboard','D','dash',()=>location.href='dashboard.html');go('Actions','Switch theme (Auto / Day / Night)','T','sun',()=>act('themecycle'));go('Actions','Settings and sample roles','','more',()=>act('settings'));go('Actions','Simulate a driver ticket (demo)','','bolt',()=>act('simtk'));go('Actions','Keyboard shortcuts','?','kbd',()=>helpK());
 C.S.drivers.filter(d=>scope.lines.includes(d.line)).forEach(d=>{go('Drivers',`${d.name} · ${d.route.id}`,LN[d.line],'user',()=>drvDrawer(d.id),false);go('Drivers',`Message ${d.name}`,d.route.id,'chat',()=>msgDrawer(d.id),false);if(scope.reopt&&d.line!=='shuttle')go('Drivers',`Re-optimize ${d.route.id}`,d.name,'bolt',()=>reoptDrawer(d.id),false)});
 C.S.tasks.filter(t=>scope.lines.includes(t.line)).forEach(t=>go('Stops',`${t.name} · ${t.id}`,`${C.stateLabel(t.state,t.line)} · ${(t.items[0]||{}).id||''}`,'box',()=>stopDrawer(t.id),false));
 return out});
function helpK(){V.help([['1–6','Switch service line'],['M','Open the map'],['J / K','Next / previous card'],['Enter','Main action on the selected card'],['A','Assign the first waiting stop'],['D','Go to the Dashboard']])}
V.keys['?']=helpK;V.keys['m']=()=>act('mappanel');V.keys['d']=()=>location.href='dashboard.html';
V.keys['a']=()=>{const f=cols[1]&&cols[1].items.find(x=>x.k==='group');f&&act('assign',f.id)};
V.keys['j']=()=>{ui.kb=1;ui.focus++;focusCard(true)};V.keys['k']=()=>{ui.kb=1;ui.focus--;focusCard(true)};
V.keys['Enter']=()=>{const f=document.querySelector('.v4-card.focus .v4-btn');f&&f.click()};
['1','2','3','4','5','6'].forEach((k,i)=>V.keys[k]=()=>{const ids=[...(scope.all?['all']:[]),...scope.lines];ids[i]&&act('line',ids[i])});
const _t=V.keys.t;V.keys.t=()=>{_t();draw()};
C.subscribe(()=>{const ae=document.activeElement;if(ae&&ae.matches&&ae.matches('input,textarea'))return;if(V.drawerOpen()==='pick'||V.drawerOpen()==='reopt')return;draw()});
window.addEventListener('v4-theme',()=>{});let mq=mob();window.addEventListener('resize',()=>{if(mob()!==mq){mq=mob();draw()}});
C.init();draw();
window.__v4d={act,draw,get ui(){return ui},columns,get scope(){return scope}};
})();
