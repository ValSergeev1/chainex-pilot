/* V06 Dispatch extras: thin top bar, New menu, schedule view, map styles, context menus,
   lasso / draw, auto-build, route card, undo. Keeps the V06 map + sidebar layout. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,O=window.CXO,esc=V.esc,ic=V.ic,$=s=>document.querySelector(s);
const NEED={assign:'route.assign',assignChecked:'route.assign',reroute:'route.merge',reopt:'route.optimize',
  tkok:'dispatch.edit',tkno:'dispatch.edit',edok:'dispatch.edit',edno:'dispatch.edit',exok:'dispatch.edit',redo:'dispatch.edit',
  newstop:'stop.add',newroute:'route.add',neworder:'order.create',newwo:'order.create',schedwo:'order.create',
  autobuild:'route.autobuild',draw:'route.draw',lasso:'route.draw',delstop:'stop.delete',split:'route.split',merge:'route.merge',
  optfrom:'route.optimize',undo:'dispatch.edit',import:'import.batch',style:'dispatch.view'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.classList.contains('x-locked'))return;
  const need=NEED[b.dataset.a];if(need&&A&&!A.can(need)){e.preventDefault();e.stopPropagation();A.deny(need)}},true);

function bar(){const u=O?O.ui():{},d=O?O.serviceDate():'',today=O?O.todayStr():'';
  const type= (__v5d.ui.line||'all');
  const can=(a,html,cls,attrs)=>A?A.actBtn(a,html,cls,attrs):`<button class="${cls||'btn sm'}" ${attrs||''}>${html}</button>`;
  return `<div class="d5-bar">
    <div class="d5-bar-l">
      <input class="in" id="d5date" type="date" value="${esc(d)}" title="Service date">
      <button class="btn sm ${d===today?'pri':''}" data-a="today">Today</button>
      <input class="in d5-search" id="d5q2" placeholder="Run, driver or reference" value="${esc(__v5d.ui.q||'')}">
      <select class="in" id="d5type" title="Work type">${[['all','All work types'],['pd','P&D'],['bulky','Bulky'],['wg','White glove'],['ltl','LTL'],['shuttle','Shuttle']].map(([v,l])=>`<option value="${v}"${type===v?' selected':''}>${l}</option>`).join('')}</select>
    </div>
    <div class="d5-bar-c"><div class="seg" id="d5views">${[['map','Map'],['table','Table'],['schedule','Schedule']].map(([v,l])=>`<button data-a="view" data-v="${v}" class="${__v5d.ui.view===v?'on':''}">${esc(l)}</button>`).join('')}</div></div>
    <div class="d5-bar-r">
      <a class="d5-ico" href="orders.html" title="Work orders" aria-label="Work orders">${ic('box',16)}</a>
      <a class="d5-ico" href="import.html" title="Import" aria-label="Import">${ic('scan',16)}</a>
      <a class="d5-ico" href="dset.html" title="Settings" aria-label="Settings">${ic('gear',16)}</a>
      ${can('dispatch.edit',ic('undo',15)+'<span class="d5-bar-txt">Undo</span>','btn sm','data-a="undo" title="Undo last change"')}
      <button type="button" class="d5-ico d5-bar-more" data-a="barmore" title="More" aria-label="More">${ic('more',16)}</button>
      <div class="d5-bar-new">${can('order.create',ic('plus',15)+' New','btn sm pri','data-a="newmenu" id="d5new" title="New"')}</div>
    </div>
  </div>`}
window.__d5bar=bar;

function newMenu(){const items=[
    ['neworder','order.create','New order'],
    ['newroute','route.add','New route'],
    ['newwo','order.create','New work order'],
    ['schedwo','order.create','Schedule from work order'],
    ['newstop','stop.add','Add a stop'],
    ['autobuild','route.autobuild','Auto-build routes'],
    ['lasso','route.draw','Draw a route on the map']
  ];
  return `<div class="x-ctx on" id="d5newm" style="position:fixed">${items.map(([a,perm,l])=>A&&!A.can(perm)?`<button class="x-locked" data-restricted="1" data-need="${perm}">${ic('lock',14)}${esc(l)}</button>`:`<button data-a="${a}">${esc(l)}</button>`).join('')}</div>`}

function sched(){const ds=__v5d.drivers().filter(d=>!d.dspSlot);
  const hours=[...Array(14)].map((_,i)=>6+i);
  return `<div class="d5-tl"><div class="d5-tlh"><div class="d5-tlh-lab">Routes</div><div class="d5-tlh-hrs">${hours.map(h=>`<span style="flex:1;text-align:center">${String(h).padStart(2,'0')}:00</span>`).join('')}</div></div>
  ${ds.map(d=>{const st=O&&O.routeStats(d.id);if(!st||!st.stops)return '';
    const t0=6*60,span=14*60;const s=Math.max(0,((st.start||600)-t0)/span*100),e=Math.min(100,((st.finish||st.start+st.hours*60)-t0)/span*100);
    return `<div class="d5-tlr"><div class="d5-tln"><b>${esc(d.route.id)}</b><div class="small t3">${esc(d.name)}</div></div><div class="d5-tlb"><div class="d5-tlp" data-a="rte" data-v="${d.id}" style="left:${s}%;width:${Math.max(4,e-s)}%;background:${V.hue(d.id)}">${st.stops} stops · ${st.packages} pkg · ${st.miles} mi</div></div></div>`}).join('')||'<div class="empty" style="padding:40px">No routes on this date.</div>'}</div>`}
window.__d5sched=sched;

function routeCard(wid){const st=O&&O.routeStats(wid),d=C.driver(wid);if(!st||!d)return '<div class="empty">No route.</div>';
  const lim=(O.desk().settings.limits)||{};
  const btn=(perm,a,l,cls)=>A&&!A.can(perm)?A.actBtn(perm,l,'btn sm',`data-a="${a}" data-v="${wid}"`):`<button class="${cls||'btn sm'}" data-a="${a}" data-v="${wid}">${l}</button>`;
  return `<div class="d5-ih"><span style="width:12px;height:12px;border-radius:3px;background:${V.hue(d.id)}"></span><div style="flex:1;min-width:0"><b>${esc(d.route.id)}</b><div class="small t3">${esc(d.name)} · ${esc((A.HUBS.find(h=>h.id===st.hub)||{}).name||st.hub||'')}</div></div><button class="x-ib" data-a="unsel">${ic('x',16)}</button></div>
    <div class="d5-ib d5-rc"><div class="d5-kv"><div><b>${st.stops}</b><span>stops</span></div><div><b>${st.packages}</b><span>packages</span></div><div><b>${st.miles}</b><span>miles</span></div></div>
    <div class="d5-kv"><div><b>${st.hours} h</b><span>drive time</span></div><div><b>${C.fmt(st.start)}</b><span>start</span></div><div><b>${C.fmt(st.finish)}</b><span>finish</span></div></div>
    <div class="d5-kv"><div><b>${esc(st.driver)}</b><span>driver</span></div><div><b>${esc((st.vehicle||'—').split('·')[0])}</b><span>vehicle</span></div><div><b>${st.fill}%</b><span>load fill</span></div></div>
    <div class="bar ok"><i style="width:${st.fill}%"></i></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${btn('route.optimize','reopt',ic('bolt',14)+' Optimize','btn sm pri')}${btn('route.optimize','optfrom','Reorder from a stop')}${btn('route.edit','assign',ic('user',14)+' Driver')}${btn('route.split','split','Split')}${btn('route.delete','delroute','Delete','btn sm ghost')}</div>
    <div class="micro">Stops</div>${(O.routeTasks(wid)||[]).map((t,i)=>`<div class="d5-stop" data-a="stop" data-v="${t.id}" style="cursor:pointer"><span class="d5-n">${i+1}</span><span class="grow">${esc(t.name)}<span class="small t3"> · ${O.pkgs(t)} pkg</span></span></div>`).join('')}</div>`}

function inspBoost(){const s=__v5d.ui.sel;if(s&&s.t==='rte'){const el=$('#d5insp');if(el){el.hidden=false;el.innerHTML=routeCard(s.id)}return}
  if(s&&s.t==='drv'&&O){const st=O.routeStats(s.id),el=$('#d5insp');if(st&&el&&!el.querySelector('.d5-rcadd')){const box=document.createElement('div');box.className='d5-rcadd';box.innerHTML=`<div class="d5-kv"><div><b>${st.stops}</b><span>stops</span></div><div><b>${st.packages}</b><span>packages</span></div><div><b>${st.miles}</b><span>miles</span></div><div><b>${st.hours} h</b><span>drive</span></div><div><b>${st.fill}%</b><span>fill</span></div></div><button class="btn sm" data-a="rte" data-v="${s.id}">Route details</button>`;const host=el.querySelector('.d5-ib');if(host)host.insertBefore(box,host.firstChild)}}
  if(s&&s.t==='mm'){const m=O.desk().moves.find(x=>x.id===s.id);if(!m)return;
    $('#d5insp').innerHTML=`<div class="d5-ih"><b>${esc(m.name)}</b><button class="x-ib" data-a="unsel">${ic('x',16)}</button></div><div class="d5-ib">${[['Trailer',m.trailer],['Status',m.status],['ETA',m.eta],['Pallets',m.pallets],['Carrier',m.carrier],['Driver',m.driver]].map(([k,v])=>`<div class="d5-mr"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`}}

function formStop(){const hub=A&&A.viewHub()!=='all'?A.viewHub():(A&&A.homeHub())||'sea';
  V.panel('Add a stop',`<div class="w6-form"><label class="x-field"><span class="micro">Name</span><input class="in" id="nsName" placeholder="Recipient or site"></label>
    <label class="x-field"><span class="micro">Address</span><input class="in" id="nsAddr" placeholder="Street, city"></label>
    <label class="x-field"><span class="micro">Line</span><select class="in" id="nsLine">${['pd','bulky','wg','ltl','shuttle'].map(l=>`<option value="${l}">${{pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'}[l]}</option>`).join('')}</select></label>
    <label class="x-field"><span class="micro">Packages</span><input class="in" id="nsPkg" type="number" min="1" value="2"></label></div>`,
    {icon:'pin',kind:'newstop',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="nsGo">${ic('plus',14)}Add stop</button>`});
  $('#nsGo').onclick=()=>{const name=$('#nsName').value.trim(),addr=$('#nsAddr').value.trim();if(!name||!addr)return V.toast('Name and address are required');
    const line=$('#nsLine').value,units=+$('#nsPkg').value||1;const t=O.createStop({name,address:addr,ll:O.llForAddress(addr,hub),line,units,opHub:hub},'Dispatcher');
    V.close();__v5d.ui.sel={t:'stop',id:t.id};__v5d.save();__v5d.draw();V.toast('Stop added','check')}}
function formRoute(){const hub=A&&A.viewHub()!=='all'?A.viewHub():(A&&A.homeHub())||'sea';
  V.panel('New route',`<div class="w6-form"><label class="x-field"><span class="micro">Name or driver</span><input class="in" id="nrName" placeholder="Open route · ${(hub||'SEA').toUpperCase()}"></label>
    <label class="x-field"><span class="micro">Line</span><select class="in" id="nrLine">${['pd','bulky','wg','ltl'].map(l=>`<option>${l}</option>`).join('')}</select></label>
    <label class="x-field"><span class="micro">Vehicle</span><input class="in" id="nrVeh" value="Cargo van"></label></div>`,
    {icon:'route',kind:'newroute',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="nrGo">Create route</button>`});
  $('#nrGo').onclick=()=>{const d=O.newRoute({name:$('#nrName').value||('Open route · '+hub.toUpperCase()),line:$('#nrLine').value,vehicle:$('#nrVeh').value,opHub:hub,facility:{sea:'SEA1',tac:'TAC1',evt:'EVT1',pdx:'PDX1'}[hub]},'Dispatcher');
    V.close();__v5d.ui.sel={t:'rte',id:d.id};__v5d.save();__v5d.draw();V.toast('Route created','check')}}
function formOrder(kind){const hub=A&&A.viewHub()!=='all'?A.viewHub():(A&&A.homeHub())||'sea';
  const title=kind==='wo'?'New work order':kind==='sched'?'Schedule from a work order':'New order';
  const wos=kind==='sched'?(O.desk().workOrders||[]):[];
  V.panel(title,`${kind==='sched'?`<label class="x-field"><span class="micro">Work order</span><select class="in" id="noWO">${wos.map(w=>`<option value="${w.id}">${esc(w.id)} · ${esc(w.customer)}</option>`).join('')||'<option>No work orders</option>'}</select></label>`:''}
    <label class="x-field"><span class="micro">Customer</span><input class="in" id="noCust" placeholder="Shipper name (sample)"></label>
    <label class="x-field"><span class="micro">Type</span><select class="in" id="noType"><option>P&D route</option><option>Bulky final mile</option><option>White glove</option><option>LTL</option><option>Middle mile</option></select></label>
    <label class="x-field"><span class="micro">Packages</span><input class="in" id="noPkg" type="number" value="20"></label>
    <label class="x-field"><span class="micro">Notes</span><input class="in" id="noNotes"></label>`,
    {icon:'box',kind:'neword',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="noGo">Create</button>`});
  const go=$('#noGo');if(go)go.onclick=()=>{const f={customer:$('#noCust').value||'Sample shipper',type:$('#noType').value,packages:$('#noPkg').value,notes:$('#noNotes').value,hub};
    if(kind==='sched'){const id=$('#noWO')&&$('#noWO').value;const w=(O.desk().workOrders||[]).find(x=>x.id===id);if(w){w.status='Scheduled';f.customer=w.customer;f.type=w.type;f.hub=w.hub}}
    const row=O.createOrder('wo',f,'Dispatcher');V.close();V.toast(row.id+' created','check');location.href='orders.html'}}

function autoPanel(){const lim=O.desk().settings.limits;
  V.panel('Auto-build routes',`<p class="small t2" style="margin:0 0 10px">Splits unassigned stops on this hub and line into routes, using the limits below. Built for a day of about 2,000 packages. You can still draw routes by hand.</p>
    <div class="d5-kv" style="grid-template-columns:1fr 1fr 1fr"><div><b><input class="in" id="abS" type="number" value="${lim.stops}"></b><span>avg stops</span></div><div><b><input class="in" id="abP" type="number" value="${lim.packages}"></b><span>packages</span></div><div><b><input class="in" id="abM" type="number" value="${lim.miles}"></b><span>miles</span></div></div>
    <div class="d5-kv" style="grid-template-columns:1fr 1fr;margin-top:8px"><div><b><input class="in" id="abH" type="number" value="${lim.hours}"></b><span>hours</span></div><div><b><input class="in" id="abC" type="number" value="${lim.capacity}"></b><span>vehicle capacity</span></div></div>`,
    {icon:'bolt',kind:'autobuild',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="abGo">Build routes</button>`});
  $('#abGo').onclick=()=>{const limits={stops:+$('#abS').value,packages:+$('#abP').value,miles:+$('#abM').value,hours:+$('#abH').value,capacity:+$('#abC').value};
    O.desk().settings.limits=limits;const r=O.autoBuild({line:__v5d.ui.line==='all'?'pd':__v5d.ui.line,limits});V.close();__v5d.draw();V.toast(r.stops?`Built ${r.routes} route(s) from ${r.stops} stops`:(r.why||'No unassigned stops to build from'),'bolt')}}

/* ----- draw line / lasso ----- */
let drawing=null;
function startDraw(mode){if(A&&!A.can('route.draw'))return A.deny('route.draw');
  drawing={mode,pts:[]};const mapw=$('.d5-map');if(!mapw)return;
  let ov=$('#d5draw');if(!ov){ov=document.createElement('div');ov.id='d5draw';ov.className='d5-draw';mapw.appendChild(ov)}
  V.toast(mode==='lasso'?'Drag to loop around stops':'Click to draw a line, double-click to finish','pin');
  const m=__v5d.map&&__v5d.map.m;
  const toLL=(ev)=>{if(m&&__v5d.map.ready){const r=mapw.getBoundingClientRect();const p=m.unproject([ev.clientX-r.left,ev.clientY-r.top]);return [p.lng,p.lat]}return null};
  ov.onmousedown=e=>{drawing.pts=[toLL(e)];drawing.live=true};
  ov.onmousemove=e=>{if(!drawing||!drawing.live)return;const ll=toLL(e);if(ll)drawing.pts.push(ll);paintDraw()};
  ov.onmouseup=()=>{if(!drawing)return;if(drawing.mode==='lasso')finishDraw();else drawing.live=false};
  ov.ondblclick=()=>finishDraw();
  ov.oncontextmenu=e=>{e.preventDefault();cancelDraw()};
}
function paintDraw(){/* visual is enough via cursor; selection happens at finish */}
function cancelDraw(){drawing=null;const ov=$('#d5draw');if(ov)ov.remove()}
function pointInPoly(ll,poly){if(!ll||!poly||poly.length<3)return false;let x=ll[0],y=ll[1],inr=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
  const hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi);if(hit)inr=!inr}return inr}
