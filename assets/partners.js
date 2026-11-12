/* ChainEx Pilot · Partner directory layer (models the ChainEx Global portal Dashboard) shared by Dashboard, Dispatch desk, Driver app and Shipper view.
   Owns: partners, documents, agreements, payment setup, verification checks, eligibility, work queue, recruiting, team roles, settlements, audit + sync events. Sample data only. */
(function(){
const C=CX,esc=C.esc;
const DAY0=Date.UTC(2026,10,12);const DAY=864e5;
const iso=ms=>new Date(ms).toISOString().slice(0,10);
const today=S=>iso(DAY0+(S.dayOffset||0)*DAY);
const addDays=(S,n)=>iso(DAY0+((S.dayOffset||0)+n)*DAY);
const daysUntil=(S,d)=>d?Math.round((Date.parse(d)-Date.parse(today(S)))/DAY):null;
const nowH=S=>(S.dayOffset||0)*24+S.clock/60;
const fmtDate=d=>{if(!d)return '—';const x=new Date(d+'T12:00:00Z');return x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})};
const TYPES=['Driver','DSP','Carrier','Shipper','Customer','Warehouse','Warehouse worker'];
const STATUSES=['Completing setup','Needs team review','Fully approved','Closed'];
const ROLES=['Owner','Operations','Recruiting','Finance','Viewer','Sales'];
const STEPS=[['profile','Profile'],['documents','Documents'],['agreements','Agreements'],['payment','Payment setup'],['review','Team review']];
const LINE_NAMES={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};
const VEHICLE_TYPES=['Cargo van','Sprinter','Box truck','26\' box truck','Padded box truck',"28' pup","53' dry van",'Day cab tractor'];
// required documents per partner type (check = simulated auto-verification source)
function reqDocs(p){const indep=p.type==='Driver'&&!p.parent;switch(p.type){
  case 'Driver':return[{type:"Driver's license",exp:true,check:'background'},{type:'Background check',exp:true,check:'background'},{type:'Motor vehicle record (MVR)',exp:true,check:'background'},...(indep?[{type:'Auto insurance (COI)',exp:true,check:'insurance'},{type:'W-9',exp:false}]:[])];
  case 'DSP':return[{type:'Commercial auto insurance (COI)',exp:true,check:'insurance'},{type:'General liability insurance',exp:true,check:'insurance'},{type:'W-9',exp:false},{type:'Business license',exp:true}];
  case 'Carrier':return[{type:'Auto liability insurance (COI)',exp:true,check:'insurance'},{type:'Cargo insurance',exp:true,check:'insurance'},{type:'Operating authority (USDOT / MC)',exp:false,check:'fmcsa'},{type:'W-9',exp:false}];
  case 'Warehouse worker':return[{type:'Photo ID',exp:true},{type:'Work authorization (I-9)',exp:false},{type:'Background check',exp:true,check:'background'}];
  case 'Warehouse':return[{type:'Warehouse legal liability insurance',exp:true,check:'insurance'},{type:'W-9',exp:false},{type:'Facility inspection',exp:true}];
  default:return[{type:'W-9',exp:false},{type:'Credit application',exp:false}]}}
function reqAgreements(p){switch(p.type){case 'Driver':return p.parent?['Safety & conduct policy','DSP driver acknowledgement']:['Independent Contractor Agreement','Safety & conduct policy'];
  case 'DSP':return['DSP Master Services Agreement','Rate schedule · 2026'];case 'Carrier':return['Carrier Services Agreement','Rate confirmation · 2026'];case 'Warehouse':return['Facility Services Agreement'];case 'Warehouse worker':return['Employee handbook acknowledgement','Warehouse safety policy'];default:return['Master Services Agreement','Rate card · 2026']}}
const checksFor=p=>[...new Set(reqDocs(p).map(d=>d.check).filter(Boolean))];
const paidThroughParent=p=>p.type==='Driver'&&!!p.parent;
const isBilling=p=>p.type==='Shipper'||p.type==='Customer';
function docState(S,d){if(!d||d.status==='Missing')return 'missing';if(d.status==='Rejected')return 'rejected';if(d.status==='Pending review')return 'pending';const n=daysUntil(S,d.expires);if(n!=null&&n<0)return 'expired';if(n!=null&&n<=30)return 'expiring';return 'current'}
const DOC_LBL={missing:'Missing',rejected:'Rejected',pending:'Pending review',expired:'Expired',expiring:'Expiring',current:'Current'};
function stepState(S,p){const docs=reqDocs(p).every(r=>{const d=p.docs.find(x=>x.type===r.type);const s=docState(S,d);return s==='current'||s==='expiring'});
  const agr=reqAgreements(p).every(a=>(p.agreements.find(x=>x.name===a)||{}).status==='Signed');const pay=paidThroughParent(p)||(p.payment&&p.payment.status==='Verified');
  return{profile:!!p.profile,documents:docs,agreements:agr,payment:pay,review:p.status==='Fully approved'}}
const stepsDone=(S,p)=>Object.values(stepState(S,p)).filter(Boolean).length;
function nextAction(S,p){if(p.status==='Closed')return['Closed','—'];const st=stepState(S,p);const exp=p.docs.filter(d=>docState(S,d)==='expired');if(exp.length)return[`Renew ${exp[0].type}`,'Partner'];
  if(!st.profile)return['Complete profile','Partner'];if(!st.documents){const pend=p.docs.some(d=>d.status==='Pending review');const rej=p.docs.find(d=>d.status==='Rejected');return rej?[`Re-upload ${rej.type}`,'Partner']:pend?['Review documents','ChainEx']:['Upload documents','Partner']}
  if(!st.agreements)return['Sign agreements','Partner'];if(!st.payment)return[p.payment&&p.payment.status==='Failed'?'Fix payment setup':isBilling(p)?'Set up billing':'Set up payouts','Partner'];if(!st.review)return['Approve partner','ChainEx'];
  const soon=p.docs.filter(d=>docState(S,d)==='expiring');if(soon.length)return[`${soon[0].type} expires ${fmtDate(soon[0].expires)}`,'Partner'];return['None','—']}
