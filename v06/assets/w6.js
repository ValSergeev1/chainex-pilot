/* ChainEx V06 · W6 workspace engine. One layout for every rebuilt workspace and portal:
   a one-sentence header, clickable focus numbers, views, then list + inspector (desktop) or list + bottom sheet (phone).
   Pages describe data and actions; W6 renders, keeps selection, live-syncs with the shared store and never wipes a field you are typing in. */
(function(){
const C=window.CX,V=window.V5,esc=V.esc,ic=V.ic;
const mob=()=>innerWidth<900;
const money=(n,d=0)=>(n<0?'-':'')+'$'+Math.abs(+n||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=x=>x==null||isNaN(x)?'—':Math.round(x*100)+'%';
const ini=n=>String(n||'?').replace(/\(.*?\)/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
/* ---------- small renderers pages use ---------- */
const H={
 money,pct,ini,esc,ic,
 chip:(t,tone='')=>`<span class="chip ${tone}">${esc(t)}</span>`,
 btn:(label,act,val='',cls='',icon='')=>`<button class="btn ${cls}" data-w="${act}" data-v="${esc(String(val))}">${icon?ic(icon,15):''}${esc(label)}</button>`,
 link:(label,href,cls='',icon='')=>`<a class="btn ${cls}" href="${esc(href)}">${icon?ic(icon,15):''}${esc(label)}</a>`,
 kv:pairs=>`<div class="w6-kv">${pairs.filter(Boolean).map(([k,v,num])=>`<div><span>${esc(k)}</span><b class="${num?'num':''}">${v==null||v===''?'—':v}</b></div>`).join('')}</div>`,
 sec:(title,body,right='')=>`<section class="w6-s"><div class="w6-st">${esc(title)}<span class="sp"></span>${right}</div>${body}</section>`,
 items:rows=>rows.length?`<div class="w6-items">${rows.join('')}</div>`:'<div class="w6-note">Nothing here.</div>',
 it:(main,sub='',right='',lead='')=>`<div class="w6-it">${lead}<div class="grow"><b>${main}</b>${sub?`<small>${sub}</small>`:''}</div>${right}</div>`,
 steps:arr=>`<div class="w6-steps">${arr.map(s=>`<i class="${s}"></i>`).join('')}</div>`,
 tl:arr=>`<div class="w6-tl">${arr.map(([t,s,ok])=>`<div class="${ok?'ok':''}">${t}${s?`<small>${s}</small>`:''}</div>`).join('')}</div>`,
 note:(t,tone='')=>`<div class="w6-note ${tone}">${t}</div>`,
 lead:(txt,tone='')=>`<span class="w6-lead ${tone}">${txt}</span>`,
 bar:(p,tone='')=>`<div class="bar ${tone}"><i style="width:${Math.max(0,Math.min(100,Math.round(p*100)))}%"></i></div>`,
 table:(cols,rows,empty='Nothing here.')=>rows.length?`<div class="w6-tw"><table class="tbl"><thead><tr>${cols.map(c=>`<th class="${/^(\$|#|Amount|Net|Gross|Total|Value)/.test(c)?'num':''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="w6-empty">${ic('list',22)}${esc(empty)}</div>`,
 empty:(t,icon='check')=>`<div class="w6-empty">${ic(icon,26)}<div>${t}</div></div>`,
 chart:(vals,labels,cur)=>{const mx=Math.max(1,...vals);return `<div class="w6-chart">${vals.map((v,i)=>`<div><i class="${cur===i?'cur':''}" style="height:${Math.max(3,v/mx*100)}%"></i><span>${esc(labels[i]||'')}</span></div>`).join('')}</div>`},
 toggle:(on,act,val,label)=>`<button class="w6-toggle${on?' on':''}" data-w="${act}" data-v="${esc(String(val))}" role="switch" aria-checked="${!!on}"${label?` aria-label="${esc(String(label))}"`:''}></button>`,
 field:(label,inner,wide)=>`<label class="${wide?'wide':''}">${esc(label)}${inner}</label>`,
 actor:()=>{const s=window.CXS&&CXS.get&&CXS.get();const st=window.CXS&&CXS.staff&&CXS.staff();return (s&&s.name)||(st&&st.name)||'Staff'},
 dfmt:d=>{if(!d)return '—';const x=new Date(String(d).length<=10?d+'T12:00:00':d);return isNaN(x)?String(d):x.toLocaleDateString('en-US',{month:'short',day:'numeric'})},
 rel:d=>{if(!d||!C.v2)return '';const n=C.v2.daysBetween(C.v2.today(),d);return n===0?'today':n===1?'tomorrow':n===-1?'yesterday':n>0?`in ${n} days`:`${-n} days ago`},
 val:id=>{const e=document.getElementById(id);return e?e.value.trim():''},
 toast:m=>V.toast(m),
 /* every store op persists + syncs only inside C.update */
 O:new Proxy({},{get:(_,k)=>(...a)=>C.update(()=>C.ops[k](...a))}),
 up:fn=>C.update(fn),
 doc:d=>{const s=C.portal?C.portal.docState(d):'current';return [(C.portal&&C.portal.DOC_LBL[s])||s,{current:'ok',pending:'warn',expiring:'warn',missing:'bad',rejected:'bad',expired:'bad'}[s]||'',s]}
};
/* ---------- portal shell (partners: driver, DSP, carrier, shipper, warehouse) ---------- */
function portalShell(cfg,st){document.body.classList.add('v5','w6p-b');const root=document.getElementById('app')||document.body;
 root.innerHTML=`<header class="w6p-top"><a class="x-logo" href="start.html" title="ChainEx V06"><span class="x-mark">Ex</span><span class="x-word">Chain<b>Ex</b></span></a><span class="w6p-app">${esc(cfg.app)}</span><span class="x-sp" style="flex:1"></span><span class="w6p-who" id="w6who"></span><button class="x-ib" data-x="theme" title="Theme" aria-label="Theme">${ic('auto',17)}</button><a class="x-ib" href="signin.html" title="Switch account" aria-label="Switch account">${ic('logout',17)}</a></header>
 <div class="w6p-wrap"><nav class="w6p-nav" id="w6nav"></nav><main id="w6pm"></main></div><nav class="w6p-tabs" id="w6tabs"></nav>`;
 return document.getElementById('w6pm')}
/* ---------- engine ---------- */
function app(cfg){
 const KEY='cx.v06.w.'+cfg.key;const qs=new URLSearchParams(location.search);
 const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
 const st={view:qs.get('view')||saved.view||cfg.views[0].id,sel:qs.get('sel')||saved.sel||null,q:'',kpi:null,data:{}};
 if(!cfg.views.some(v=>v.id===st.view))st.view=cfg.views[0].id;
 const save=()=>localStorage.setItem(KEY,JSON.stringify({view:st.view,sel:st.sel}));
 const host=cfg.portal?portalShell(cfg,st):V.shell({app:cfg.app,active:cfg.active,full:true,onRole:()=>{gateMsg=cfg.gate?cfg.gate():null;render()}});
 let gateMsg=cfg.gate?cfg.gate():null;
 host.innerHTML=`<div class="w6" id="w6"><header class="w6-h" id="w6h"></header><div class="kpis w6-k" id="w6k"></div><div class="w6-bar" id="w6bar"><div class="w6-tabs" id="w6t"></div>${cfg.search===false?'':`<div class="w6-q">${ic('search',15)}<input class="in" id="w6q" placeholder="${esc(cfg.searchPh||'Search')}" autocomplete="off"></div>`}</div><div class="w6-body" id="w6b"></div></div>`;
 const $=id=>document.getElementById(id);
 const view=()=>cfg.views.find(v=>v.id===st.view)||cfg.views[0];
 const visibleViews=()=>cfg.views.filter(v=>!v.hidden||!v.hidden());
 function rows(){const v=view();if(!v.list)return[];let r=v.list(st)||[];if(st.q){const q=st.q.toLowerCase();r=r.filter(x=>JSON.stringify(v.row(x)).toLowerCase().includes(q)||(v.text&&v.text(x).toLowerCase().includes(q)))}return r}
 function rowHTML(v,x){const r=v.row(x);const id=String(r.id);return `<button class="w6-r${st.sel===id?' sel':''}" data-wsel="${esc(id)}">${r.lead!=null?r.lead:`<span class="w6-lead ${r.tone||''}">${esc(r.ini||ini(r.t))}</span>`}<span class="grow"><span class="w6-rt">${r.tHTML||esc(r.t)}</span>${r.s?`<span class="w6-rs">${r.sHTML||esc(r.s)}</span>`:''}</span>${r.r?`<span class="w6-rr">${r.r}</span>`:''}</button>`}
 function listHTML(v,list){if(!list.length)return H.empty(st.q?'No matches.':((typeof v.empty==='function'?v.empty():v.empty)||'All clear.'),st.q?'search':'check');
  if(v.group){const g={},order=[];list.forEach(x=>{const k=v.group(x);if(!g[k]){g[k]=[];order.push(k)}g[k].push(x)});return order.map(k=>`<div class="w6-g">${esc(k)}<span class="c">${g[k].length}</span></div>`+g[k].map(x=>rowHTML(v,x)).join('')).join('')}
  return list.map(x=>rowHTML(v,x)).join('')}
 function findSel(list){const v=view();return list.find(x=>String(v.row(x).id)===String(st.sel))}
 function detailHTML(v,item){if(!item)return H.empty(v.pick||'Select an item to see details and actions.','list');return `<div class="w6-d">${v.detail(item,st)}</div>`}
 const focusedIn=el=>el&&el.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
 function render(){
  if(gateMsg){$('w6h').innerHTML=`<div><div class="micro">${esc(cfg.eyebrow||cfg.app)}</div><h1>${esc(cfg.title||cfg.app)}</h1><p class="w6-sub">${gateMsg}</p></div><div class="w6-act"><a class="btn pri" href="signin.html">Sign in</a><a class="btn" href="start.html">V06 start</a></div>`;$('w6k').style.display='none';$('w6bar').style.display='none';$('w6b').innerHTML='';return}
  const v=view();
  const head=cfg.header?cfg.header(st):{};
  $('w6h').innerHTML=`<div style="min-width:0;flex:1 1 420px"><div class="micro">${esc(head.eyebrow||cfg.eyebrow||cfg.app)}</div><h1>${esc(head.title||cfg.title||cfg.app)}</h1>${head.sub?`<p class="w6-sub">${head.sub}</p>`:''}</div><div class="w6-act">${(head.actions||[]).join('')}${cfg.classic?`<a class="btn ghost" href="${cfg.classic}" title="Open the preserved V03 version">${ic('ext',14)}V03</a>`:''}</div>`;
  const k=cfg.kpis?cfg.kpis(st):[];$('w6k').style.display=k.length?'':'none';
  $('w6k').innerHTML=k.map(x=>`<button class="kpi${x.view&&st.view===x.view?' on':''}" ${x.view?`data-wv="${x.view}"`:''}${x.act?` data-w="${x.act}" data-v="${esc(x.val||'')}"`:''}><span class="l">${esc(x.l)}</span><span class="v ${x.tone||''}">${x.v}</span>${x.d?`<span class="d">${x.d}</span>`:''}</button>`).join('');
  const tabs=visibleViews().map(t=>{const n=t.count?t.count(st):null;return `<button class="w6-tab${t.id===st.view?' on':''}" data-wv="${t.id}">${esc(t.label)}${n!=null&&n!==''?`<span class="n ${t.tone?t.tone(st):''}">${n}</span>`:''}</button>`}).join('');
  if(cfg.portal){$('w6bar').style.display=v.list?'':'none';$('w6t').innerHTML='';
   $('w6nav').innerHTML=visibleViews().map(t=>{const n=t.count?t.count(st):null;return `<button class="w6p-ni${t.id===st.view?' on':''}" data-wv="${t.id}">${ic(t.icon||'dot',17)}<span>${esc(t.label)}</span>${n?`<span class="n ${t.tone&&t.tone(st)==='bad'?'':'q'}">${n}</span>`:''}</button>`}).join('')+`<div class="w6p-foot">${cfg.foot||'Sample data only. Simulated actions.'}</div>`;
   const vv=visibleViews(),main=vv.slice(0,4);const more=vv.length>5;const tb=(more?main:vv.slice(0,5));
   $('w6tabs').innerHTML=tb.map(t=>{const n=t.count?t.count(st):null;return `<button class="${t.id===st.view?'on':''}" data-wv="${t.id}">${ic(t.icon||'dot',20)}<span>${esc(t.short||t.label)}</span>${n&&t.tone&&t.tone(st)==='bad'?`<b class="n">${n}</b>`:''}</button>`}).join('')+(more?`<button data-w6more="1" class="${tb.some(t=>t.id===st.view)?'':'on'}">${ic('menu',20)}<span>More</span></button>`:'');
   if(cfg.who)$('w6who').innerHTML=cfg.who(st);
  }else $('w6t').innerHTML=tabs;
  const body=$('w6b');
  if(v.render){body.className='w6-body solo';if(v.update&&body.dataset.v===v.id){v.update(body,st);return}if(!focusedIn(body)||body.dataset.v!==v.id){body.dataset.v=v.id;body.innerHTML=v.render(st);v.after&&v.after(body,st)}return}
  body.dataset.v='';
  const list=rows();body.className='w6-body';
  const lst=body.querySelector('.w6-list'),sc=lst?lst.scrollTop:0,ins=body.querySelector('.w6-insp'),isc=ins?ins.scrollTop:0;
  if(!mob()&&!st.sel&&list.length&&v.autoSelect!==false)st.sel=String(v.row(list[0]).id);
  const item=findSel(list)||(st.sel&&v.find?v.find(st.sel):null);
  if(focusedIn(ins)){lst.innerHTML=(v.top?v.top(st):'')+listHTML(v,list);return}
  body.innerHTML=`<div class="w6-list">${v.top?v.top(st):''}${listHTML(v,list)}</div><aside class="w6-insp">${detailHTML(v,item)}</aside>`;
  body.querySelector('.w6-list').scrollTop=sc;body.querySelector('.w6-insp').scrollTop=isc;v.afterDetail&&item&&v.afterDetail(body.querySelector('.w6-insp'),item);
  // phone sheet refresh
  const p=document.getElementById('x-panel');if(mob()&&p&&p.classList.contains('on')&&p.dataset.kind==='w6'&&item&&!focusedIn(p)){p.querySelector('.x-pb').innerHTML=detailHTML(v,item)}
 }
 function openSheet(){const v=view();const item=findSel(rows())||(v.find?v.find(st.sel):null);if(!item)return;const r=v.row(item);V.panel(r.t,detailHTML(v,item),{kind:'w6',wide:true});const p=document.getElementById('x-panel');v.afterDetail&&v.afterDetail(p,item)}
 let t=0;const soon=()=>{clearTimeout(t);t=setTimeout(render,60)};
 document.addEventListener('click',e=>{const w6=e.target.closest('#w6,#w6nav,#w6tabs,#x-panel,.x-panel');if(!w6)return;
  const tv=e.target.closest('[data-wv]');if(tv){st.view=tv.dataset.wv;st.sel=null;st.q='';const qi=$('w6q');if(qi)qi.value='';save();V.close&&document.getElementById('x-panel')&&document.getElementById('x-panel').dataset.kind==='w6more'&&V.close();render();scrollTo({top:0});return}
  const mm=e.target.closest('[data-w6more]');if(mm){V.panel('More',`<div class="w6-items">${visibleViews().slice(4).map(t=>`<button class="w6-it" style="width:100%;border:0;background:none;color:inherit;text-align:left" data-wv="${t.id}">${ic(t.icon||'dot',17)}<div class="grow"><b>${esc(t.label)}</b></div>${ic('chev',15)}</button>`).join('')}</div>`,{kind:'w6more'});return}
  const se=e.target.closest('[data-wsel]');if(se){st.sel=se.dataset.wsel;save();if(mob()){render();openSheet()}else render();return}
  const a=e.target.closest('[data-w]');if(a&&cfg.acts&&cfg.acts[a.dataset.w]){e.preventDefault();const r=cfg.acts[a.dataset.w](a.dataset.v,a,st,api);if(r!==false)soon()}});
 document.addEventListener('change',e=>{const a=e.target.closest('[data-wc]');if(a&&cfg.acts&&cfg.acts[a.dataset.wc]){cfg.acts[a.dataset.wc](a.value,a,st,api);soon()}});
 const qi=$('w6q');if(qi)qi.addEventListener('input',()=>{st.q=qi.value.trim();render()});
 document.addEventListener('keydown',e=>{if(mob()||/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))return;const v=view();if(!v.list)return;if(e.key==='j'||e.key==='k'){const l=rows();const i=l.findIndex(x=>String(v.row(x).id)===String(st.sel));const n=l[Math.max(0,Math.min(l.length-1,i+(e.key==='j'?1:-1)))];if(n){st.sel=String(v.row(n).id);save();render();const el=document.querySelector('.w6-r.sel');el&&el.scrollIntoView({block:'nearest'})}}if(e.key==='/'&&qi){e.preventDefault();qi.focus()}});
 if(C&&C.subscribe)C.subscribe(soon);addEventListener('resize',soon);
 const api={st,render,soon,select:id=>{st.sel=String(id);save();render();if(mob())openSheet()},go:(view,sel)=>{st.view=view;st.sel=sel?String(sel):null;save();render();if(sel&&mob())openSheet()}};
 if(cfg.commands&&V.setCmd)V.setCmd(()=>cfg.commands(api));
 render();if(st.sel&&mob()&&qs.get('sel'))openSheet();
 window.__w6=api;return api}
window.W6={app,H,mob};
})();