function sideOfLine(ll,a,b){return (b[0]-a[0])*(ll[1]-a[1])-(b[1]-a[1])*(ll[0]-a[0])}
function finishDraw(){if(!drawing||drawing.pts.filter(Boolean).length<2){cancelDraw();return}
  const pts=drawing.pts.filter(Boolean),mode=drawing.mode;cancelDraw();
  const un=__v5d.allT().filter(t=>t.state==='unassigned'&&__v5d.inL(t)&&t.ll);
  let ids;
  if(mode==='lasso')ids=un.filter(t=>pointInPoly(t.ll,pts)).map(t=>t.id);
  else {const a=pts[0],b=pts[pts.length-1];ids=un.filter(t=>sideOfLine(t.ll,a,b)>0).map(t=>t.id)}
  const r=O.lassoToRoute(ids);__v5d.draw();
  if(r.ok){__v5d.ui.sel={t:'rte',id:r.id};__v5d.save();__v5d.draw();V.toast('Route of '+r.n+' stops','check')}
  else V.toast(r.why||'No stops in that area')}

/* ----- context menu ----- */
function ctxHTML(kind,id){
  const rows=kind==='stop'?[
    ['stop.edit','edstop','Edit stop'],['stop.move','assign','Move to a route'],['stop.add','newstop','Add a stop here'],
    'sep',['route.optimize','optthis','Reorder from this stop'],['stop.delete','delstop','Delete stop']
  ]:kind==='drv'||kind==='rte'?[
    ['route.optimize','reopt','Optimize'],['route.split','split','Split route'],['route.merge','reroute','Merge into…'],
    ['route.assign','assigndrv','Change driver / vehicle'],['route.add','newstop','Add a stop'],'sep',['route.delete','delroute','Delete route']
  ]:[];
  return rows.map(r=>r==='sep'?'<div class="sep"></div>':(A&&!A.can(r[0])?`<button class="x-locked" data-restricted="1" data-need="${r[0]}">${ic('lock',14)}${esc(r[2])}</button>`:`<button data-a="${r[1]}" data-v="${esc(id)}">${esc(r[2])}</button>`)).join('')}
