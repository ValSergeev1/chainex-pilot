/* V06 Partners sub-page: Directory, Onboarding, Agreements. Payment setup lives in the partner file. Sample data only. */
(function(){
const C=window.CX,V=window.V5,A=window.CXA,esc=V.esc,ic=V.ic,$=s=>document.querySelector(s);
C.init();
const TYPES=['Driver','DSP','Carrier','Shipper','Customer','Warehouse','Other'];
const STAT=['Current accounts','Completing setup','Needs team review','Fully approved','Closed'];
const QF=[['all','All open items'],['action','Needs team action'],['review','Team review'],['follow','Follow-ups due'],['portal','Portal requests'],['docs','Documents'],['sign','Signatures'],['pay','Payment setup'],['owner','Accounts without a team owner']];
let ui={tab:'dir',q:'',type:'All types',status:'Current accounts',state:'',city:'',market:'',service:'',vehicle:'',qf:'all',sel:null,noOwner:false};

function partners(){return (C.S.partners||[]).filter(p=>p.status!=='__none__')}
function qKind(q){const k=(q.kind||'').toLowerCase();
  if(/document|doc|insur|w-9|license/.test(k))return 'docs';
  if(/sign|agreement/.test(k))return 'sign';
  if(/payment|payout|billing|ach|zelle/.test(k))return 'pay';
  if(/follow/.test(k))return 'follow';
  if(/portal|request/.test(k))return 'portal';
  if(/review/.test(k))return 'review';
  return 'action'}
function openQ(){return (C.S.queue||[]).filter(q=>q.status==='Open')}
function partnerQueue(p){return openQ().filter(q=>q.partnerId===p.id)}
function nextAction(p){const st=C.portal.stepState?C.portal.stepState(p):{};const na=C.portal.nextAction?C.portal.nextAction(p):null;return na&&na[0]||p.nextAction||'Review file'}
function ownerName(id){if(!id)return 'Unassigned';const u=(C.S.users||[]).find(x=>x.id===id);return (u&&u.name)||id}
function steps(p){try{const st=C.portal.stepState(p);const n=Object.values(st).filter(Boolean).length;return n+' of 5'}catch(e){return '—'}}
function dispatchReady(p){return p.status==='Fully approved'&&!p.suspended}

function filtered(){let list=partners();
  if(ui.status==='Current accounts')list=list.filter(p=>p.status!=='Closed');
  else if(ui.status&&ui.status!=='All')list=list.filter(p=>p.status===ui.status);
  if(ui.type&&ui.type!=='All types')list=list.filter(p=>p.type===ui.type);
  if(ui.state)list=list.filter(p=>(p.state||'WA')===ui.state);
  if(ui.city)list=list.filter(p=>(p.city||'')===ui.city);
  if(ui.market)list=list.filter(p=>((p.city||'')+' '+(p.state||'')).includes(ui.market));
  if(ui.service)list=list.filter(p=>(p.lines||[]).includes(ui.service));
  if(ui.vehicle)list=list.filter(p=>(p.vehicleTypes||[]).includes(ui.vehicle));
  if(ui.q){const q=ui.q.toLowerCase();list=list.filter(p=>[p.name,p.short,p.id,p.contact&&p.contact.email,p.city,p.type].join(' ').toLowerCase().includes(q))}
  if(ui.qf==='owner'||ui.noOwner)list=list.filter(p=>!p.owner);
  if(ui.qf&&ui.qf!=='all'&&ui.qf!=='owner')list=list.filter(p=>partnerQueue(p).some(q=>qKind(q)===ui.qf)||(ui.qf==='review'&&p.status==='Needs team review')||(ui.qf==='action'&&partnerQueue(p).length));
  return list}

function counts(){const all=partners().filter(p=>p.status!=='Closed');
  const q=openQ();const by={all:q.length,action:q.filter(x=>qKind(x)==='action').length,review:partners().filter(p=>p.status==='Needs team review').length,
    follow:q.filter(x=>qKind(x)==='follow').length,portal:q.filter(x=>qKind(x)==='portal').length,docs:q.filter(x=>qKind(x)==='docs').length,
    sign:q.filter(x=>qKind(x)==='sign'||(x.kind||'').match(/sign/i)).length,pay:q.filter(x=>qKind(x)==='pay').length,owner:all.filter(p=>!p.owner).length};
  const typ={};TYPES.forEach(t=>typ[t]=partners().filter(p=>p.type===t&&p.status!=='Closed').length);
  typ['All types']=all.length;
  const st={};STAT.forEach(s=>{st[s]=s==='Current accounts'?all.length:partners().filter(p=>p.status===s).length});
  return {q:by,typ,st}}

function chipRow(items,key,lab){return `<div class="pg-chips">${items.map(([v,n])=>`<button class="${ui[key]===v?'on':''}" data-a="chip" data-k="${key}" data-v="${esc(v)}">${esc(lab?lab(v):v)}${n!=null?` <span class="mono">${n}</span>`:''}</button>`).join('')}</div>`}

function dir(){const list=filtered(),c=counts();
  const states=[...new Set(partners().map(p=>p.state||'WA'))].sort();
  const cities=[...new Set(partners().map(p=>p.city).filter(Boolean))].sort();
  const vehicles=[...new Set(partners().flatMap(p=>p.vehicleTypes||[]))].sort();
  const markets=[...new Set(partners().map(p=>p.market||p.city).filter(Boolean))].sort();
  const locked=A&&!A.can('partners.edit');
  return `<div class="pg-c" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
    <div class="pg-chips">${QF.map(([v,l])=>`<button class="${ui.qf===v?'on':''}" data-a="qf" data-v="${v}">${esc(l)} <span class="mono">${c.q[v]||0}</span></button>`).join('')}</div>
    ${chipRow(TYPES.map(t=>[t,c.typ[t]]).concat([['All types',c.typ['All types']]]),'type')}
    ${chipRow(STAT.map(s=>[s,c.st[s]]),'status')}
    <div class="pg-filters">
      <input class="in" id="pq" placeholder="Company, contact, market, service, vehicle or ID" value="${esc(ui.q)}" style="flex:1;min-width:180px">
      <select class="in" id="pstate"><option value="">All states</option>${states.map(s=>`<option${ui.state===s?' selected':''}>${esc(s)}</option>`).join('')}</select>
      <select class="in" id="pcity"><option value="">All cities</option>${cities.map(s=>`<option${ui.city===s?' selected':''}>${esc(s)}</option>`).join('')}</select>
      <select class="in" id="pmkt"><option value="">All markets</option>${markets.map(s=>`<option${ui.market===s?' selected':''}>${esc(s)}</option>`).join('')}</select>
      <select class="in" id="psvc"><option value="">All services</option>${(C.LINE_ORDER||[]).map(l=>`<option value="${l}"${ui.service===l?' selected':''}>${esc((window.CXS&&CXS.LINES[l])||l)}</option>`).join('')}</select>
      <select class="in" id="pveh"><option value="">All vehicle types</option>${vehicles.map(s=>`<option${ui.vehicle===s?' selected':''}>${esc(s)}</option>`).join('')}</select>
    </div>
    <label class="small t2"><input type="checkbox" id="powner" ${ui.noOwner||ui.qf==='owner'?'checked':''}> Only accounts without a team owner</label>
  </div>
  <div class="pg-c"><table><thead><tr><th>Partner ID</th><th>Account</th><th>Completion</th><th>Next action</th><th class="hm">Owner</th><th class="hm">Updated</th><th></th></tr></thead><tbody>
  ${list.map(p=>`<tr data-a="open" data-v="${p.id}" class="${ui.sel===p.id?'sel':''}"><td class="mono t3">${esc(p.id)}</td><td><b>${esc(p.name)}</b><div class="small t3">${esc(p.type)} · ${esc(p.city||'')} ${esc(p.state||'')}</div></td><td>${esc(steps(p))}<div class="small t3">${esc(p.status)}</div></td><td>${esc(nextAction(p))}</td><td class="hm">${esc(ownerName(p.owner))}</td><td class="hm small t3">${esc(p.createdAt||'—')}</td><td><button class="btn sm" data-a="open" data-v="${p.id}">Open file</button></td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No accounts match.</div></td></tr>'}
  </tbody></table></div>`}

function onboarding(){const inc=partners().filter(p=>p.status==='Completing setup'||p.status==='Needs team review');
  const m=C.portal.metrics();
  return `<div class="pg-c"><div class="db5-ch"><h3>Application invites</h3>${A&&!A.can('partners.edit')?A.actBtn('partners.edit','Manage invites','btn sm',''):`<button class="btn sm" data-a="invites">Manage invites</button>`}</div>
    <div class="small t2" style="padding:12px 14px">Queue a new invite. Nothing is emailed until a teammate approves the draft.</div></div>
  <div class="pg-c"><div class="db5-ch"><h3>Setup reminders</h3><span class="chip">${inc.length} incomplete</span>${A&&!A.can('partners.remind')?A.actBtn('partners.remind','Preview reminders','btn sm',''):`<button class="btn sm pri" data-a="remind">Preview reminders</button>`}</div></div>
  <div class="pg-c"><div class="db5-ch"><h3>Partner activation</h3></div><div class="funnel">${(m.funnel||[]).map(f=>`<div><b>${f.n}</b><span>${esc(f.l)}</span></div>`).join('')}</div>
    <div class="small t2" style="padding:0 14px 14px">Median time to approve: <b>${m.tta==null?'—':m.tta+' days'}</b>. ${m.overdue||0} onboarding tasks are past their wait-time target.</div></div>`}

function agreements(){const list=filtered();
  return `<div class="pg-c"><table><thead><tr><th>Partner</th><th>Signatures</th><th>Awards</th><th></th></tr></thead><tbody>
  ${list.map(p=>{const ag=p.agreements||[];const signed=ag.filter(a=>a.status==='Signed').length,draft=ag.filter(a=>a.status==='Draft').length,sent=ag.filter(a=>a.status==='Sent').length,none=ag.filter(a=>a.status==='Not sent').length;
    const sig=ag.length?(draft?draft+' draft, ':'')+(sent?sent+' awaiting signature, ':'')+(signed?signed+' signed':(none?none+' not assigned':'')): 'No agreement assigned';
    return `<tr data-a="open" data-v="${p.id}"><td><b>${esc(p.name)}</b><div class="small t3">${esc(p.type)} · ${esc((p.contact&&p.contact.email)||'')}</div></td><td>${esc(sig)}</td><td>0 accepted · 0 awaiting</td><td>${A&&!A.can('agreements.draft')?A.actBtn('agreements.draft','Send agreement','btn sm',`data-a="sendag" data-v="${p.id}"`):`<button class="btn sm" data-a="sendag" data-v="${p.id}">Send agreement</button>`} <button class="btn sm ghost" data-a="open" data-v="${p.id}">View</button></td></tr>`}).join('')}
  </tbody></table></div>`}

function file(p){if(!p)return '<div class="empty">Select a partner.</div>';
  const pay=p.payment||{};const last4=pay.last4?('···· '+pay.last4):'not on file';
  const method=pay.method||'Missing';
  const docs=(p.docs||[]).map(d=>`<div class="row"><div class="grow"><div class="ttl">${esc(d.type)}</div><div class="sub">${esc(d.status)}${d.expires?' · exp '+d.expires:''}</div></div><span class="chip ${d.status==='Verified'?'ok':/Missing|expired/i.test(d.status)?'bad':'warn'}">${esc(d.status)}</span></div>`).join('');
  const ag=(p.agreements||[]).map(a=>`<div class="row"><div class="grow"><div class="ttl">${esc(a.name)}</div><div class="sub">${esc(a.status)}${a.envelope?' · '+a.envelope:''}</div></div></div>`).join('')||'<div class="empty">No agreements assigned.</div>';
  return `<div class="pg-c"><div class="db5-ch"><h3>${esc(p.name)}</h3><span class="chip">${esc(p.type)}</span><span class="chip ${p.status==='Fully approved'?'ok':''}">${esc(p.status)}</span></div>
    <div class="pg-kv"><div><span class="t3">ID</span><b class="mono">${esc(p.id)}</b></div><div><span class="t3">City</span><b>${esc(p.city||'')} ${esc(p.state||'')}</b></div><div><span class="t3">Owner</span><b>${esc(ownerName(p.owner))}</b></div><div><span class="t3">Setup</span><b>${esc(steps(p))}</b></div><div><span class="t3">Contact</span><b>${esc((p.contact&&p.contact.email)||'—')}</b></div></div></div>
    <div class="pg-c"><div class="db5-ch"><h3>Documents</h3></div><div>${docs||'<div class="empty">No documents.</div>'}</div></div>
    <div class="pg-c"><div class="db5-ch"><h3>Agreements</h3></div><div>${ag}</div></div>
    <div class="pg-c"><div class="db5-ch"><h3>Payment setup</h3></div><div class="pg-kv">
      <div><span class="t3">Method</span><b>${esc(method)}</b></div>
      <div><span class="t3">Bank / account</span><b>${method.match(/Zelle/i)?'Zelle recipient on file, masked':('ACH '+last4)}</b></div>
      <div><span class="t3">Status</span><b>${esc(pay.status||'Missing')}</b></div>
      <div><span class="t3">Tax forms</span><b>${(p.docs||[]).some(d=>/W-9|tax/i.test(d.type))?'W-9 on file (restricted folder)':'No tax form on file'}</b></div>
      <div class="small t2" style="display:block">Bank details stay masked here. Full numbers stay in the restricted profile folder.</div>
    </div></div>`}

function draw(){const main=document.getElementById('x-main')?null:null;
  if(!$('#pg')){const m=V.shell({app:'Partners',active:'partners.html',crumbHTML:`<span class="x-hide-m">ChainEx /</span> Partners`});
    m.innerHTML=`<div class="pg" id="pg"><div class="pg-h"><div><h1>Partners</h1><p>Directory, onboarding and agreements. Payment setup is inside each file.</p></div><div class="sp"></div>${A&&!A.can('partners.edit')?A.actBtn('partners.edit',ic('plus',14)+' Add partner','btn pri',''):`<button class="btn pri" data-a="add">${ic('plus',14)} Add partner</button>`}${A&&!A.can('partners.remind')?A.actBtn('partners.remind','Setup reminders','btn',''):`<button class="btn" data-a="remind">Setup reminders</button>`}<a class="btn" href="recruiting.html">Recruiting</a><a class="btn" href="dashboard.html">Control tower</a></div>
      <div class="pg-tabs">${[['dir','Directory'],['onb','Onboarding'],['agr','Agreements']].map(([v,l])=>`<button data-a="tab" data-v="${v}" class="${ui.tab===v?'on':''}">${l}</button>`).join('')}</div>
      <div id="pgbody"></div><div id="pgfile"></div></div>`}
  $$=s=>[...document.querySelectorAll(s)];
  $$('.pg-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===ui.tab));
  $('#pgbody').innerHTML=ui.tab==='dir'?dir():ui.tab==='onb'?onboarding():agreements();
  const sel=ui.sel&&C.portal.partner(ui.sel);
  $('#pgfile').innerHTML=sel?`<div class="pg-file"><div></div>${file(sel)}</div>`:'';
  const q=$('#pq');if(q)q.oninput=()=>{ui.q=q.value;clearTimeout(q._t);q._t=setTimeout(draw,160)};
  ['pstate','pcity','pmkt','psvc','pveh'].forEach(id=>{const el=$('#'+id);if(el)el.onchange=()=>{ui[{pstate:'state',pcity:'city',pmkt:'market',psvc:'service',pveh:'vehicle'}[id]]=el.value;draw()}});
  const ow=$('#powner');if(ow)ow.onchange=()=>{ui.noOwner=ow.checked;if(ow.checked)ui.qf='owner';else if(ui.qf==='owner')ui.qf='all';draw()}}

function addPartner(){V.panel('Add partner',`<div class="w6-form"><label class="x-field"><span class="micro">Name</span><input class="in" id="apN"></label>
  <label class="x-field"><span class="micro">Type</span><select class="in" id="apT">${TYPES.map(t=>`<option>${t}</option>`).join('')}</select></label>
  <label class="x-field"><span class="micro">City</span><input class="in" id="apC" value="Kent"></label>
  <label class="x-field"><span class="micro">Email</span><input class="in" id="apE" placeholder="sample@example.com"></label></div>`,
  {icon:'users',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="apGo">Create</button>`});
  $('#apGo').onclick=()=>{const name=$('#apN').value.trim();if(!name)return V.toast('Name is required');
    let id;C.update(()=>{id=C.ops.pApply($('#apT').value,{name,city:$('#apC').value,email:$('#apE').value,source:'Staff add'})});
    V.close();ui.sel=id;draw();V.toast('Partner added (sample)')}}