const partner=(S,id)=>S.partners.find(p=>p.id===id);
const short=p=>p?(p.short||p.name):'—';
function audit(S,actor,action,target,detail){S.audit.unshift({at:`${today(S)} ${C.fmt(S.clock)}`,h:nowH(S),actor:actor||'System',action,target,detail:detail||''});if(S.audit.length>20000)S.audit.length=20000}
function event(S,name,payload,line){S.events.unshift({name,at:`${today(S)} ${C.fmt(S.clock)}`,h:nowH(S),payload});S.events=S.events.slice(0,300);S.activity.unshift({at:S.clock,text:`Portal event · ${name}${payload&&payload.name?' · '+payload.name:''}${payload&&payload.detail?' · '+payload.detail:''}`,kind:'partner',line:line||null})}
const ROUTING={Driver:'u-hannah',DSP:'u-hannah',Carrier:'u-miguel',Warehouse:'u-miguel',Shipper:'u-nina',Customer:'u-nina'};
function routeOwner(S,kind,pid){const p=partner(S,pid);if(/payment|payout|billing/i.test(kind))return 'u-owen';if(/insurance|background|renew|expir/i.test(kind))return p&&(p.type==='Driver'||p.type==='DSP')?'u-sasha':'u-miguel';return p?ROUTING[p.type]:null}
let qn=1000;
function enqueue(S,kind,pid,o={}){const ex=S.queue.find(q=>q.kind===kind&&q.partnerId===pid&&q.status!=='Done');if(ex)return ex;const q=Object.assign({id:'Q-'+(++qn+S.queue.length),kind,partnerId:pid,owner:null,createdH:nowH(S),slaH:24,priority:'Normal',status:'Open',note:''},o);if(!q.owner&&S.meta.autoRoute)q.owner=routeOwner(S,kind,pid);S.queue.unshift(q);return q}
// ---------- eligibility ----------
function partnerBlocks(S,p,line,vt,label){const r=[],w=[];if(!p){r.push('No partner record in the directory');return{r,w}}const pre=label?label+': ':'';
  if(p.status!=='Fully approved')r.push(`${pre}Setup status: ${p.status}`);
  reqDocs(p).forEach(q=>{const d=p.docs.find(x=>x.type===q.type);const s=docState(S,d);if(s==='expired')r.push(`${pre}${q.type.replace(/ \(.*\)/,'')} expired`);else if(s==='missing'||s==='rejected')r.push(`${pre}${q.type.replace(/ \(.*\)/,'')} ${s}`);else if(s==='expiring')w.push(`${pre}${q.type.replace(/ \(.*\)/,'')} expires in ${daysUntil(S,d.expires)} days (${fmtDate(d.expires)})`)});
  reqAgreements(p).forEach(n=>{const a=(p.agreements||[]).find(x=>x.name===n);if(!a||a.status!=='Signed')r.push(`${pre}Agreement not signed: ${n}`)});
  if(line&&!(p.lines||[]).includes(line))r.push(`${pre}Not approved for ${LINE_NAMES[line]}`);
  if(vt&&p.vehicleTypes&&p.vehicleTypes.length&&!p.vehicleTypes.includes(vt))r.push(`${pre}Vehicle type not approved: ${vt}`);return{r,w}}
function eligibility(wid,line){const S=C.S;const d=C.driver(wid);if(!d)return{ok:false,reasons:['Unknown driver'],warnings:[]};line=line||d.line;const v=S.vehicles.find(x=>x.name===d.vehicle);const vt=v&&v.type;
  if(d.dspSlot){const dsp=partner(S,d.partnerId);const a=partnerBlocks(S,dsp,line,null,null);return{ok:!a.r.length,reasons:a.r,warnings:a.w,partner:dsp}}
  const p=partner(S,d.partnerId);const a=partnerBlocks(S,p,line,vt,null);let reasons=a.r,warnings=a.w;
  if(p&&p.parent){const par=partner(S,p.parent);const b=partnerBlocks(S,par,line,vt,`${par.type} ${short(par)}`);reasons=reasons.concat(b.r);warnings=warnings.concat(b.w)}
  return{ok:!reasons.length,reasons,warnings,partner:p}}
// ---------- settlement ----------
const RATES={pd:{stop:2.10,unit:0.35,label:'$2.10 / stop + $0.35 / package'},bulky:{stop:18,unit:6,label:'$18 / stop + $6 / piece'},wg:{stop:65,unit:0,install:35,haul:20,label:'$65 / job + $35 install + $20 haul-away'},ltl:{stop:42,unit:6,label:'$42 / shipment + $6 / handling unit'},shuttle:{trip:85,label:'$85 / trip leg'}};
function earn(t){const r=RATES[t.line]||{};if(t.line==='shuttle')return r.trip;let a=(r.stop||0)+(r.unit||0)*t.items.length;if(t.line==='wg'){if(t.stepData.install)a+=r.install;if(t.stepData.haul)a+=r.haul}return Math.round(a*100)/100}
function settlement(S){const rows={};const get=pid=>rows[pid]=rows[pid]||{payee:pid,lines:{},drivers:{},total:0,exceptions:0,count:0};
  S.tasks.forEach(t=>{if(!t.workerId)return;const d=C.driver(t.workerId);if(!d||!d.partnerId)return;const p=partner(S,d.partnerId);if(!p)return;const payee=p.parent&&!d.dspSlot?p.parent:p.id;const row=get(payee);
    if(t.state==='failed'){row.exceptions++;return}if(t.state!=='completed')return;const L=row.lines[t.line]=row.lines[t.line]||{stops:0,units:0,trips:0,amount:0};const amt=earn(t);
    if(t.line==='shuttle')L.trips++;else{L.stops++;L.units+=t.items.length}L.amount+=amt;row.total+=amt;row.count++;const dr=row.drivers[d.name]=row.drivers[d.name]||{stops:0,units:0,trips:0,amount:0};if(t.line==='shuttle')dr.trips++;else{dr.stops++;dr.units+=t.items.length}dr.amount+=amt});
  return Object.values(rows).map(r=>Object.assign(r,{prior:(partner(S,r.payee)||{}).wtdPrior||0})).sort((a,b)=>b.total-a.total)}
// ---------- dashboard metrics ----------
function metrics(S){const P=S.partners.filter(p=>p.status!=='Closed');const appr=S.partners.filter(p=>p.approvedAt&&p.status==='Fully approved');
  const tta=appr.map(p=>Math.max(0,Math.round((Date.parse(p.approvedAt)-Date.parse(p.createdAt))/DAY))).sort((a,b)=>a-b);const med=tta.length?tta[Math.floor(tta.length/2)]:null;
  const funnel=STEPS.map(([k,l])=>({k,l,n:0}));funnel.push({k:'approved',l:'Fully approved',n:0});P.forEach(p=>{const st=stepState(S,p);const i=STEPS.findIndex(([k])=>!st[k]);funnel[i<0?5:i].n++});
  let req=0,cur=0;appr.forEach(p=>reqDocs(p).forEach(q=>{if(!q.exp)return;req++;const s=docState(S,p.docs.find(x=>x.type===q.type));if(s==='current'||s==='expiring')cur++}));
  const expiring=[];S.partners.filter(p=>p.status!=='Closed').forEach(p=>p.docs.forEach(d=>{const s=docState(S,d);if(s==='expiring'||s==='expired')expiring.push({p,d,s,days:daysUntil(S,d.expires)})}));expiring.sort((a,b)=>a.days-b.days);
  const blocked=S.drivers.filter(d=>!d.dspSlot&&!eligibility(d.id).ok);const p90=tta.length?tta[Math.min(tta.length-1,Math.floor(tta.length*.9))]:null;
  const capacity=C.LINE_ORDER.map(l=>({line:l,approved:appr.filter(p=>(p.type==='Driver')&&(p.lines||[]).includes(l)).length,eligible:S.drivers.filter(d=>d.line===l&&!d.dspSlot&&eligibility(d.id).ok).length,roster:S.drivers.filter(d=>d.line===l&&!d.dspSlot).length}));
  const exp90=[30,60,90].map(n=>S.partners.reduce((a,p)=>a+p.docs.filter(d=>{const x=daysUntil(S,d.expires);return d.status==='Verified'&&x!=null&&x>=0&&x<=n}).length,0));
  return{active:appr.length,inSetup:P.filter(p=>p.status==='Completing setup').length,review:P.filter(p=>p.status==='Needs team review').length,closed:S.partners.filter(p=>p.status==='Closed').length,tta:med,ttaList:tta,funnel,docsPct:req?Math.round(cur/req*100):100,expiring,blocked,suspended:S.partners.filter(p=>p.suspended).length,p90,capacity,exp90,unowned:S.queue.filter(q=>q.status==='Open'&&!q.owner).length,openQueue:S.queue.filter(q=>q.status==='Open').length,overdue:S.queue.filter(q=>q.status==='Open'&&q.createdH+q.slaH<nowH(S)).length}}
