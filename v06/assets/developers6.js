/* V06 Developer portal: API console, keys, webhooks, sandbox walk, docs. Sample data only. */
(function(){
const C=window.CX,V=window.V5,I=window.CXI,esc=V.esc,$=s=>document.querySelector(s);
C.init();I&&I.seedInteg&&I.seedInteg();
let tab='console';
function keys(){return I.desk().keys}
function demoToken(){const k=keys().find(x=>x.active&&x.token.indexOf('cx_test_')===0);return k?k.token:''}
function draw(){
  const m=document.getElementById('app');
  if(!m.dataset.shell){V.shell({app:'Developers',active:'developers.html',crumbHTML:`<span class="x-hide-m">ChainEx /</span> Developer portal`});m.dataset.shell='1'}
  const host=document.getElementById('app').querySelector('#app')||document.getElementById('app');
  /* shell puts content in #app's inner main - V.shell returns main */
}
const main=()=>document.querySelector('#app .x-main')||document.querySelector('#app > main')||document.getElementById('app');
function page(){
  if(!document.querySelector('.x-top'))V.shell({app:'Developers',active:'developers.html',crumbHTML:`<span class="x-hide-m">ChainEx /</span> Developer portal`});
  const root=document.getElementById('x-main')||document.getElementById('app');
  const Idesk=I.desk();
  root.innerHTML=`<div class="cxi-page"><div class="cxi-h"><div><span class="micro">Integrations</span><h1>Developer portal</h1><p>Create sandbox keys, post orders into the Dispatch map, and set up signed webhooks. In this pilot everything runs in your browser. Production will use the same contract on ChainEx's own servers.</p></div></div>
    <div class="cxi-tabs">${[['console','API console'],['keys','API keys'],['hooks','Webhooks'],['sandbox','Lifecycle sandbox'],['docs','OpenAPI & EDI']].map(([id,l])=>`<button class="btn sm ${tab===id?'pri':''}" data-tab="${id}">${l}</button>`).join('')}</div>
    <div id="cxiBody"></div></div>`;
  body()}
function body(){
  const el=$('#cxiBody');
  if(tab==='console')el.innerHTML=`<div class="cxi-grid"><div class="cxi-card"><h3>Request</h3>
    <div class="small t2" style="margin-bottom:8px">The mock endpoint writes real sample stops into the shared store, so they show up on the Dispatch map.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <select class="in" id="mth" style="width:110px"><option>POST</option><option>GET</option></select>
      <input class="in" id="path" value="/v1/orders" style="flex:1;min-width:160px">
    </div>
    <label class="micro">Authorization</label><input class="in" id="tok" value="Bearer ${esc(demoToken())}" style="width:100%;margin-bottom:8px">
    <label class="micro">Idempotency-Key</label><input class="in" id="idem" value="demo-${Date.now().toString(36)}" style="width:100%;margin-bottom:8px">
    <textarea class="cxi-cons" id="body">{
  "name": "API sample stop · Bellevue",
  "address": "10400 NE 8th St, Bellevue, WA 98004",
  "packages": 2,
  "line": "pd",
  "reference": "PO-44019"
}</textarea>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="run">Run request</button><a class="btn" href="dispatch.html">Open Dispatch map</a></div>
    </div><div class="cxi-card"><h3>Response</h3><pre class="cxi-pre" id="resp">Ready.</pre></div></div>`;
  if(tab==='keys')el.innerHTML=`<div class="cxi-card"><h3>Scoped API keys</h3>
    <p class="small t2">Keys are stored only in this browser. Scopes limit what a partner can do. Rate limit is 20 requests per second, with a 429 and limit headers when exceeded.</p>
    <table class="tbl"><thead><tr><th>Name</th><th>Token</th><th>Scopes</th><th>Shipper</th><th></th></tr></thead><tbody>
    ${keys().map(k=>`<tr><td><b>${esc(k.name)}</b><div class="small t3">${k.active?'Active':'Revoked'}</div></td><td class="mono">${esc(k.token)}</td><td class="small">${esc((k.scopes||[]).join(', '))}</td><td>${esc(k.shipper||'—')}</td><td>${k.active?`<button class="btn sm" data-revoke="${k.id}">Revoke</button>`:''}</td></tr>`).join('')}</tbody></table>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><input class="in" id="kn" placeholder="Key name" style="flex:1"><input class="in" id="ks" placeholder="Shipper id" style="width:140px"><button class="btn pri" id="knew">Create sandbox key</button></div>
    </div>`;
  if(tab==='hooks')el.innerHTML=hooksHTML();
  if(tab==='sandbox')el.innerHTML=`<div class="cxi-card"><h3>Walk a shipment through every status</h3>
    <p class="small t2">Creates one sample stop and emits the canonical events: created, received, loaded, out for delivery, arrived, delivered. The same events fan out to any active webhook.</p>
    <button class="btn pri" id="walk">Run lifecycle</button>
    <pre class="cxi-pre" id="walkout" style="margin-top:12px">Waiting.</pre></div>`;
  if(tab==='docs')el.innerHTML=`<div class="cxi-grid"><div class="cxi-card"><h3>OpenAPI</h3><p class="small t2">The contract for create, batch, quote, cancel and tracking. Production will host the same paths.</p><a class="btn" href="assets/openapi.yaml" download>Download openapi.yaml</a></div>
    <div class="cxi-card"><h3>EDI samples</h3><p class="small t2">Sample 214 (status) and 210 (invoice) for retail and freight partners. Confirm each partner's code guide before go-live.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="assets/edi/214-sample.txt" download>EDI 214 sample</a><a class="btn" href="assets/edi/210-sample.txt" download>EDI 210 sample</a><button class="btn" id="edi214">214 for latest event</button></div>
    <pre class="cxi-pre" id="ediout" style="margin-top:10px;display:none"></pre></div></div>`;
}
function hooksHTML(){const Idesk=I.desk();
  return `<div class="cxi-card"><h3>Webhook subscriptions</h3>
    <p class="small t2">Payloads are HMAC-SHA256 signed (<span class="mono">X-ChainEx-Signature: t=…,v1=…</span>). In this pilot, deliveries are simulated and written to the log — a production sender on ChainEx's servers would POST them. Use a URL containing <span class="mono">fail</span> to simulate a failed delivery, then retry or replay.</p>
    <table class="tbl"><thead><tr><th>Customer</th><th>URL</th><th>Events</th><th>Failures</th><th></th></tr></thead><tbody>
    ${Idesk.hooks.map(h=>`<tr><td>${esc(h.customer||'—')}</td><td class="mono small">${esc(h.url)}</td><td>${esc((h.events||[]).join(', '))}</td><td class="${h.failures?'bad':''}">${h.failures||0}</td><td style="white-space:nowrap"><button class="btn sm" data-fire="${h.id}">Test-fire</button> <button class="btn sm" data-retry="${h.id}">Retry failed</button> <button class="btn sm" data-replay="${h.id}">Replay all</button></td></tr>`).join('')}</tbody></table>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><input class="in" id="hu" placeholder="https://hooks.example.com/…" style="flex:2"><input class="in" id="hc" placeholder="Customer id" style="flex:1"><button class="btn pri" id="hadd">Add endpoint</button></div>
    <h3 style="margin:18px 0 8px">Delivery log</h3>
    <table class="tbl"><thead><tr><th>When</th><th>Event</th><th>Status</th><th>Attempt</th><th>Note</th></tr></thead><tbody>
    ${Idesk.log.slice().reverse().slice(0,25).map(l=>`<tr><td class="mono small">${esc(l.at)}</td><td class="mono">${esc(l.eventId)}</td><td class="${l.ok?'ok':'bad'}">${l.status}</td><td>${l.attempt}</td><td class="small">${esc(l.note||'')}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No deliveries yet.</div></td></tr>'}</tbody></table></div>`}
document.addEventListener('click',e=>{
  const tb=e.target.closest('[data-tab]');if(tb){tab=tb.dataset.tab;page();return}
  if(e.target.id==='run'){const r=I.request($('#mth').value,$('#path').value,{headers:{Authorization:$('#tok').value,'Idempotency-Key':$('#idem').value},body:JSON.parse($('#body').value||'{}')});
    $('#resp').textContent=JSON.stringify(r,null,2);if(r.ok&&r.body&&r.body.id)V.toast('Order '+r.body.id+' is on the Dispatch map','check');return}
  if(e.target.id==='knew'){const k=I.createKey({name:$('#kn').value||'New sandbox key',shipper:$('#ks').value,test:true});V.toast('Key created · '+k.token);page();return}
  const rv=e.target.closest('[data-revoke]');if(rv){I.revokeKey(rv.dataset.revoke);page();return}
  if(e.target.id==='hadd'){I.addHook({url:$('#hu').value,customer:$('#hc').value});V.toast('Endpoint added');page();return}
  const f=e.target.closest('[data-fire]');if(f){I.testFire(f.dataset.fire,'created');V.toast('Test event signed and logged');page();return}
  const rt=e.target.closest('[data-retry]');if(rt){const n=I.retryFailed(rt.dataset.retry);V.toast('Retried '+n);page();return}
  const rp=e.target.closest('[data-replay]');if(rp){const n=I.replay(rp.dataset.replay);V.toast('Replayed '+n+' events');page();return}
  if(e.target.id==='walk'){const r=I.request('POST','/v1/orders',{token:demoToken(),idem:'walk-'+Date.now(),body:{name:'Sandbox walk-through',address:'800 Occidental Ave S, Seattle, WA 98134',packages:1,line:'pd',reference:'WALK-01'}});
    if(!r.ok){$('#walkout').textContent=JSON.stringify(r,null,2);return}
    const id=r.body.id;['received','loaded','out_for_delivery','arrived','delivered'].forEach(t=>I.emit(t,{taskId:id,tracking:id,actor:'Sandbox'}));
    $('#walkout').textContent=JSON.stringify({id,tracking_url:I.trackUrl(id),events:I.eventsFor(id).map(e=>e.type)},null,2);V.toast('Walk-through complete · see Dispatch');return}
  if(e.target.id==='edi214'){const ev=I.desk().events.slice(-1)[0];const txt=I.edi214(ev&&ev.taskId);$('#ediout').style.display='block';$('#ediout').textContent=txt}
});
page();
window.__cxiDev={page};
})();