function openCtx(ev,kind,id){ev.preventDefault();closeCtx();const m=document.createElement('div');m.className='x-ctx on';m.id='d5ctx';m.innerHTML=ctxHTML(kind,id);
  m.style.left=Math.min(ev.clientX,innerWidth-240)+'px';m.style.top=Math.min(ev.clientY,innerHeight-280)+'px';document.body.appendChild(m)}
function closeCtx(){['d5ctx','d5newm','d5morem'].forEach(id=>{const n=document.getElementById(id);if(n)n.remove()})}

document.addEventListener('contextmenu',e=>{
  const mk=e.target.closest('.mk');if(mk&&mk.dataset.id){const t=C.task(mk.dataset.id)||(O&&O.allTasks().find(x=>x.id===mk.dataset.id));
    if(t){openCtx(e,'stop',t.id);return}const d=C.driver(mk.dataset.id);if(d){openCtx(e,'drv',d.id);return}}
  const it=e.target.closest('.d5-it');if(it&&it.dataset.item&&it.dataset.item.startsWith('d:')){openCtx(e,'drv',it.dataset.item.slice(2));return}
  const map=e.target.closest('.d5-map');if(map){e.preventDefault();openCtx(e,'map','')}});
document.addEventListener('click',()=>closeCtx(),true);
let holdT=null;
document.addEventListener('touchstart',e=>{const mk=e.target.closest('.mk,.d5-it');if(!mk)return;holdT=setTimeout(()=>{const ev={preventDefault(){},clientX:e.touches[0].clientX,clientY:e.touches[0].clientY};
  if(mk.dataset.id){const t=C.task(mk.dataset.id);if(t)openCtx(ev,'stop',t.id);else if(C.driver(mk.dataset.id))openCtx(ev,'drv',mk.dataset.id)}
  else if(mk.dataset.item&&mk.dataset.item.startsWith('d:'))openCtx(ev,'drv',mk.dataset.item.slice(2))},520)}, {passive:true});