// ---------- roles ----------
const PERM={Owner:['*'],Operations:['partners.edit','docs.review','approve','queue','agreements','dispatch','recruiting.view','payments.view','team.view'],Recruiting:['recruiting','onboarding','partners.view','queue','agreements.send','team.view'],
  Finance:['payments','payments.approve','partners.view','queue','team.view'],Viewer:['partners.view','payments.view','recruiting.view','team.view'],Sales:['partners.view','shippers.edit','recruiting.view','agreements.send','team.view']};
const can=(role,perm)=>{const p=PERM[role]||[];return p.includes('*')||p.includes(perm)||(perm.endsWith('.view')&&p.includes(perm.replace('.view','')))||(perm==='partners.view'&&p.includes('partners.edit'))};
// ---------- verification ----------
function runChecks(S,pid,actor){const p=partner(S,pid);if(!p)return;const sim=p.sim||{};const res=[];
  checksFor(p).forEach(k=>{const docs=p.docs.filter(d=>{const q=reqDocs(p).find(r=>r.type===d.type);return q&&q.check===k&&d.status==='Pending review'});if(!docs.length&&p.checks[k]&&p.checks[k].status!=='Not run')return;
    const allIn=reqDocs(p).filter(r=>r.check===k).every(r=>{const d=p.docs.find(x=>x.type===r.type);return d&&d.status!=='Missing'});if(!allIn)return;
    const out=sim[k]||'pass';const src={fmcsa:'FMCSA SAFER (simulated)',insurance:'Insurer COI verification (simulated)',background:'Background screening provider (simulated)'}[k];
    if(out==='pass'){docs.forEach(d=>{d.status='Verified';d.verifiedBy='Auto · '+src});p.checks[k]={status:'Pass',at:today(S),detail:k==='fmcsa'?`USDOT ${p.usdot||'—'} active · authorized for hire · no OOS order`:k==='insurance'?'Limits meet minimums · ChainEx named as certificate holder':'Clear · MVR acceptable'};res.push(k+': pass')}
    else if(out==='review'){p.checks[k]={status:'Review',at:today(S),detail:k==='background'?'Record found · needs adjudication':'Mismatch · manual review'};enqueue(S,k==='background'?'Background check review':'Insurance review',pid,{priority:'High',slaH:24});res.push(k+': needs review')}
    else{docs.forEach(d=>{d.status='Rejected';d.verifiedBy='Auto · '+src});enqueue(S,k==='insurance'?'Insurance rejected · contact partner':k==='fmcsa'?'Authority check failed':'Background check failed',pid,{priority:'High',slaH:24});p.checks[k]={status:'Fail',at:today(S),detail:k==='insurance'?'Coverage below minimum ($1M auto liability required)':k==='fmcsa'?'Authority not active':'Failed screening'};res.push(k+': fail')}});
  // non-check docs: verified by ops review -> auto for pilot when uploaded with a valid date
  p.docs.forEach(d=>{const q=reqDocs(p).find(r=>r.type===d.type);if(q&&!q.check&&d.status==='Pending review'){d.status='Verified';d.verifiedBy='Auto · document AI (simulated)'}});
  if(p.payment&&p.payment.status==='Pending'){if(sim.payment==='fail'){p.payment.status='Failed';p.payment.detail='Micro-deposit returned: account closed';enqueue(S,'Payment setup failed',pid,{slaH:48})}else{p.payment.status='Verified';p.payment.detail=p.payment.method==='Zelle'?'Zelle recipient confirmed':'Micro-deposits matched'}}
  audit(S,actor||'Auto-verification','Checks run',p.id,res.join(' · ')||'No pending checks');evaluate(S,pid,actor);return res}
function evaluate(S,pid,actor){const p=partner(S,pid);if(!p||p.status==='Closed')return;const st=stepState(S,p);const pre=st.profile&&st.documents&&st.agreements&&st.payment;const checksOk=checksFor(p).every(k=>p.checks[k]&&p.checks[k].status==='Pass');
  if(pre&&checksOk&&p.status!=='Fully approved'){if(S.meta.autoApprove!==false&&!(p.sim&&p.sim.manual)){approve(S,pid,'Auto-approve (all checks passed)')}else{p.status='Needs team review';enqueue(S,'Approve partner',pid,{slaH:24})}}
  else if(pre&&!checksOk&&p.status==='Completing setup'){p.status='Needs team review'}
  else if(!pre&&p.status==='Needs team review'&&!S.queue.some(q=>q.partnerId===pid&&q.status!=='Done')){p.status='Completing setup'}}
function approve(S,pid,actor){const p=partner(S,pid);p.status='Fully approved';p.approvedAt=p.approvedAt||today(S);p.suspended=false;S.queue.forEach(q=>{if(q.partnerId===pid&&/Approve|review/i.test(q.kind)&&q.status!=='Done')q.status='Done'});
  audit(S,actor,'Approved',p.id,`${p.type} · ${p.name}`);event(S,'partner.approved',{id:p.id,name:p.name,type:p.type,lines:p.lines,vehicleTypes:p.vehicleTypes});const r=S.recruits.find(x=>x.partnerId===pid);if(r)r.stage='Active'}
function sweep(S){S.partners.forEach(p=>{if(p.status==='Closed')return;let expired=[];p.docs.forEach(d=>{const s=docState(S,d);
    if(s==='expired'){expired.push(d.type);if(!d.expiredSent){d.expiredSent=true;event(S,'document.expired',{id:p.id,name:p.name,detail:d.type});enqueue(S,`Renew ${d.type}`,p.id,{priority:'High',slaH:24})}}
    if(s==='expiring'||s==='expired'){const n=daysUntil(S,d.expires);d.reminders=d.reminders||[];[30,15,7,0].forEach(th=>{if(n<=th&&!d.reminders.includes(th)){d.reminders.push(th);audit(S,'Reminder cadence',th?`${th}-day expiry reminder sent (email + SMS)`:'Expiry-day notice sent',p.id,d.type)}})}
    if(s==='expiring'&&!d.warnSent){d.warnSent=true;event(S,'document.expiring',{id:p.id,name:p.name,detail:`${d.type} · ${fmtDate(d.expires)}`});enqueue(S,`Expiring: ${d.type}`,p.id,{slaH:72})}});
  if(expired.length&&!p.suspended&&p.status==='Fully approved'){p.suspended=true;p.suspendReason=expired.join(', ')+' expired';audit(S,'Expiry monitor','Dispatch eligibility suspended',p.id,p.suspendReason);event(S,'partner.suspended',{id:p.id,name:p.name,detail:p.suspendReason})}
  if(!expired.length&&p.suspended){p.suspended=false;p.suspendReason='';audit(S,'Expiry monitor','Dispatch eligibility reinstated',p.id,'All documents current');event(S,'partner.reinstated',{id:p.id,name:p.name})}})}
