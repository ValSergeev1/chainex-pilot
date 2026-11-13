/* Public-style tracking page for a recipient. In the pilot it reads the shared sample store in this browser. */
(function(){
const C=window.CX,V=window.V5,I=window.CXI,esc=V.esc,$=s=>document.querySelector(s);
C.init();I&&I.seedInteg&&I.seedInteg();
const q=new URLSearchParams(location.search);let id=q.get('id')||q.get('ref')||'';
function find(x){if(!x)return null;return (C.S.tasks||[]).find(t=>t.id===x||t.ref===x||(t.items||[]).some(p=>p.id===x))||null}
function paint(){
  document.getElementById('app').innerHTML=`<div class="cxi-track">
    <div class="micro">ChainEx · Tracking</div>
    <h1 style="margin:6px 0 0;font-size:28px;letter-spacing:-.03em">Where is this shipment?</h1>
    <p class="small t2">Enter a tracking number or reference. This pilot page only sees sample data stored in this browser.</p>
    <div style="display:flex;gap:8px;margin:14px 0 20px"><input class="in" id="q" value="${esc(id)}" placeholder="Tracking number" style="flex:1"><button class="btn pri" id="go">Track</button></div>
    <div id="res"></div></div>`;
  if(id)show(id);
}
function show(x){
  const t=find(x);const evs=I.eventsFor(t?t.id:x);
  const box=$('#res');
  if(!t&&!evs.length){box.innerHTML='<div class="empty">No sample shipment with that id in this browser. Post an order from the developer portal, or try a stop id from Dispatch.</div>';return}
  const last=evs[evs.length-1];const pod=t&&t.pod;
  const gps=t&&t.workerId&&I.lastGps(t.workerId);
  box.innerHTML=`<div class="cxi-card">
    <div class="chip ${last&&last.status==='delivered'?'ok':last&&last.status==='exception'?'bad':'acc'}">${esc((last&&last.label)||'Created')}</div>
    <h2 style="margin:8px 0 0">${esc(t?t.name:x)}</h2>
    <div class="small t3 mono">${esc(t?t.id:x)}${t&&t.ref?' · '+esc(t.ref):''}</div>
    <div class="small t2" style="margin-top:6px">${esc(t&&t.address||'')}</div>
    ${t&&t.window?`<div class="small">Window ${esc(C.fmt?C.fmt(t.window[0]):t.window[0])}–${esc(C.fmt?C.fmt(t.window[1]):t.window[1])}</div>`:''}
    ${gps&&gps.source==='live'?`<div class="small">Live driver position is on (accuracy about ${Math.round(gps.acc||0)} m). Shown near arrival only in production.</div>`:''}
    <div class="cxi-tl">${(evs.length?evs:[{type:'created',label:'Created',at:'—',actor:''}]).map(e=>`<div class="s"><i></i><div><b>${esc(e.label||e.type)}</b><div class="small t3">${esc(e.at||'')} · ${esc(e.actor||'')}</div></div></div>`).join('')}</div>
    ${pod?`<div style="margin-top:14px"><b>Proof of delivery</b><div class="small t2">${esc(pod.placement||pod.receivedBy||'')} ${pod.signer?('· '+esc(pod.signer)):''}</div>
      ${pod.notes?`<div class="small">${esc(pod.notes)}</div>`:''}
      ${pod.photos&&pod.photos[0]?`<img alt="Sample POD" src="${pod.photos[0].src}" style="width:160px;height:120px;object-fit:cover;border-radius:8px;margin-top:8px">`:''}
      ${pod.signatureImg?`<img alt="Signature" src="${pod.signatureImg}" style="height:56px;margin-top:8px;background:#fff;border-radius:4px">`:''}</div>`:''}
    <p class="small t3" style="margin-top:16px">Sample data only. Photos are placeholders. A production tracking page would load from ChainEx's servers, not from this browser.</p>
  </div>`}
document.addEventListener('click',e=>{if(e.target.id==='go'){id=$('#q').value.trim();history.replaceState(null,'','track.html'+(id?('?id='+encodeURIComponent(id)):''));show(id)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='q'){document.getElementById('go').click()}});
paint();
window.__cxiTrack={paint,show};
})();
