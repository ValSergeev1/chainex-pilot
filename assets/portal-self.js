/* ChainEx V02 · self-service partner portals (Driver, DSP, Carrier): shared records + ops.
   The portals read and write the SAME partner records the staff Dashboard, Onboarding and Compliance
   workspaces use (S.partners), the payments ledger / pay runs / disputes (C.v2), and the dispatch eligibility gate.
   Support chat is rule-based in the pilot; in production it runs on ChainEx's own AI layer. Sample data only. */
(function(){const C=window.CX;if(!C)return;
const BOTS={Driver:'ChainEx Driver Support',DSP:'ChainEx Partner Support',Carrier:'ChainEx Carrier Compliance'};
const now=S=>(C.v2?C.v2.today():new Date().toISOString().slice(0,10))+' '+C.fmt(S.clock);
function ensure(S){S.pchat=S.pchat||{};S.psupport=S.psupport||[];S.pread=S.pread||{};S.ptrain=S.ptrain||{};S.pnotif=S.pnotif||{}}
function partner(S,id){return S.partners.find(p=>p.id===id)}
const RX=[['docs',/expir|renew|document|upload|licen[cs]e|\bcoi\b|insurance|med(ical)? card|w-?9|background|mvr|authority|usdot|\bmc\b/i],['dispute',/disput|short ?paid|missing pay|wrong amount|underpaid|not paid for/i],['pay',/\bpay\b|paid|settle|statement|deposit|payout|1099|earning|money|ach/i],['agree',/agree|sign|contract|e-?sign/i],['elig',/eligib|blocked|why.*(route|work|offer)|can'?t get (routes|work)|no routes|suspend/i],['status',/status|approved|onboard|progress|checklist|next step|how long/i],['roster',/roster|my drivers|add (a )?driver|driver list/i],['human',/human|person|agent|call me|talk to|someone|escalat/i]];
function topic(t){for(const [k,r] of RX)if(r.test(t||''))return k;return 'other'}
function answer(S,p,t){const P=C.portal;const k=topic(t);const docs=P.reqDocs(p).map(q=>({q,d:p.docs.find(x=>x.type===q.type)})).map(o=>({type:o.q.type,st:P.docState(o.d),exp:o.d&&o.d.expires}));
  const bad=docs.filter(d=>['missing','rejected','expired'].includes(d.st)),soon=docs.filter(d=>d.st==='expiring'),pend=docs.filter(d=>d.st==='pending');
  if(k==='docs'){if(!bad.length&&!soon.length&&!pend.length)return{text:`All ${docs.length} required documents are current. The next expiry is ${docs.filter(d=>d.exp).sort((a,b)=>a.exp.localeCompare(b.exp)).map(d=>d.type+' on '+P.fmtDate(d.exp))[0]||'not scheduled'}. I'll remind you 30, 15 and 7 days before anything expires.`,go:'docs'};
    return{text:[bad.length?`Needs action: ${bad.map(d=>d.type+' ('+d.st+')').join(', ')}.`:'',soon.length?`Expiring soon: ${soon.map(d=>d.type+' · '+P.fmtDate(d.exp)).join(', ')}.`:'',pend.length?`Waiting for review: ${pend.map(d=>d.type).join(', ')}.`:'','Upload a replacement in Documents. Most uploads are checked automatically within minutes.'].filter(Boolean).join(' '),go:'docs'}}
  if(k==='dispute')return{text:'You can open a pay dispute from Pay & settlements → Disputes. Pick the pay run, the amount and the reason. Finance answers within 2 business days, and the pay run is held until it is resolved.',go:'pay'};
  if(k==='pay'){const runs=S.payRuns.filter(r=>r.payee===p.id);const last=runs.find(r=>r.status==='Paid');const open=runs.find(r=>r.status!=='Paid');
    if(P.paidThroughParent(p))return{text:`You're paid through ${p.parentName||'your DSP'}. Your completed stops still show in Pay & settlements with the amount credited to your DSP's weekly pay run.`,go:'pay'};
    return{text:`${last?`Last payout: ${last.id}, week of ${P.fmtDate(last.week)}, net $${last.net.toFixed(2)} (simulated ACH).`:'No payouts yet.'} ${open?`In progress: ${open.id} · ${open.status} · $${open.net.toFixed(2)}.`:''} Payouts go out weekly after ops review and finance approval.`,go:'pay'}}
  if(k==='agree'){const un=P.reqAgreements(p).filter(n=>((p.agreements||[]).find(a=>a.name===n)||{}).status!=='Signed');return{text:un.length?`Waiting for your signature: ${un.join(', ')}. Open Agreements to read and e-sign.`:'All agreements are signed. You can download copies from Agreements.',go:'agr'}}
  if(k==='elig'){const r=blocks(S,p);return{text:r.r.length?`You can't receive work right now: ${r.r.join('; ')}. Fix these and dispatch picks it up immediately.`:`You're eligible for work${r.w.length?` (heads-up: ${r.w.join('; ')})`:''}.`,go:'compliance'}}
  if(k==='status'){const st=P.stepState(p);const n=Object.values(st).filter(Boolean).length;const na=P.nextAction(p);return{text:`Setup is ${n} of 5 steps done · status: ${p.status}.`+(na[0]&&na[0]!=='None'?` Next: ${na[0]} (waiting on ${na[1]==='Partner'?'you':na[1]}).`:' Nothing else to do.'),go:'onboarding'}}
  if(k==='roster'&&p.type==='DSP')return{text:'Your driver roster is under Drivers. Each driver shows license, background and MVR status and whether dispatch can assign them. Use "Add driver" to invite a new driver; they appear in ChainEx onboarding right away.',go:'roster'};
  return null}
function blocks(S,p){const P=C.portal,r=[],w=[];if(p.status!=='Fully approved')r.push('Setup status: '+p.status);if(p.suspended)r.push('Account suspended');
  P.reqDocs(p).forEach(q=>{const d=p.docs.find(x=>x.type===q.type);const s=P.docState(d);const n=q.type.replace(/ \(.*\)/,'');if(s==='expired')r.push(n+' expired');else if(s==='missing'||s==='rejected')r.push(n+' '+s);else if(s==='expiring')w.push(`${n} expires ${P.fmtDate(d.expires)}`)});
  P.reqAgreements(p).forEach(n=>{const a=(p.agreements||[]).find(x=>x.name===n);if(!a||a.status!=='Signed')r.push('Agreement not signed: '+n)});return{r,w}}
C.registerModule({id:'pself',seed(S){ensure(S)},ops(api){return{
  psAsk(pid,text,who){const S=api.S;ensure(S);const p=partner(S,pid);if(!p||!String(text||'').trim())return null;const L=S.pchat[pid]=S.pchat[pid]||[];const bot=BOTS[p.type]||'ChainEx Support';
    L.push({from:'me',who:who||p.contact.name,text:String(text).trim(),at:now(S)});const a=answer(S,p,text);
    if(a&&topic(text)!=='human'){L.push({from:'bot',who:bot,text:a.text,go:a.go,at:now(S)});return{bot:true,go:a.go}}
    const t={id:'PS-'+(2001+S.psupport.length),pid,pname:p.short||p.name,ptype:p.type,text:String(text).trim(),status:'Open',opened:now(S),by:who||p.contact.name,reply:null};S.psupport.unshift(t);
    L.push({from:'bot',who:bot,text:`I've sent this to the ChainEx ${p.type==='Carrier'?'compliance':'onboarding'} team as ticket ${t.id}. You'll get the answer here and in Notifications, usually within 1 business day.`,ticket:t.id,at:now(S)});
    S.audit.unshift({at:now(S),actor:who||p.name,action:'Partner support ticket opened',target:t.id,detail:p.name+' · '+t.text.slice(0,80),area:'portal'});return{ticket:t.id}},
  psReply(id,text,actor){const S=api.S;ensure(S);const t=S.psupport.find(x=>x.id===id);if(!t||!String(text||'').trim())return false;t.reply=String(text).trim();t.status='Answered';t.repliedBy=actor;t.repliedAt=now(S);
    (S.pchat[t.pid]=S.pchat[t.pid]||[]).push({from:'staff',who:actor+' · ChainEx',text:t.reply,ticket:id,at:now(S)});S.audit.unshift({at:now(S),actor,action:'Partner support answered',target:id,detail:t.reply.slice(0,80),area:'portal'});return true},
  psResolve(id,actor){const S=api.S;ensure(S);const t=S.psupport.find(x=>x.id===id);if(!t)return false;t.status='Resolved';t.resolvedBy=actor;return true},
  pNotifRead(pid,keys){const S=api.S;ensure(S);const r=new Set(S.pread[pid]||[]);keys.forEach(k=>r.add(k));S.pread[pid]=[...r].slice(-400)},
  pTrain(pid,line){const S=api.S;ensure(S);(S.ptrain[pid]=S.ptrain[pid]||{})[line]=C.v2?C.v2.today():'done';S.audit.unshift({at:now(S),actor:(partner(S,pid)||{}).name,action:'Line training completed',target:pid,detail:line,area:'portal'})},
  pProfile(pid,f,actor){const S=api.S;const p=partner(S,pid);if(!p)return;['legal','usdot','mc','ein','fleetSize','phoneAlt'].forEach(k=>{if(f[k]!=null)p[k]=f[k]});if(f.fleetAdd){p.fleet=p.fleet||[];p.fleet.push(f.fleetAdd)}if(f.fleetDel!=null&&p.fleet)p.fleet.splice(+f.fleetDel,1);
    api.ops&&0;S.audit.unshift({at:now(S),actor:actor||p.name,action:'Profile updated in partner portal',target:pid,detail:Object.keys(f).join(', '),area:'portal'})},
  pRosterAdd(dspId,f,actor){const S=api.S;const d=partner(S,dspId);if(!d||!f.name)return null;const n0=S.partners.length;C.ops.pApply('Driver',{name:f.name,contact:f.name,email:f.email||'',phone:f.phone||'',parent:dspId,lines:f.lines||d.lines.slice(0,1),vehicleTypes:d.vehicleTypes.slice(0,1),city:d.city,source:'DSP roster invite'});
    const p=S.partners.slice(n0).find(x=>x.name===f.name)||S.partners.find(x=>x.name===f.name&&x.parent===dspId);if(p){S.audit.unshift({at:now(S),actor:actor||d.name,action:'DSP added roster driver',target:p.id,detail:d.short+' → '+f.name,area:'portal'})}return p&&p.id},
  pRemindDriver(pid,actor){const S=api.S;ensure(S);const p=partner(S,pid);if(!p)return;(S.pnotif[pid]=S.pnotif[pid]||[]).unshift({k:'rem-'+Date.now(),t:`${actor||'Your DSP'} asked you to update your documents`,at:now(S),go:'docs'})}
}}});
C.pself={BOTS,topic,blocks:p=>blocks(C.S,p),answer:(p,t)=>answer(C.S,p,t),ensure:()=>ensure(C.S)};
})();