// ---------- seed ----------
function seed(S,api,geo){const r=geo.rng(2026);const hex=()=>Array.from({length:8},()=>'0123456789ABCDEF'[Math.floor(r()*16)]).join('');let drvN=10;
  S.meta.autoApprove=true;S.meta.autoRoute=false;S.meta.security={mfa:false,backups:false,malware:false,retention:false,ownerCleanup:false};
  S.users=[{id:'u-jordan',name:'Jordan Lee',email:'jordan@chainexglobal.com',role:'Owner',customers:[]},{id:'u-sasha',name:'Sasha Patel',email:'sasha@chainexglobal.com',role:'Operations',customers:[]},{id:'u-miguel',name:'Miguel Torres',email:'miguel@chainexglobal.com',role:'Operations',customers:[]},
    {id:'u-hannah',name:'Hannah Kim',email:'hannah@chainexglobal.com',role:'Recruiting',customers:[]},{id:'u-owen',name:'Owen Brooks',email:'owen@chainexglobal.com',role:'Finance',customers:[]},{id:'u-nina',name:'Nina Alvarez',email:'nina@chainexglobal.com',role:'Sales',customers:[]},{id:'u-ari',name:'Ari Cohen',email:'ari@chainexglobal.com',role:'Viewer',customers:[]}];
  const P=(type,name,o={})=>{const p=Object.assign({id:'P-'+hex(),type,name,short:o.short||name,legal:o.legal||name,contact:o.contact||{name:'—',email:'',phone:''},city:o.city||'Kent',state:'WA',status:'Completing setup',suspended:false,createdAt:addDays(S,-(o.age||20)),approvedAt:null,owner:o.owner||null,profile:true,docs:[],agreements:[],payment:{method:null,status:'Missing'},lines:[],vehicleTypes:[],parent:null,driverId:null,stations:[],facilities:[],contracts:[],fleet:[],notes:[],checks:{},sim:{},source:o.source||'Portal invite',wtdPrior:0},o);
    p.docs=reqDocs(p).map(q=>({type:q.type,status:'Missing',expires:null,file:''}));p.agreements=reqAgreements(p).map(a=>({name:a,status:'Not sent',signedAt:null,envelope:null}));checksFor(p).forEach(k=>p.checks[k]={status:'Not run'});S.partners.push(p);return p};
  const full=(p,o={})=>{p.status='Fully approved';p.approvedAt=addDays(S,-(o.appr!=null?o.appr:Math.max(1,(Date.parse(today(S))-Date.parse(p.createdAt))/DAY-(o.tta||6))));
    p.docs.forEach(d=>{const q=reqDocs(p).find(x=>x.type===d.type);d.status='Verified';d.file=d.type.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_$/,'')+'.pdf';d.verifiedBy=q&&q.check?'Auto · '+({fmcsa:'FMCSA SAFER',insurance:'Insurer COI verification',background:'Background screening provider'})[q.check]:'Ops · Sasha Patel';d.expires=q&&q.exp?addDays(S,(o.exp&&o.exp[d.type]!=null)?o.exp[d.type]:120+Math.floor(r()*300)):null});
    p.agreements.forEach(a=>{a.status='Signed';a.signedAt=p.approvedAt;a.envelope='ENV-'+hex().slice(0,6)});if(!paidThroughParent(p))p.payment=isBilling(p)?{method:'ACH debit',status:'Verified',terms:'Net 30',detail:'Billing account verified'}:{method:o.pay||'ACH',status:'Verified',last4:String(1000+Math.floor(r()*8999)),detail:'Micro-deposits matched'};else p.payment={method:'Paid through '+p.parentName,status:'Verified'};
    checksFor(p).forEach(k=>p.checks[k]={status:'Pass',at:p.approvedAt,detail:k==='fmcsa'?'Authority active · no OOS order':k==='insurance'?'Limits meet minimums':'Clear'});return p};
  // DSPs and carriers
  const dspA=full(P('DSP','Eastside Express Logistics LLC',{short:'Eastside Express',city:'Bellevue',age:240,owner:'u-sasha',contact:{name:'Carla Mendes',email:'ops@eastsideexpress.example',phone:'(425) 555-0144'},lines:['pd','bulky'],vehicleTypes:['Cargo van','Box truck'],fleet:['Sprinter 170" · WA C47120','Transit 148" · WA C33018',"26' box · liftgate · WA D11902","24' box · liftgate · WA D20871"],wtdPrior:3184.4,source:'Sales referral'}),{tta:9});
  const dspB=full(P('DSP','Rainier Final Mile Inc',{short:'Rainier Final Mile',city:'Seattle',age:180,owner:'u-miguel',contact:{name:'Dev Raman',email:'dispatch@rainierfm.example',phone:'(206) 555-0181'},lines:['pd','wg'],vehicleTypes:['Cargo van','Padded box truck'],fleet:['ProMaster 159" · WA C29031',"20' padded box · liftgate · WA W1101","24' padded box · liftgate · WA W1103"],wtdPrior:2710.15}),{tta:7});
  const dspC=P('DSP','Sound Route Partners LLC',{short:'Sound Route Partners',city:'Tacoma',age:6,owner:'u-hannah',contact:{name:'Ty Wells',email:'ty@soundroute.example',phone:'(253) 555-0102'},lines:['pd'],vehicleTypes:['Cargo van'],source:'Recruiting · Indeed'});
  dspC.docs.forEach((d,i)=>{if(i<2){d.status=i===0?'Pending review':'Verified';d.expires=addDays(S,300);d.file='upload_'+i+'.pdf'}});dspC.agreements[0].status='Sent';dspC.agreements[0].envelope='ENV-'+hex().slice(0,6);dspC.status='Needs team review';
  const carA=full(P('Carrier','Cascade Freight Lines Inc',{short:'Cascade Freight',city:'Kent',age:400,owner:'u-miguel',usdot:'3318820',mc:'MC-1182044',contact:{name:'Rob Tanaka',email:'safety@cascadefreight.example',phone:'(253) 555-0170'},lines:['ltl','shuttle'],vehicleTypes:["28' pup","53' dry van",'Day cab tractor'],fleet:["28' pup · liftgate · TR-1180","53' van · TR-2241","28' pup · liftgate · TR-1192",'Tractor TR-412'],wtdPrior:5420}),{tta:12});
  const carB=full(P('Carrier','Valley Drayage Co',{short:'Valley Drayage',city:'Auburn',age:300,owner:'u-sasha',usdot:'2984411',mc:'MC-1029977',contact:{name:'Ana Ruiz',email:'ana@valleydrayage.example',phone:'(253) 555-0133'},lines:['shuttle'],vehicleTypes:['Day cab tractor',"26' box truck",'Sprinter'],fleet:['Tractor TR-218','Box BOX-26-07','Van VAN-77'],wtdPrior:3910}),{tta:10,exp:{'Auto liability insurance (COI)':12}});
  // drivers linked to dispatch roster
  const DR=(wid,parent,o={})=>{const d=S.drivers.find(x=>x.id===wid);const par=parent&&partner(S,parent);const p=P('Driver',d?d.name:o.name,Object.assign({parent:parent||null,parentName:par?short(par):'',city:o.city||'Seattle',age:o.age||90,driverId:'CX-DRV-'+String(++drvN).padStart(6,'0'),dispatchDriver:wid,lines:o.lines||(d?[d.line]:[]),vehicleTypes:o.vt||(par?par.vehicleTypes:[]),contact:{name:d?d.name:o.name,email:(d?d.name:o.name).toLowerCase().replace(/[^a-z]+/g,'.')+'@mail.example',phone:'(206) 555-01'+String(drvN).padStart(2,'0')}},o.p||{}));
    full(p,{exp:o.exp||{},pay:o.pay});if(d)d.partnerId=p.id;if(par&&d&&!par.drivers)par.drivers=[];return p};
  DR('avery',dspA.id,{city:'Bellevue',exp:{"Driver's license":400}});DR('drew',dspA.id);DR('lena',dspA.id,{city:'Bellevue'});DR('chris',dspA.id);
  DR('maria',dspB.id);DR('marcus',dspB.id,{lines:['wg']});DR('kai',dspB.id,{lines:['wg']});
  const jam=DR('jamal',null,{vt:['Cargo van'],exp:{'Auto insurance (COI)':-3},pay:'Zelle'});
  DR('dee',null,{vt:['Box truck'],exp:{"Driver's license":9}});
  DR('ben',null,{lines:['bulky'],vt:['Box truck','Padded box truck']});
  DR('jorge',carA.id,{city:'Kent'});DR('priya',carA.id,{city:'Kent'});DR('tom',carA.id,{city:'Kent'});DR('leo',carA.id,{lines:['shuttle']});DR('ivan',carA.id,{lines:['shuttle'],city:'Kent'});
  DR('sam',carB.id,{city:'Kent'});DR('rosa',carB.id,{city:'Kent'});DR('mia',carB.id,{city:'Bellevue'});
  // idle DSP driver for the DSP-assign flow
  const nate={id:'nate',name:'Nate Silva',driverId:'CX-1188',line:'pd',team:'pd-bel',duty:true,loc:S.hubs.BEL1.ll.slice(),home:S.hubs.BEL1.ll.slice(),hub:'BEL1',hubName:S.hubs.BEL1.name,vehicle:'Transit 130" · WA C51177',helper:'',skills:[],route:{id:'PD-BEL-05',stage:'not_started',checkin:'none'},sos:false};S.drivers.push(nate);DR('nate',dspA.id,{city:'Bellevue'});
  // jamal suspended by expired insurance (sweep below emits the events)
  // onboarding pipeline (not yet in dispatch)
  const ob=[['Driver','Luis Romero',{parent:dspC.id,parentName:'Sound Route Partners',lines:['pd'],vehicleTypes:['Cargo van'],age:5,stage:2}],['Driver','Grace Liu',{parent:dspC.id,parentName:'Sound Route Partners',lines:['pd'],vehicleTypes:['Cargo van'],age:4,stage:1}],
    ['Driver','Andre Wallace',{lines:['bulky'],vehicleTypes:['Box truck'],age:3,stage:3,source:'Self-serve'}],['Driver','Priscilla Nguyen',{lines:['pd'],vehicleTypes:['Cargo van'],age:9,stage:4,sim:{background:'review'},source:'Recruiting · Indeed'}],['Driver','Hector Ramos',{lines:['wg'],vehicleTypes:['Padded box truck'],age:2,stage:0,source:'Self-serve'}],
    ['Driver','Tasha Greene',{lines:['pd'],vehicleTypes:['Cargo van'],age:14,stage:2,source:'Referral'}],['Driver','Mohammed Ali',{lines:['ltl'],vehicleTypes:["53' dry van"],age:7,stage:3,parent:carA.id,parentName:'Cascade Freight'}],
    ['Carrier','Northgate Transport LLC',{short:'Northgate Transport',usdot:'4102275',mc:'MC-1402213',lines:['ltl'],vehicleTypes:["53' dry van"],age:8,stage:2,sim:{insurance:'fail'},source:'Self-serve'}],
    ['Warehouse','Puget Cross-Dock · Tukwila',{lines:['shuttle'],age:11,stage:3,facilities:['Tukwila cross-dock · 14 doors']}],['DSP','Lakeside Delivery Co',{short:'Lakeside Delivery',lines:['pd','bulky'],vehicleTypes:['Cargo van','Box truck'],age:16,stage:4,sim:{manual:true},source:'Sales referral'}]];
  ob.forEach(([type,name,o])=>{const p=P(type,name,Object.assign({owner:['u-hannah','u-sasha','u-miguel',null][Math.floor(r()*4)]},o));if(type==='Driver')p.driverId='CX-DRV-'+String(++drvN).padStart(6,'0');const st=o.stage;
    p.docs.forEach((d,i)=>{if(st>=2||(st===1&&i<1)){const q=reqDocs(p).find(x=>x.type===d.type);d.status=st>=2?(i===0&&st===2?'Pending review':'Verified'):'Pending review';d.expires=q.exp?addDays(S,200+i*30):null;d.file='upload_'+i+'.pdf';if(d.status==='Verified')d.verifiedBy='Auto · simulated'}});
    if(st>=3)p.agreements.forEach(a=>{a.status='Signed';a.signedAt=addDays(S,-1);a.envelope='ENV-'+hex().slice(0,6)});else if(st>=1)p.agreements.forEach(a=>{a.status='Sent';a.envelope='ENV-'+hex().slice(0,6)});
    if(st>=4&&!paidThroughParent(p))p.payment={method:'ACH',status:'Verified',last4:'4471',detail:'Micro-deposits matched'};if(paidThroughParent(p))p.payment={method:'Paid through '+o.parentName,status:'Verified'};
    if(st>=3)checksFor(p).forEach(k=>{if(o.sim&&o.sim[k]==='review'){p.checks[k]={status:'Review',at:today(S),detail:'Record found · needs adjudication'}}else if(o.sim&&o.sim[k]==='fail'){p.checks[k]={status:'Fail',at:today(S),detail:'Coverage below minimum'}}else p.checks[k]={status:'Pass',at:today(S),detail:'Clear'}});
    if(o.sim&&o.sim.insurance==='fail'){const d=p.docs.find(x=>/insurance/i.test(x.type));if(d){d.status='Rejected';d.verifiedBy='Auto · Insurer COI verification'}p.checks.insurance={status:'Fail',at:today(S),detail:'Coverage below minimum ($1M auto liability required)'}}
    p.status=st>=4?'Needs team review':st===3&&o.sim?'Needs team review':'Completing setup'});
  P('Driver','Kevin Shaw',{lines:['pd'],vehicleTypes:['Cargo van'],age:210,status:'Closed',source:'Portal invite',notes:[{at:addDays(S,-30),by:'Sasha Patel',text:'Closed at partner request (moved out of state).'}]}).driverId='CX-DRV-'+String(++drvN).padStart(6,'0');
  // shippers / customers (own contracts, stations, facilities)
  const cust=(type,name,o)=>{const p=full(P(type,name,Object.assign({age:500,owner:'u-nina'},o)),{tta:14});(o.contracts||[]).forEach(c=>{if(S.contracts[c])S.contracts[c].shipper=p.id});return p};
  cust('Customer','Summit Parcel Network',{contracts:['PD-COM'],stations:['BEL1'],city:'Bellevue',contact:{name:'Regional ops',email:'pnw-ops@summitparcel.example',phone:''}});
  cust('Customer','Harborline Parcel',{contracts:['PD-OT'],stations:['SEA1'],city:'Seattle',contact:{name:'Seattle terminal',email:'sea@harborline.example',phone:''}});
  cust('Shipper','Ridgeline Outfitters',{short:'Ridgeline',contracts:['PD-RG'],stations:['SEA1'],city:'Seattle'});
  cust('Shipper','Northline Home',{contracts:['BK-RET','SH-3PL'],stations:['KNTB','KNT-DC'],city:'Kent'});
  cust('Shipper','Kestrel Appliances',{contracts:['BK-APP','WG-APPL'],stations:['KNTB','WGH'],city:'Renton'});
  cust('Shipper','Alder & Oak Furniture',{contracts:['WG-FURN'],stations:['WGH'],city:'Seattle'});
  cust('Shipper','Cascade Fixtures (LTL accounts)',{short:'LTL shipper accounts',contracts:['LT-STD'],stations:['KNT'],city:'Kent'});
  cust('Shipper','Pacific Builders Supply',{contracts:['LT-KEY'],stations:['KNT'],city:'Auburn'});
  cust('Warehouse','ChainEx Facilities (internal)',{short:'ChainEx internal',contracts:['SH-INT'],stations:['KNT-DC','SEA-SODO','BEL-WH','EVT-WH'],facilities:['Kent DC','Seattle SoDo','Bellevue warehouse','Everett warehouse']});
  const wg=Object.values(S.hubs).find(h=>h.line==='wg');if(wg)S.partners.forEach(p=>{p.stations=p.stations.map(s=>s==='WGH'?wg.id:s)});
  // customer-manager users scoped to stations
  const jit=S.partners.find(p=>p.name==='Summit Parcel Network'),ont=S.partners.find(p=>p.name==='Harborline Parcel');
  S.users.push({id:'u-spn',name:'Summit Parcel PNW manager',email:'pnw-ops@summitparcel.example',role:'Viewer',customers:[{customer:jit.id,stations:['BEL1']}],external:true},{id:'u-hpl',name:'Harborline Seattle manager',email:'sea@harborline.example',role:'Viewer',customers:[{customer:ont.id,stations:['SEA1']}],external:true});
  S.users.find(u=>u.id==='u-nina').customers=[{customer:jit.id,stations:['BEL1']},{customer:ont.id,stations:['SEA1']}];
  // recruiting pipeline
  const RC=[['Marisol Vega','Driver','pd','Submitted','Indeed'],['Darnell Fox','Driver','bulky','Contact requested','Referral'],['Quick Lane Couriers','DSP','pd','Interview','Sales referral'],['Yuki Sato','Driver','wg','Reviewing','Self-serve'],['Brett Olson','Driver','ltl','Submitted','CDL school'],['Harbor Line Freight','Carrier','ltl','Reviewing','FMCSA lookup'],['Owen Pike','Driver','pd','Closed','Indeed'],['Fatima Noor','Driver','pd','Talent pool','Job fair'],['Ricardo Gomez','Driver','shuttle','Interview','CDL school']];
  S.recruits=RC.map(([name,type,line,stage,source],i)=>({id:'R-'+(301+i),name,type,line,stage,source,owner:i%2?'u-hannah':null,lastTouch:addDays(S,-(i%5)),partnerId:null,city:['Seattle','Kent','Bellevue','Tacoma','Everett'][i%5]}));
  S.partners.filter(p=>p.status!=='Fully approved'&&p.status!=='Closed').forEach((p,i)=>S.recruits.push({id:'R-'+(320+i),name:p.name,type:p.type,line:p.lines[0]||'pd',stage:'Onboarding',source:p.source,owner:p.owner,lastTouch:addDays(S,-1),partnerId:p.id,city:p.city}));
  S.recruits.push({id:'R-340',name:'Nate Silva',type:'Driver',line:'pd',stage:'Active',source:'DSP roster',owner:'u-hannah',lastTouch:addDays(S,-20),partnerId:S.drivers.find(d=>d.id==='nate').partnerId,city:'Bellevue'});
  // queue: reviews for partners in team review + seeded aging
  S.partners.filter(p=>p.status==='Needs team review').forEach((p,i)=>{const pr=p.checks.background&&p.checks.background.status==='Review';const fail=p.checks.insurance&&p.checks.insurance.status==='Fail';
    enqueue(S,pr?'Background check review':fail?'Insurance rejected · contact partner':p.docs.some(d=>d.status==='Pending review')?'Review documents':'Approve partner',p.id,{createdH:nowH(S)-[30,6,14,3][i%4],slaH:24,owner:i%2?'u-sasha':null,priority:pr||fail?'High':'Normal'})});
  S.partners.filter(p=>p.status==='Completing setup').slice(0,4).forEach((p,i)=>enqueue(S,'Stalled onboarding · nudge partner',p.id,{createdH:nowH(S)-[50,20,8,2][i],slaH:48,owner:i===0?'u-hannah':null}));
  sweep(S);
  // seeded tender to a DSP (Eastside Express) for the DSP flow: 3 late-sort stops
  tender(S,api,'pd',dspA.id,['PD-LS-01','PD-LS-02','PD-LS-08'],'Seed');
  audit(S,'Jordan Lee','Workspace opened','—','Pilot sample data loaded');S.audit.push({at:addDays(S,-1)+' 4:12 PM',h:-8,actor:'Sasha Patel',action:'Approved',target:dspA.id,detail:'Annual re-verification'});
  S.partners.forEach(p=>{if(p.status==='Fully approved'&&!p.suspended&&p.type!=='Shipper'&&p.type!=='Customer'&&p.createdAt>=addDays(S,-60))S.events.push({name:'partner.approved',at:p.approvedAt,h:-24,payload:{id:p.id,name:p.name}})})}
