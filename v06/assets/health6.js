/* Integration health sub-page. */
(function(){
const C=window.CX,V=window.V5,I=window.CXI,esc=V.esc;
C.init();I&&I.seedInteg&&I.seedInteg();
function page(){
  if(!document.querySelector('.x-top'))V.shell({app:'Integrations',active:'health.html',crumbHTML:`<span class="x-hide-m">ChainEx / Control tower /</span> Integration health`});
  const root=document.getElementById('x-main')||document.getElementById('app');
  const h=I.health();const d=I.desk();
  root.innerHTML=`<div class="cxi-page"><div class="cxi-h"><div><span class="micro">Control tower</span><h1>Integration health</h1><p>Feed lag, failed webhooks, scan gaps and silent devices, by partner where we have a subscription. In the pilot, webhook delivery is simulated.</p></div><div class="sp"></div><a class="btn" href="dashboard.html">Back to the control tower</a></div>
    <div class="cxi-k">
      <div><b class="${h.tone}">${esc(h.lag)}</b><span>Feed lag</span></div>
      <div><b class="${h.failed?'warn':''}">${h.failed}</b><span>Failed webhook deliveries</span></div>
      <div><b class="${h.gaps?'warn':''}">${h.gaps}</b><span>Scan gaps on delivered stops</span></div>
      <div><b class="${h.silent?'warn':''}">${h.silent}</b><span>Silent devices on the road</span></div>
    </div>
    <div class="cxi-grid">
      <div class="cxi-card"><h3>Failed deliveries</h3>
        <table class="tbl"><thead><tr><th>When</th><th>URL</th><th>Status</th><th>Attempts</th></tr></thead><tbody>
        ${h.failedRows.map(l=>`<tr><td class="mono small">${esc(l.at)}</td><td class="mono small">${esc(l.url)}</td><td class="bad">${l.status}</td><td>${l.attempt}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty">No failed deliveries in the log.</div></td></tr>'}
        </tbody></table>
        <button class="btn" id="retryall" style="margin-top:10px">Retry failed</button>
      </div>
      <div class="cxi-card"><h3>Subscriptions</h3>
        ${(d.hooks||[]).map(x=>`<div class="card pad" style="margin-bottom:8px"><b>${esc(x.customer||x.url)}</b><div class="small t3 mono">${esc(x.url)}</div><div class="small">${x.active?'Active':'Off'} · ${x.failures||0} failure(s)</div></div>`).join('')||'<div class="empty">No subscriptions.</div>'}
        <a class="btn" href="developers.html">Open developer portal</a>
      </div>
    </div>
    <div class="cxi-card" style="margin-top:14px"><h3>Canonical events (latest)</h3>
      <table class="tbl"><thead><tr><th>Time</th><th>Type</th><th>Tracking</th><th>EDI</th><th>Actor</th></tr></thead><tbody>
      ${d.events.slice().reverse().slice(0,30).map(e=>`<tr><td class="mono small">${esc(e.at)}</td><td>${esc(e.label||e.type)}</td><td class="mono">${esc(e.tracking)}</td><td class="mono">${esc(e.edi||'—')}</td><td>${esc(e.actor)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">No events yet.</div></td></tr>'}
      </tbody></table></div>
  </div>`}
document.addEventListener('click',e=>{if(e.target.id==='retryall'){const n=I.retryFailed();V.toast('Retried '+n);page()}});
page();
window.__cxiHealth={page};
})();
