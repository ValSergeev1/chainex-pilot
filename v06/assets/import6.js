/* V06 Import: batch upload with column mapping and validation, plus scan reports. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,O=window.CXO,I=window.CXI,esc=V.esc,$=s=>document.querySelector(s);
C.init();O&&O.seed&&O.seed();
let preview=null,map={};
function draw(){
  if(!$('#pg')){const m=V.shell({app:'Import',active:'import.html',crumbHTML:`<span class="x-hide-m">ChainEx / Dispatch /</span> Import`});
    m.innerHTML=`<div class="pg" id="pg"><div class="pg-h"><div><h1>Import</h1><p>Batch upload stops from a CSV, map columns, validate rows, and review scan reports.</p></div><div class="sp"></div><a class="btn" href="dispatch.html">Back to the map</a></div><div id="pgbody"></div></div>`}
  const v=O.desk();const hub=A&&A.viewHub();
  const scans=(v.scans||[]).filter(s=>!A||hub==='all'||s.hub===hub);
  const can=A&&A.can('import.batch');
  const cols=(I&&I.COLS)||['name','address','lat','lng','packages','ref'];
  $('#pgbody').innerHTML=`<div class="pg-c" style="padding:16px"><h3 style="margin:0 0 8px">Batch upload</h3>
    <div class="small t2" style="margin-bottom:10px">Paste a CSV. The first row can be headers. Map each ChainEx field, then validate before import. Rows without coordinates are geocoded; low-confidence matches go to Needs you.</div>
    <textarea class="in" id="csv" style="width:100%;min-height:120px;font-family:var(--fm);padding:10px" placeholder="name,address,lng,lat,packages"></textarea>
    <div id="imap" style="margin-top:10px"></div>
    <div id="ival" class="small" style="margin-top:8px"></div>
    <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select class="in" id="iline" style="width:140px"><option value="pd">P&amp;D</option><option value="bulky">Bulky</option><option value="wg">White glove</option><option value="ltl">LTL</option></select>
    <button class="btn" data-a="prev">Preview &amp; validate</button>
    ${can?`<button class="btn pri" data-a="imp" ${preview&&preview.ok?'':'disabled'}>Import ${preview?preview.rows.length+' valid rows':''}</button>`:A.actBtn('import.batch','Import','btn pri','')}</div></div>
    <div class="pg-c"><div class="db5-ch"><h3>Scan reports</h3></div><table><thead><tr><th>ID</th><th>Station</th><th>Time</th><th>Kind</th><th>Expected</th><th>Actual</th><th>Exceptions</th><th>Route</th></tr></thead><tbody>
    ${scans.map(s=>`<tr><td class="mono">${esc(s.id)}</td><td>${esc(s.station)}</td><td class="mono">${esc(s.at)}</td><td>${esc(s.kind)}</td><td class="num">${s.expected}</td><td class="num">${s.actual}</td><td class="num ${s.exceptions?'bad':''}">${s.exceptions}</td><td class="mono">${esc(s.route)}</td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">No scan reports for this hub.</div></td></tr>'}</tbody></table></div>`}
function paintMap(parsed){
  const box=$('#imap');if(!box||!I)return;
  const headers=parsed.headers;
  if(!Object.keys(map).length)map=I.guessMap(headers);
  box.innerHTML=`<div class="small" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">${I.COLS.map(c=>`<label class="x-field"><span class="micro">${c}</span><select class="in" data-map="${c}"><option value="">—</option>${headers.map((h,i)=>`<option value="${i}"${map[c]===i?' selected':''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div>`}
document.addEventListener('change',e=>{const s=e.target.closest('[data-map]');if(!s)return;const v=s.value;if(v==='')delete map[s.dataset.map];else map[s.dataset.map]=+v});
document.addEventListener('click',e=>{
  if(e.target.closest('[data-a=prev]')){
    const parsed=I.parseCsv($('#csv').value);if(!parsed.rows.length){V.toast('Paste a CSV first');return}
    if(!Object.keys(map).length)map=I.guessMap(parsed.headers);
    paintMap(parsed);preview=I.validateRows(parsed,map);
    $('#ival').innerHTML=preview.ok?`<span class="ok">${preview.rows.length} rows are valid.</span>`:`<span class="bad">${preview.issues.length} row(s) need a fix.</span> ${preview.issues.slice(0,6).map(x=>'Row '+x.row+': '+x.errs.join('; ')).join(' · ')}`;
    const btn=document.querySelector('[data-a=imp]');if(btn&&!(A&&!A.can('import.batch')))btn.disabled=!preview.ok;if(btn&&preview.ok)btn.textContent='Import '+preview.rows.length+' valid rows';
    return}
  if(!e.target.closest('[data-a=imp]'))return;
  if(A&&!A.can('import.batch'))return A.deny('import.batch');
  if(!preview||!preview.ok){V.toast('Validate the file first');return}
  const m=I.importMapped(preview.rows,$('#iline').value);V.toast(m?`Imported ${m.taskIds.length} stops · ${m.id}`:'Nothing to import');preview=null;draw()});
draw();
window.__v6imp={draw};
})();