function tender(S,api,line,dspId,taskIds,actor){const dsp=partner(S,dspId);const cfg=C.lines[line]||{};const n=S.drivers.filter(d=>d.dspSlot).length+1;const team=(S.teams.find(t=>t.line===line)||{}).id;const hubId=(S.teams.find(t=>t.id===team)||{}).hub;const hub=S.hubs[hubId]||{ll:cfg.defaultLL||[-122.2,47.6],name:''};
  const slot={id:'dsp-'+line+'-'+n,name:`${short(dsp)} · driver TBD`,driverId:'—',line,team,duty:false,loc:hub.ll.slice(),home:hub.ll.slice(),hub:hubId,hubName:hub.name,vehicle:'Assigned by DSP',helper:'',skills:[],route:{id:`${cfg.prefix||'RT'}-DSP-${String(n).padStart(2,'0')}`,stage:'not_started',checkin:'none'},sos:false,dspSlot:true,partnerId:dspId,tenderedAt:S.clock};
  S.drivers.push(slot);(taskIds||[]).forEach(id=>{const t=C.task(id);if(t&&t.state==='unassigned')C.ops.assign(id,slot.id,null,null,actor||'Dispatcher')});C.ops.optimize&&C.route(slot.id).length>1&&C.ops.optimize(slot.id);
  event(S,'route.tendered',{id:slot.route.id,name:short(dsp),detail:`${C.route(slot.id).length} ${cfg.stopWord||'stops'} · ${LINE_NAMES[line]}`},line);audit(S,actor||'Dispatcher','Route tendered to DSP',dspId,slot.route.id);return slot}
