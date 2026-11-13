/* ChainEx Pilot V02 · operating layer: onboarding owners/SLA, security, backups + full audit, compliance center,
   stop-to-ledger (charge + pay line + scorecard), scorecards, connected payments (rate cards, invoices, settlements,
   disputes, approvals, payout batches, AR aging, reconciliation), dispatch teams, re-optimize routes.
   SAMPLE DATA ONLY. Money is simulated; no real bank, ACH or card activity. */
(function(){
const C=CX;const DAY=864e5,DAY0=Date.UTC(2026,10,12);
const iso=ms=>new Date(ms).toISOString().slice(0,10);
const today=S=>iso(DAY0+(S.dayOffset||0)*DAY);
const addD=(d,n)=>iso(Date.parse(d+'T00:00:00Z')+n*DAY);
const weekOf=d=>{const x=new Date(d+'T00:00:00Z');const dw=(x.getUTCDay()+6)%7;return iso(x.getTime()-dw*DAY)};
const daysBetween=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/DAY);
const r2=n=>Math.round(n*100)/100;
const LN={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};
const P=()=>C.portal;
const can=perm=>{if(typeof window==='undefined'||!window.CXS)return true;return window.CXS.can(perm)};
const who=()=>{if(typeof window!=='undefined'&&window.CXS){const s=window.CXS.staff();if(s)return s.name+' ('+s.role+')'}return 'Staff'};
function aud(S,actor,action,target,detail,area){S.audit.unshift({at:`${today(S)} ${C.fmt(S.clock)}`,h:(S.dayOffset||0)*24+S.clock/60,actor:actor||'System',action,target:target||'',detail:detail||'',area:area||'admin'});if(S.audit.length>20000)S.audit.length=20000}
/* ---------- rate cards (what ChainEx charges shippers; sample) ---------- */
const BASE_CHARGE={pd:{stop:3.40,unit:0.55},bulky:{stop:45,unit:10},wg:{stop:145,install:60,haul:35},ltl:{stop:95,unit:14},shuttle:{trip:210}};
function rateFor(S,t){const c=S.contracts[t.contract]||{};return (S.rateCards||[]).find(r=>r.contract===t.contract)||{line:t.line,stop:(BASE_CHARGE[t.line]||{}).stop||0,unit:(BASE_CHARGE[t.line]||{}).unit||0,trip:(BASE_CHARGE[t.line]||{}).trip||0,install:60,haul:35,fuelPct:6,customer:c.shipper}}
function chargeOf(S,t){const r=rateFor(S,t);let a;if(t.line==='shuttle')a=r.trip||210;else{a=(r.stop||0)+(r.unit||0)*t.items.length;if(t.line==='wg'){if(t.stepData&&t.stepData.install)a+=r.install||0;if(t.stepData&&t.stepData.haul)a+=r.haul||0}}return r2(a*(1+(r.fuelPct||0)/100))}
function payeeOf(S,t){const d=C.driver(t.workerId);if(!d||!d.partnerId)return null;const p=P().partner(d.partnerId);if(!p)return null;return p.parent&&!d.dspSlot?p.parent:p.id}
const pname=(id)=>{const p=P().partner(id);return p?(p.short||p.name):'—'};
let lgn=0;const lid=S=>'LG-'+String(100000+(S.ledger||[]).length+(++lgn)).slice(-6);
function writeLedger(S,t,actor){S.ledger=S.ledger||[];S.scores=S.scores||[];if(t.x&&t.x.ledger)return null;t.x=t.x||{};const day=today(S),wk=weekOf(day);
  const c=S.contracts[t.contract]||{};const cp=c.shipper&&P().partner(c.shipper);const cust=cp&&cp.type!=='Warehouse'?c.shipper:null;const charge=chargeOf(S,t);const pay=P().earn(t)||0;const payee=payeeOf(S,t);const d=C.driver(t.workerId);
  const out=[];
  out.push({id:lid(S),kind:'charge',day,week:wk,taskId:t.id,line:t.line,party:cust,amount:charge,desc:`${LN[t.line]} · ${t.name}`,invoice:null,at:S.clock});
  out.push({id:lid(S),kind:'pay',day,week:wk,taskId:t.id,line:t.line,party:payee,driver:d?d.name:'',amount:pay,desc:`${LN[t.line]} · ${t.id}`,payRun:null,at:S.clock});
  out.forEach(e=>S.ledger.unshift(e));
  const onTime=(t.completedAt||S.clock)<=((t.window||[0,1e9])[1]);const first=(t.attempts||0)===0&&!(t.tags||[]).includes('REATTEMPT');
  S.scores.unshift({taskId:t.id,line:t.line,day,week:wk,onTime,first,exc:false,cost:pay,rev:charge,driver:d?d.name:''});
  t.x.ledger=out.map(e=>e.id);if(actor!=='Seed')aud(S,actor||'System','Stop completed → ledger',t.id,`Charge $${charge.toFixed(2)} to ${pname(cust)} · pay $${pay.toFixed(2)} to ${pname(payee)} · scorecard ${onTime?'on time':'late'}${first?' · first attempt':''}`,'ledger');return out}
function writeException(S,t){S.scores=S.scores||[];if(t.x&&t.x.scoredExc)return;t.x=t.x||{};t.x.scoredExc=true;const day=today(S);S.scores.unshift({taskId:t.id,line:t.line,day,week:weekOf(day),onTime:false,first:false,exc:true,cost:0,rev:0,reason:t.failReason||''})}
/* ---------- deterministic sample generators ---------- */
const FIRST=['Alex','Jordan','Taylor','Morgan','Casey','Riley','Jamie','Quinn','Avery','Reese','Drew','Skyler','Rowan','Emerson','Hayden','Parker','Sage','Kendall','Logan','Blake','Cameron','Dakota','Elliot','Finley'];
const LAST=['Nguyen','Garcia','Smith','Okafor','Silva','Petrov','Tanaka','Haddad','Ramos','Kowalski','Ibrahim','Larsen','Mehta','Castillo','Ward','Fischer','Moreno','Chen','Bennett','Adeyemi','Novak','Duarte','Sato','Brennan'];
const CO1=['Summit','Harbor','Evergreen','Cedar','Lakeside','Olympic','Ridge','Pioneer','Northgate','Cascade Peak','Salish','Tahoma','Sound','Juniper','Bluewater','Ironwood','Timberline','Westlake'];
const CO2=['Delivery','Logistics','Route Co','Transport','Courier','Final Mile','Freight','Express'];
const CITIES=['Seattle','Bellevue','Kent','Tacoma','Renton','Everett','Federal Way','Auburn','Lynnwood','Redmond','Portland','Spokane'];
function fillPartners(S){const R=CXGeo.rng(4242);const pick=a=>a[Math.floor(R()*a.length)];const n=101-S.partners.length;if(n<=0)return;
  const mix=[];for(let i=0;i<n;i++){const x=R();mix.push(x<.55?'DSP':x<.86?'Driver':x<.93?'Carrier':'Warehouse worker')}
  const hex=()=>Array.from({length:8},()=>'0123456789ABCDEF'[Math.floor(R()*16)]).join('');
  mix.forEach((type,i)=>{const nm=type==='Driver'||type==='Warehouse worker'?`${pick(FIRST)} ${pick(LAST)}`:`${pick(CO1)} ${pick(CO2)} ${R()<.6?'LLC':'Inc'}`;const age=2+Math.floor(R()*60);
    const p={id:'P-'+hex(),type,name:nm,short:nm.replace(/ (LLC|Inc)$/,''),legal:nm,contact:{name:type==='Driver'?nm:`${pick(FIRST)} ${pick(LAST)}`,email:nm.toLowerCase().replace(/[^a-z]+/g,'.').replace(/^\.|\.$/g,'')+'@sample.example',phone:''},city:pick(CITIES),state:'WA',status:R()<.08?'Needs team review':'Completing setup',suspended:false,createdAt:addD(today(S),-age),approvedAt:null,owner:null,profile:R()<.85,docs:[],agreements:[],payment:{method:null,status:'Missing'},lines:[pick(['pd','pd','bulky','wg','ltl','shuttle'])],vehicleTypes:[pick(['Cargo van','Sprinter','Box truck',"26' box truck"])],parent:null,driverId:null,stations:[],facilities:[],contracts:[],fleet:[],notes:[],checks:{},sim:{},source:pick(['Website application','Portal invite','Referral','Job board']),wtdPrior:0,sample:true};
    p.docs=P().reqDocs(p).map(q=>{const up=R()<.35;return{type:q.type,status:up?(R()<.5?'Pending review':'Verified'):'Missing',expires:q.exp&&up?addD(today(S),90+Math.floor(R()*300)):null,file:up?'uploaded.pdf':''}});
    p.agreements=P().reqAgreements(p).map(a=>({name:a,status:R()<.25?'Signed':R()<.5?'Sent':'Not sent',signedAt:null,envelope:null}));
    S.partners.push(p)})}
const OWNERS=['u-hannah','u-sasha','u-miguel','u-hannah','u-owen'];
function obRoute(S,p){const k=P().nextAction(p)||['',''];const kind=k[0]||'';if(/payment|payout|billing/i.test(kind))return 'u-owen';if(/insurance|expire|renew/i.test(kind))return 'u-sasha';if(p.type==='Carrier'||p.type==='Warehouse')return 'u-miguel';return 'u-hannah'}
function obEnsure(S,p,actor){if(p.status==='Fully approved'||p.status==='Closed'||(p.type!=='Driver'&&p.type!=='DSP'&&p.type!=='Carrier'&&p.type!=='Warehouse worker'&&p.type!=='Warehouse'))return;
  p.ob=p.ob||{};if(!p.ob.owner){p.ob.owner=obRoute(S,p);p.ob.assignedBy=actor||'Auto-routing'}if(!p.ob.due){const fresh=Date.parse(p.createdAt)>Date.parse(addD(today(S),-2));const h=p.id.charCodeAt(3)+p.id.charCodeAt(5);p.ob.due=fresh||actor!=='Auto-routing'?addD(fresh?p.createdAt:today(S),p.status==='Needs team review'?1:3):addD(today(S),(h%6)-2)}p.ob.reminders=p.ob.reminders||[];
  p.agreements.forEach(a=>{if(a.status==='Not sent'&&S.v2.autoAgreements){a.status='Sent';a.envelope='ENV-'+p.id.slice(2,8)+'-'+a.name.length;aud(S,'Auto-send','Agreement sent automatically',p.id,a.name,'onboarding')}})}
/* ---------- seed ---------- */
function seed(S){S.v2={version:1,autoAgreements:true,autoRemind:{on:true,every:2,channel:'Email + SMS'}};
  fillPartners(S);
  S.partners.forEach(p=>obEnsure(S,p,'Auto-routing'));
  S.salesCounts={accounts:1339,active:212,prospects:874,dormant:253,note:'Counts mirror the size of the live Sales workspace; account names are not published.'};
  S.dispatchTeams=[{id:'team-pd',name:'P&D team',lines:['pd'],lead:'Miguel Torres'},{id:'team-bulky',name:'Bulky team',lines:['bulky'],lead:'Dana Ruiz'},{id:'team-wg',name:'White glove team',lines:['wg'],lead:'Leo Grant'},{id:'team-ltl',name:'LTL team',lines:['ltl'],lead:'Kim Osei'},{id:'team-shuttle',name:'Shuttle team',lines:['shuttle'],lead:'Ray Novak'},{id:'team-ops',name:'Ops manager / Admin',lines:['pd','bulky','wg','ltl','shuttle'],lead:'Sasha Patel'}];
  S.sec={mfaRequired:true,mfaMethods:['Authenticator app','Security key'],sessionHours:12,ownerReview:{status:'Open',accounts:[{id:'own-1',label:'Owner · company email (sample)',email:'owner@chainex.example',mfa:true,domain:'company'},{id:'own-2',label:'Owner · personal webmail (sample)',email:'owner.personal@webmail.example',mfa:false,domain:'personal'}]},
    staffMfa:{'admin@chainex.example':true,'ops.manager@chainex.example':true,'pd.dispatch@chainex.example':true,'bulky.dispatch@chainex.example':true,'wg.dispatch@chainex.example':false,'ltl.dispatch@chainex.example':true,'shuttle.dispatch@chainex.example':false,'onboarding@chainex.example':true,'finance@chainex.example':true,'sales@chainex.example':false,'viewer@chainex.example':false},
    sessions:[{id:'SES-1',user:'admin@chainex.example',device:'Chrome · macOS',ip:'10.0.x.x (sample)',started:'Nov 12 · 7:02 AM',mfa:true},{id:'SES-2',user:'ops.manager@chainex.example',device:'Edge · Windows',ip:'10.0.x.x (sample)',started:'Nov 12 · 6:45 AM',mfa:true},{id:'SES-3',user:'pd.dispatch@chainex.example',device:'Chrome · Windows',ip:'10.0.x.x (sample)',started:'Nov 12 · 5:30 AM',mfa:true},{id:'SES-4',user:'owner.personal@webmail.example',device:'Safari · iPhone',ip:'unknown (sample)',started:'Nov 9 · 9:14 PM',mfa:false}]};
  S.backups={schedule:'daily',time:'02:00',retention:30,offsite:true,encrypted:true,malwareScan:true,list:[]};
  for(let i=1;i<=7;i++)S.backups.list.push({id:'BK-'+addD(today(S),-i).replace(/-/g,''),at:addD(today(S),-i)+' 2:00 AM',kind:'Scheduled',size:(2.1+i*.03).toFixed(2)+' MB',status:'Completed',where:'Off-site (simulated)',restorable:false});
  S.company={legal:'Chain Express Global Logistics, LLC',dba:'ChainEx',address:'Company address · one record (sample: 1200 Sample Way, Kent, WA 98032)',phone:'(206) 539-9549',email:'support@chainexglobal.com',usdot:'3797262',mc:'MC-number on file (sample)',
    biennial:{lastFiled:null,month:'February',cycle:'even years',status:'Confirm filing',steps:[['Confirm the USDOT number and legal name match every system','done'],['Confirm the company address matches the one record above','open'],['Update fleet size (power units) and driver counts','open'],['Update operation classification and cargo types','open'],['File the biennial update (MCS-150) and save the confirmation','open'],['Upload the confirmation to Compliance → Company records','open']]},
    addrAudit:[['Website footer','none listed'],['Portal company profile','sample address A'],['Insurance certificates','sample address B'],['Carrier registration','sample address A']]};
  // rate cards per contract/customer
  S.rateCards=Object.values(S.contracts).map((c,i)=>{const b=BASE_CHARGE[c.line]||{};const f=1+((i*7)%9-4)/100;return{id:'RC-'+c.id,contract:c.id,customer:c.shipper,line:c.line,name:c.name,stop:r2((b.stop||0)*f),unit:r2((b.unit||0)*f),trip:r2((b.trip||0)*f),install:b.install||0,haul:b.haul||0,fuelPct:c.line==='shuttle'||c.line==='ltl'?12:6,terms:c.line==='ltl'?'Net 30':'Net 15',effective:'2026-01-01',status:'Active'}});
  S.ledger=[];S.scores=[];S.invoices=[];S.payRuns=[];S.disputes=[];S.adjustments=[];S.batches=[];S.scoreReviews=[];
  S.tasks.filter(t=>t.state==='completed').forEach(t=>writeLedger(S,t,'Seed'));
  S.tasks.filter(t=>t.state==='failed').forEach(t=>writeException(S,t));
  history(S);}
function history(S){const R=CXGeo.rng(777);const wk0=weekOf(today(S));S.scoreHist={};
  const prof={pd:{n:2600,ot:.955,fa:.962,ex:.03,cps:2.9},bulky:{n:420,ot:.91,fa:.93,ex:.05,cps:28},wg:{n:180,ot:.93,fa:.95,ex:.04,cps:118},ltl:{n:230,ot:.94,fa:.97,ex:.03,cps:71},shuttle:{n:190,ot:.965,fa:1,ex:.01,cps:96}};
  C.LINE_ORDER.forEach(l=>{S.scoreHist[l]=[];for(let w=4;w>=1;w--){const p=prof[l];const n=Math.round(p.n*(.9+R()*.2));S.scoreHist[l].push({week:addD(wk0,-7*w),stops:n,onTime:+(p.ot+(R()-.5)*.03).toFixed(3),first:+Math.min(1,p.fa+(R()-.5)*.03).toFixed(3),exc:Math.round(n*p.ex*(.7+R()*.6)),cps:r2(p.cps*(.95+R()*.1)),rev:r2(n*p.cps*1.32)})}});
  // historic invoices per customer (AR aging)
  const custs=[...new Set(Object.values(S.contracts).map(c=>c.shipper).filter(Boolean))];let k=0;
  custs.forEach((cid,ci)=>{for(let w=6;w>=1;w--){const wk=addD(wk0,-7*w);const amt=r2(1800+R()*9000*(ci%3+1));const terms=ci%3===2?30:15;const issued=addD(wk,7);const due=addD(issued,terms);const age=daysBetween(due,today(S));
    let status=age>-1?(R()<.75||w>=5&&ci!==1?'Paid':'Sent'):'Sent';if(ci===1&&w===6)status='Sent';if(w<=1)status='Sent';
    S.invoices.push({id:`INV-${wk.replace(/-/g,'').slice(2)}-${String(++k).padStart(3,'0')}`,customer:cid,week:wk,issued,due,terms:'Net '+terms,amount:amt,lines:Math.round(amt/6),status,paidOn:status==='Paid'?addD(due,-Math.floor(R()*4)):null,source:'History (sample)'})}});
  // historic pay runs
  const payees=S.partners.filter(p=>(p.type==='DSP'||p.type==='Carrier'||(p.type==='Driver'&&!p.parent))&&p.status==='Fully approved');let j=0;
  [2,1].forEach(w=>{const wk=addD(wk0,-7*w);payees.forEach(p=>{const gross=r2(400+R()*5200);const ded=r2(R()<.3?R()*180:0);S.payRuns.push({id:`PR-${wk.replace(/-/g,'').slice(2)}-${String(++j).padStart(3,'0')}`,payee:p.id,week:wk,gross,deductions:ded?[{kind:'Fuel card advance',amount:-ded,note:'sample'}]:[],net:r2(gross-ded),status:'Paid',batch:'BATCH-'+wk.replace(/-/g,''),history:[['Built','System'],['Ops review approved','Sasha Patel'],['Finance approved','Owen Brooks'],['Paid · simulated ACH','System']],lines:Math.round(gross/4)})})})}
/* ---------- invoices / pay runs / reconciliation ---------- */
function buildInvoices(S,actor){const open=S.ledger.filter(e=>e.kind==='charge'&&!e.invoice&&e.party);const by={};open.forEach(e=>{const k=e.party+'|'+e.week;(by[k]=by[k]||[]).push(e)});let n=0;
  Object.entries(by).forEach(([k,es])=>{const [cid,wk]=k.split('|');const rc=S.rateCards.find(r=>r.customer===cid)||{terms:'Net 15'};const terms=+(rc.terms||'Net 15').replace(/\D/g,'')||15;
    let inv=S.invoices.find(i=>i.customer===cid&&i.week===wk&&i.status==='Draft');if(!inv){inv={id:`INV-${wk.replace(/-/g,'').slice(2)}-${String(S.invoices.length+1).padStart(3,'0')}`,customer:cid,week:wk,issued:null,due:null,terms:rc.terms||'Net 15',amount:0,lines:0,status:'Draft',source:'Completed stops',termsDays:terms};S.invoices.unshift(inv);n++}
    es.forEach(e=>{e.invoice=inv.id;inv.amount=r2(inv.amount+e.amount);inv.lines++})});
  if(n||open.length)aud(S,actor||'System','Invoices generated from completed stops','',`${open.length} charge line(s) → ${n} new draft invoice(s)`,'payments');return{lines:open.length,invoices:n}}
function sendInvoice(S,id,actor){const i=S.invoices.find(x=>x.id===id);if(!i||i.status!=='Draft')return false;i.status='Sent';i.issued=today(S);i.due=addD(i.issued,i.termsDays||15);aud(S,actor,'Invoice sent (simulated email)',id,`${pname(i.customer)} · $${i.amount.toFixed(2)}`,'payments');return true}
function payInvoice(S,id,actor){const i=S.invoices.find(x=>x.id===id);if(!i||i.status!=='Sent')return false;i.status='Paid';i.paidOn=today(S);aud(S,actor,'Payment received (simulated)',id,`$${i.amount.toFixed(2)}`,'payments');return true}
function arAging(S){const B=[['Current',-1e9,0],['1–30',1,30],['31–60',31,60],['61–90',61,90],['90+',91,1e9]];const rows={};
  S.invoices.filter(i=>i.status==='Sent').forEach(i=>{const late=daysBetween(i.due,today(S));const b=B.find(x=>late>=x[1]&&late<=x[2])[0];const r=rows[i.customer]=rows[i.customer]||{customer:i.customer,total:0};r[b]=r2((r[b]||0)+i.amount);r.total=r2(r.total+i.amount)});
  return{buckets:B.map(b=>b[0]),rows:Object.values(rows).sort((a,b)=>b.total-a.total)}}
const RUN_FLOW=['Ops review','Finance approval','Approved','In payout batch','Paid'];
function buildPayRuns(S,actor){const wk=weekOf(today(S));const open=S.ledger.filter(e=>e.kind==='pay'&&!e.payRun&&e.party);const by={};open.forEach(e=>(by[e.party]=by[e.party]||[]).push(e));let n=0;
  Object.entries(by).forEach(([pid,es])=>{let run=S.payRuns.find(r=>r.payee===pid&&r.week===wk&&r.status==='Ops review');if(!run){run={id:`PR-${wk.replace(/-/g,'').slice(2)}-${String(S.payRuns.length+1).padStart(3,'0')}`,payee:pid,week:wk,gross:0,deductions:[],net:0,status:'Ops review',batch:null,history:[['Built from completed stops',actor||'System']],lines:0};S.payRuns.unshift(run);n++}
    es.forEach(e=>{e.payRun=run.id;run.gross=r2(run.gross+e.amount);run.lines++});run.net=r2(run.gross+run.deductions.reduce((a,d)=>a+d.amount,0))});
  if(open.length)aud(S,actor||'System','Weekly pay runs built',wk,`${open.length} pay line(s) → ${n} new run(s)`,'payments');return{lines:open.length,runs:n}}
function advanceRun(S,id,actor){const r=S.payRuns.find(x=>x.id===id);if(!r)return{ok:false,why:'Unknown run'};
  if(S.disputes.some(d=>d.run===id&&d.status==='Open'))return{ok:false,why:'Resolve the open dispute first'};
  if(r.status==='Ops review'){if(!can('payments.ops'))return{ok:false,why:'Needs Payments · ops review permission'};r.status='Finance approval';r.history.push(['Ops review approved',actor])}
  else if(r.status==='Finance approval'){if(!can('payments.approve'))return{ok:false,why:'Needs Finance approve permission'};r.status='Approved';r.history.push(['Finance approved',actor])}
  else return{ok:false,why:'Use payout batch'};aud(S,actor,'Pay run advanced',id,`${pname(r.payee)} → ${r.status}`,'payments');return{ok:true}}
function adjust(S,id,kind,amount,note,actor){const r=S.payRuns.find(x=>x.id===id);if(!r||r.status==='Paid'||r.status==='In payout batch')return false;r.deductions.push({kind,amount:r2(+amount),note:note||''});r.net=r2(r.gross+r.deductions.reduce((a,d)=>a+d.amount,0));r.history.push([`${kind} ${amount<0?'-':'+'}$${Math.abs(amount).toFixed(2)}`,actor]);aud(S,actor,'Pay adjustment',id,`${kind} ${amount}`,'payments');return true}
function openDispute(S,runId,payee,text,amount,actor){const d={id:'DSP-'+(1000+S.disputes.length+1),run:runId,payee,text,amount:r2(+amount||0),status:'Open',opened:today(S),by:actor,resolution:null};S.disputes.unshift(d);const r=S.payRuns.find(x=>x.id===runId);if(r)r.history.push(['Dispute opened · '+text,actor]);aud(S,actor,'Pay dispute opened',runId,text,'payments');return d}
function resolveDispute(S,id,accept,actor){const d=S.disputes.find(x=>x.id===id);if(!d||d.status!=='Open')return false;d.status=accept?'Accepted':'Denied';d.resolution=today(S);if(accept&&d.amount)adjust(S,d.run,'Dispute credit',Math.abs(d.amount),d.id,actor);aud(S,actor,'Pay dispute '+d.status.toLowerCase(),d.run,d.text,'payments');return true}
function makeBatch(S,actor){if(!can('payments.approve'))return null;const runs=S.payRuns.filter(r=>r.status==='Approved');if(!runs.length)return null;const b={id:'BATCH-'+today(S).replace(/-/g,'')+'-'+(S.batches.length+1),at:today(S)+' '+C.fmt(S.clock),runs:runs.map(r=>r.id),total:r2(runs.reduce((a,r)=>a+r.net,0)),status:'Exported (simulated ACH)',by:actor};
  runs.forEach(r=>{r.status='Paid';r.batch=b.id;r.history.push(['Paid · simulated ACH batch '+b.id,actor])});S.batches.unshift(b);aud(S,actor,'Payout batch exported (simulated)',b.id,`${runs.length} run(s) · $${b.total.toFixed(2)}`,'payments');return b}
function recon(S){const done=S.tasks.filter(t=>t.state==='completed');const charged=new Set(S.ledger.filter(e=>e.kind==='charge').map(e=>e.taskId)),paid=new Set(S.ledger.filter(e=>e.kind==='pay').map(e=>e.taskId));
  const rev=S.ledger.filter(e=>e.kind==='charge'&&e.party).reduce((a,e)=>a+e.amount,0),cost=S.ledger.filter(e=>e.kind==='pay').reduce((a,e)=>a+e.amount,0);
  return{completed:done.length,charged:done.filter(t=>charged.has(t.id)).length,paid:done.filter(t=>paid.has(t.id)).length,missingCharge:done.filter(t=>!charged.has(t.id)).map(t=>t.id),missingPay:done.filter(t=>!paid.has(t.id)).map(t=>t.id),
    rev:r2(rev),cost:r2(cost),margin:r2(rev-cost),invoiced:r2(S.ledger.filter(e=>e.kind==='charge'&&e.invoice).reduce((a,e)=>a+e.amount,0)),inRuns:r2(S.ledger.filter(e=>e.kind==='pay'&&e.payRun).reduce((a,e)=>a+e.amount,0))}}
/* ---------- scorecards ---------- */
function scorecard(S,line){const wk=weekOf(today(S));const cur=(S.scores||[]).filter(s=>s.line===line&&s.week===wk);const done=cur.filter(s=>!s.exc);
  const now={week:wk,stops:done.length,onTime:done.length?done.filter(s=>s.onTime).length/done.length:null,first:done.length?done.filter(s=>s.first).length/done.length:null,exc:cur.filter(s=>s.exc).length,cps:done.length?r2(done.reduce((a,s)=>a+s.cost,0)/done.length):null,rev:r2(done.reduce((a,s)=>a+s.rev,0)),current:true};
  return[...(S.scoreHist&&S.scoreHist[line]||[]),now]}
const TARGETS={onTime:.95,first:.96,excRate:.04};
/* ---------- re-optimize (staff only) ---------- */
function reoptPreview(S,o){const lines=o.lines||[o.line];const keepEnds=o.keepEnds!==false,keepLocks=o.keepLocks!==false,windows=o.windows!==false;const out=[];
  const ds=S.drivers.filter(d=>lines.includes(d.line)&&d.line!=='shuttle'&&!d.dspSlot).filter(d=>!o.wids||o.wids.includes(d.id));
  ds.forEach(d=>{const all=C.routeAll(d.id);const live=all.filter(t=>t.state==='assigned').sort((a,b)=>a.seq-b.seq);if(live.length<3)return;
    const hub=(S.hubs[d.hub]||{}).ll;const start=d.route&&d.route.stage==='on_road'?d.loc:(hub||d.loc);
    const plan=(d.route&&d.route.plan)||{};const has=id=>live.some(t=>t.id===id);
    const pts=live.map(t=>({id:t.id,ll:t.ll,window:windows?t.window:null,x:t.x}));
    let first,last;if(keepEnds&&plan.first&&has(plan.first)&&plan.last&&has(plan.last)&&plan.first!==plan.last){first=plan.first;last=plan.last}
    else{const nn=C.nn(start,pts);first=nn[0].id;last=nn[nn.length-1].id}
    const locked=keepLocks?(plan.locked||[]).filter(has):[];
    const res=C.nn2opt(pts,first,last,{clock:S.clock,serviceMin:(C.lines[d.line]||{}).serviceMin||3,locked,startLL:start});
    const bk=C.pathKm([start,...live.map(t=>t.ll)]),ak=C.pathKm([start,...res.order.map(s=>s.ll)]);const svc=((C.lines[d.line]||{}).serviceMin||3)*live.length;
    out.push({wid:d.id,name:d.name,line:d.line,routeId:(d.route&&d.route.id)||'',n:live.length,first,last,locked:locked.length,keepEnds:keepEnds&&first===plan.first,beforeKm:r2(bk),afterKm:r2(Math.min(ak,bk)),beforeMin:Math.round(bk*2.2+svc),afterMin:Math.round(Math.min(ak,bk)*2.2+svc),order:ak<=bk?res.order.map(s=>s.id):live.map(t=>t.id),changed:ak<bk-0.01})});
  return out}
function reoptApply(S,results,actor){if(!can('reopt'))return{ok:false,why:'Only ChainEx staff teams can re-optimize routes'};const allowed=(typeof window!=='undefined'&&window.CXS)?window.CXS.lines():C.LINE_ORDER;let n=0;
  results.forEach(r=>{const d=C.driver(r.wid);if(!d||!allowed.includes(d.line))return;const all=C.routeAll(d.id);const fixed=all.filter(t=>t.state!=='assigned').sort((a,b)=>a.seq-b.seq);const ord=r.order.map(id=>C.task(id)).filter(t=>t&&t.workerId===d.id&&t.state==='assigned');all.filter(t=>t.state==='assigned'&&!ord.includes(t)).forEach(t=>ord.push(t));
    [...fixed,...ord].forEach((t,i)=>t.seq=i);d.route.notice={kind:'reopt',text:'Route re-optimized by dispatch',at:S.clock,by:actor,savedKm:r2(r.beforeKm-r.afterKm),seen:false};
    C.api.log(`Route ${r.routeId} re-optimized by dispatch (${actor}) · ${r.beforeKm} → ${r.afterKm} km`,'desk',d.line);aud(S,actor,'Route re-optimized',r.routeId,`${d.name} · ${r.n} stops · ${r.beforeKm}→${r.afterKm} km · ${r.beforeMin}→${r.afterMin} min · ends ${r.keepEnds?'kept':'reset'} · ${r.locked} locked kept`,'dispatch');n++});
  return{ok:true,n}}
/* ---------- module ---------- */
C.registerModule({id:'v02',seed,
  ops:(api,ops)=>{const origApply=ops.pApply,origSet=ops.setState,origFail=ops.fail;return{
    pApply(type,f){const id=origApply.call(ops,type,f);const S=api.S,p=P().partner(id);if(p){p.ob=null;obEnsure(S,p,'Auto-routing');if(f.applicant)p.applicant=f.applicant;if(f.extra)p.application=f.extra;aud(S,'Auto-routing','Onboarding owner assigned',id,`${(S.users.find(u=>u.id===p.ob.owner)||{}).name||p.ob.owner} · due ${p.ob.due}`,'onboarding')}return id},
    setState(id,st,actor,extra){const r=origSet.call(ops,id,st,actor,extra);if(st==='completed'){const t=api.task(id);if(t)writeLedger(api.S,t,actor)}return r},
    fail(id,...a){const r=origFail.call(ops,id,...a);const t=api.task(id);if(t&&t.state==='failed')writeException(api.S,t);return r},
    obAssign(pids,owner,actor){const S=api.S;pids.forEach(id=>{const p=P().partner(id);if(!p)return;p.ob=p.ob||{reminders:[]};p.ob.owner=owner;p.ob.assignedBy=actor;aud(S,actor,'Onboarding owner set',id,(S.users.find(u=>u.id===owner)||{}).name||owner,'onboarding')});return pids.length},
    obDue(pid,due,actor){const S=api.S,p=P().partner(pid);if(!p||!p.ob)return;p.ob.due=due;aud(S,actor,'Due date set',pid,due,'onboarding')},
    obRemind(pids,actor){const S=api.S;let n=0;pids.forEach(id=>{const p=P().partner(id);if(!p)return;const miss=p.docs.filter(d=>{const s=P().docState(d);return s==='missing'||s==='rejected'||s==='expired'}).map(d=>d.type);const unsigned=p.agreements.filter(a=>a.status!=='Signed').map(a=>a.name);if(!miss.length&&!unsigned.length)return;p.ob=p.ob||{reminders:[]};p.ob.reminders=p.ob.reminders||[];p.ob.reminders.push({at:today(S),items:[...miss,...unsigned]});p.ob.lastReminder=today(S);n++;aud(S,actor||'Auto-reminder','Missing-item reminder sent (simulated)',id,[...miss,...unsigned].join(', '),'onboarding')});return n},
    obSendAgreements(pid,actor){const S=api.S,p=P().partner(pid);let n=0;p.agreements.forEach(a=>{if(a.status==='Not sent'){a.status='Sent';a.envelope='ENV-'+p.id.slice(2,8);n++}});if(n)aud(S,actor,'Agreements sent',pid,n+' envelope(s)','onboarding');return n},
    obToggleAuto(k,v,actor){const S=api.S;if(k==='agreements')S.v2.autoAgreements=!!v;else S.v2.autoRemind.on=!!v;aud(S,actor,'Onboarding automation '+(v?'on':'off'),k,'','onboarding')},
    secSet(k,v,actor){const S=api.S;S.sec[k]=v;aud(S,actor,'Security setting changed',k,String(v),'security')},
    secOwner(action,actor){const S=api.S,o=S.sec.ownerReview;if(action==='demote'){o.accounts=o.accounts.map(a=>a.domain==='personal'?Object.assign({},a,{role:'Viewer · demoted',demoted:true}):a);o.status='Resolved · personal account demoted'}else if(action==='keep'){o.status='Accepted risk · break-glass with MFA required'}aud(S,actor,'Owner account review',action,o.status,'security');return o.status},
    secRevoke(id,actor){const S=api.S;S.sec.sessions=S.sec.sessions.filter(s=>s.id!==id);aud(S,actor,'Session revoked',id,'','security')},
    secMfa(email,on,actor){const S=api.S;S.sec.staffMfa[email]=!!on;aud(S,actor,on?'MFA enrollment confirmed':'MFA reset',email,'','security')},
    backupSet(f,actor){const S=api.S;Object.assign(S.backups,f);aud(S,actor,'Backup schedule changed','',JSON.stringify(f),'backup')},
    backupNow(actor){const S=api.S;const id='BK-'+today(S).replace(/-/g,'')+'-'+String(S.clock).padStart(4,'0')+'-'+(S.backups.list.length+1);const snap=JSON.stringify(S);let restorable=false;
      try{if(typeof localStorage!=='undefined'){const keys=Object.keys(localStorage).filter(k=>k.startsWith('cx.v02.snap.')).sort();while(keys.length>=2)localStorage.removeItem(keys.shift());localStorage.setItem('cx.v02.snap.'+id,snap);restorable=true}}catch(e){restorable=false}
      S.backups.list.unshift({id,at:today(S)+' '+C.fmt(S.clock),kind:'Manual',size:(snap.length/1048576).toFixed(2)+' MB',status:'Completed',where:restorable?'This browser + off-site (simulated)':'Off-site (simulated)',restorable});aud(S,actor,'Backup created',id,S.backups.list[0].size,'backup');return id},
    obForPartner:pid=>P().partner(pid)&&P().partner(pid).ob,
    compSet(f,actor){const S=api.S;Object.assign(S.company,f);aud(S,actor,'Company profile updated','',Object.keys(f).join(', '),'compliance')},
    compStep(i,actor){const S=api.S,st=S.company.biennial.steps[i];st[1]=st[1]==='done'?'open':'done';if(S.company.biennial.steps.every(s=>s[1]==='done')){S.company.biennial.status='Filed · confirmation saved';S.company.biennial.lastFiled=today(S)}else S.company.biennial.status='Confirm filing';aud(S,actor,'Biennial checklist',st[0],st[1],'compliance')},
    docRemind(pid,type,actor){const S=api.S,p=P().partner(pid);if(!p)return;p.ob=p.ob||{reminders:[]};(p.ob.reminders=p.ob.reminders||[]).push({at:today(S),items:[type]});aud(S,actor,'Renewal reminder sent (simulated)',pid,type,'compliance')},
    reoptPreview:o=>reoptPreview(api.S,o),reoptApply:(res,actor)=>reoptApply(api.S,res,actor||who()),
    buildInvoices:actor=>buildInvoices(api.S,actor),sendInvoice:(id,a)=>sendInvoice(api.S,id,a),payInvoice:(id,a)=>payInvoice(api.S,id,a),
    buildPayRuns:a=>buildPayRuns(api.S,a),advanceRun:(id,a)=>advanceRun(api.S,id,a),adjustRun:(id,k,amt,n,a)=>adjust(api.S,id,k,amt,n,a),
    openDispute:(run,payee,text,amt,a)=>openDispute(api.S,run,payee,text,amt,a),resolveDispute:(id,ok,a)=>resolveDispute(api.S,id,ok,a),payoutBatch:a=>makeBatch(api.S,a),
    rateSet(id,f,actor){const S=api.S,r=S.rateCards.find(x=>x.id===id);if(!r)return;Object.assign(r,f);aud(S,actor,'Rate card edited',id,JSON.stringify(f),'payments')},
    scoreReview(line,week,note,actor){const S=api.S;S.scoreReviews.unshift({line,week,note,by:actor,at:today(S)});aud(S,actor,'Weekly scorecard review signed off',LN[line],note,'scorecards')},
    noticeSeen(wid){const d=api.driver(wid);if(d&&d.route&&d.route.notice)d.route.notice.seen=true}
  }}});
C.v2={today:()=>today(C.S),weekOf,addD,daysBetween,LN,chargeOf:t=>chargeOf(C.S,t),writeLedger:t=>writeLedger(C.S,t),arAging:()=>arAging(C.S),recon:()=>recon(C.S),scorecard:l=>scorecard(C.S,l),TARGETS,RUN_FLOW,pname,
  money:n=>(n<0?'-':'')+'$'+Math.abs(+n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),
  obQueue(){const S=C.S;return S.partners.filter(p=>p.ob&&p.status!=='Fully approved'&&p.status!=='Closed')},
  slaState(p){if(!p.ob||!p.ob.due)return 'none';const n=daysBetween(today(C.S),p.ob.due);return n<0?'overdue':n===0?'due':'ok'},
  userName:id=>((C.S.users||[]).find(u=>u.id===id)||{}).name||id||'Unassigned'};
})();
