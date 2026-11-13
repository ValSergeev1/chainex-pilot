/* V06 Recruiting pipeline. Sample candidates only. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,esc=V.esc,ic=V.ic,$=s=>document.querySelector(s);
C.init();
const STAGES=['Submitted','Reviewing','Contact requested','Interview','Onboarding','Active','Talent pool','Closed'];
function norm(s){s=String(s||'Submitted');
  const m={submitted:'Submitted',reviewing:'Reviewing','contact requested':'Contact requested',interview:'Interview',onboarding:'Onboarding',active:'Active','hiring approved':'Active','talent pool':'Talent pool',closed:'Closed'};
  return m[s.toLowerCase()]||s}
let ui={q:'',stage:'All',role:'All',sel:null};
function list(){let r=(C.S.recruits||[]).map(x=>Object.assign({},x,{stage:norm(x.stage)}));
  if(ui.stage!=='All')r=r.filter(x=>x.stage===ui.stage);
  if(ui.role!=='All')r=r.filter(x=>x.type===ui.role);
  if(ui.q){const q=ui.q.toLowerCase();r=r.filter(x=>[x.name,x.type,x.city,x.source,x.stage].join(' ').toLowerCase().includes(q))}
  return r}
function draw(){
  if(!$('#pg')){const m=V.shell({app:'Recruiting',active:'recruiting.html',crumbHTML:`<span class="x-hide-m">ChainEx /</span> Recruiting`});
    m.innerHTML=`<div class="pg" id="pg"><div class="pg-h"><div><h1>Recruiting</h1><p>Hiring pipeline. Shift assignments stay with Dispatch.</p></div><div class="sp"></div><a class="btn" href="partners.html">Partners</a><a class="btn" href="dashboard.html">Control tower</a></div><div id="pgbody"></div></div>`}
  const r=list(),cnt={};STAGES.forEach(s=>cnt[s]= (C.S.recruits||[]).filter(x=>norm(x.stage)===s).length);
  const types=[...new Set((C.S.recruits||[]).map(x=>x.type).filter(Boolean))];
  $('#pgbody').innerHTML=`<div class="pg-c" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
    <div class="pg-chips"><button class="${ui.stage==='All'?'on':''}" data-a="stage" data-v="All">All applicants <span class="mono">${(C.S.recruits||[]).length}</span></button>${STAGES.map(s=>`<button class="${ui.stage===s?'on':''}" data-a="stage" data-v="${esc(s)}">${esc(s)} <span class="mono">${cnt[s]||0}</span></button>`).join('')}</div>
    <div class="pg-filters"><input class="in" id="rq" placeholder="Name, role, location" value="${esc(ui.q)}" style="flex:1"><select class="in" id="rrole"><option>All</option>${types.map(t=>`<option${ui.role===t?' selected':''}>${esc(t)}</option>`).join('')}</select></div>
  </div>
  <div class="pg-c"><table><thead><tr><th>Name</th><th>Role</th><th>Stage</th><th class="hm">City</th><th class="hm">Source</th><th></th></tr></thead><tbody>
  ${r.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.type||'—')}</td><td><span class="chip">${esc(x.stage)}</span></td><td class="hm">${esc(x.city||'')}</td><td class="hm">${esc(x.source||'')}</td><td>${A&&!A.can('recruiting.edit')?A.actBtn('recruiting.edit','Move','btn sm',''):`<select class="in" data-a="move" data-v="${x.id}">${STAGES.map(s=>`<option${s===x.stage?' selected':''}>${s}</option>`).join('')}</select>`}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">No matching applications.</div></td></tr>'}</tbody></table></div>`;
  const q=$('#rq');if(q)q.oninput=()=>{ui.q=q.value;clearTimeout(q._t);q._t=setTimeout(draw,160)};
  const rr=$('#rrole');if(rr)rr.onchange=()=>{ui.role=rr.value;draw()}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a=stage]');if(!b)return;ui.stage=b.dataset.v;draw()});
document.addEventListener('change',e=>{const b=e.target.closest('[data-a=move]');if(!b)return;if(A&&!A.can('recruiting.edit'))return A.deny('recruiting.edit');
  C.update(()=>{if(C.ops.rMove)C.ops.rMove(b.dataset.v,b.value,'Recruiter');else{const r=C.S.recruits.find(x=>x.id===b.dataset.v);if(r)r.stage=b.value}});draw();V.toast('Stage updated')});
draw();
window.__v6rec={draw,list,STAGES};
})();