// ---------- module ----------
C.registerModule({id:'partners',seed,
  onLineSeed(line,S){// re-link reseeded drivers to their partner records
    S.partners.forEach(p=>{if(p.dispatchDriver){const d=S.drivers.find(x=>x.id===p.dispatchDriver);if(d)d.partnerId=p.id}});S.partners.forEach(p=>(p.contracts||[]).forEach(c=>{if(S.contracts[c])S.contracts[c].shipper=p.id}))},
  onComplete(t,S){},
  onRouteClosed(d,S){if(d.dspSlot)return;const done=C.routeAll(d.id).filter(t=>t.state==='completed');const p=partner(S,d.partnerId);event(S,'route.completed',{id:d.route.id,name:d.name,detail:`${done.length} ${(C.lines[d.line]||{}).stopWord||'stops'} · $${done.reduce((a,t)=>a+earn(t),0).toFixed(2)} to ${p?short(p.parent?partner(S,p.parent):p):'—'}`},d.line)},
  ops:(api,ops)=>({
    tenderRoute(line,dspId,taskIds){return tender(api.S,api,line,dspId,taskIds,'Dispatcher')},
    dspAssignDriver(slotId,wid,actor){const S=api.S,slot=C.driver(slotId),d=C.driver(wid);if(!slot||!d)return false;const e=eligibility(wid,slot.line);if(!e.ok){ops.lastBlock=e.reasons;return false}
      const open=C.route(slotId);const had=C.route(wid).length;open.forEach(t=>ops.assign(t.id,wid,null,null,actor||short(partner(S,slot.partnerId))));if(!had)d.route.id=slot.route.id;S.drivers=S.drivers.filter(x=>x.id!==slotId);
      event(S,'route.accepted',{id:slot.route.id,name:short(partner(S,slot.partnerId)),detail:`assigned to ${d.name}`},slot.line);audit(S,actor||short(partner(S,slot.partnerId)),'DSP assigned driver',slot.partnerId,`${slot.route.id} → ${d.name}`);return true},
    recallTender(slotId){const S=api.S,slot=C.driver(slotId);C.route(slotId).forEach(t=>ops.assign(t.id,null));S.drivers=S.drivers.filter(x=>x.id!==slotId);audit(S,'Dispatcher','Tender recalled',slot.partnerId,slot.route.id)},
    pApply(type,f){const S=api.S;const r=CXGeo.rng(Date.now()%100000);const hex=Array.from({length:8},()=>'0123456789ABCDEF'[Math.floor(r()*16)]).join('');
      const p={id:'P-'+hex,type,name:f.name,short:f.short||f.name,legal:f.legal||f.name,contact:{name:f.contact||f.name,email:f.email||'',phone:f.phone||''},city:f.city||'Seattle',state:'WA',status:'Completing setup',suspended:false,createdAt:today(S),approvedAt:null,owner:null,profile:true,docs:[],agreements:[],payment:{method:null,status:'Missing'},lines:f.lines||[],vehicleTypes:f.vehicleTypes||[],parent:f.parent||null,parentName:f.parent?short(partner(S,f.parent)):'',driverId:null,stations:[],facilities:[],contracts:[],fleet:[],notes:[],checks:{},sim:f.sim||{},source:f.source||'Self-serve',usdot:f.usdot||'',mc:f.mc||'',wtdPrior:0};
      if(type==='Driver')p.driverId='CX-DRV-'+String(10+S.partners.filter(x=>x.driverId).length+1).padStart(6,'0');p.docs=reqDocs(p).map(q=>({type:q.type,status:'Missing',expires:null,file:''}));p.agreements=reqAgreements(p).map(a=>({name:a,status:'Sent',signedAt:null,envelope:'ENV-'+hex.slice(0,6)}));checksFor(p).forEach(k=>p.checks[k]={status:'Not run'});if(paidThroughParent(p))p.payment={method:'Paid through '+p.parentName,status:'Verified'};
      S.partners.push(p);audit(S,f.name,'Application submitted',p.id,`${type} · ${(p.lines||[]).map(l=>LINE_NAMES[l]).join(', ')}`);event(S,'partner.created',{id:p.id,name:p.name,type});if(f.recruit){const rc=S.recruits.find(x=>x.id===f.recruit);if(rc){rc.partnerId=p.id;rc.stage='Onboarding'}}else S.recruits.push({id:'R-'+(400+S.recruits.length),name:p.name,type,line:p.lines[0]||'pd',stage:'Onboarding',source:p.source,owner:null,lastTouch:today(S),partnerId:p.id,city:p.city});return p.id},
    pUploadDoc(pid,type,f,actor){const S=api.S,p=partner(S,pid);let d=p.docs.find(x=>x.type===type);if(!d){d={type};p.docs.push(d)}Object.assign(d,{status:'Pending review',file:f.file||type.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'.pdf',expires:f.expires||null,uploadedAt:today(S),expiredSent:false,warnSent:false,verifiedBy:''});
      audit(S,actor||p.name,'Document uploaded',pid,`${type}${f.expires?' · expires '+fmtDate(f.expires):''}`);event(S,'document.uploaded',{id:pid,name:p.name,detail:type});if(f.autoCheck!==false)runChecks(S,pid,actor);sweep(S)},
    pReviewDoc(pid,type,ok,actor){const S=api.S,p=partner(S,pid),d=p.docs.find(x=>x.type===type);d.status=ok?'Verified':'Rejected';d.verifiedBy=(ok?'Approved':'Rejected')+' · '+(actor||'Ops');audit(S,actor,ok?'Document approved':'Document rejected',pid,type);sweep(S);evaluate(S,pid,actor)},
    pSendAgreement(pid,name,actor){const S=api.S,p=partner(S,pid),a=p.agreements.find(x=>x.name===name);a.status='Sent';a.envelope=a.envelope||'ENV-'+Math.random().toString(16).slice(2,8).toUpperCase();audit(S,actor,'Agreement sent for e-signature',pid,name)},
    pSignAgreement(pid,name,signer){const S=api.S,p=partner(S,pid),a=p.agreements.find(x=>x.name===name);a.status='Signed';a.signedAt=today(S);a.signer=signer||p.contact.name;audit(S,signer||p.name,'Agreement e-signed',pid,name);event(S,'agreement.signed',{id:pid,name:p.name,detail:name});evaluate(S,pid)},
    pSetPayment(pid,f,actor){const S=api.S,p=partner(S,pid);p.payment=Object.assign({status:'Pending'},f);audit(S,actor||p.name,isBilling(p)?'Billing setup submitted':'Payout method submitted',pid,`${f.method}${f.last4?' ···'+f.last4:''}`);event(S,'payment_method.updated',{id:pid,name:p.name,detail:f.method})},
    pSubmit(pid,actor){const S=api.S;const res=runChecks(S,pid,actor||'Partner portal');sweep(S);return res},
    pRunChecks(pid,actor){return runChecks(api.S,pid,actor)},
    pApprove(pid,actor){approve(api.S,pid,actor)},
    pSetStatus(pid,status,actor,why){const S=api.S,p=partner(S,pid);const old=p.status;p.status=status;if(status==='Fully approved')return approve(S,pid,actor);audit(S,actor,'Status changed',pid,`${old} → ${status}${why?' · '+why:''}`);event(S,status==='Closed'?'partner.closed':'partner.updated',{id:pid,name:p.name,detail:status})},
    pEdit(pid,f,actor){const S=api.S,p=partner(S,pid);const before=JSON.stringify([p.lines,p.vehicleTypes]);['name','short','city','owner'].forEach(k=>{if(f[k]!=null)p[k]=f[k]});if(f.lines)p.lines=f.lines;if(f.vehicleTypes)p.vehicleTypes=f.vehicleTypes;if(f.contact)Object.assign(p.contact,f.contact);
      audit(S,actor,'Partner edited',pid,JSON.stringify([p.lines,p.vehicleTypes])!==before?`Lines: ${p.lines.map(l=>LINE_NAMES[l]).join(', ')||'none'} · Vehicles: ${p.vehicleTypes.join(', ')||'none'}`:'Profile');if(JSON.stringify([p.lines,p.vehicleTypes])!==before)event(S,'partner.updated',{id:pid,name:p.name,detail:'service lines / vehicle types'})},
    pNote(pid,text,actor){const S=api.S,p=partner(S,pid);p.notes.unshift({at:today(S),by:actor,text});audit(S,actor,'Note added',pid,text.slice(0,60))},
    pAddToDispatch(pid,line,actor){const S=api.S,p=partner(S,pid);const cfg=C.lines[line];const team=S.teams.find(t=>t.line===line);const v=S.vehicles.find(x=>x.line===line&&(!p.vehicleTypes.length||p.vehicleTypes.includes(x.type)));
      const d=ops.saveDriver({line,name:p.name,driverId:p.driverId,team:team&&team.id,hub:team&&team.hub,vehicle:v?v.name:''});d.partnerId=p.id;p.dispatchDriver=d.id;audit(S,actor,'Added to dispatch roster',pid,`${LINE_NAMES[line]} · ${d.route.id}`);event(S,'driver.rostered',{id:pid,name:p.name,detail:LINE_NAMES[line]},line);return d},
    qAssign(ids,owner,actor){const S=api.S;[].concat(ids).forEach(id=>{const q=S.queue.find(x=>x.id===id);if(q)q.owner=owner||null});audit(S,actor,'Queue owner set',[].concat(ids).join(', '),owner?(S.users.find(u=>u.id===owner)||{}).name:'Unassigned')},
    qStatus(ids,status,actor){const S=api.S;[].concat(ids).forEach(id=>{const q=S.queue.find(x=>x.id===id);if(!q)return;q.status=status;if(status==='Snoozed')q.slaH+=24;if(status==='Snoozed')q.status='Open'});audit(S,actor,status==='Done'?'Queue item resolved':'Queue item snoozed 24h',[].concat(ids).join(', '))},
    rMove(id,stage,actor){const S=api.S,r=S.recruits.find(x=>x.id===id);r.stage=stage;r.lastTouch=today(S);audit(S,actor,'Recruit moved',id,`${r.name} → ${stage}`)},
    rAdd(f,actor){const S=api.S;const r={id:'R-'+(500+S.recruits.length),name:f.name,type:f.type||'Driver',line:f.line||'pd',stage:'Submitted',source:f.source||'Manual',owner:f.owner||null,lastTouch:today(S),partnerId:null,city:f.city||'Seattle'};S.recruits.unshift(r);audit(S,actor,'Recruit added',r.id,r.name);return r},
    payCreate(actor){const S=api.S;const rows=settlement(S);const wk=46+Math.floor((S.dayOffset||0)/7);const b={id:`PB-2026-W${wk}-${S.payouts.length+1}`,period:'Week of Nov 9, 2026 (to date)',status:'Draft',createdBy:actor,createdAt:today(S),items:rows.map(r=>({payee:r.payee,amount:+(r.total+r.prior).toFixed(2),today:+r.total.toFixed(2)})).filter(i=>{const p=partner(S,i.payee);return p&&!isBilling(p)})};S.payouts.unshift(b);audit(S,actor,'Payout batch created',b.id,`${b.items.length} payees · $${b.items.reduce((a,i)=>a+i.amount,0).toFixed(2)}`);return b},
    payStatus(id,status,actor){const S=api.S,b=S.payouts.find(x=>x.id===id);b.status=status;b[status.toLowerCase()+'By']=actor;audit(S,actor,'Payout batch '+status.toLowerCase(),id);if(status==='Paid')event(S,'payout.paid',{id,name:`${b.items.length} payees`,detail:'$'+b.items.reduce((a,i)=>a+i.amount,0).toFixed(2)})},
    qAutoRoute(actor){const S=api.S;let n=0;S.queue.forEach(q=>{if(q.status==='Open'&&!q.owner){q.owner=routeOwner(S,q.kind,q.partnerId);n++}});S.meta.autoRoute=true;audit(S,actor,'Queue auto-routed',`${n} items`,'Rules: Driver/DSP → Onboarding (Hannah) · Carrier/Warehouse → Compliance (Miguel) · Payments → Finance (Owen) · Shippers → Sales (Nina) · Insurance/background → Sasha/Miguel');return n},
    setSetting(k,v,actor){api.S.meta[k]=v;audit(api.S,actor,'Setting changed',k,String(v))},
    setAutoApprove(on,actor){api.S.meta.autoApprove=!!on;audit(api.S,actor,'Setting changed','Auto-approve',on?'On':'Off')},
    setUserRole(uid,role,actor){const u=api.S.users.find(x=>x.id===uid);const old=u.role;u.role=role;audit(api.S,actor,'Role changed',u.name,`${old} → ${role}`)},
    addUser(f,actor){const u={id:'u-'+Math.random().toString(36).slice(2,7),name:f.name,email:f.email,role:f.role||'Viewer',customers:f.customers||[],external:!!f.external};api.S.users.push(u);audit(api.S,actor,'User invited',u.email,u.role);return u},
    setCustomerScope(uid,cust,stations,actor){const u=api.S.users.find(x=>x.id===uid);u.customers=u.customers.filter(c=>c.customer!==cust);if(stations.length)u.customers.push({customer:cust,stations});audit(api.S,actor,'Customer access updated',u.name,`${short(partner(api.S,cust))}: ${stations.join(', ')||'removed'}`)},
    advanceDays(n,actor){const S=api.S;S.dayOffset=(S.dayOffset||0)+n;audit(S,actor||'Test tools',`Date advanced +${n} day(s)`,'—',today(S));sweep(S)},
    sweepExpiry(){sweep(api.S)},
  })});
