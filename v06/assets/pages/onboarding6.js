/* V06 Onboarding · one queue of partners in setup. Each row says who owes the next move; the inspector shows the five steps,
   every document with verify/reject, agreements, payout, checks, notes and history. Recruiting pipeline and partner support live alongside. */
(function(){const C=CX,P=C.portal,V2=C.v2,{H}=W6,{esc,ic,chip,btn}=H;C.init();
const A=()=>H.actor();const pname=p=>p.short||p.name;
const sla=p=>V2.slaState(p);const SLA={overdue:['Overdue','bad'],due:['Due today','warn'],ok:['On track','ok'],none:['No due date','']};
const owner=p=>p.ob&&p.ob.owner;const uname=id=>V2.userName(id);
const me=()=>{const n=H.actor();const u=(C.S.users||[]).find(x=>x.name===n);return u?u.id:'u-sasha'};
const waiting=p=>(P.nextAction(p)||['',''])[1];
const Q=()=>V2.obQueue();
const TONE={DSP:'acc',Carrier:'vio',Driver:'ok',Shipper:'warn',Warehouse:'',"Warehouse worker":'',Customer:'warn'};
const prow=p=>{const s=SLA[sla(p)];const n=P.nextAction(p)||['—',''];return{id:p.id,t:pname(p),ini:H.ini(pname(p)),tone:TONE[p.type]||'',s:`${p.type} · ${p.city||''} · ${n[0]}`,r:`${chip(s[0],s[1])}<span>${esc(owner(p)?uname(owner(p)).split(' ')[0]:'No owner')}</span>`}};
function docRows(p){return p.docs.map(d=>{const [lbl,tone,s]=H.doc(d);
 return H.it(esc(d.type),`${d.file?esc(d.file):'Not uploaded'}${d.expires?' · expires '+H.dfmt(d.expires):''}`,`${chip(lbl,tone)}${s==='pending'?` ${btn('Verify','docok',p.id+'|'+d.type,'sm okb')} ${btn('Reject','docno',p.id+'|'+d.type,'sm ghost')}`:''}${s==='missing'||s==='rejected'||s==='expired'?` ${btn('Remind','remind',p.id,'sm ghost')}`:''}`)})}
function detail(p){const ss=P.stepState(p),n=P.nextAction(p)||['—',''];const s=SLA[sla(p)];const done=P.stepsDone(p);const users=(C.S.users||[]).filter(u=>!/Viewer/.test(u.role));
 const allButReview=P.STEPS.slice(0,4).every(([k])=>ss[k]);
 const audit=(C.S.audit||[]).filter(a=>a.target===p.id).slice(0,8);
 return `<div class="w6-dh">${H.lead(H.ini(pname(p)),TONE[p.type]||'')}<div style="flex:1;min-width:0"><h2>${esc(p.name)}</h2><p>${esc(p.type)} · ${esc(p.city||'')}, ${esc(p.state||'')} · source ${esc(p.source||'—')} · sample record</p></div>${chip(p.status,p.status==='Fully approved'?'ok':p.status==='Needs team review'?'acc':'')}</div>
 ${H.steps(P.STEPS.map(([k],i)=>ss[k]?'done':i===done?'cur':''))}
 <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t3);margin-top:-12px">${P.STEPS.map(([k,l])=>`<span style="color:${ss[k]?'var(--ok)':'inherit'}">${esc(l)}</span>`).join('')}</div>
 ${H.note(`<b>Next:</b> ${esc(n[0])} · waiting on <b>${esc(n[1]||'—')}</b>`,n[1]==='ChainEx'?'acc':'')}
 <div class="w6-da">${p.status!=='Fully approved'?`<button class="btn pri" data-w="approve" data-v="${p.id}"${allButReview?'':' disabled title="Profile, documents, agreements and payout must be complete first"'}>${ic('check',15)}Approve partner</button>`:''}${btn('Send reminder','remind',p.id,'','chat')}${btn('Send agreements','agree',p.id)}${btn('Run checks','checks',p.id)}${H.link('Partner portal view',(p.type==='DSP'?'portal-dsp.html':p.type==='Carrier'?'portal-carrier.html':'portal-driver.html')+'?pid='+p.id,'ghost','ext')}</div>
 <div class="w6-form">${H.field('Owner',`<select class="in" data-wc="owner" data-pid="${p.id}"><option value="">No owner</option>${users.map(u=>`<option value="${u.id}"${owner(p)===u.id?' selected':''}>${esc(u.name)} · ${esc(u.role)}</option>`).join('')}</select>`)}${H.field('Due date · '+s[0],`<input class="in" type="date" data-wc="due" data-pid="${p.id}" value="${esc((p.ob&&p.ob.due)||'')}">`)}</div>
 ${H.sec('Documents',H.items(docRows(p)))}
 ${H.sec('Agreements',H.items(p.agreements.map(a=>H.it(esc(a.name),a.signedAt?'Signed '+H.dfmt(a.signedAt):a.envelope?'Envelope '+esc(a.envelope):'',chip(a.status,a.status==='Signed'?'ok':a.status==='Sent'?'warn':'')))))}
 ${H.sec('Payout',H.kv([['Method',esc(p.payment&&p.payment.method||'—')],['Status',esc(p.payment&&p.payment.status||'Not set')],['Account',p.payment&&p.payment.last4?'•••• '+esc(p.payment.last4):'—',1]]))}
 ${H.sec('Checks',H.items(Object.entries(p.checks||{}).map(([k,c])=>H.it(esc(k[0].toUpperCase()+k.slice(1)),esc(c.detail||''),chip(c.status,c.status==='Pass'?'ok':c.status==='Fail'?'bad':'')))))}
 ${H.sec('Contact',H.kv([['Name',esc(p.contact&&p.contact.name)],['Email',esc(p.contact&&p.contact.email)],['Phone',esc(p.contact&&p.contact.phone)],['Lines',esc((p.lines||[]).map(l=>(P.LINE_NAMES||{})[l]||l).join(', '))]]))}
 ${H.sec('Notes',`${(p.notes||[]).slice(0,4).map(n=>H.note(`${esc(n.text||n)}${n.by?` <span class="t3">· ${esc(n.by)}</span>`:''}`)).join('')}<textarea class="in" id="obNote" placeholder="Add an internal note"></textarea><div>${btn('Add note','note',p.id,'sm')}</div>`)}
 ${audit.length?H.sec('History',H.tl(audit.map(a=>[esc(a.action),`${esc(a.detail||'')} · ${esc(a.actor)} · ${esc(a.at)}`,/approv|verif|signed/i.test(a.action)]))):''}`}
const recRow=r=>({id:r.id,t:r.name,s:`${r.type} · ${(P.LINE_NAMES||{})[r.line]||r.line||''} · ${r.city||''} · ${r.source}`,r:chip(r.stage,r.stage==='Active'?'ok':r.stage==='Closed'?'':'acc'),tone:'vio'});
function recDetail(r){return `<div class="w6-dh">${H.lead(H.ini(r.name),'vio')}<div><h2>${esc(r.name)}</h2><p>${esc(r.type)} applicant · ${esc(r.city||'')} · via ${esc(r.source)}</p></div></div>
 ${H.steps(P.RSTAGES.slice(0,6).map((s,i)=>P.RSTAGES.indexOf(r.stage)>i?'done':P.RSTAGES.indexOf(r.stage)===i?'cur':''))}
 ${H.kv([['Stage',esc(r.stage)],['Owner',esc(r.owner?uname(r.owner):'Unassigned')],['Last touch',H.dfmt(r.lastTouch)],['Line',esc((P.LINE_NAMES||{})[r.line]||r.line||'—')]])}
 ${H.sec('Move to stage',`<div class="w6-da">${P.RSTAGES.filter(s=>s!==r.stage).map(s=>btn(s,'rmove',r.id+'|'+s,'sm'+(s==='Onboarding'?' pri':''))).join('')}</div>`)}
 ${H.note('Moving to <b>Onboarding</b> creates the partner record and sends the portal invite (simulated).')}`}
const sup=()=>(C.S.psupport||[]);
const supRow=t=>({id:t.id,t:(P.partner(t.pid)||{}).short||t.pid,s:t.text||t.q||t.question||'',r:chip(t.status||'Open',t.status==='Resolved'?'ok':'warn'),tone:'acc'});
function supDetail(t){const p=P.partner(t.pid)||{};return `<div class="w6-dh">${H.lead(H.ini(p.short||p.name||'?'),'acc')}<div><h2>${esc(p.short||p.name||t.pid)}</h2><p>${esc(p.type||'')} · partner support thread</p></div>${chip(t.status||'Open',t.status==='Resolved'?'ok':'warn')}</div>
 ${H.sec('Conversation',((C.S.pchat||{})[t.pid]||[{who:'Partner',text:t.text||''}]).slice(-10).map(m=>H.note(`<b>${esc(m.who||'')}</b> ${esc(m.text)}`,m.from==='staff'?'acc':m.from==='bot'?'':'')).join(''))}
 <textarea class="in" id="psText" placeholder="Reply as ChainEx support"></textarea><div class="w6-da">${btn('Send reply','psreply',t.id,'pri')}${t.status!=='Resolved'?btn('Mark resolved','psres',t.id):''}</div>`}
function automation(){const v=C.S.v2||{};const ar=v.autoRemind||{};return `<div class="w6-two"><div class="w6-cards" style="grid-template-columns:1fr">
 <div class="w6-c"><div style="display:flex;align-items:center;gap:12px"><div style="flex:1"><h3>Send agreements automatically</h3><div class="small t2">When a partner finishes their profile, ChainEx sends the right agreements for their type.</div></div>${H.toggle(v.autoAgreements,'auto','autoAgreements')}</div></div>
 <div class="w6-c"><div style="display:flex;align-items:center;gap:12px"><div style="flex:1"><h3>Remind partners about missing items</h3><div class="small t2">Every ${ar.every||2} days by ${esc(ar.channel||'Email + SMS')} until documents are in. Simulated.</div></div>${H.toggle(ar.on,'auto','autoRemind')}</div></div>
 <div class="w6-c"><h3>Remind everyone waiting now</h3><div class="small t2">${Q().filter(p=>waiting(p)==='Partner').length} partners are waiting on their own next step.</div><div>${btn('Send reminders','remindall','', 'pri')}</div></div>
 <div class="w6-c"><h3>Balance the queue</h3><div class="small t2">Give unowned applications to the onboarding team so nothing sits without a person.</div><div>${btn('Assign unowned to me','claimall','')}</div></div>
 </div><div class="w6-c"><h3>Funnel</h3>${P.metrics().funnel.map(f=>`<div style="display:flex;align-items:center;gap:10px;font-size:13px"><span style="width:120px">${esc(f.l)}</span><div style="flex:1">${H.bar(f.n/Math.max(1,...P.metrics().funnel.map(x=>x.n)))}</div><b class="num" style="width:32px;text-align:right">${f.n}</b></div>`).join('')}<div class="small t3" style="margin-top:6px">Typical time to approve: ${P.metrics().tta} days.</div></div></div>`}
const byId=id=>P.partner(id);
W6.app({key:'onboarding',app:'Onboarding',active:'onboarding.html',classic:'../onboarding.html',searchPh:'Search partners, cities, types',
 gate:()=>window.CXS&&!CXS.can('onboarding')?'Your role does not include onboarding. Switch role at the top, or sign in as Ops or Recruiting.':null,
 header:()=>{const q=Q(),od=q.filter(p=>sla(p)==='overdue').length,wc=q.filter(p=>waiting(p)==='ChainEx').length;return{eyebrow:'People · Onboarding',title:'Onboarding',sub:`<b>${wc}</b> applications are waiting on ChainEx${od?`, <b class="bad">${od} overdue</b>`:''}. Everything else is on the partner. Each one has an owner and a due date.`,actions:[btn('Remind all waiting','remindall','','','chat'),H.link('New application','../auth/apply.html?type=driver','pri','plus')]}},
 kpis:()=>{const m=P.metrics(),q=Q();return[{l:'In setup',v:q.length,d:'open applications',view:'queue'},{l:'Waiting on ChainEx',v:q.filter(p=>waiting(p)==='ChainEx').length,d:'our move',view:'ours',tone:'acc'},{l:'Overdue',v:q.filter(p=>sla(p)==='overdue').length,d:'past due date',view:'overdue',tone:q.some(p=>sla(p)==='overdue')?'bad':''},{l:'No owner',v:q.filter(p=>!owner(p)).length,d:'needs a person',view:'unowned'},{l:'Approved',v:m.active,d:`${m.tta} days typical`,view:'approved',tone:'ok'}]},
 views:[
  {id:'queue',label:'Queue',count:()=>Q().length,list:()=>Q().slice().sort((a,b)=>(sla(a)==='overdue'?0:1)-(sla(b)==='overdue'?0:1)),group:p=>waiting(p)==='ChainEx'?'Waiting on ChainEx':'Waiting on partner',row:prow,detail,find:byId},
  {id:'ours',label:'Our move',count:()=>Q().filter(p=>waiting(p)==='ChainEx').length,list:()=>Q().filter(p=>waiting(p)==='ChainEx'),group:p=>(P.nextAction(p)||[''])[0],row:prow,detail,find:byId},
  {id:'mine',label:'Mine',count:()=>Q().filter(p=>owner(p)===me()).length,list:()=>Q().filter(p=>owner(p)===me()),row:prow,detail,find:byId,empty:'Nothing assigned to you.'},
  {id:'overdue',label:'Overdue',count:()=>Q().filter(p=>sla(p)==='overdue').length,tone:()=>'bad',list:()=>Q().filter(p=>sla(p)==='overdue'),row:prow,detail,find:byId,empty:'Nothing overdue.'},
  {id:'unowned',label:'No owner',hidden:()=>!Q().some(p=>!owner(p)),count:()=>Q().filter(p=>!owner(p)).length,list:()=>Q().filter(p=>!owner(p)),row:prow,detail,find:byId},
  {id:'approved',label:'Approved',list:()=>C.S.partners.filter(p=>p.status==='Fully approved').sort((a,b)=>String(b.approvedAt).localeCompare(String(a.approvedAt))),group:p=>p.type,row:p=>Object.assign(prow(p),{r:`${chip(p.suspended?'Suspended':'Approved',p.suspended?'bad':'ok')}<span>${H.dfmt(p.approvedAt)}</span>`}),detail,find:byId},
  {id:'recruiting',label:'Recruiting',count:()=>(C.S.recruits||[]).filter(r=>!['Active','Closed'].includes(r.stage)).length,list:()=>C.S.recruits||[],group:r=>r.stage,row:recRow,detail:recDetail,find:id=>(C.S.recruits||[]).find(r=>r.id===id)},
  {id:'support',label:'Support',count:()=>sup().filter(t=>t.status!=='Resolved').length||'',list:sup,row:supRow,detail:supDetail,empty:'No partner questions right now.',find:id=>sup().find(t=>t.id===id)},
  {id:'auto',label:'Automation',render:automation}],
 acts:{
  approve:id=>{H.O.pApprove(id,A());H.toast('Approved · partner can take work')},
  remind:id=>{const n=H.O.obRemind([id],A());H.toast(n?'Reminder sent (simulated)':'Nothing missing to remind about')},
  remindall:()=>{const ids=Q().filter(p=>waiting(p)==='Partner').map(p=>p.id);const n=H.O.obRemind(ids,A());H.toast(`${n||0} reminders sent (simulated)`)},
  claimall:()=>{const ids=Q().filter(p=>!owner(p)).map(p=>p.id);H.O.obAssign(ids,me(),A());H.toast(`${ids.length} assigned to you`)},
  agree:id=>{H.O.obSendAgreements(id,A());H.toast('Agreements sent for e-signature (simulated)')},
  checks:id=>{H.O.pRunChecks(id,A());H.toast('Automatic checks run')},
  docok:v=>{const [id,ty]=v.split('|');H.O.pReviewDoc(id,ty,true,A());H.toast(ty+' verified')},
  docno:v=>{const [id,ty]=v.split('|');H.O.pReviewDoc(id,ty,false,A());H.toast(ty+' rejected · partner asked to re-upload')},
  owner:(val,el)=>{H.O.obAssign([el.dataset.pid],val,A());H.toast('Owner updated')},
  due:(val,el)=>{H.O.obDue(el.dataset.pid,val,A());H.toast('Due date set')},
  note:id=>{const t=H.val('obNote');if(!t)return H.toast('Write a note first'),false;H.O.pNote(id,t,A());H.toast('Note added')},
  rmove:v=>{const [id,s]=v.split('|');H.O.rMove(id,s,A());H.toast('Moved to '+s)},
  psreply:id=>{const t=H.val('psText');if(!t)return H.toast('Write a reply first'),false;H.O.psReply(id,t,A());H.toast('Reply sent')},
  psres:id=>{H.O.psResolve(id,A());H.toast('Resolved')},
  auto:k=>{const v=C.S.v2||{};if(k==='autoRemind')H.O.obToggleAuto('remind',!(v.autoRemind&&v.autoRemind.on),A());else H.O.obToggleAuto('agreements',!v.autoAgreements,A());H.toast('Saved')}},
 commands:api=>Q().slice(0,40).map(p=>({group:'Partners',label:pname(p),hint:p.type+' · '+(P.nextAction(p)||[''])[0],icon:'users',run:()=>api.go('queue',p.id)}))
});
})();
