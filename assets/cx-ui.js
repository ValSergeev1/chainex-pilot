/* ChainEx Mission Control UI kit: Auto/Day/Night theme, command palette (Ctrl/Cmd+K),
   keyboard shortcuts, collapsible rails, KPI sparklines, first-run tours and splash.
   Shared by Dispatch, Dashboard, DSP portal, Shipper portal, Driver frame, Start, Classic. */
(function(){
const H=document.documentElement,TK='cx.themePref',OLD=['cx.theme2','cx.theme'];
const SEA={lat:47.6,lon:-122.3};
/* Auto follows Seattle sunrise/sunset (47.6N, 122.3W), computed in-JS with the NOAA
   solar-position series and official zenith 90.833°. No network. If the sun never
   rises or sets (should not happen here) we fall back to 6:30 AM–7:00 PM Pacific.
   Times are always America/Los_Angeles, not the browser zone. prefers-color-scheme
   is ignored: Auto is a clock-based setting, and Day/Night already lock a look. */
const FALLBACK_RISE=6*60+30,FALLBACK_SET=19*60;
let fakeNow=null;

/* Auto is evaluated in America/Los_Angeles (Seattle operations time), not the
   browser's zone. Otherwise a UTC Chrome session would treat 1:00 PM as 5:00 AM. */
function pacificParts(date){
  const dt=date||new Date();
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const o={};for(const p of fmt.formatToParts(dt))if(p.type!=='literal')o[p.type]=+p.value;
  return{year:o.year,month:o.month,day:o.day,hour:o.hour,minute:o.minute,second:o.second};
}
function pacificOffsetHours(year,month,day){
  const utcNoon=new Date(Date.UTC(year,month-1,day,12,0,0));
  const p=pacificParts(utcNoon);
  return p.hour-12;
}
function pacificDate(year,month,day,h,m,s){
  const off=pacificOffsetHours(year,month,day);
  return new Date(Date.UTC(year,month-1,day,h-off,m||0,s||0,0));
}
function parseNow(v){
  if(v==null||v==='clear'||v==='')return null;
  if(v instanceof Date)return isNaN(v)?null:v;
  const s=String(v).trim();
  if(!s)return null;
  const today=pacificParts(new Date());
  if(/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)){
    const [hh,mm,ss]=s.split(':').map(Number);
    return pacificDate(today.year,today.month,today.day,hh,mm,ss||0);
  }
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?(Z|([+-]\d{2}:?\d{2}))?$/);
  if(m){
    const Y=+m[1],Mo=+m[2],D=+m[3],hh=m[4]!=null?+m[4]:12,mm=m[5]!=null?+m[5]:0,ss=m[6]!=null?+m[6]:0;
    if(m[7]==='Z'||(m[7]&&m[7][0]!==undefined&&/[+-]/.test(m[7]))){
      const iso=m[7]==='Z'?`${m[1]}-${m[2]}-${m[3]}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}Z`:s;
      const d=new Date(iso);return isNaN(d)?null:d;
    }
    return pacificDate(Y,Mo,D,hh,mm,ss);
  }
  const d=new Date(s);return isNaN(d)?null:d;
}
function getNow(){if(fakeNow)return new Date(fakeNow.getTime());return new Date()}
function sunTimes(date){
  const p=pacificParts(date||getNow());
  const y=p.year,m=p.month,day=p.day;
  const start=Date.UTC(y,0,1),doy=Math.round((Date.UTC(y,m-1,day)-start)/86400000)+1;
  const gamma=2*Math.PI/365*(doy-1);
  const eqTime=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
  const decl=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
  const latR=SEA.lat*Math.PI/180,zenith=90.833*Math.PI/180;
  const cosH=(Math.cos(zenith)-Math.sin(latR)*Math.sin(decl))/(Math.cos(latR)*Math.cos(decl));
  if(cosH>1||cosH<-1)return null;
  const Ha=Math.acos(cosH)*180/Math.PI;
  const tz=pacificOffsetHours(y,m,day);
  return{rise:720-4*(SEA.lon+Ha)-eqTime+tz*60,set:720-4*(SEA.lon-Ha)-eqTime+tz*60,doy,tz};
}
function isDaytime(date){
  const p=pacificParts(date||getNow());
  const mins=p.hour*60+p.minute+p.second/60;
  const s=sunTimes(date||getNow());
  const rise=(s&&isFinite(s.rise))?s.rise:FALLBACK_RISE;
  const set=(s&&isFinite(s.set))?s.set:FALLBACK_SET;
  return mins>=rise&&mins<set;
}
function normPref(t){
  const v=String(t||'').toLowerCase();
  if(v==='day'||v==='light')return 'day';
  if(v==='night'||v==='dark')return 'night';
  if(v==='auto')return 'auto';
  return null;
}
function migrate(){
  try{
    const cur=localStorage.getItem(TK);
    if(cur==='auto'||cur==='day'||cur==='night'){OLD.forEach(k=>localStorage.removeItem(k));return}
    const legacy=localStorage.getItem('cx.theme2')||localStorage.getItem('cx.theme');
    // Old default was 'dark'. Treat that (and any missing/unknown value) as Auto so
    // existing users are not stuck in night mode. An explicit prior 'light' stays Day.
    const next=(legacy==='light'||legacy==='day')?'day':'auto';
    localStorage.setItem(TK,next);
    OLD.forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}
function getPref(){try{const v=localStorage.getItem(TK);if(v==='auto'||v==='day'||v==='night')return v}catch(e){}return 'auto'}
function setPref(p,silent){const n=normPref(p)||'auto';try{localStorage.setItem(TK,n);OLD.forEach(k=>localStorage.removeItem(k))}catch(e){}applyAppearance();if(!silent&&UI.toast){const mode=resolved();UI.toast(n==='auto'?`Auto · ${cap(mode)}`:cap(n))}}
function resolved(p,date){const pref=p||getPref();if(pref==='day')return 'day';if(pref==='night')return 'night';return isDaytime(date)?'day':'night'}
function cap(m){return m==='night'?'Night':'Day'}
function label(p,mode){return p==='auto'?`Auto · ${cap(mode)}`:cap(mode)}

const SUN='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const AUTOIC='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18"/><path d="M12 7v5l3 2"/></svg>';

function switcherHTML(p,mode){
  const lab=label(p,mode);
  return `<div class="cx-theme-seg" role="radiogroup" aria-label="Appearance">
    <button type="button" data-theme-pref="auto" class="${p==='auto'?'on':''}" role="radio" aria-checked="${p==='auto'}" title="Auto: follow Seattle sunrise and sunset (Shift+L)">${AUTOIC}<span>Auto</span></button>
    <button type="button" data-theme-pref="day" class="${p==='day'?'on':''}" role="radio" aria-checked="${p==='day'}" title="Day mode">${SUN}<span>Day</span></button>
    <button type="button" data-theme-pref="night" class="${p==='night'?'on':''}" role="radio" aria-checked="${p==='night'}" title="Night mode">${MOON}<span>Night</span></button>
  </div><span class="cx-theme-ind" aria-live="polite">${lab}</span>`;
}
function makeSwitcher(){const w=document.createElement('div');w.className='cx-theme-sw';w.innerHTML=switcherHTML(getPref(),resolved());return w}
function paintSwitchers(){const p=getPref(),mode=resolved(),lab=label(p,mode);
  document.querySelectorAll('.cx-theme-sw').forEach(w=>{
    w.querySelectorAll('[data-theme-pref]').forEach(b=>{const on=b.dataset.themePref===p;b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false')});
    const ind=w.querySelector('.cx-theme-ind');if(ind)ind.textContent=lab;
    w.title=`Appearance: ${lab} (Shift+L to cycle)`;
  });
  document.querySelectorAll('.cx-theme-btn').forEach(b=>{b.innerHTML=mode==='night'?SUN:MOON;b.title=`${lab} · Shift+L to cycle`});
}
let lastApplied='';
function applyAppearance(){
  H.classList.add('cx');
  const p=getPref(),mode=resolved(),night=mode==='night';
  H.classList.toggle('dark',night);
  H.dataset.theme=mode;H.dataset.themePref=p;H.dataset.themeResolved=night?'dark':'light';
  paintSwitchers();
  const sig=p+'|'+mode+'|'+(fakeNow?fakeNow.getTime():0);
  if(sig===lastApplied)return;lastApplied=sig;
  window.dispatchEvent(new CustomEvent('cx-theme',{detail:{pref:p,mode,theme:night?'dark':'light'}}));
}
function cyclePref(){const o=['auto','day','night'];setPref(o[(o.indexOf(getPref())+1)%3])}

migrate();
(function readQuery(){
  const q=new URLSearchParams(location.search);
  if(q.get('theme')){const n=normPref(q.get('theme'));if(n)try{localStorage.setItem(TK,n);OLD.forEach(k=>localStorage.removeItem(k))}catch(e){}}
  if(q.get('now'))fakeNow=parseNow(q.get('now'));
})();
applyAppearance();
if(localStorage.getItem('cx.rail')==='off')H.classList.add('rail-off');

setInterval(()=>{if(getPref()==='auto')applyAppearance()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyAppearance()});
window.addEventListener('storage',e=>{if(e.key===TK||e.key==='cx.theme2')applyAppearance()});
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('button[data-theme-pref],button[data-theme-now]');
  if(!b)return;
  if(b.dataset.themePref){e.preventDefault();e.stopPropagation();setPref(b.dataset.themePref)}
  if(b.hasAttribute('data-theme-now')){e.preventDefault();const v=b.getAttribute('data-theme-now');fakeNow=v&&v!=='clear'?parseNow(v):null;applyAppearance();if(UI.toast)UI.toast(fakeNow?`Auto clock set to ${String(fakeNow.getHours()).padStart(2,'0')}:${String(fakeNow.getMinutes()).padStart(2,'0')}`:'Using the real clock')}
},true);

const CTLCSS=`
.cx-theme-sw{display:inline-flex;align-items:center;gap:7px;flex:none;min-width:0}
.cx-theme-seg{display:inline-flex;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:2px;gap:1px}
.cx-theme-seg button{appearance:none;border:0;background:transparent;color:#b4c5db;font:650 11.5px/1 var(--font,Inter,system-ui,sans-serif);padding:5px 8px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;letter-spacing:.01em;transition:background 180ms ease,color 180ms ease}
.cx-theme-seg button svg{flex:none;opacity:.9}
.cx-theme-seg button:hover{color:#fff;background:rgba(255,255,255,.08)}
.cx-theme-seg button.on{background:linear-gradient(180deg,rgba(59,140,255,.42),rgba(37,99,201,.28));color:#fff;box-shadow:inset 0 0 0 1px rgba(120,180,255,.4),0 4px 12px -6px rgba(37,99,201,.8)}
.cx-theme-ind{font:650 11px/1 var(--font,Inter,system-ui,sans-serif);color:#c5d4e8;letter-spacing:.01em;white-space:nowrap}
html.cx:not(.dark) .frame-top .cx-theme-seg,html.cx:not(.dark) .cx-theme-sw.on-light .cx-theme-seg,.phone:not(.dark) .cx-theme-seg{background:#e7eef6;border-color:#cfd8e6}
html.cx:not(.dark) .frame-top .cx-theme-seg button,html.cx:not(.dark) .cx-theme-sw.on-light .cx-theme-seg button,.phone:not(.dark) .cx-theme-seg button{color:#3c516b}
html.cx:not(.dark) .frame-top .cx-theme-seg button:hover,html.cx:not(.dark) .cx-theme-sw.on-light .cx-theme-seg button:hover,.phone:not(.dark) .cx-theme-seg button:hover{color:#172b45;background:rgba(23,43,69,.06)}
html.cx:not(.dark) .frame-top .cx-theme-seg button.on,html.cx:not(.dark) .cx-theme-sw.on-light .cx-theme-seg button.on,.phone:not(.dark) .cx-theme-seg button.on{background:#2563c9;color:#fff;box-shadow:0 4px 10px -4px rgba(37,99,201,.7)}
html.cx:not(.dark) .frame-top .cx-theme-ind,html.cx:not(.dark) .cx-theme-sw.on-light .cx-theme-ind,.phone:not(.dark) .cx-theme-ind{color:#3c516b}
@media (max-width:1500px){.tb-right .cx-theme-ind{display:none}}
@media (max-width:1180px){.cx-theme-seg button span{display:none}.cx-theme-seg button{padding:5px 7px}}
`;
if(!document.getElementById('cx-theme-ctl')){const st=document.createElement('style');st.id='cx-theme-ctl';st.textContent=CTLCSS;(document.head||document.documentElement).appendChild(st)}

const cmds=[],page=(location.pathname.split('/').pop()||'index.html').replace('.html','')||'index';
const NAV=[['Pilot home','start.html','⌂'],['Dispatch board','index.html','◎'],['Driver app','driver.html','▯'],['DSP & carrier portal','dsp.html','⇄'],['Shipper portal','shipper.html','▤'],['Partner dashboard · A (mission control)','dashboard.html','▦'],['Partner dashboard · B (alternative)','dashboard-alt.html','▧'],['Classic dispatch (pre-redesign)','classic.html','◌']];
const UI={
  theme(){return resolved()==='night'?'dark':'light'},
  pref:getPref,mode:resolved,now:getNow,sunTimes,isDaytime,
  setNow(v){fakeNow=v==null||v==='clear'?null:parseNow(v);applyAppearance();return fakeNow},
  setTheme(t){setPref(normPref(t)||t,true)},
  setPref(t,silent){setPref(t,silent)},
  toggleTheme(){cyclePref()},cycleTheme(){cyclePref()},
  switcherHTML(){return switcherHTML(getPref(),resolved())},
  refreshTheme:applyAppearance,mountTheme:mountThemeControl,
  register(list){(list||[]).forEach(c=>{const i=cmds.findIndex(x=>x.id&&x.id===c.id);i>=0?cmds.splice(i,1,c):cmds.push(c)})},dynamic:null,
  toggleRail(){H.classList.toggle('rail-off');localStorage.setItem('cx.rail',H.classList.contains('rail-off')?'off':'on');setTimeout(()=>window.dispatchEvent(new Event('resize')),260)},
  toast(m){if(window.CX&&CX.toast)CX.toast(m)},open:openPalette,help:openHelp,tour:startTour,spark
};
window.CXUI=UI;

// ---------- sparklines ----------
const hist={};const HK='cx.spark.'+page;try{Object.assign(hist,JSON.parse(sessionStorage.getItem(HK)||'{}'))}catch(e){}
function seed(label,v){let h=0;for(const c of label)h=(h*31+c.charCodeAt(0))>>>0;const r=()=>(h=(h*1103515245+12345)>>>0)/4294967296;const out=[];let x=v*(.55+r()*.3);for(let i=0;i<15;i++){x+=(v-x)*.18+(r()-.5)*Math.max(1,v)*.12;out.push(Math.max(0,x))}out.push(v);return out}
function spark(vals,color){const w=120,h=20,mx=Math.max(...vals,1),mn=Math.min(...vals,0),sx=w/(vals.length-1),y=v=>h-2-((v-mn)/(mx-mn||1))*(h-5);const pts=vals.map((v,i)=>`${(i*sx).toFixed(1)},${y(v).toFixed(1)}`).join(' ');const id='g'+Math.random().toString(36).slice(2,7);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`}
let sparkQueued=false;function enhance(){sparkQueued=false;document.querySelectorAll('.kpi:not([data-sp]),.kc:not([data-sp])').forEach(k=>{const b=k.querySelector('b');const lab=(k.querySelector('.eyebrow,.kc-l,span')||{}).textContent||'';if(!b||!lab)return;k.dataset.sp=1;const v=parseFloat(String(b.textContent).replace(/[^0-9.\\-]/g,''));if(isNaN(v))return;
  const key=lab.trim().toLowerCase();let a=hist[key];if(!a){a=hist[key]=seed(key,v)}else if(a[a.length-1]!==v){a.push(v);if(a.length>24)a.shift();k.classList.add('bump')}
  const col=k.classList.contains('risk')?'#f25f5f':k.classList.contains('warn')?'#f59e0b':/complet|deliver|done|earn|pod/i.test(key)?'#22c55e':'#3b8cff';k.style.position=k.style.position||'relative';k.insertAdjacentHTML('beforeend',spark(a,col))});try{sessionStorage.setItem(HK,JSON.stringify(hist))}catch(e){}}
new MutationObserver(()=>{if(!sparkQueued){sparkQueued=true;requestAnimationFrame(enhance)}}).observe(H,{childList:true,subtree:true});

// ---------- command palette ----------
let pal=null,sel=0,items=[];
function allItems(qs){const s=qs.trim().toLowerCase();const mode=resolved(),p=getPref();const base=[...cmds,...NAV.filter(n=>!location.pathname.endsWith('/'+n[1])).map(n=>({group:'Go to',label:n[0],icon:n[2],run:()=>location.href=n[1]})),
  {group:'Appearance',label:'Appearance: Auto (sunrise / sunset)',icon:'◷',hint:p==='auto'?'On':'',run:()=>setPref('auto')},
  {group:'Appearance',label:'Appearance: Day',icon:'☀',hint:p==='day'?'On':'',run:()=>setPref('day')},
  {group:'Appearance',label:'Appearance: Night',icon:'☾',hint:p==='night'?'On':'',run:()=>setPref('night')},
  {group:'Appearance',label:'Cycle Auto / Day / Night · now '+label(p,mode),icon:'◐',hint:'Shift+L',run:cyclePref},
  {group:'Help',label:'Keyboard shortcuts',icon:'⌨',hint:'?',run:openHelp},...(tours[page]?[{group:'Help',label:'Show me around (guided tour)',icon:'✦',run:()=>startTour(page,true)}]:[])];
  let list=s?base.filter(c=>(c.label+' '+(c.kw||'')+' '+(c.group||'')).toLowerCase().includes(s)):base;if(s&&UI.dynamic)list=list.concat(UI.dynamic(s)||[]);return list.slice(0,60)}
function drawPal(){const qs=pal.querySelector('input').value;items=allItems(qs);sel=Math.min(sel,Math.max(0,items.length-1));let g='',h='';items.forEach((c,i)=>{if(c.group!==g){g=c.group;h+=`<div class="cxk-g">${g||''}</div>`}h+=`<div class="cxk-i${i===sel?' on':''}" data-i="${i}"><span class="ki">${c.icon||'›'}</span><span>${esc(c.label)}</span>${c.hint?`<small>${esc(c.hint)}</small>`:''}</div>`});
  pal.querySelector('.cxk-list').innerHTML=h||`<div class="cxk-empty">No matches for “${esc(qs)}”</div>`;const on=pal.querySelector('.cxk-i.on');on&&on.scrollIntoView({block:'nearest'})}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function openPalette(){if(pal)return;pal=document.createElement('div');pal.className='cxk-back';pal.innerHTML=`<div class="cxk" role="dialog" aria-label="Command palette"><input placeholder="Type a command, page, task ID or driver…" aria-label="Search commands"><div class="cxk-list"></div><div class="cxk-f"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span><span style="margin-left:auto">ChainEx command</span></div></div>`;document.body.appendChild(pal);sel=0;const inp=pal.querySelector('input');inp.focus();drawPal();
  inp.oninput=()=>{sel=0;drawPal()};pal.onclick=e=>{const it=e.target.closest('.cxk-i');if(it){run(+it.dataset.i)}else if(e.target===pal)closePal()};
  inp.onkeydown=e=>{if(e.key==='ArrowDown'){sel=Math.min(items.length-1,sel+1);drawPal();e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);drawPal();e.preventDefault()}else if(e.key==='Enter'){run(sel);e.preventDefault()}else if(e.key==='Escape'){closePal()}}}
function closePal(){if(pal){pal.remove();pal=null}}
function run(i){const c=items[i];closePal();if(c&&c.run)setTimeout(()=>c.run(),10)}
function openHelp(){closePal();const b=document.createElement('div');b.className='cxk-back';const sc=[['Ctrl/⌘ K','Command palette'],['?','This help'],['/','Search'],['[','Collapse / expand side rail'],['Shift L','Cycle Auto / Day / Night'],['Esc','Close drawer / dialog'],...(shortcuts[page]||[])];
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
function drawTour(){if(!tour)return;const s=tour.steps[tour.i];if(s.run&&s._ran!==tour.i){s._ran=tour.i;try{s.run()}catch(e){}return setTimeout(drawTour,80)}const el=document.querySelector(s.sel);if(!el||!el.offsetParent){if(tour.i<tour.steps.length-1){tour.i++;return drawTour()}return endTour()}
  let ring=document.querySelector('.cxt-ring'),tip=document.querySelector('.cxt-tip');if(!ring){ring=document.createElement('div');ring.className='cxt-ring';document.body.appendChild(ring);tip=document.createElement('div');tip.className='cxt-tip';document.body.appendChild(tip)}
  const r=el.getBoundingClientRect(),pad=6;Object.assign(ring.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
  tip.innerHTML=`<b>${esc(s.title)}</b><p>${esc(s.text)}</p><div class="cxt-f"><span class="dots">${tour.steps.map((_,i)=>`<i class="${i===tour.i?'on':''}"></i>`).join('')}</span><button class="btn sm" data-t="skip">Skip</button><button class="btn sm primary" data-t="next">${tour.i===tour.steps.length-1?'Done':'Next'}</button></div>`;
  const tw=320,th=tip.offsetHeight||140;let left=Math.min(window.innerWidth-tw-12,Math.max(12,r.left+(s.side==='left'?-tw-16:s.side==='right'?r.width+16:0)));let top=s.side==='left'||s.side==='right'?r.top:r.bottom+14;if(top+th>window.innerHeight-12)top=Math.max(12,r.top-th-14);
  Object.assign(tip.style,{left:left+'px',top:top+'px'});tip.onclick=e=>{const t=e.target.dataset.t;if(t==='skip')endTour();if(t==='next'){tour.i++;tour.i>=tour.steps.length?endTour():drawTour()}}}
window.addEventListener('resize',()=>tour&&drawTour());document.addEventListener('keydown',e=>{if(tour&&e.key==='Escape')endTour()});

// ---------- DOM wiring ----------
function mountThemeControl(){
  const tb=document.querySelector('#themeBtn');
  const right=document.querySelector('.tb-right');
  const frame=document.querySelector('.frame-top');
  if(document.querySelector('.tb-right .cx-theme-sw,.frame-top .cx-theme-sw')){paintSwitchers();return}
  const el=makeSwitcher();
  if(tb)tb.replaceWith(el);
  else if(right)right.appendChild(el);
  else if(frame)frame.appendChild(el);
  paintSwitchers();
}
function wire(){
  const right=document.querySelector('.tb-right');
  if(right&&!right.querySelector('.cxk-launch')){const b=document.createElement('button');b.className='cxk-launch';b.type='button';b.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Search or jump to…</span><kbd>Ctrl K</kbd>';b.onclick=openPalette;right.insertBefore(b,right.firstChild)}
  mountThemeControl();
  const board=document.querySelector('#board');if(board&&!board.querySelector('.rail-tg')){const t=document.createElement('button');t.className='rail-tg';t.type='button';t.title='Collapse / expand queue ( [ )';t.innerHTML='‹';t.onclick=UI.toggleRail;board.appendChild(t)}
  document.querySelectorAll('.rail-tg').forEach(t=>t.innerHTML=H.classList.contains('rail-off')?'›':'‹');
  const sp=document.querySelector('.cx-splash');if(sp)setTimeout(()=>sp.classList.add('out'),420)}
new MutationObserver(()=>{document.querySelectorAll('.rail-tg').forEach(t=>t.innerHTML=H.classList.contains('rail-off')?'›':'‹')}).observe(H,{attributes:true,attributeFilter:['class']});
if(!sessionStorage.getItem('cx.splash')&&document.readyState==='loading'){sessionStorage.setItem('cx.splash','1');document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('div');s.className='cx-splash';s.innerHTML='<div><div class="wm">Chain<span>Ex</span></div><div class="ln"></div><small>Syncing live operations</small></div>';document.body.appendChild(s)},{once:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,0)):wire();window.addEventListener('load',()=>{wire();setTimeout(()=>startTour(page),900)});
})();
