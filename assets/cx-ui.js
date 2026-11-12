/* ChainEx Mission Control UI kit: theme (dark default + light), command palette (Ctrl/Cmd+K), keyboard shortcuts,
   collapsible rails, KPI sparklines, first-run tours and splash. Shared by Dispatch, Dashboard, DSP portal, Shipper portal, Driver frame. */
(function(){
const H=document.documentElement,TK='cx.theme2';
const getTheme=()=>localStorage.getItem(TK)||'dark';
function applyTheme(t){H.classList.add('cx');H.classList.toggle('dark',t==='dark');H.dataset.theme=t;document.querySelectorAll('.cx-theme-btn').forEach(b=>{b.innerHTML=t==='dark'?SUN:MOON;b.title=t==='dark'?'Switch to light mode (Shift+L)':'Switch to dark mode (Shift+L)'});window.dispatchEvent(new CustomEvent('cx-theme',{detail:t}))}
const SUN='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const q=new URLSearchParams(location.search);if(q.get('theme'))localStorage.setItem(TK,q.get('theme')==='light'?'light':'dark');
applyTheme(getTheme());if(localStorage.getItem('cx.rail')==='off')H.classList.add('rail-off');
const cmds=[],page=(location.pathname.split('/').pop()||'index.html').replace('.html','')||'index';
const NAV=[['Pilot home','start.html','⌂'],['Dispatch board','index.html','◎'],['Driver app','driver.html','▯'],['DSP & carrier portal','dsp.html','⇄'],['Shipper portal','shipper.html','▤'],['Partner dashboard · A (mission control)','dashboard.html','▦'],['Partner dashboard · B (alternative)','dashboard-alt.html','▧'],['Classic dispatch (pre-redesign)','classic.html','◌']];
const UI={theme:getTheme,toggleTheme(){const t=getTheme()==='dark'?'light':'dark';localStorage.setItem(TK,t);applyTheme(t);UI.toast&&UI.toast(t==='dark'?'Dark mode':'Light mode')},
  setTheme(t){localStorage.setItem(TK,t);applyTheme(t)},
  register(list){(list||[]).forEach(c=>{const i=cmds.findIndex(x=>x.id&&x.id===c.id);i>=0?cmds.splice(i,1,c):cmds.push(c)})},dynamic:null,
  toggleRail(){H.classList.toggle('rail-off');localStorage.setItem('cx.rail',H.classList.contains('rail-off')?'off':'on');setTimeout(()=>window.dispatchEvent(new Event('resize')),260)},
  toast(m){if(window.CX&&CX.toast)CX.toast(m)},open:openPalette,help:openHelp,tour:startTour,spark};
window.CXUI=UI;
// ---------- sparklines ----------
const hist={};const HK='cx.spark.'+page;try{Object.assign(hist,JSON.parse(sessionStorage.getItem(HK)||'{}'))}catch(e){}
function seed(label,v){let h=0;for(const c of label)h=(h*31+c.charCodeAt(0))>>>0;const r=()=>(h=(h*1103515245+12345)>>>0)/4294967296;const out=[];let x=v*(.55+r()*.3);for(let i=0;i<15;i++){x+=(v-x)*.18+(r()-.5)*Math.max(1,v)*.12;out.push(Math.max(0,x))}out.push(v);return out}
function spark(vals,color){const w=120,h=20,mx=Math.max(...vals,1),mn=Math.min(...vals,0),sx=w/(vals.length-1),y=v=>h-2-((v-mn)/(mx-mn||1))*(h-5);const pts=vals.map((v,i)=>`${(i*sx).toFixed(1)},${y(v).toFixed(1)}`).join(' ');const id='g'+Math.random().toString(36).slice(2,7);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`}
let sparkQueued=false;function enhance(){sparkQueued=false;document.querySelectorAll('.kpi:not([data-sp]),.kc:not([data-sp])').forEach(k=>{const b=k.querySelector('b');const lab=(k.querySelector('.eyebrow,.kc-l,span')||{}).textContent||'';if(!b||!lab)return;k.dataset.sp=1;const v=parseFloat(String(b.textContent).replace(/[^0-9.\-]/g,''));if(isNaN(v))return;
  const key=lab.trim().toLowerCase();let a=hist[key];if(!a){a=hist[key]=seed(key,v)}else if(a[a.length-1]!==v){a.push(v);if(a.length>24)a.shift();k.classList.add('bump')}
  const col=k.classList.contains('risk')?'#f25f5f':k.classList.contains('warn')?'#f59e0b':/complet|deliver|done|earn|pod/i.test(key)?'#22c55e':'#3b8cff';k.style.position=k.style.position||'relative';k.insertAdjacentHTML('beforeend',spark(a,col))});try{sessionStorage.setItem(HK,JSON.stringify(hist))}catch(e){}}
new MutationObserver(()=>{if(!sparkQueued){sparkQueued=true;requestAnimationFrame(enhance)}}).observe(H,{childList:true,subtree:true});
// ---------- command palette ----------
let pal=null,sel=0,items=[];
function allItems(qs){const s=qs.trim().toLowerCase();const base=[...cmds,...NAV.filter(n=>!location.pathname.endsWith('/'+n[1])).map(n=>({group:'Go to',label:n[0],icon:n[2],run:()=>location.href=n[1]})),
  {group:'Appearance',label:getTheme()==='dark'?'Switch to light mode':'Switch to dark mode',icon:'◐',hint:'Shift+L',run:UI.toggleTheme},{group:'Help',label:'Keyboard shortcuts',icon:'⌨',hint:'?',run:openHelp},...(tours[page]?[{group:'Help',label:'Show me around (guided tour)',icon:'✦',run:()=>startTour(page,true)}]:[])];
  let list=s?base.filter(c=>(c.label+' '+(c.kw||'')+' '+(c.group||'')).toLowerCase().includes(s)):base;if(s&&UI.dynamic)list=list.concat(UI.dynamic(s)||[]);return list.slice(0,60)}
function drawPal(){const qs=pal.querySelector('input').value;items=allItems(qs);sel=Math.min(sel,Math.max(0,items.length-1));let g='',h='';items.forEach((c,i)=>{if(c.group!==g){g=c.group;h+=`<div class="cxk-g">${g||''}</div>`}h+=`<div class="cxk-i${i===sel?' on':''}" data-i="${i}"><span class="ki">${c.icon||'›'}</span><span>${esc(c.label)}</span>${c.hint?`<small>${esc(c.hint)}</small>`:''}</div>`});
  pal.querySelector('.cxk-list').innerHTML=h||`<div class="cxk-empty">No matches for “${esc(qs)}”</div>`;const on=pal.querySelector('.cxk-i.on');on&&on.scrollIntoView({block:'nearest'})}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function openPalette(){if(pal)return;pal=document.createElement('div');pal.className='cxk-back';pal.innerHTML=`<div class="cxk" role="dialog" aria-label="Command palette"><input placeholder="Type a command, page, task ID or driver…" aria-label="Search commands"><div class="cxk-list"></div><div class="cxk-f"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span><span style="margin-left:auto">ChainEx command</span></div></div>`;document.body.appendChild(pal);sel=0;const inp=pal.querySelector('input');inp.focus();drawPal();
  inp.oninput=()=>{sel=0;drawPal()};pal.onclick=e=>{const it=e.target.closest('.cxk-i');if(it){run(+it.dataset.i)}else if(e.target===pal)closePal()};
  inp.onkeydown=e=>{if(e.key==='ArrowDown'){sel=Math.min(items.length-1,sel+1);drawPal();e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);drawPal();e.preventDefault()}else if(e.key==='Enter'){run(sel);e.preventDefault()}else if(e.key==='Escape'){closePal()}}}
function closePal(){if(pal){pal.remove();pal=null}}
function run(i){const c=items[i];closePal();if(c&&c.run)setTimeout(()=>c.run(),10)}
function openHelp(){closePal();const b=document.createElement('div');b.className='cxk-back';const sc=[['Ctrl/⌘ K','Command palette'],['?','This help'],['/','Search'],['[','Collapse / expand side rail'],['Shift L','Light / dark mode'],['Esc','Close drawer / dialog'],...(shortcuts[page]||[])];
  b.innerHTML=`<div class="cxk cxh"><h3>Keyboard shortcuts</h3><div class="cxh-g">${sc.map(s=>`<div><span>${s[1]}</span><kbd>${s[0]}</kbd></div>`).join('')}</div></div>`;b.onclick=e=>{if(e.target===b)b.remove()};document.body.appendChild(b);const k=e=>{if(e.key==='Escape'){b.remove();document.removeEventListener('keydown',k)}};document.addEventListener('keydown',k)}
const shortcuts={index:[['1–6','Switch service line'],['Z','Zoom map to fit'],['N','New task'],['A','Auto-assign'],['M / T / B','Map · Table · Board view']]};UI.shortcuts=shortcuts;
document.addEventListener('keydown',e=>{const typing=e.target.matches&&e.target.matches('input,select,textarea,[contenteditable]');
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();pal?closePal():openPalette();return}
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='?'){e.preventDefault();openHelp()}else if(e.key==='/'){const s=document.querySelector('#search,#sq,#stopq,input[type=search],.vtools input');if(s){e.preventDefault();s.focus()}}
  else if(e.key==='['){UI.toggleRail()}else if(e.key==='L'&&e.shiftKey){UI.toggleTheme()}
  else if(UI.keys&&UI.keys[e.key]){UI.keys[e.key](e)}},true);
// ---------- tours ----------
const tours={};UI.tours=tours;let tour=null;
function startTour(id,force){const steps=(tours[id]||[]).filter(s=>!s.when||s.when());if(!steps.length)return;if(!force&&(localStorage.getItem('cx.tour.'+id)||navigator.webdriver))return;localStorage.setItem('cx.tour.'+id,'1');endTour();tour={id,steps,i:0};drawTour()}
function endTour(){document.querySelectorAll('.cxt-ring,.cxt-tip').forEach(x=>x.remove());tour=null}
function drawTour(){if(!tour)return;const s=tour.steps[tour.i];const el=document.querySelector(s.sel);if(!el||!el.offsetParent){if(tour.i<tour.steps.length-1){tour.i++;return drawTour()}return endTour()}
  let ring=document.querySelector('.cxt-ring'),tip=document.querySelector('.cxt-tip');if(!ring){ring=document.createElement('div');ring.className='cxt-ring';document.body.appendChild(ring);tip=document.createElement('div');tip.className='cxt-tip';document.body.appendChild(tip)}
  const r=el.getBoundingClientRect(),pad=6;Object.assign(ring.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
  tip.innerHTML=`<b>${esc(s.title)}</b><p>${esc(s.text)}</p><div class="cxt-f"><span class="dots">${tour.steps.map((_,i)=>`<i class="${i===tour.i?'on':''}"></i>`).join('')}</span><button class="btn sm" data-t="skip">Skip</button><button class="btn sm primary" data-t="next">${tour.i===tour.steps.length-1?'Done':'Next'}</button></div>`;
  const tw=320,th=tip.offsetHeight||140;let left=Math.min(window.innerWidth-tw-12,Math.max(12,r.left+(s.side==='left'?-tw-16:s.side==='right'?r.width+16:0)));let top=s.side==='left'||s.side==='right'?r.top:r.bottom+14;if(top+th>window.innerHeight-12)top=Math.max(12,r.top-th-14);
  Object.assign(tip.style,{left:left+'px',top:top+'px'});tip.onclick=e=>{const t=e.target.dataset.t;if(t==='skip')endTour();if(t==='next'){tour.i++;tour.i>=tour.steps.length?endTour():drawTour()}}}
window.addEventListener('resize',()=>tour&&drawTour());document.addEventListener('keydown',e=>{if(tour&&e.key==='Escape')endTour()});
// ---------- DOM wiring ----------
function wire(){
  const right=document.querySelector('.tb-right');
  if(right&&!right.querySelector('.cxk-launch')){const b=document.createElement('button');b.className='cxk-launch';b.type='button';b.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Search or jump to…</span><kbd>Ctrl K</kbd>';b.onclick=openPalette;right.insertBefore(b,right.firstChild);
    const tb=document.querySelector('#themeBtn');if(tb){tb.classList.add('cx-theme-btn');tb.onclick=null;tb.addEventListener('click',e=>{e.stopImmediatePropagation();UI.toggleTheme()},true)}else{const t=document.createElement('button');t.className='tb-btn cx-theme-btn';t.type='button';t.onclick=UI.toggleTheme;right.appendChild(t)}applyTheme(getTheme())}
  const board=document.querySelector('#board');if(board&&!board.querySelector('.rail-tg')){const t=document.createElement('button');t.className='rail-tg';t.type='button';t.title='Collapse / expand queue ( [ )';t.innerHTML='‹';t.onclick=UI.toggleRail;board.appendChild(t)}
  document.querySelectorAll('.rail-tg').forEach(t=>t.innerHTML=H.classList.contains('rail-off')?'›':'‹');
  const sp=document.querySelector('.cx-splash');if(sp)setTimeout(()=>sp.classList.add('out'),420)}
new MutationObserver(()=>{document.querySelectorAll('.rail-tg').forEach(t=>t.innerHTML=H.classList.contains('rail-off')?'›':'‹')}).observe(H,{attributes:true,attributeFilter:['class']});
if(!sessionStorage.getItem('cx.splash')&&document.readyState==='loading'){sessionStorage.setItem('cx.splash','1');document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('div');s.className='cx-splash';s.innerHTML='<div><div class="wm">Chain<span>Ex</span></div><div class="ln"></div><small>Syncing live operations</small></div>';document.body.appendChild(s)},{once:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,0)):wire();window.addEventListener('load',()=>{wire();setTimeout(()=>startTour(page),900)});
})();