document.addEventListener('touchend',()=>{clearTimeout(holdT)});

/* map style switcher */
const STYLES=[
  ['standard','Standard'],['light','Light'],['dark','Dark'],['satellite','Satellite'],['traffic','Traffic (sample)']
];
function styleBar(){const cur=(O.ui().style)||'standard';return `<div class="d5-styles" id="d5styles">${STYLES.map(([v,l])=>`<button data-a="style" data-v="${v}" class="${cur===v?'on':''}" title="${v==='traffic'?'Sample congestion on today\'s routes, not live traffic':v==='satellite'?'Aerial imagery':''}">${esc(l)}</button>`).join('')}</div>`}
function applyStyle(name){const u=O.ui();u.style=name;O.saveUi(u);const map=__v5d.map;if(map&&map.setStyle)map.setStyle(name);else if(map&&map.m){ /* fallback in v06 Map */ if(window.V5&&V5.applyMapStyle)V5.applyMapStyle(map,name)}
  __v5d.draw();V.toast(name==='traffic'?'Traffic is a sample overlay, not live data':('Map · '+name),'map')}

function after(){/* bind bar inputs, inject style bar, boost inspector, midmile hint */
  const d=$('#d5date');if(d)d.onchange=()=>{O.setDate(d.value);__v5d.draw()};
  const q=$('#d5q2');if(q)q.oninput=()=>{__v5d.ui.q=q.value;clearTimeout(q._t);q._t=setTimeout(()=>__v5d.draw(),180)};
  const ty=$('#d5type');if(ty)ty.onchange=()=>{__v5d.ui.line=ty.value;__v5d.save();__v5d.draw()};
  const mapw=$('.d5-mapw');if(__v5d.ui.view!=='map'){const s=$('#d5styles');if(s)s.remove()}else if(mapw&&!$('#d5styles'))mapw.insertAdjacentHTML('beforeend',styleBar());
  inspBoost();
  /* click a route line → card: clicking a stop already opens the stop; use a small legend */
}

