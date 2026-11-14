/* ChainEx V06 · delivery outcomes (delivery6.js) → window.CXDO
   One catalog for the driver app, Dispatch settings and the API (api/src/lib/delivery.js uses the same codes):
   - placements (where it was left / who took it), secure access (gate / door codes, lockbox, key fob, smart garage),
   - attempt / exception reasons with retry + return-to-sender rules,
   - proofs per outcome: photo, signature, name, ID / age 21+, PIN / OTP, geofence,
   - customer instructions + preferences shown before arrival, Bulky / White glove extras.
   Proofs are configurable per shipper (contract) and service line: S.v06.delivery.policy[contract|'*'][line].
   Sample data only: codes, names and notes below are generated, never real. */
(function(){'use strict';const C=window.CX;if(!C)return;
const PLACEMENTS=[
 {id:'front_door',label:'Front door',grp:'Door'},{id:'back_door',label:'Back door',grp:'Door'},{id:'side_door',label:'Side door',grp:'Door'},
 {id:'porch',label:'Porch',grp:'Door'},{id:'garage',label:'Garage',grp:'Door'},{id:'behind_gate',label:'Behind the gate',grp:'Door'},
 {id:'safe_place',label:'Safe place (customer note)',grp:'Door',needsInstr:true},
 {id:'in_garage',label:'In-garage (smart access)',grp:'Door',needsAccess:'garage'},
 {id:'mailroom',label:'Mailroom',grp:'Building'},{id:'leasing_office',label:'Leasing office / front desk',grp:'Building',attended:true},
 {id:'locker',label:'Locker / parcel box',grp:'Building'},{id:'inside_building',label:'Inside building / vestibule',grp:'Building'},
 {id:'receptionist',label:'Receptionist',grp:'Person',attended:true},{id:'recipient',label:'Handed to recipient',grp:'Person',attended:true},
 {id:'neighbor',label:'Neighbor',grp:'Person',attended:true,neighbor:true}];
const BIG_PLACEMENTS=[
 {id:'room_of_choice',label:'Room of choice',grp:'Door'},{id:'inside_threshold',label:'Inside threshold',grp:'Door'},{id:'garage',label:'Garage',grp:'Door'},
 {id:'first_dry_area',label:'First dry area',grp:'Door'},{id:'curbside',label:'Curbside (customer request)',grp:'Door'},
 {id:'leasing_office',label:'Leasing office / front desk',grp:'Building',attended:true},{id:'receptionist',label:'Receptionist / loading dock',grp:'Person',attended:true},
 {id:'recipient',label:'Handed to recipient',grp:'Person',attended:true},{id:'neighbor',label:'Neighbor',grp:'Person',attended:true,neighbor:true}];
function placements(line){return line==='bulky'||line==='wg'?BIG_PLACEMENTS:PLACEMENTS}
const REASONS=[
 {id:'no_access',label:'No access (gate / door / code)',edi:'A1',retry:true,proofs:['photo']},
 {id:'business_closed',label:'Business closed',edi:'B1',retry:true,proofs:['photo']},
 {id:'no_safe_place',label:'No safe place',edi:'N1',retry:true,proofs:['photo'],notice:true},
 {id:'recipient_unavailable',label:'Recipient not available',edi:'R1',retry:true,proofs:[],notice:true},
 {id:'signature_required',label:'Signature required · no one to sign',edi:'S1',retry:true,proofs:[],notice:true},
 {id:'id_failed',label:'Age / ID check failed',edi:'I1',retry:false,rts:true,proofs:[]},
 {id:'refused',label:'Refused by recipient',edi:'X1',retry:false,rts:true,proofs:['name']},
 {id:'address_issue',label:'Address not found / incorrect',edi:'D1',retry:false,hold:true,proofs:['photo']},
 {id:'weather_unsafe',label:'Weather / unsafe to deliver',edi:'W1',retry:true,proofs:[]},
 {id:'animal',label:'Dog / animal',edi:'K1',retry:true,proofs:[]},
 {id:'damaged',label:'Damaged',edi:'Q1',retry:false,hold:true,proofs:['photo']},
 {id:'wrong_package',label:'Wrong package (not for this address)',edi:'M1',retry:false,station:true,proofs:['photo']},
 {id:'reschedule',label:'Customer asked to reschedule',edi:'C1',retry:true,appointment:true,proofs:[]},
 {id:'holiday_closed',label:'Holiday / closed today',edi:'H1',retry:true,proofs:[]}];
const ALIAS={no_one_home:'recipient_unavailable','no answer':'recipient_unavailable'};
const LINE_REASONS={bulky:[{id:'no_fit',label:"Won't fit through doorway",edi:'F1',retry:false,appointment:true,proofs:['photo']},{id:'unsafe_lift',label:'Stairs / unsafe lift',edi:'F2',retry:true,appointment:true,proofs:['photo']}],
 wg:[{id:'no_fit',label:"Won't fit / access issue",edi:'F1',retry:false,appointment:true,proofs:['photo']},{id:'install_blocked',label:'Install not possible (site conditions)',edi:'F3',retry:true,appointment:true,proofs:['photo']}]};
const PROOFS=[{id:'photo',label:'Photo'},{id:'signature',label:'Signature'},{id:'name',label:'Recipient name'},{id:'id21',label:'ID / age check'},{id:'pin',label:'PIN / OTP code'},{id:'geofence',label:'At the address (geofence)'}];
const EXTRAS=[{id:'room_of_choice',label:'Room of choice'},{id:'assembly',label:'Assembly'},{id:'debris',label:'Debris / packaging removal'},{id:'two_person',label:'Two-person'},{id:'haul_away',label:'Haul-away of old item'}];
const OUTCOMES=['unattended','attended','attempt'];
const LINES=['pd','bulky','wg','ltl','shuttle'];
const BASE={unattended:['photo','geofence'],attended:['name','photo'],attempt:['photo','geofence']};
const LINE_BASE={pd:BASE,bulky:{unattended:['photo','signature','geofence'],attended:['signature','name','photo'],attempt:['photo','geofence']},
 wg:{unattended:['photo','signature'],attended:['signature','name','photo'],attempt:['photo']},ltl:{unattended:['photo','signature','name'],attended:['photo','signature','name'],attempt:['photo']},shuttle:{unattended:['photo'],attended:['signature','name'],attempt:['photo']}};
const RULE={maxAttempts:3,rtsAfter:3,holdDays:5,ageMin:21,geofenceFt:300};
function S(){return C.S}
function ensure(s){s=s||S();s.v06=s.v06||{};const D=s.v06.delivery=s.v06.delivery||{policy:{},log:[]};D.policy=D.policy||{};D.log=D.log||[];return D}
function desk(){return ensure()}
function lineOf(t){return (t&&t.line)||'pd'}
/* policy: contract-specific > all shippers ('*') > built-in line default */
function policy(contract,line){const P=desk().policy;const b=LINE_BASE[line]||BASE;const out={unattended:b.unattended.slice(),attended:b.attended.slice(),attempt:b.attempt.slice(),...RULE,from:'Default'};
 const c=(S().contracts||{})[contract];if(c&&c.maxAttempts)out.maxAttempts=out.rtsAfter=c.maxAttempts;
 [['*','All shippers'],[contract,'Shipper']].forEach(([k,from])=>{const p=P[k]&&P[k][line];if(!p)return;OUTCOMES.forEach(o=>{if(Array.isArray(p[o]))out[o]=p[o].slice()});['maxAttempts','rtsAfter','holdDays','ageMin','geofenceFt'].forEach(x=>{if(p[x]!=null)out[x]=+p[x]});out.from=from});return out}
function setPolicy(contract,line,patch,actor){let r;C.update(s=>{const D=ensure(s);const k=contract||'*';D.policy[k]=D.policy[k]||{};const p=D.policy[k][line]=Object.assign({},D.policy[k][line]||{},patch);D.log.unshift({at:s.clock,atIso:new Date().toISOString(),by:actor||'Dispatch',contract:k,line,patch});D.log=D.log.slice(0,100);r=p});return r}
function resetPolicy(contract,line){C.update(s=>{const D=ensure(s);const k=contract||'*';if(D.policy[k])delete D.policy[k][line]})}
/* ---- sample customer instructions + access (deterministic per task, no real data) ---- */
function hash(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
/* every note matches its drop spot, so the card never says one door while the note says another */
const RES=[['front_door','Dog in the yard, use the front door only'],['back_door','Side gate is unlocked, leave by the back door'],['porch','Leave behind the planter on the porch'],['front_door','Please do not ring the bell, baby sleeping'],['safe_place','Leave inside the bench box on the porch'],['side_door','Use the side door by the driveway'],['front_door','Call on arrival'],['porch','Leave on the covered porch, out of the rain']];
const MULTI=[['locker','Use the parcel locker in the lobby'],['leasing_office','Leave with the leasing office if no answer'],['mailroom','Mailroom is open 8–6, leave with the clerk']];
const BIG={bulky:[['inside_threshold','Call 30 minutes ahead'],['garage','Use the garage, code on the keypad'],['room_of_choice','Stairs to the 2nd floor, two people needed'],['room_of_choice','Remove the old sofa from the living room']],wg:[['room_of_choice','Call 30 minutes ahead'],['room_of_choice','Stairs to the 2nd floor, two people needed'],['room_of_choice','Remove the old sofa from the living room']]};
const NOTES=RES.map(x=>x[1]);
function instructions(t){if(!t)return null;const x=t.x||{};if(x.instr)return x.instr;const h=hash(t.id);const multi=(t.tags||[]).includes('MULTI-UNIT')||/apt|unit|#/i.test(t.address||'');const line=lineOf(t);
 const big=line==='bulky'||line==='wg';const pair=big?BIG[line][h%BIG[line].length]:multi?MULTI[h%3]:RES[h%RES.length];
 const o={notes:pair[1],prefer:pair[0],noKnock:/do not ring/i.test(pair[1])||h%5===0,callAhead:/^Call/.test(pair[1])||h%4===1||line==='wg'||line==='bulky',
  access:{gate:h%3===0?'#'+(1000+h%9000):'',door:multi&&h%2?'*'+(100+h%900):'',lockbox:h%7===2?'Key lockbox by the entry · code '+(10+h%90):'',fob:multi&&h%5===3?'Fob in lockbox':'',garage:h%6===0||pair[0]==='garage'},
  age21:(t.tags||[]).includes('AGE21'),pin:(t.tags||[]).includes('PIN')?String(1000+h%9000).slice(-4):'',signature:(t.tags||[]).includes('SIGNATURE'),
  extras:(line==='bulky'||line==='wg')?EXTRAS.filter((e,i)=>line==='wg'?i!==4||h%2:(i===0||i===3||(i===4&&h%3===0)||(i===2&&h%2===0))).map(e=>e.id):[]};
 o.sample=true;return o}
function setInstructions(tid,patch){C.update(()=>{const t=C.task(tid);if(!t)return;t.x=t.x||{};t.x.instr=Object.assign({},instructions(t),patch)})}
/* ---- which proofs this delivery needs ---- */
function outcomeOf(placementId){const p=placement(placementId);return p&&p.attended?'attended':'unattended'}
function required(t,placementId){const ins=instructions(t)||{};const pol=policy(t.contract,lineOf(t));const kind=outcomeOf(placementId);const need=new Set(pol[kind]);const p=placement(placementId)||{};
 if(ins.signature)need.add('signature');if(ins.age21){need.add('id21');need.add('name')}if(ins.pin)need.add('pin');if(p.neighbor)need.add('name');if(p.id==='recipient'||p.id==='receptionist')need.add('name');
 return{kind,proofs:PROOFS.map(x=>x.id).filter(x=>need.has(x)),policy:pol,attendedOnly:!!(ins.age21||ins.pin||ins.signature)}}
function reasons(line){return REASONS.concat(LINE_REASONS[line]||[])}
function reason(id){id=ALIAS[id]||id;return reasons('bulky').concat(LINE_REASONS.wg).find(r=>r.id===id||r.label===id)||null}
function distFt(a,b){if(!a||!b)return null;const R=6371,toR=x=>x*Math.PI/180,dLat=toR(b[1]-a[1]),dLon=toR(b[0]-a[0]),h=Math.sin(dLat/2)**2+Math.cos(toR(a[1]))*Math.cos(toR(b[1]))*Math.sin(dLon/2)**2;return Math.round(2*R*Math.asin(Math.min(1,Math.sqrt(h)))*3280.84)}
function geofence(t,loc){const pol=policy(t.contract,lineOf(t));const d=distFt(loc,t.ll);return{ft:d,limit:pol.geofenceFt,ok:d==null||d<=pol.geofenceFt}}
function ageOn(dob,ref){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob||''));if(!m)return null;const r=ref||new Date();let a=r.getFullYear()-+m[1];if(r.getMonth()+1<+m[2]||(r.getMonth()+1===+m[2]&&r.getDate()<+m[3]))a--;return a}
/* v = {placement, photo, signature, name, neighborAddr, dob, idChecked, pin, loc, geoOverride, extrasDone[]} */
function validate(t,v){const r=required(t,v.placement);const ins=instructions(t)||{};const miss=[];const pl=placement(v.placement);
 if(!pl)miss.push('Pick where it was left');
 if(pl&&r.attendedOnly&&r.kind!=='attended')miss.push(ins.age21?'Age-restricted: hand to an adult 21+':ins.pin?'PIN delivery: hand to the recipient':'Signature required: hand to a person');
 if(pl&&pl.needsAccess==='garage'&&!(ins.access&&ins.access.garage))miss.push('No smart-garage access on this order');
 if(r.proofs.includes('photo')&&!v.photo)miss.push('Photo');
 if(r.proofs.includes('signature')&&!v.signature)miss.push('Signature');
 if(r.proofs.includes('name')&&!String(v.name||'').trim())miss.push(pl&&pl.neighbor?'Neighbor name':'Recipient name');
 if(pl&&pl.neighbor&&!String(v.neighborAddr||'').trim())miss.push('Neighbor address');
 if(r.proofs.includes('id21')){const a=ageOn(v.dob);if(!v.idChecked)miss.push('ID checked');else if(a==null)miss.push('Date of birth from the ID');else if(a<r.policy.ageMin)miss.push(`Under ${r.policy.ageMin}: do not hand over`)}
 if(r.proofs.includes('pin')&&String(v.pin||'').trim()!==String(ins.pin||''))miss.push(v.pin?'PIN does not match':'PIN / OTP code');
 if(r.proofs.includes('geofence')){const g=geofence(t,v.loc);if(!g.ok&&!v.geoOverride)miss.push(`Too far from the address (${g.ft} ft · max ${g.limit})`)}
 const ex=(ins.extras||[]).filter(e=>!(v.extrasDone||[]).includes(e));if(ex.length)miss.push('Extras: '+ex.map(e=>EXTRAS.find(x=>x.id===e).label).join(', '));
 return{ok:!miss.length,missing:miss,required:r}}
function validateAttempt(t,v){const rs=reason(v.reason);const miss=[];if(!rs)return{ok:false,missing:['Choose what happened']};const pol=policy(t.contract,lineOf(t));const need=new Set(pol.attempt.concat(rs.proofs||[]));
 if(need.has('photo')&&!v.photo)miss.push('Photo');if(need.has('name')&&!String(v.name||'').trim())miss.push('Name of who refused');
 if(need.has('geofence')){const g=geofence(t,v.loc);if(!g.ok&&!v.geoOverride)miss.push(`Too far from the address (${g.ft} ft · max ${g.limit})`)}
 return{ok:!miss.length,missing:miss,reason:rs,next:nextAction(t,rs)}}
/* retry / return-to-sender */
function nextAction(t,rs){rs=typeof rs==='string'?reason(rs):rs;const pol=policy(t.contract,lineOf(t));const n=(t.attempts||0)+1;
 if(!rs)return{next:'Reattempt',why:''};
 if(rs.rts)return{next:'Return to shipper',code:'rts',why:rs.label+' · goes back to the shipper',attempt:n,max:pol.maxAttempts};
 if(rs.station)return{next:'Return to station',code:'station',why:'Wrong package · back to the station for re-sort',attempt:n,max:pol.maxAttempts};
 if(rs.hold)return{next:'Hold for instructions',code:'hold',why:`Held at the station up to ${pol.holdDays} days for shipper / customer instructions`,attempt:n,max:pol.maxAttempts};
 if(n>=pol.rtsAfter)return{next:'Return to shipper',code:'rts',why:`Attempt ${n} of ${pol.maxAttempts}: final attempt · return to sender`,attempt:n,max:pol.maxAttempts};
 if(rs.appointment)return{next:'New appointment',code:'appt',why:`Attempt ${n} of ${pol.maxAttempts} · dispatch books a new time`,attempt:n,max:pol.maxAttempts};
 return{next:'Reattempt',code:'retry',why:`Attempt ${n} of ${pol.maxAttempts} · next business day${rs.notice?' · leave a notice':''}`,attempt:n,max:pol.maxAttempts}}
function placement(id){return PLACEMENTS.concat(BIG_PLACEMENTS).find(x=>x.id===id||x.label===id)||null}
window.CXDO={PLACEMENTS,BIG_PLACEMENTS,placements,REASONS,LINE_REASONS,PROOFS,EXTRAS,OUTCOMES,LINES,RULE,desk,policy,setPolicy,resetPolicy,instructions,setInstructions,required,validate,validateAttempt,nextAction,reasons,reason,placement,geofence,distFt,ageOn,outcomeOf};
})();
