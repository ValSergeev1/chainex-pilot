/* ChainEx V06 · Dispatch settings → Delivery rules (delivery6-view.js).
   Per shipper (contract) and service line: which proofs each outcome needs (photo, signature, name, ID / age, PIN / OTP, geofence),
   age minimum, geofence radius, attempts before return-to-sender, hold days. Reads / writes CXDO (delivery6.js); the driver app enforces it. */
(function(){const C=window.CX,V=window.V5,X=window.CXDO;if(!C||!V||!X)return;const esc=V.esc,ic=V.ic;
const page=(location.pathname.split('/').pop()||'').replace(/\.html$/,'');if(!['dispatch','dashboard'].includes(page))return;
if(window.CXA&&CXA.ACTIONS&&!CXA.ACTIONS.some(a=>a[0]==='delivery.rules')){CXA.ACTIONS.push(['delivery.rules','Set delivery proof rules per shipper and service line']);['dispatcher','middle-mile'].forEach(f=>{const g=CXA.GRANT&&CXA.GRANT[f];if(g&&!g.includes('delivery.rules'))g.push('delivery.rules')})}
const can=()=>!window.CXA||!CXA.can||CXA.can('delivery.rules');
const actor=()=>{try{const r=CXA.rec();return r.name||r.role||'Dispatch'}catch(e){return 'Dispatch'}};
const LN={pd:'P&D',bulky:'Bulky',wg:'White glove',ltl:'LTL',shuttle:'Shuttle'};
const OL={unattended:'Left (unattended)',attended:'Handed to a person',attempt:'Attempt / exception'};
let line='pd',ship='*';
function css(){if(document.getElementById('do6css'))return;const s=document.createElement('style');s.id='do6css';s.textContent=`
.do6-pill{position:fixed;left:16px;bottom:64px;z-index:900;display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:20px;border:1px solid var(--line,#24354d);background:var(--s1,#0F1A2A);color:var(--t1,#E5EDF7);font:600 13px var(--f,system-ui);box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer}
body:has(#x-panel.on) .do6-pill{display:none}
.do6 .seg{display:flex;gap:6px;flex-wrap:wrap}.do6 .seg button{border:1px solid var(--line,#24354d);background:transparent;color:inherit;border-radius:16px;padding:6px 12px;font:600 12.5px var(--f,system-ui);cursor:pointer}.do6 .seg button.on{background:var(--acc,#3B82F6);border-color:transparent;color:#fff}
.do6 table{width:100%;border-collapse:collapse;font-size:13px}.do6 th,.do6 td{padding:8px 6px;border-bottom:1px solid var(--line,#24354d);text-align:center}.do6 th:first-child,.do6 td:first-child{text-align:left}
.do6 .nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.do6 .nums label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--t3,#9FB0C6)}.do6 .nums input{background:var(--s2,#08111C);color:inherit;border:1px solid var(--line,#24354d);border-radius:8px;padding:8px;font:14px var(--fm,ui-monospace)}
.do6 .cat{display:flex;flex-wrap:wrap;gap:6px}.do6 .cat span{border:1px solid var(--line,#24354d);border-radius:12px;padding:3px 9px;font-size:12px}.do6 h4{margin:16px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--t3,#9FB0C6)}
.do6 select{background:var(--s2,#08111C);color:inherit;border:1px solid var(--line,#24354d);border-radius:8px;padding:8px;font:14px var(--f,system-ui)}.do6 .lock{padding:10px;border-radius:8px;background:rgba(248,113,113,.1);color:var(--bad,#F87171);font-size:13px}`;document.head.appendChild(s)}
function contracts(){return Object.values(C.S.contracts||{}).filter(c=>c.line===line)}
function body(){const p=X.policy(ship==='*'?null:ship,line);const ro=!can();const own=(X.desk().policy[ship]||{})[line];
 const rows=X.PROOFS.map(pr=>`<tr><td>${esc(pr.label)}</td>${X.OUTCOMES.map(o=>`<td><input type="checkbox" data-do6p="${o}|${pr.id}" ${p[o].includes(pr.id)?'checked':''} ${ro?'disabled':''} aria-label="${esc(OL[o]+' · '+pr.label)}"></td>`).join('')}</tr>`).join('');
 const num=(k,l)=>`<label>${esc(l)}<input type="number" min="0" data-do6n="${k}" value="${p[k]}" ${ro?'disabled':''}></label>`;
 const rs=X.reasons(line).map(r=>{const t=r.rts?'return to sender':r.station?'back to station':r.hold?'hold':r.appointment?'new appointment':'reattempt';return `<span title="${esc(r.edi)}">${esc(r.label)} · <b>${t}</b>${(r.proofs||[]).length?' · '+r.proofs.join('+'):''}</span>`}).join('');
 return `<div class="do6" id="do6">${ro?'<div class="lock">Access restricted, ask an admin.</div>':''}
 <div class="seg" id="do6lines">${X.LINES.map(l=>`<button class="${l===line?'on':''}" data-do6line="${l}">${esc(LN[l]||l)}</button>`).join('')}</div>
 <div style="display:flex;gap:10px;align-items:center;margin:12px 0;flex-wrap:wrap"><span style="font-size:13px">Shipper</span><select id="do6ship"><option value="*">All shippers (${esc(LN[line])} default)</option>${contracts().map(c=>`<option value="${esc(c.id)}" ${ship===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
 <span class="chip" id="do6from">${esc(own?'Custom rules':p.from==='Default'?'Built-in default':'Inherits '+p.from)}</span>${own&&!ro?'<button class="btn sm ghost" data-do6reset="1">Reset</button>':''}</div>
 <h4>Proofs required</h4><table><thead><tr><th>Proof</th>${X.OUTCOMES.map(o=>`<th>${esc(OL[o])}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
 <div class="t3" style="font-size:12px;margin-top:6px">Order flags add to these: signature-required orders need a signature, 21+ orders need an ID check and a hand-off, PIN orders need the customer's code. Neighbor and receptionist hand-offs always take a name.</div>
 <h4>Attempts and returns</h4><div class="nums">${num('maxAttempts','Max attempts')}${num('rtsAfter','Return to sender after attempt')}${num('holdDays','Hold at station (days)')}${num('ageMin','Minimum age (ID check)')}${num('geofenceFt','Geofence radius (ft)')}</div>
 <h4>Attempt reasons · rule</h4><div class="cat" id="do6reasons">${rs}</div>
 <h4>Delivered placements</h4><div class="cat">${X.placements(line).map(x=>`<span>${esc(x.label)}${x.attended?' · hand-off':''}</span>`).join('')}</div>
 ${['bulky','wg'].includes(line)?`<h4>Service extras the driver confirms</h4><div class="cat">${X.EXTRAS.map(e=>`<span>${esc(e.label)}</span>`).join('')}</div>`:''}</div>`}
function open(){css();V.panel('Delivery rules',body(),{icon:'shield',wide:true,kind:'do6'})}
function refresh(){if(V.panelOpen&&V.panelOpen()==='do6'){const pb=document.querySelector('#x-panel .x-pb');if(pb){const st=pb.scrollTop;pb.innerHTML=body();pb.scrollTop=st}}}
function pill(){css();if(document.getElementById('do6pill'))return;const b=document.createElement('button');b.id='do6pill';b.className='do6-pill';b.type='button';b.innerHTML=`${ic('shield',15)}Delivery rules`;b.onclick=open;document.body.appendChild(b)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-do6line],[data-do6reset]');if(!t)return;e.preventDefault();e.stopPropagation();
 if(t.dataset.do6line){line=t.dataset.do6line;ship='*';refresh();return}
 if(t.dataset.do6reset){X.resetPolicy(ship,line);V.toast('Back to the default rules','check');refresh()}},true);
document.addEventListener('change',e=>{const el=e.target;if(el.id==='do6ship'){ship=el.value;refresh();return}
 if(!el.closest('#do6'))return;if(!can()){V.toast('Access restricted, ask an admin.','lock');refresh();return}
 const p=X.policy(ship==='*'?null:ship,line);
 if(el.dataset.do6p){const [o,pr]=el.dataset.do6p.split('|');const set=new Set(p[o]);el.checked?set.add(pr):set.delete(pr);X.setPolicy(ship,line,{[o]:X.PROOFS.map(x=>x.id).filter(x=>set.has(x))},actor());V.toast(`${LN[line]} · ${OL[o]}: ${el.checked?'needs':'no longer needs'} ${pr}`,'check');refresh()}
 else if(el.dataset.do6n){X.setPolicy(ship,line,{[el.dataset.do6n]:Math.max(0,+el.value||0)},actor());refresh()}},true);
window.CXDOView={open,refresh,set:(l,s)=>{line=l||line;ship=s||'*';refresh()}};
const boot=()=>pill();if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>setTimeout(boot,300));else setTimeout(boot,300);
})();
