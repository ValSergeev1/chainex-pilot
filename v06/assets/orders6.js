/* V06 Work orders and shipments sub-page. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,O=window.CXO,esc=V.esc,$=s=>document.querySelector(s);
C.init();O&&O.seed&&O.seed();
let tab='wo';
function hubName(id){return (A&&A.HUBS.find(h=>h.id===id)||{name:id}).name}
function scoped(list){if(!A||A.viewHub()==='all')return list;return list.filter(x=>x.hub===A.viewHub()||x.from===A.viewHub()||x.to===A.viewHub())}
function draw(){
  if(!$('#pg')){const m=V.shell({app:'Work orders',active:'orders.html',crumbHTML:`<span class="x-hide-m">ChainEx / Dispatch /</span> Work orders & shipments`});
    m.innerHTML=`<div class="pg" id="pg"><div class="pg-h"><div><h1>Work orders & shipments</h1><p>Coverage, scheduled work and in-transit freight for this hub.</p></div><div class="sp"></div><a class="btn" href="dispatch.html">Back to the map</a></div>
      <div class="pg-tabs"><button data-t="wo" class="on">Work orders</button><button data-t="sh">Shipments</button></div><div id="pgbody"></div></div>`}
  const v=O.desk();
  const wo=scoped(v.workOrders||[]),sh=scoped(v.shipments||[]);
  $('#pgbody').innerHTML=tab==='wo'?`<div class="pg-c"><table><thead><tr><th>ID</th><th>Customer</th><th>Type</th><th>Hub</th><th>Stops</th><th>Packages</th><th>Status</th></tr></thead><tbody>
    ${wo.map(w=>`<tr><td class="mono">${esc(w.id)}</td><td>${esc(w.customer)}</td><td>${esc(w.type)}</td><td>${esc(hubName(w.hub))}</td><td class="num">${w.stops||'—'}</td><td class="num">${w.packages||0}</td><td><span class="chip ${w.status==='Needs coverage'?'warn':w.status==='On the move'?'acc':''}">${esc(w.status)}</span></td></tr>`).join('')}</tbody></table></div>`
    :`<div class="pg-c"><table><thead><tr><th>ID</th><th>Reference</th><th>Customer</th><th>From</th><th>To</th><th>Packages</th><th>Status</th></tr></thead><tbody>
    ${sh.map(s=>`<tr><td class="mono">${esc(s.id)}</td><td class="mono">${esc(s.ref)}</td><td>${esc(s.customer)}</td><td>${esc(s.from)}</td><td>${esc(s.to)}</td><td class="num">${s.packages}</td><td><span class="chip">${esc(s.status)}</span></td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('.pg-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
}
document.addEventListener('click',e=>{const b=e.target.closest('.pg-tabs button');if(!b)return;tab=b.dataset.t;draw()});
draw();
window.__v6orders={draw,get tab(){return tab}};
})();
