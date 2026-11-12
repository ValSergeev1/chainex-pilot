/* ChainEx V02 · Driver ⇄ Dispatch link: messages + "ChainEx Dispatch" AI bot tickets.
   Pilot: rule-based simulation. Production: runs on ChainEx's own AI layer (see architecture.html). Sample data only. */
(function(){const C=window.CX;if(!C)return;
const ISSUES={late:{label:'Running late',icon:'⏱'},address:{label:'Wrong or unclear address',icon:'📍'},access:{label:"Can't access building / gate",icon:'🚪'},damaged:{label:'Damaged item',icon:'📦'},vehicle:{label:'Vehicle problem',icon:'🛻'},nothome:{label:'Customer not home',icon:'🏠'},toomany:{label:'Too many stops',icon:'📚'},break:{label:'Need a break',icon:'☕'},other:{label:'Something else',icon:'💬'}};
const RX=[['vehicle',/vehicle|truck|\bvan\b|flat|tire|tyre|engine|battery|break ?down|broke down|accident|won'?t start/i],['damaged',/damag|broken|crush|leak|torn|dented/i],['nothome',/not home|no ?one|nobody|no answer|unavailable|not there|didn'?t answer/i],['access',/access|gate|\bcode\b|locked|buzz|lobby|door ?man|concierge/i],['address',/address|wrong (house|unit|apt)|can'?t find|no such|gps|location/i],['toomany',/too many|overload|can'?t finish|won'?t finish|not going to finish|too much/i],['break',/break|lunch|rest\b|bathroom|restroom/i],['late',/late|behind|traffic|delay|slow|running/i]];
function classify(text){for(const [k,r] of RX)if(r.test(text||''))return k;return 'other'}
const pick=(arr,re,fb)=>(arr||[]).find(x=>re.test(x))||fb||(arr||[])[0];
C.registerModule({id:'dlink',seed(S){S.msgs=[];S.tickets=[]},ops(api,ops){
 const S=()=>api.S;const now=()=>api.S.clock;
 function ensure(){const s=S();s.msgs=s.msgs||[];s.tickets=s.tickets||[]}
 function msg(wid,from,text,o){ensure();const m=Object.assign({id:api.uid('M'),wid,from,text,at:now(),readDriver:from==='driver',readDesk:from!=='driver'},o||{});S().msgs.push(m);if(S().msgs.length>3000)S().msgs.splice(0,S().msgs.length-3000);return m}
 function openTasks(wid){return C.route(wid)}
 function tl(t,text,actor){t.timeline.push({at:now(),text,actor})}
 function shift(wid,min,why){const d=api.driver(wid);d.route.delay=(d.route.delay||0)+min;openTasks(wid).forEach(t=>{t.x.etaShift=(t.x.etaShift||0)+min});const t=openTasks(wid)[0];if(t)tl(t,`ETA updated +${min} min · ${why}`,'ChainEx Dispatch bot');const c=t&&S().contracts[t.contract];return c&&c.tracking?'recipients with live tracking get the new ETA':'ETA updated on the dispatch board'}
 function moveEnd(t){if(!t||!t.workerId)return;t.seq=999;const all=C.routeAll(t.workerId);all.sort((a,b)=>a.seq-b.seq).forEach((x,i)=>x.seq=i);tl(t,'Moved to end of route by ChainEx Dispatch bot (driver request)','ChainEx Dispatch bot')}
 function excode(t,code){if(!t)return;if(!t.tags.includes(code))t.tags.push(code);tl(t,`Exception code ${code} logged from driver chat`,'ChainEx Dispatch bot')}
 function bestOther(wid,line,n){const d0=api.driver(wid);const c=S().drivers.filter(d=>d.id!==wid&&d.line===line&&!d.dspSlot&&(!C.eligibility||C.eligibility(d.id,line).ok)).map(d=>({d,n:openTasks(d.id).length,duty:d.duty?0:1})).sort((a,b)=>a.duty-b.duty||a.n-b.n);return c[0]&&c[0].d}
 const FIX={
  eta:{scope:'driver',run:(tk,f)=>({text:`ETA +${f.min} min · `+shift(tk.wid,f.min,tk.label)})},
  brk:{scope:'driver',run:(tk,f)=>{const d=api.driver(tk.wid);d.route.breakUntil=now()+f.min;shift(tk.wid,f.min,'driver break');return{text:`Break logged until ${api.fmt(now()+f.min)} · ETAs +${f.min} min`}}},
  moveEnd:{scope:'driver',run:(tk,f)=>{const t=api.task(f.task);moveEnd(t);return{text:`${t?t.name:'Stop'} moved to the end of your route`}}},
  excode:{scope:'driver',run:(tk,f)=>{const t=api.task(f.task);excode(t,f.code);return{text:`Exception code ${f.code} on ${t?t.name:'stop'}`}}},
  reorder:{scope:'driver',run:(tk)=>{ops.optimize(tk.wid);const d=api.driver(tk.wid);d.route.notice={at:now(),seen:false,savedKm:0,by:'ChainEx Dispatch bot'};return{text:'Remaining stops re-sequenced for the shortest drive'}}},
  contact:{scope:'dispatch',run:(tk,f)=>{const t=api.task(f.task);if(t)tl(t,`Customer contacted through masked SMS (simulated): "${f.template}"`,tk.decidedBy||'Dispatcher');return{text:'Customer messaged through a masked number'}}},
  reschedule:{scope:'dispatch',run:(tk,f)=>{const t=api.task(f.task);if(!t||!C.OPEN(t))return{text:'Stop is no longer open'};const cfg=C.lines[t.line]||{};const r=pick(cfg.reasons,f.reasonRx||/no answer|not home|unavail/i);const nx=pick(cfg.nextActions,/new appointment|reattempt|reschedul/i);ops.fail(t.id,r,nx,'Approved from driver chat ticket '+tk.id,tk.decidedBy||'Dispatcher');return{text:`${t.name} rescheduled · ${r} → ${nx}`}}},
  station:{scope:'dispatch',run:(tk,f)=>{const t=api.task(f.task);if(!t||!C.OPEN(t))return{text:'Stop is no longer open'};const cfg=C.lines[t.line]||{};const r=pick(cfg.reasons,/damag/i);const nx=pick(cfg.nextActions,/station/i,pick(cfg.nextActions,/shipper|hold/i));ops.fail(t.id,r,nx,'Damaged item · approved from driver chat '+tk.id,tk.decidedBy||'Dispatcher');return{text:`${t.name} → ${nx}; shipper notified of damage (simulated)`}}},
  reassign:{scope:'dispatch',run:(tk,f)=>{const d=api.driver(tk.wid);let ids=openTasks(tk.wid).filter(t=>t.state==='assigned').map(t=>t.id);if(f.last)ids=ids.slice(-f.last);const to=bestOther(tk.wid,d.line);if(!to||!ids.length)return{text:'No eligible driver available · kept on route',fail:true};let n=0;ids.forEach(id=>{if(ops.assign(id,to.id,null,undefined,tk.decidedBy||"Dispatcher")!==false)n++});return{text:`${n} stop(s) moved to ${to.name}`,to:to.id}}},
  review:{scope:'dispatch',run:(tk)=>({text:'Dispatcher reviewed your message'})}
 };
 function plan(kind,wid,t,text){const nm=t?t.name:'current stop',id=t&&t.id;const m=(text||'').match(/(\d{1,3})\s*(min|m\b)/i);const late=m?Math.min(180,+m[1]):20;
  switch(kind){
   case 'late':return[{type:'eta',min:late,desc:`Update ETAs on remaining stops by +${late} min`}];
   case 'address':return[{type:'excode',task:id,code:'ADDR',desc:`Log exception code ADDR on ${nm}`},{type:'moveEnd',task:id,desc:`Move ${nm} to the end of your route while Dispatch confirms the address`},{type:'contact',task:id,template:'Hi, this is your ChainEx driver. We are near your delivery but the address looks incomplete. Please reply with your unit or building number.',desc:'Text the customer for the correct address (masked number)'}];
   case 'access':return[{type:'excode',task:id,code:'ACCESS',desc:`Log exception code ACCESS on ${nm}`},{type:'moveEnd',task:id,desc:`Move ${nm} to the end of your route`},{type:'contact',task:id,template:'Hi, your ChainEx delivery is outside. We can\'t get into the building. Could you share the gate or door code, or meet us at the entrance?',desc:'Ask the customer for the access code (masked number)'}];
   case 'damaged':return[{type:'excode',task:id,code:'DAMAGED',desc:`Log exception code DAMAGED on ${nm} (photo in chat)`},{type:'station',task:id,desc:`Return ${nm} to station and notify the shipper`}];
   case 'vehicle':return[{type:'eta',min:30,desc:'Update ETAs +30 min while you are stopped'},{type:'reassign',desc:'Move your remaining assigned stops to the nearest eligible driver'}];
   case 'nothome':return[{type:'excode',task:id,code:'NOT HOME',desc:`Log exception code NOT HOME on ${nm}`},{type:'contact',task:id,template:'Hi, your ChainEx driver tried to deliver just now. Reply with a good time today or tomorrow and we\'ll come back.',desc:'Text the customer to set a new time'},{type:'reschedule',task:id,desc:`Reschedule ${nm} (new appointment)`}];
   case 'toomany':return[{type:'reorder',desc:'Re-sequence your remaining stops for the shortest drive'},{type:'reassign',last:3,desc:'Move your last 3 stops to another eligible driver'}];
   case 'break':return[{type:'brk',min:30,desc:'Log a 30-min break and shift ETAs'}];
   default:return[{type:'review',desc:'Send your message to the dispatcher on duty for review'}];
  }}
 return{
  msgSend(wid,from,text,actor){if(!wid||!String(text||'').trim())return null;const d=api.driver(wid);const m=msg(wid,from,String(text).trim(),{actor:actor||(from==='driver'?(d&&d.name):'Dispatch')});api.log(from==='driver'?`Message from ${d?d.name:wid}: ${m.text.slice(0,60)}`:`Dispatch → ${d?d.name:wid}: ${m.text.slice(0,60)}`,from==='driver'?'driver':'desk',d&&d.line);return m},
  msgRead(wid,side){ensure();S().msgs.forEach(m=>{if(m.wid===wid){if(side==='driver')m.readDriver=true;else m.readDesk=true}})},
  botIssue(wid,kind,taskId,text){ensure();const d=api.driver(wid);if(!d)return null;kind=ISSUES[kind]?kind:classify(text);const t=(taskId&&api.task(taskId))||openTasks(wid)[0]||null;
   const fixes=plan(kind,wid,t,text).map(f=>Object.assign(f,{scope:FIX[f.type].scope,status:FIX[f.type].scope==='driver'?'applied':'pending'}));
   const tk={id:'TK-'+Math.random().toString(36).slice(2,6).toUpperCase(),wid,driver:d.name,line:d.line,route:d.route.id,kind,label:ISSUES[kind].label,text:text||'',taskId:t&&t.id,stop:t&&t.name,at:now(),fixes,status:'applied',results:[]};
   fixes.filter(f=>f.scope==='driver').forEach(f=>{try{tk.results.push(FIX[f.type].run(tk,f).text)}catch(e){f.status='failed'}});
   const pend=fixes.filter(f=>f.scope==='dispatch');tk.status=pend.length?'pending':'applied';S().tickets.unshift(tk);
   const body=`${ISSUES[kind].icon} ${ISSUES[kind].label}${t?' · '+t.name:''}.\n`+(tk.results.length?'Done now: '+tk.results.join('; ')+'.\n':'')+(pend.length?'Sent to Dispatch for one-click approval: '+pend.map(f=>f.desc).join('; ')+'.':'No dispatcher approval needed.');
   msg(wid,'bot',body,{ticket:tk.id,readDesk:!pend.length});
   api.log(`ChainEx Dispatch bot · ${d.name}: ${tk.label}${pend.length?' · needs approval':' · fixed in route'} (${tk.id})`,pend.length?'exception':'driver',d.line);
   if(S().audit)S().audit.unshift({at:(C.portal&&C.portal.today?C.portal.today()+' ':'')+api.fmt(now()),actor:'ChainEx Dispatch bot',action:`Ticket ${tk.id} · ${tk.label}`,target:d.line,detail:tk.status,area:'bot'});
   return tk},
  ticketDecide(id,approve,actor){ensure();const tk=S().tickets.find(x=>x.id===id);if(!tk||tk.status!=='pending')return null;if(window.CXS){const st=CXS.staff&&CXS.staff();if(!st||!CXS.can('dispatch',st)||!(CXS.lines(st)||[]).includes(tk.line))return{ok:false,why:'Not your team\'s ticket'}}
   tk.decidedBy=actor||'Dispatcher';tk.decidedAt=now();const out=[];
   tk.fixes.filter(f=>f.status==='pending').forEach(f=>{if(approve){try{const r=FIX[f.type].run(tk,f);f.status=r.fail?'failed':'applied';out.push(r.text)}catch(e){f.status='failed';out.push('Could not apply: '+f.desc)}}else f.status='declined'});
   tk.status=approve?'approved':'declined';tk.results=tk.results.concat(out);
   msg(tk.wid,'dispatch',approve?`✓ Approved by ${tk.decidedBy}: ${out.join('; ')}.`:`Dispatch declined the request for ${tk.label.toLowerCase()} (${tk.decidedBy}). Keep the stop on your route; call Dispatch if you need help.`,{ticket:tk.id,actor:tk.decidedBy});
   const d=api.driver(tk.wid);d.route.botNote={id:tk.id,status:tk.status,at:now(),seen:false};
   api.log(`${tk.decidedBy} ${approve?'approved':'declined'} driver ticket ${tk.id} (${tk.driver} · ${tk.label})`,'desk',tk.line);
   if(S().audit)S().audit.unshift({at:(C.portal&&C.portal.today?C.portal.today()+' ':'')+api.fmt(now()),actor:tk.decidedBy,action:`${approve?'Approved':'Declined'} bot ticket ${tk.id}`,target:tk.line,detail:tk.label,area:'bot'});
   return{ok:true,status:tk.status,results:out}},
  botNoteSeen(wid){const d=api.driver(wid);if(d&&d.route.botNote)d.route.botNote.seen=true}
 }}});
C.dlink={ISSUES,classify,unreadDesk:(lines)=>(C.S.msgs||[]).filter(m=>!m.readDesk&&(!lines||lines.includes((C.driver(m.wid)||{}).line))).length,pending:(lines)=>(C.S.tickets||[]).filter(t=>t.status==='pending'&&(!lines||lines.includes(t.line)))};
})();
