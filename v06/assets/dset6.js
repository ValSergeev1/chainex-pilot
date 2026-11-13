/* V06 Dispatch settings: customer access, territories, route limits, demo role/hub. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,O=window.CXO,esc=V.esc,$=s=>document.querySelector(s);
C.init();O&&O.seed&&O.seed();
function draw(){
  const v=O.desk(),s=v.settings,can=A&&A.can('settings.edit');
  if(!$('#pg')){const m=V.shell({app:'Dispatch settings',active:'dset.html',crumbHTML:`<span class="x-hide-m">ChainEx / Dispatch /</span> Settings`});
    m.innerHTML=`<div class="pg" id="pg"><div class="pg-h"><div><h1>Dispatch settings</h1><p>Customer access, territories and route limits for this network.</p></div><div class="sp"></div><a class="btn" href="dispatch.html">Back to the map</a></div><div id="pgbody"></div></div>`}
  $('#pgbody').innerHTML=`
  <div class="pg-c" style="padding:16px"><h3 style="margin:0 0 10px">Customer manager access</h3>
    ${(s.customers||[]).map(c=>`<div class="card pad" style="margin-bottom:10px" data-cm="${c.id}">
      <div class="pg-filters"><input class="in" data-f="customer" value="${esc(c.customer)}" style="flex:1"><input class="in" data-f="managerEmail" placeholder="Manager email" value="${esc(c.managerEmail||'')}" style="flex:1"></div>
      <label class="small t2"><input type="checkbox" data-f="allStations" ${c.allStations?'checked':''}> All stations</label>
      <input class="in" data-f="stations" placeholder="Station names, comma separated" value="${esc(c.stations||'')}" style="width:100%;margin:8px 0">
      <div class="small t3">Customer sign-in link: <a href="${esc(c.signIn||'#')}">${esc(c.signIn||'')}</a> (sample)</div>
    </div>`).join('')}
    ${can?`<button class="btn pri" data-a="savecm">Save access</button>`:A.actBtn('settings.edit','Save access','btn pri','')}
  </div>
  <div class="pg-c" style="padding:16px"><h3 style="margin:0 0 10px">Team territories</h3>
    <table><thead><tr><th>Territory</th><th>Hub</th><th>Lines</th><th>ZIP coverage</th></tr></thead><tbody>
    ${(s.territories||[]).map(t=>`<tr><td><b>${esc(t.name)}</b></td><td>${esc((A.HUBS.find(h=>h.id===t.hub)||{}).name||t.hub)}</td><td>${esc((t.lines||[]).join(', '))}</td><td class="mono">${esc(t.zips)}</td></tr>`).join('')}</tbody></table>
  </div>
  <div class="pg-c" style="padding:16px"><h3 style="margin:0 0 10px">Route limits (auto-build)</h3>
    <div class="d5-kv" style="grid-template-columns:repeat(5,1fr);display:grid;gap:8px">${[['stops','Avg stops'],['packages','Packages'],['miles','Miles'],['hours','Hours'],['capacity','Vehicle capacity']].map(([k,l])=>`<label class="x-field"><span class="micro">${l}</span><input class="in" data-lim="${k}" type="number" value="${s.limits[k]}"></label>`).join('')}</div>
    ${can?`<button class="btn pri" data-a="savelim" style="margin-top:10px">Save limits</button>`:A.actBtn('settings.edit','Save limits','btn pri','')}
  </div>
  <div class="pg-c" style="padding:16px"><h3 style="margin:0 0 8px">Demo · role and hub</h3>
    <div class="small t2" style="margin-bottom:8px">Hidden from everyday use. Switch sample roles and hubs to try access and scoping. Not real people.</div>
    ${A?A.demoHTML():''}</div>`;
  const ap=document.getElementById('cxaApply');if(ap)ap.onclick=()=>{const r=document.getElementById('cxaRole').value;const h=document.getElementById('cxaHub');if(h)A.setViewHub(h.value);CXS.actAs(r);location.reload()}
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-a=savecm]')){if(A&&!A.can('settings.edit'))return A.deny('settings.edit');
    document.querySelectorAll('[data-cm]').forEach(box=>{const id=box.dataset.cm;const c=O.desk().settings.customers.find(x=>x.id===id);if(!c)return;
      box.querySelectorAll('[data-f]').forEach(el=>{c[el.dataset.f]=el.type==='checkbox'?el.checked:el.value})});
    C.update(()=>{});V.toast('Customer access saved') ;return}
  if(e.target.closest('[data-a=savelim]')){if(A&&!A.can('settings.edit'))return A.deny('settings.edit');
    document.querySelectorAll('[data-lim]').forEach(el=>O.desk().settings.limits[el.dataset.lim]=+el.value);C.update(()=>{});V.toast('Route limits saved')}
});
draw();
window.__v6dset={draw};
})();
