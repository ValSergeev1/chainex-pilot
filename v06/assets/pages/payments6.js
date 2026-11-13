/* V06 Payments · money in and money out on one page. Pay runs move through ops review → finance → payout; invoices go draft → sent → paid.
   Disputes block their pay run until resolved. Every number is built from the shared ledger the driver app writes on each completed stop. */
(function(){const C=CX,V2=C.v2,{H}=W6,{esc,ic,chip,btn,money}=H;C.init();const A=()=>H.actor(),O=H.O,S=()=>C.S;
const pn=id=>V2.pname(id);const m2=n=>money(n,2);
const RT={'Ops review':'warn','Finance approval':'acc','Approved':'acc','In payout batch':'vio','Paid':'ok'};
const IT={Draft:'',Sent:'warn',Paid:'ok',Overdue:'bad'};
const runs=()=>S().payRuns.slice().sort((a,b)=>b.week.localeCompare(a.week));
const openD=()=>S().disputes.filter(d=>d.status==='Open');
const invState=i=>i.status==='Sent'&&i.due&&V2.daysBetween(V2.today(),i.due)<0?'Overdue':i.status;
function runDetail(r){const flow=V2.RUN_FLOW;const i=flow.indexOf(r.status);const ds=S().disputes.filter(d=>d.run===r.id);const next={'Ops review':'Approve ops review','Finance approval':'Finance approve','Approved':'Add to payout batch'}[r.status];
 return `<div class="w6-dh">${H.lead(H.ini(pn(r.payee)),'acc')}<div style="flex:1;min-width:0"><h2>${esc(pn(r.payee))}</h2><p>${esc(r.id)} · week of ${H.dfmt(r.week)} · ${r.lines} lines</p></div>${chip(r.status,RT[r.status])}</div>
 ${H.steps(flow.map((f,k)=>k<i||r.status==='Paid'?'done':k===i?'cur':''))}<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--t3);margin-top:-12px">${flow.map(f=>`<span>${esc(f)}</span>`).join('')}</div>
 <div class="w6-big">${m2(r.net)}</div>
 ${ds.some(d=>d.status==='Open')?H.note('<b>Open dispute.</b> Resolve it before this run can move.','bad'):''}
 <div class="w6-da">${next?btn(next,'adv',r.id,'pri','check'):''}${r.status!=='Paid'&&r.status!=='In payout batch'?btn('Add adjustment','adjopen',r.id):''}</div>
 <div id="adjf" hidden class="w6-c">${H.field('Type',`<select class="in" id="ak">${['Chargeback · damage claim','Fuel card advance','Vehicle rental','Occupational accident insurance','Bonus · peak','Correction'].map(x=>`<option>${x}</option>`).join('')}</select>`)}${H.field('Amount (negative = deduction)','<input class="in" id="aa" type="number" value="-25">')}${H.field('Note','<input class="in" id="an">')}<div>${btn('Add adjustment','adj',r.id,'pri sm')}</div></div>
 ${H.kv([['Gross',m2(r.gross),1],['Adjustments',m2(r.deductions.reduce((a,d)=>a+d.amount,0)),1],['Net',m2(r.net),1],['Batch',esc(r.batch||'—')]])}
 ${r.deductions.length?H.sec('Adjustments',H.items(r.deductions.map(d=>H.it(esc(d.kind),esc(d.note||''),`<b class="num ${d.amount<0?'bad':'ok'}">${m2(d.amount)}</b>`)))):''}
 ${ds.length?H.sec('Disputes',H.items(ds.map(d=>H.it(esc(d.text),`${esc(d.status)} · ${m2(d.amount||0)}`,d.status==='Open'?btn('Accept','dres',d.id+'|1','sm okb')+' '+btn('Deny','dres',d.id+'|0','sm ghost'):chip(d.status,d.status==='Accepted'?'ok':''))))):''}
 ${H.sec('History',H.tl(r.history.map(([t,by])=>[esc(t),esc(by),/Paid|approved/i.test(t)])))}`}
function invDetail(i){const st=invState(i);return `<div class="w6-dh">${H.lead(H.ini(pn(i.customer)),'warn')}<div style="flex:1;min-width:0"><h2>${esc(pn(i.customer))}</h2><p>${esc(i.id)} · week of ${H.dfmt(i.week)} · ${i.lines} lines · ${esc(i.terms)}</p></div>${chip(st,IT[st])}</div>
 <div class="w6-big">${m2(i.amount)}</div>
 <div class="w6-da">${i.status==='Draft'?btn('Send invoice','send',i.id,'pri','chat'):''}${i.status==='Sent'?btn('Record payment','paid',i.id,'pri','check'):''}</div>
 ${H.kv([['Issued',H.dfmt(i.issued)],['Due',`${H.dfmt(i.due)} ${i.status==='Sent'?'· '+H.rel(i.due):''}`],['Paid on',H.dfmt(i.paidOn)],['Source',esc(i.source||'Ledger')]])}
 ${H.note('Sending is simulated. In production the invoice is emailed from ChainEx billing and payment posts from the bank feed.')}`}
function aging(){const a=V2.arAging();const tot=a.rows.reduce((s,r)=>s+r.total,0);const bt=a.buckets.map(b=>a.rows.reduce((s,r)=>s+(r[b]||0),0));const col=['var(--ok)','var(--acc)','var(--warn)','var(--bad)','var(--bad)'];
 return `<div class="w6-c"><div style="display:flex;align-items:baseline;gap:12px"><h3 style="flex:1">Accounts receivable</h3><span class="w6-big">${money(tot)}</span></div>
 <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px">${bt.map((v,i)=>v?`<i style="flex:${v};background:${col[i]}" title="${esc(a.buckets[i])}"></i>`:'').join('')}</div>
 <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px">${a.buckets.map((b,i)=>`<span><span class="dot" style="color:${col[i]}"></span> ${esc(b)} <b class="num">${money(bt[i])}</b></span>`).join('')}</div></div>
 ${H.table(['Customer',...a.buckets,'Total'],a.rows.map(r=>`<tr><td>${esc(pn(r.customer))}</td>${a.buckets.map(b=>`<td class="num ${r[b]&&b!=='Current'?'warn':''}">${r[b]?money(r[b]):'—'}</td>`).join('')}<td class="num"><b>${money(r.total)}</b></td></tr>`))}`}
function ledger(){const L=S().ledger.slice(0,120);return H.table(['Day','Kind','Description','Party','Amount'],L.map(l=>`<tr><td class="mono">${esc(l.day)}</td><td>${chip(l.kind,l.kind==='pay'?'vio':'acc')}</td><td>${esc(l.desc)}</td><td>${esc(l.party?pn(l.party):l.driver||'—')}</td><td class="num">${m2(l.kind==='pay'?-l.amount:l.amount)}</td></tr>`))}
function recon(){const r=V2.recon();return `<div class="w6-cards">${[['Completed stops',r.completed],['Charged',r.charged],['Paid out',r.paid],['Revenue',money(r.rev)],['Cost',money(r.cost)],['Margin',money(r.margin)]].map(([l,v])=>`<div class="w6-c"><span class="small t3">${l}</span><span class="w6-big">${v}</span></div>`).join('')}</div>${H.note(r.missingCharge.length||r.missingPay.length?`<b>${r.missingCharge.length}</b> completed stops have no charge and <b>${r.missingPay.length}</b> have no pay line.`:'Every completed stop has exactly one charge and one pay line. Books reconcile.',r.missingCharge.length||r.missingPay.length?'warn':'ok')}`}
function rateDetail(rc){const F=[['stop','Per stop $'],['unit','Per unit $'],['trip','Per trip $'],['install','Install $'],['haul','Haul-away $'],['fuelPct','Fuel %']];
 return `<div class="w6-dh">${H.lead(esc((C.lines[rc.line]||{}).name||rc.line).slice(0,2),'acc')}<div style="flex:1;min-width:0"><h2>${esc(rc.name)}</h2><p>${esc(pn(rc.customer))} · ${esc(rc.contract)} · effective ${H.dfmt(rc.effective)}</p></div>${chip(rc.status,'ok')}</div>
 <div class="w6-form">${F.map(([k,l])=>H.field(l,`<input class="in num" type="number" step="0.01" id="rc_${k}" value="${rc[k]}">`)).join('')}${H.field('Terms',`<input class="in" id="rc_terms" value="${esc(rc.terms)}">`)}</div><div>${btn('Save rate card','rateSave',rc.id,'pri')}</div>
 ${H.note('Changes apply to new completed stops. Past ledger lines keep the rate they were billed at.')}`}
W6.app({key:'payments',app:'Payments',active:'payments.html',classic:'../payments.html',searchPh:'Search payees, customers, IDs',
 gate:()=>window.CXS&&!CXS.can('payments.view')?'Your role does not include payments.':null,
 header:()=>{const r=V2.recon(),w=runs().filter(x=>x.status!=='Paid');return{eyebrow:'Money · Payments',title:'Payments',sub:`This week: <b>${money(r.rev)}</b> billed, <b>${money(r.cost)}</b> owed to partners, <b>${money(r.margin)}</b> margin. ${w.length?`<b>${w.length}</b> pay runs in progress.`:'No pay runs waiting.'}${openD().length?` <b class="bad">${openD().length} disputes open.</b>`:''}`,actions:[btn('Build invoices','buildInv','','','doc'),btn('Build pay runs','buildRuns','','','money'),btn('Create payout batch','batch','','pri','bolt')]}},
 kpis:()=>{const a=V2.arAging();const past=a.rows.reduce((s,r)=>s+r.total-(r.Current||0),0);return[{l:'Pay runs in progress',v:runs().filter(r=>r.status!=='Paid').length,d:'ops → finance → payout',view:'runs'},{l:'Invoices out',v:S().invoices.filter(i=>i.status==='Sent').length,d:money(S().invoices.filter(i=>i.status==='Sent').reduce((s,i)=>s+i.amount,0)),view:'invoices',tone:'acc'},{l:'Past due AR',v:money(past),d:'over terms',view:'aging',tone:past?'warn':'ok'},{l:'Open disputes',v:openD().length,d:'block their run',view:'disputes',tone:openD().length?'bad':'ok'},{l:'Margin',v:money(V2.recon().margin),d:'this week',view:'recon',tone:'ok'}]},
 views:[
  {id:'runs',label:'Pay runs',count:()=>runs().filter(r=>r.status!=='Paid').length||'',list:runs,group:r=>r.status==='Paid'?'Paid · week of '+H.dfmt(r.week):r.status,row:r=>({id:r.id,t:pn(r.payee),s:`${r.id} · week of ${H.dfmt(r.week)}`,tone:RT[r.status],r:`<b class="num" style="color:var(--t1)">${m2(r.net)}</b>${chip(r.status,RT[r.status])}`}),detail:runDetail,find:id=>S().payRuns.find(r=>r.id===id)},
  {id:'invoices',label:'Invoices',count:()=>S().invoices.filter(i=>i.status!=='Paid').length||'',list:()=>S().invoices.slice().sort((a,b)=>String(b.week).localeCompare(a.week)),group:i=>invState(i),row:i=>({id:i.id,t:pn(i.customer),s:`${i.id} · due ${H.dfmt(i.due)}`,tone:IT[invState(i)],r:`<b class="num" style="color:var(--t1)">${m2(i.amount)}</b>${chip(invState(i),IT[invState(i)])}`}),detail:invDetail,find:id=>S().invoices.find(i=>i.id===id)},
  {id:'aging',label:'AR aging',render:aging},
  {id:'disputes',label:'Disputes',count:()=>openD().length||'',tone:()=>'bad',list:()=>S().disputes,group:d=>d.status,row:d=>({id:d.id,t:pn(d.payee),s:d.text,tone:d.status==='Open'?'bad':'',r:`<b class="num">${m2(d.amount||0)}</b>`}),detail:d=>`<div class="w6-dh">${H.lead('!','bad')}<div><h2>${esc(pn(d.payee))}</h2><p>${esc(d.id)} · pay run ${esc(d.run)}</p></div>${chip(d.status,d.status==='Open'?'bad':'ok')}</div>${H.note(esc(d.text))}<div class="w6-da">${d.status==='Open'?btn('Accept · credit the run','dres',d.id+'|1','okb')+btn('Deny','dres',d.id+'|0'):''}</div>`,empty:'No disputes. Partners open them from their portal pay statements.',find:id=>S().disputes.find(d=>d.id===id)},
  {id:'rates',label:'Rate cards',list:()=>S().rateCards,group:r=>(C.lines[r.line]||{}).name||r.line,row:r=>({id:r.id,t:r.name,s:`${pn(r.customer)} · ${r.terms}`,tone:'acc',r:`<span class="num">$${r.stop||r.trip||r.unit}</span>`}),detail:rateDetail,find:id=>S().rateCards.find(r=>r.id===id)},
  {id:'batches',label:'Payout batches',list:()=>S().batches,row:b=>({id:b.id,t:b.id,s:`${(b.runs||[]).length} runs · ${esc(b.status||'')}`,tone:'vio',r:`<b class="num">${m2(b.total||0)}</b>`}),detail:b=>`<div class="w6-dh">${H.lead('$','vio')}<div><h2>${esc(b.id)}</h2><p>${esc(b.status||'')} · simulated ACH</p></div></div>${H.kv([['Runs',(b.runs||[]).length],['Total',m2(b.total||0),1]])}`,empty:'No payout batches yet. Approved runs are batched with “Create payout batch”.'},
  {id:'recon',label:'Reconciliation',render:recon},
  {id:'ledger',label:'Ledger',render:ledger}],
 acts:{
  adv:id=>{const r=C.update(()=>C.ops.advanceRun(id,A()));if(r&&r.ok===false)H.toast(r.why);else H.toast('Moved to next step')},
  adjopen:()=>{const f=document.getElementById('adjf');if(f)f.hidden=!f.hidden;return false},
  adj:id=>{const amt=+H.val('aa');if(!amt)return H.toast('Enter an amount'),false;O.adjustRun(id,H.val('ak'),amt,H.val('an'),A());H.toast('Adjustment added')},
  dres:v=>{const [id,ok]=v.split('|');O.resolveDispute(id,ok==='1',A());H.toast('Dispute '+(ok==='1'?'accepted':'denied'))},
  send:id=>{O.sendInvoice(id,A());H.toast('Invoice sent (simulated email)')},
  paid:id=>{O.payInvoice(id,A());H.toast('Payment recorded')},
  buildInv:()=>{const n=C.update(()=>C.ops.buildInvoices(A()));H.toast(`${n||0} draft invoices built`)},
  buildRuns:()=>{const n=C.update(()=>C.ops.buildPayRuns(A()));H.toast(`${n||0} pay runs built`)},
  batch:()=>{const r=C.update(()=>C.ops.payoutBatch(A()));H.toast(r&&r.id?`Batch ${r.id} created`:(r&&r.why)||'No approved runs to batch')},
  rateSave:id=>{const f={};['stop','unit','trip','install','haul','fuelPct'].forEach(k=>f[k]=+H.val('rc_'+k)||0);f.terms=H.val('rc_terms');O.rateSet(id,f,A());H.toast('Rate card saved')}},
 commands:api=>runs().slice(0,20).map(r=>({group:'Pay runs',label:pn(r.payee)+' · '+r.id,hint:r.status,icon:'money',run:()=>api.go('runs',r.id)}))
});})();