window.__d5after=after;
window.__d5act=function(a,v,el){
  const ui=__v5d.ui;
  switch(a){
    case 'today':O.setDate('today');__v5d.draw();break;
    case 'newmenu':{closeCtx();const r=(el||$('#d5new')).getBoundingClientRect();
      document.body.insertAdjacentHTML('beforeend',newMenu());const m=$('#d5newm');m.style.left=(r.right-220)+'px';m.style.top=(r.bottom+6)+'px';break}
    case 'barmore':{closeCtx();const r=(el||document.querySelector('.d5-bar-more')).getBoundingClientRect();
      document.body.insertAdjacentHTML('beforeend',`<div class="x-ctx on" id="d5morem" style="position:fixed">${[['orders.html','box','Work orders'],['import.html','scan','Import'],['dset.html','gear','Settings']].map(([h,i,l])=>`<a href="${h}">${ic(i,15)}${esc(l)}</a>`).join('')}</div>`);
      const m=$('#d5morem');m.style.left=Math.min(r.right-220,innerWidth-240)+'px';m.style.top=(r.bottom+6)+'px';break}
    case 'newstop':V.close();closeCtx();formStop();break;
    case 'newroute':closeCtx();formRoute();break;
    case 'neworder':closeCtx();formOrder('ord');break;
    case 'newwo':closeCtx();formOrder('wo');break;
    case 'schedwo':closeCtx();formOrder('sched');break;
    case 'autobuild':closeCtx();autoPanel();break;
    case 'lasso':case 'draw':closeCtx();startDraw(a==='draw'?'line':'lasso');break;
    case 'undo':{const u=O.undoLast();__v5d.draw();V.toast(u?('Undid: '+u.label):'Nothing to undo');break}
    case 'rte':ui.sel={t:'rte',id:v};__v5d.save();__v5d.draw();break;
    case 'mm':ui.sel={t:'mm',id:v};__v5d.save();__v5d.draw();break;
    case 'style':applyStyle(v);break;
    case 'split':{const r=O.splitRoute(v);__v5d.draw();V.toast(r.ok?'Route split':'Could not split: '+(r.why||''));break}
    case 'delstop':O.deleteStop(v);ui.sel=null;__v5d.save();__v5d.draw();V.toast('Stop deleted');break;
    case 'delroute':{if(!confirm('Delete this route and return its stops to Unassigned?'))break;
      const id=v;C.update(()=>{(O.routeTasks(id)||C.route(id)).forEach(t=>C.ops.assign(t.id,null));C.ops.deleteDriver&&C.ops.deleteDriver(id)});ui.sel=null;__v5d.save();__v5d.draw();V.toast('Route removed');break}
    case 'optfrom':case 'optthis':{const t=C.task(v)||O.allTasks().find(x=>x.id===v);const wid=t&&t.workerId||v;O.optimize(wid,t&&t.id);__v5d.draw();V.toast('Route reordered');break}
    case 'edstop':{const t=C.task(v)||O.allTasks().find(x=>x.id===v);if(!t)break;
      V.panel('Edit stop',`<label class="x-field"><span class="micro">Name</span><input class="in" id="esN" value="${esc(t.name)}"></label><label class="x-field"><span class="micro">Address</span><input class="in" id="esA" value="${esc(t.address)}"></label>`,{icon:'pin',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="esGo">Save</button>`});
      $('#esGo').onclick=()=>{C.update(()=>C.ops.editTask(t.id,{name:$('#esN').value,address:$('#esA').value}));V.close();__v5d.draw();V.toast('Stop updated')};break}
    case 'assigndrv':{const d=C.driver(v);if(!d)break;V.panel('Driver and vehicle',`<label class="x-field"><span class="micro">Name</span><input class="in" id="dvN" value="${esc(d.name)}"></label><label class="x-field"><span class="micro">Vehicle</span><input class="in" id="dvV" value="${esc(d.vehicle||'')}"></label>`,{icon:'user',foot:`<button class="btn pri" id="dvGo">Save</button>`});
      $('#dvGo').onclick=()=>{C.update(()=>C.ops.saveDriver({id:d.id,name:$('#dvN').value,vehicle:$('#dvV').value,line:d.line}));V.close();__v5d.draw();V.toast('Route updated')};break}
    default:return;
  }
};

/* click route card from map: if user clicks a cluster of same-color stops, first click selects stop; double-click on map empty does nothing.
   Clicking the route id in the sidebar already opens the driver inspector — also open route card from a "Route card" button we add to driver inspector via after() */
const _insp=__v5d.inspHTML;
/* drag stop between routes: pointer on a stop pin, drop on another pin/driver row */
let drag=null;
document.addEventListener('mousedown',e=>{const mk=e.target.closest('.mk.stop');if(!mk||!mk.dataset.id||e.button!==0)return;
  drag={id:mk.dataset.id,x:e.clientX,y:e.clientY,moved:false}});
document.addEventListener('mousemove',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true});
document.addEventListener('mouseup',e=>{if(!drag)return;const d=drag;drag=null;if(!d.moved)return;
  if(A&&!A.can('stop.move'))return A.deny('stop.move');
  const over=document.elementFromPoint(e.clientX,e.clientY);
  const it=over&&over.closest && over.closest('.d5-it[data-item^="d:"],.mk');
  if(!it)return;let to=null;if(it.dataset.item)to=it.dataset.item.slice(2);
  else if(it.classList.contains('mk')){const t=C.task(it.dataset.id)||O.allTasks().find(x=>x.id===it.dataset.id);to=t&&t.workerId||(C.driver(it.dataset.id)&&it.dataset.id)}
  if(to){O.moveStop(d.id,to,null,'Dispatcher');__v5d.draw();V.toast('Stop moved','swap')}});

addEventListener('cx-hub',()=>{if(window.__v5d)__v5d.draw()});
})();

/* boot redraw */
try{if(window.__v5d&&document.getElementById('d5')&&!document.querySelector('.d5-bar')){document.getElementById('d5')&&document.getElementById('d5').remove();__v5d.draw()}}catch(e){console.warn(e)}
