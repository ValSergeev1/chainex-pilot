/* ChainEx V06 · route close-outs in Dispatch. Adds the driver's close-out (outcome per leftover package, notes, photos, missing items)
   to the route / driver inspector, plus an "All close-outs" panel. Reads S.closeouts written by the V06 driver app. Additive only. */
(function(){const C=window.CX,V=window.V5;if(!C||!V)return;const esc=V.esc,ic=V.ic;
const LBL={return:'Return to warehouse',retry:'Re-attempt tomorrow',damaged:'Damaged',refused:'Refused',handoff:'Handed to driver',missing:'Lost / missing'};
const recs=()=>(C.S&&C.S.closeouts)||[],recFor=w=>recs().find(r=>r.wid===w);
function card(r,full){const s=r.summary||{};const items=r.items||[];return `<div class="micro" style="margin-top:6px">Close-out · ${esc(r.driver||'')} · ${esc(C.fmt?C.fmt(r.at):'')}</div>
 <div class="d5-kv" style="grid-template-columns:repeat(4,1fr)"><div><b>${s.delivered||0}</b><span>delivered</span></div><div><b>${s.returned||0}</b><span>returning</span></div><div><b class="${s.missing?'bad':''}">${s.missing||0}</b><span>missing</span></div><div><b>${s.handed||0}</b><span>handed off</span></div></div>
 <div class="small ${/dispatch/i.test(r.status||'')?'bad':'t3'}">${esc(r.status||'')}</div>
 ${items.slice(0,full?999:6).map(i=>`<div class="d5-stop"><span class="d5-n">${esc(String(i.stop||''))}</span><span class="grow"><span class="mono small">${esc(i.pid)}</span> · ${esc(LBL[i.outcome]||i.outcome||'')}${i.to?' → '+esc(i.to):''}${i.photo?` <span class="t3">${ic('camera',11)}</span>`:''}${i.note?`<span class="small t3"> · “${esc(i.note)}”</span>`:''}</span></div>`).join('')}
 ${!full&&items.length>6?`<div class="small t3">+${items.length-6} more</div>`:''}${r.vehicle&&(r.vehicle.note||r.vehicle.photo)?`<div class="small t2">Vehicle: ${r.vehicle.photo?'photo added':''}${r.vehicle.photo&&r.vehicle.note?' · ':''}${esc(r.vehicle.note||'')}</div>`:''}`}
function inject(){const el=document.getElementById('d5insp');if(!el)return;const s=window.__v5d&&__v5d.ui&&__v5d.ui.sel;if(!s||!(s.t==='drv'||s.t==='rte')){return}const r=recFor(s.id);if(!r||el.querySelector('.co6'))return;
 const box=document.createElement('div');box.className='co6';box.style.cssText='display:flex;flex-direction:column;gap:6px;padding:0 14px 14px';box.innerHTML=card(r)+`<button class="btn sm" data-co6all="1" style="align-self:flex-start">${ic('list',14)} All close-outs</button>`;el.appendChild(box)}
function boot(){const el=document.getElementById('d5insp');if(!el){setTimeout(boot,400);return}new MutationObserver(()=>inject()).observe(el,{childList:true,subtree:false});inject()}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-co6all]');if(!b)return;e.preventDefault();e.stopPropagation();const all=recs();
 V.panel('Route close-outs',all.length?all.map(r=>`<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:6px"><b>${esc(r.route)} · ${esc(r.hubName||r.hub||'')}</b>${card(r,true)}</div>`).join(''):'<div class="empty">No routes closed out yet today.</div>',{icon:'list'})},true);
if(C.subscribe)C.subscribe(()=>setTimeout(inject,0));
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot);else boot();
window.CXCloseouts={recs,recFor};})();