function previewRemind(){const list=filtered().filter(p=>p.status!=='Fully approved'&&p.status!=='Closed').slice(0,12);
  V.panel('Preview setup reminders',`<p class="small t2">These are drafts. Nothing is sent until a teammate approves the batch.</p>
    ${list.map(p=>`<div class="row"><div class="grow"><div class="ttl">${esc(p.name)}</div><div class="sub">Draft: please finish ${esc(nextAction(p)).toLowerCase()} so we can activate your account.</div></div></div>`).join('')||'<div class="empty">No incomplete accounts in this view.</div>'}`,
    {icon:'doc',foot:`<button class="btn ghost" data-x="close">Cancel</button><button class="btn pri" id="rmGo">Queue drafts for approval</button>`});
  const b=document.getElementById('rmGo');if(b)b.onclick=()=>{V.toast('Reminder drafts queued for approval','check');V.close()}}

function invites(){V.panel('Manage invites',`<label class="x-field"><span class="micro">Email</span><input class="in" id="ivE" placeholder="new.partner@example.com"></label>
  <label class="x-field"><span class="micro">Type</span><select class="in" id="ivT">${TYPES.slice(0,4).map(t=>`<option>${t}</option>`).join('')}</select></label>
  <div class="small t2">Creates a draft invite. A teammate has to approve it before it goes out.</div>`,
  {icon:'users',foot:`<button class="btn pri" id="ivGo">Queue invite draft</button>`});
  document.getElementById('ivGo').onclick=()=>{V.toast('Invite draft queued for approval','check');V.close()}}

function sendAg(id){const p=C.portal.partner(id);if(!p)return;
  const ag=(p.agreements||[])[0];
  C.update(()=>{if(!p.agreements||!p.agreements.length)p.agreements=[{name:'Independent contractor agreement',status:'Draft',envelope:null}];else {const a=p.agreements.find(x=>x.status==='Not sent')||p.agreements[0];a.status='Draft'}});
  V.toast('Agreement draft ready — a teammate must approve before it is sent','doc');draw()}

document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,v=b.dataset.v;
  if(a==='tab'){ui.tab=v;ui.sel=null;draw()}
  else if(a==='chip'){ui[b.dataset.k]=v;draw()}
  else if(a==='qf'){ui.qf=v;ui.noOwner=v==='owner';draw()}
  else if(a==='open'){ui.sel=v;draw();const el=document.getElementById('pgfile');el&&el.scrollIntoView({block:'start'})}
  else if(a==='add')addPartner();
  else if(a==='remind')previewRemind();
  else if(a==='invites')invites();
  else if(a==='sendag')sendAg(v);
});
draw();
window.__v6partners={draw,ui,filtered,counts};
})();
