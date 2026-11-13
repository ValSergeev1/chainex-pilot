/* V06 Import: batch upload and scan reports. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,O=window.CXO,esc=V.esc,$=s=>document.querySelector(s);
C.init();O&&O.seed&&O.seed();
function draw(){
  if(!$('#pg')){const m=V.shell({app:'Import',active:'import.html',crumbHTML:`<span class="x-hide-m">ChainEx / Dispatch /</span> Import`});
    m.innerHTML=`<div class="pg" id="pg"><div class="pg-h"><div><h1>Import</h1><p>Batch upload stops from a CSV, and review scan reports for this hub.</p></div><div class="sp"></div><a class="btn" href="dispatch.html">Back to the map</a></div><div id="pgbody"></div></div>`}
  const v=O.desk();const hub=A&&A.viewHub();
  const scans=(v.scans||[]).filter(s=>!A||hub==='all'||s.hub===hub);
  const can=A&&A.can('import.batch');
  $('#pgbody').innerHTML=`<div class="pg-c" style="padding:16px"><h3 style="margin:0 0 8px">Batch upload</h3>
    <div class="small t2" style="margin-bottom:10px">Paste CSV with columns: name, address, longitude, latitude, packages. Rows without coordinates are placed near the current hub.</div>
    <textarea class="in" id="csv" style="width:100%;min-height:120px;font-family:var(--fm);padding:10px" placeholder="name,address,lng,lat,packages"></textarea>
    <div style="margin-top:10px;display:flex;gap:8px;align-items:center"><select class="in" id="iline" style="width:140px"><option value="pd">P&D</option><option value="bulky">Bulky</option><option value="wg">White glove</option><option value="ltl">LTL</option></select>
    ${can?`<button class="btn pri" data-a="imp">Import</button>`:A.actBtn('import.batch','Import','btn pri','')}</div></div>
    <div class="pg-c"><div class="db5-ch"><h3>Scan reports</h3></div><table><thead><tr><th>ID</th><th>Station</th><th>Time</th><th>Kind</th><th>Expected</th><th>Actual</th><th>Exceptions</th><th>Route</th></tr></thead><tbody>
    ${scans.map(s=>`<tr><td class="mono">${esc(s.id)}</td><td>${esc(s.station)}</td><td class="mono">${esc(s.at)}</td><td>${esc(s.kind)}</td><td class="num">${s.expected}</td><td class="num">${s.actual}</td><td class="num ${s.exceptions?'bad':''}">${s.exceptions}</td><td class="mono">${esc(s.route)}</td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">No scan reports for this hub.</div></td></tr>'}</tbody></table></div>`}
document.addEventListener('click',e=>{if(!e.target.closest('[data-a=imp]'))return;
  if(A&&!A.can('import.batch'))return A.deny('import.batch');
  const m=O.importCsv($('#csv').value,$('#iline').value);V.toast(m?`Imported ${m.taskIds.length} stops · ${m.id}`:'Nothing to import');draw()});
draw();
window.__v6imp={draw};
})();
