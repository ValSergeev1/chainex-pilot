/* ChainEx V06 · staff workspace shell (fork of the V02 staff.js API; same CXStaff contract so every pg-*.js module runs unchanged): top bar, side nav, permission gate, drawer, ChainEx bot side panel. */
(function(){
const C=window.CX,esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const B='';/* V06: module links stay inside v06/; v06.js routes anything not rebuilt to the pilot root, and site/ to site-v05/ */
if(window.CX)CX.toast=m=>window.V5&&V5.toast(m);
const WS=[['workspaces.html','Workspaces','▦',null],['dashboard.html','Dashboard','◫','dashboard'],['onboarding.html','Onboarding','✓','onboarding'],['compliance.html','Compliance','⚖','compliance'],['index.html','Dispatch','◎','dispatch'],['scorecards.html','Scorecards','★',null],['payments.html','Payments','$','payments.view'],['admin.html','Admin','⚙',null],['sales.html','Sales','↗','sales'],['bids.html','Bids','✦','bids'],['architecture.html','Architecture','🏗',null]];
function initials(n){return String(n||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
/* V06: the module's own sections render as a quiet sub-nav (vertical on desktop, scroll strip on phone) inside the V06 shell. */
function shell(o){document.body.classList.add('sx');const V=window.V5;
  const main=V.shell({app:o.app,crumbHTML:`<span class="x-hide-m">ChainEx /</span> ${esc(o.app)}`,onRole:()=>location.reload()});
  const nav=o.nav||[];
  const navH=nav.length?`<nav class="s6-nav" aria-label="${esc(o.app)} sections">${nav.map(n=>n[0]==='h'?`<span class="s6-h">${esc(n[1])}</span>`:`<button class="s6-ni${o.active===n[0]?' on':''}" data-nav="${n[0]}"><span>${esc(n[1])}</span>${n[3]!=null&&n[3]!==''?`<span class="n">${n[3]}</span>`:''}</button>`).join('')}</nav>`:'';
  main.innerHTML=`<div class="s6${nav.length?' has-nav':''}">${navH}<main class="sx-main" id="sxMain"></main></div>`;
  const nv=main.querySelector('.s6-nav');if(nv)nv.addEventListener('click',e=>{const b=e.target.closest('[data-nav]');if(b&&o.onNav){o.onNav(b.dataset.nav);nv.querySelectorAll('[data-nav]').forEach(x=>x.classList.toggle('on',x===b));b.scrollIntoView({block:'nearest',inline:'center'})}});
  if(window.CXUI&&CXUI.mountTheme)CXUI.mountTheme();
  return document.getElementById('sxMain')}
function gate(perm,what){if(!perm||CXS.can(perm))return null;const s=CXS.staff();return `<div class="sx-card" style="max-width:640px;margin:40px auto;text-align:center"><div style="font-size:34px">🔒</div><h2 style="margin:6px 0">No access</h2><p class="sx-mini" style="font-size:13px">${esc(s?s.role:'This account')} can't open ${esc(what||'this workspace')}. Permission needed: <b>${esc((CXS.PERMS.find(p=>p[0]===perm)||[perm,perm])[1])}</b>. Ask an Admin to change your role in Admin → Roles &amp; permissions.</p><a class="sx-btn" href="${B}workspaces.html">Back to workspaces</a></div>`}
function drawer(html){close();const b=document.createElement('div');b.className='sx-drawer-back';b.onclick=close;const d=document.createElement('aside');d.className='sx-drawer';d.innerHTML=`<button class="sx-btn sm sx-x" data-close="1">✕</button>`+html;d.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close()});document.body.append(b,d);return d}
function close(){document.querySelectorAll('.sx-drawer,.sx-drawer-back').forEach(x=>x.remove())}
function toast(m){if(C&&C.toast)C.toast(m)}
const kpis=list=>`<div class="sx-kpis">${list.map(k=>`<div class="sx-kpi ${k[3]||''}"><span>${esc(k[0])}</span><b>${k[1]}</b>${k[2]?`<small>${k[2]}</small>`:''}</div>`).join('')}</div>`;
const tbl=(head,rows,empty)=>rows.length?`<div class="sx-tbl-wrap"><table class="sx-tbl"><thead><tr>${head.map(h=>`<th${/^#|amount|total|net|gross|\$|km|min|%/i.test(h)?' class="num"':''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="sx-empty">${esc(empty||'Nothing here yet')}</div>`;
const chip=(t,k)=>`<span class="sx-chip ${k||''}">${esc(t)}</span>`;
/* ---------- ChainEx bot side panel (simulated; drafts only, human approves) ---------- */
let botCfg=null;
function bot(cfg){botCfg=cfg;let el=document.getElementById('sxBot');if(!el){el=document.createElement('aside');el.id='sxBot';el.style.cssText='position:fixed;right:16px;bottom:16px;z-index:50;width:min(360px,92vw);max-height:52vh;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 48px -20px rgba(0,0,0,.55);overflow:hidden';document.body.appendChild(el);
    el.addEventListener('click',e=>{const b=e.target.closest('[data-bot]');if(!b)return;const a=b.dataset.bot,id=b.dataset.id;
      if(a==='toggle'){localStorage.setItem('cx.bot.min.'+botCfg.name,isMin()?'0':'1');paintBot();return}
      const rec=(botCfg.recs()||[]).find(r=>r.id===id);if(!rec){toast('Already handled · list refreshed');paintBot();return}
      C.update(S=>{S.botLog=S.botLog||[];S.botDone=S.botDone||{};S.botDone[botCfg.name+'|'+id]=a;const by=(CXS.staff()||{}).name||'Staff';let res='';if(a==='approve'&&rec.run){try{res=rec.run(S)||''}catch(err){res='failed: '+err.message}}
        S.botLog.unshift({bot:botCfg.name,rec:rec.title,decision:a==='approve'?'Approved':'Dismissed',by,at:C.v2?C.v2.today()+' '+C.fmt(S.clock):'',result:res});
        S.audit.unshift({at:(C.v2?C.v2.today()+' ':'')+C.fmt(S.clock),actor:by,action:`${botCfg.name} recommendation ${a==='approve'?'approved':'dismissed'}`,target:rec.title,detail:String(res||''),area:'bot'})});
      toast(a==='approve'?'Approved · '+rec.title:'Dismissed');paintBot();botCfg.after&&botCfg.after()})}
  paintBot()}
function isMin(){const v=localStorage.getItem('cx.bot.min.'+(botCfg&&botCfg.name));return v==null?(!!(botCfg&&botCfg.min)||innerWidth<900):v==='1'}
let botSub=0;function paintBot(){if(!botSub&&C.subscribe){botSub=1;C.subscribe(()=>setTimeout(paintBot,0))}const el=document.getElementById('sxBot');if(!el||!botCfg)return;const S=C.S;const done=S.botDone||{};const min=isMin();
  const recs=(botCfg.recs()||[]).filter(r=>!done[botCfg.name+'|'+r.id]);const log=(S.botLog||[]).filter(l=>l.bot===botCfg.name).slice(0,6);
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:linear-gradient(135deg,#172b45,#1f4f9a);color:#fff;cursor:pointer" data-bot="toggle"><span style="width:28px;height:28px;border-radius:9px;background:rgba(255,255,255,.16);display:grid;place-items:center">✦</span><div style="flex:1"><b style="font-size:13.5px">${esc(botCfg.name)}</b><div style="font-size:11px;opacity:.8">ChainEx bot · drafts only · you approve${recs.length?` · ${recs.length} waiting`:''}</div></div><span>${min?'▴':'▾'}</span></div>
  ${min?'':`<div style="overflow:auto;padding:10px 12px">${recs.length?recs.map(r=>`<div class="sx-card" style="padding:10px 12px;margin-bottom:8px;box-shadow:none"><div style="font-weight:650;font-size:13px">${esc(r.title)}</div><div class="sx-mini" style="margin:4px 0 8px;line-height:1.45">${esc(r.detail)}</div><div class="sx-row"><button class="sx-btn sm pri" data-bot="approve" data-id="${esc(r.id)}">Approve</button><button class="sx-btn sm" data-bot="dismiss" data-id="${esc(r.id)}">Dismiss</button>${r.why?`<span class="sx-mini" title="${esc(r.why)}">why?</span>`:''}</div></div>`).join(''):'<div class="sx-mini" style="padding:8px">No open recommendations. The bot re-checks live data every few minutes.</div>'}
  <div class="sx-mini" style="margin:10px 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Action log</div>${log.length?log.map(l=>`<div class="sx-mini" style="padding:4px 0;border-top:1px solid var(--line-2)"><b>${esc(l.decision)}</b> · ${esc(l.rec)} · ${esc(l.by)} · ${esc(l.at)}${l.result?' · '+esc(l.result):''}</div>`).join(''):'<div class="sx-mini">No actions yet.</div>'}
  <div class="sx-mini" style="margin-top:8px">Simulated in the pilot. In production this bot runs on ChainEx's own AI layer with a scoped service account; every approval is in the audit log.</div></div>`}`}
window.CXStaff={shell,gate,drawer,close,toast,kpis,tbl,chip,esc,bot,paintBot,B};
})();