// shipper of a task (via contract) + station of a task
const shipperOf=t=>{const c=C.S.contracts[t.contract];return c&&c.shipper};
function stationOf(t){if(t.line==='pd'&&t.x&&t.x.zone)return t.x.zone.split('-')[0];if(t.line==='shuttle')return t.x&&t.x.from;const d=t.workerId&&C.driver(t.workerId);if(d&&d.hub)return d.hub;const h=Object.values(C.S.hubs).find(h=>h.line===t.line);return h&&h.id}
C.eligibility=eligibility;
C.portal={ROUTING,routeOwner:(k,p)=>routeOwner(C.S,k,p),RSTAGES:['Submitted','Reviewing','Contact requested','Interview','Onboarding','Active','Talent pool','Closed'],TYPES,STATUSES,ROLES,STEPS,LINE_NAMES,VEHICLE_TYPES,RATES,DOC_LBL,reqDocs,reqAgreements,checksFor,docState:d=>docState(C.S,d),stepState:p=>stepState(C.S,p),stepsDone:p=>stepsDone(C.S,p),nextAction:p=>nextAction(C.S,p),
  partner:id=>partner(C.S,id),short,today:()=>today(C.S),daysUntil:d=>daysUntil(C.S,d),addDays:n=>addDays(C.S,n),fmtDate,nowH:()=>nowH(C.S),eligibility,settlement:()=>settlement(C.S),earn,metrics:()=>metrics(C.S),can,PERM,shipperOf,stationOf,isBilling,paidThroughParent};
})();
