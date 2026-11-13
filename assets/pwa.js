/* ChainEx V03 PWA helper: app mode (full-screen phone layout), service worker, install prompt + install cards.
   Load in <head> with data-app="driver" | "board". */
(function(){
const me=document.currentScript,APP=(me&&me.dataset.app)||'driver',BASE=(me&&me.getAttribute('src')||'').replace(/assets\/pwa\.js.*$/,'');
const NAME=APP==='board'?'ChainEx Dispatch':'ChainEx Driver',PAGE=APP==='board'?'board.html':'driver.html';
const LIVE='https://valsergeev1.github.io/chainex-pilot/'+PAGE;
const ua=navigator.userAgent||'',isIOS=/iphone|ipad|ipod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),isAndroid=/android/i.test(ua);
const standalone=()=>!!(window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches))||navigator.standalone===true;
const q=new URLSearchParams(location.search);
const appMode=()=>APP==='driver'&&(q.get('app')==='1'||standalone()||(q.get('app')!=='0'&&window.matchMedia&&matchMedia('(max-width: 600px)').matches));
const de=document.documentElement;
function setMode(){de.classList.toggle('cx-app',appMode());de.classList.toggle('cx-standalone',standalone())}
setMode();if(window.matchMedia)matchMedia('(max-width: 600px)').addEventListener&&matchMedia('(max-width: 600px)').addEventListener('change',setMode);
let deferred=null;const subs=[];const emit=()=>subs.forEach(f=>{try{f()}catch(e){}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;emit()});
window.addEventListener('appinstalled',()=>{deferred=null;try{localStorage.setItem('cx.pwa.installed.'+APP,'1')}catch(e){}emit();toast(NAME+' installed · open it from your home screen')});
const sw={state:'none',scope:null,error:null};
function register(){if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)){sw.state='unsupported';return}
 navigator.serviceWorker.register(BASE+'sw.js',{scope:BASE||'./'}).then(r=>{sw.state='registered';sw.scope=r.scope;emit()}).catch(e=>{sw.state='error';sw.error=String(e&&e.message||e);emit()})}
if(document.readyState==='complete')register();else window.addEventListener('load',register);
async function prompt(){if(!deferred)return false;deferred.prompt();const r=await deferred.userChoice.catch(()=>({outcome:'dismissed'}));deferred=null;emit();return r.outcome==='accepted'}
const css=`.cxi-card{display:flex;gap:14px;align-items:center;max-width:560px;width:100%;box-sizing:border-box;background:#fff;color:#14213d;border:1px solid #e3e6f0;border-radius:18px;padding:14px 16px;font:14px/1.4 Inter,system-ui,sans-serif;box-shadow:0 10px 30px -18px rgba(20,33,61,.5);text-align:left}
.cxi-card img.ic{width:56px;height:56px;border-radius:14px;flex:none}.cxi-card .tx{flex:1;min-width:0}.cxi-card .tx>b{display:block;font-size:15px}.cxi-card small{color:#5d6785}
.cxi-card .qr{width:96px;height:96px;flex:none;border-radius:10px;border:1px solid #e3e6f0;background:#fff;padding:4px;box-sizing:border-box}
.cxi-steps{margin:6px 0 0;padding-left:18px;color:#3c4766;font-size:13px}.cxi-steps li{margin:2px 0}
.cxi-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:11px;background:#5a6be0;color:#fff!important;font:700 14px Inter,system-ui,sans-serif;padding:10px 14px;cursor:pointer;text-decoration:none;min-height:42px;margin-top:8px}
.cxi-btn.ghost{background:transparent;color:#5a6be0!important;border:1.5px solid #c9cff7}
html.cx.dark .cxi-card{background:#0f1629;color:#e6eaf7;border-color:#1f2a47}html.cx.dark .cxi-card small,html.cx.dark .cxi-steps{color:#97a3c4}
.cxi-ban{position:fixed;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:99999;display:flex;gap:10px;align-items:center;background:#14213d;color:#fff;border-radius:16px;padding:10px 10px 10px 12px;font:13px/1.3 Inter,system-ui,sans-serif;box-shadow:0 16px 36px -14px rgba(0,0,0,.7);animation:cxiIn .3s ease}
.cxi-ban img{width:40px;height:40px;border-radius:10px}.cxi-ban .tx{flex:1;min-width:0}.cxi-ban .tx>b{display:block;font-size:14px}.cxi-ban small{opacity:.75}
.cxi-ban .cxi-btn{margin:0;min-height:38px;padding:8px 12px}.cxi-x{border:0;background:rgba(255,255,255,.12);color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;flex:none}
@keyframes cxiIn{from{transform:translateY(-20px);opacity:0}}
.cxi-ios{position:fixed;inset:0;z-index:100000;background:rgba(8,12,26,.55);display:flex;align-items:flex-end;justify-content:center}
.cxi-ios .box{width:100%;max-width:480px;background:#fff;color:#14213d;border-radius:22px 22px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom,0px));font:15px/1.45 Inter,system-ui,sans-serif;box-sizing:border-box}
.cxi-ios ol{padding-left:20px}.cxi-ios li{margin:8px 0}.cxi-ios .sh{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#eef0ff;color:#5a6be0;vertical-align:middle}
.cxi-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);transform:translateX(-50%);background:#14213d;color:#fff;padding:10px 14px;border-radius:12px;font:600 13px Inter,system-ui,sans-serif;z-index:100001}`;
function style(){if(document.getElementById('cxi-css'))return;const s=document.createElement('style');s.id='cxi-css';s.textContent=css;document.head.appendChild(s)}
function toast(m){style();const t=document.createElement('div');t.className='cxi-toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}
const SHARE='<span class="sh"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span>';
function iosSheet(){style();const m=document.createElement('div');m.className='cxi-ios';m.id='cxiIos';m.innerHTML=`<div class="box" role="dialog" aria-label="Install on iPhone"><b style="font-size:18px">Install ${NAME} on iPhone</b><ol><li>In Safari, tap ${SHARE} <b>Share</b> (bottom bar, or top right on iPad).</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Keep the name <b>${NAME}</b> and tap <b>Add</b>.</li><li>Open it from the home-screen icon: it runs full screen with no browser bars.</li></ol><small style="color:#5d6785">Chrome/Edge on iPhone: tap Share in the address bar, then Add to Home Screen.</small><br><button class="cxi-btn" id="cxiIosOk" style="width:100%;justify-content:center;margin-top:14px">Got it</button></div>`;
 document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.id==='cxiIosOk')m.remove()})}
function card(kind){kind=kind||APP;const nm=kind==='board'?'ChainEx Dispatch':'ChainEx Driver',pg=kind==='board'?'board.html':'driver.html';
 const btn=standalone()?`<small>✓ You're using the installed app.</small>`:deferred?`<button class="cxi-btn" data-cxi="install">Install ${nm}</button>`:isIOS?`<button class="cxi-btn" data-cxi="ios">How to add to Home Screen</button>`:`<a class="cxi-btn ghost" href="${BASE}${pg}?app=1">Open the phone view</a>`;
 return `<div class="cxi-card" data-cxi-card="${kind}"><img class="ic" src="${BASE}assets/pwa/${kind}-192.png" alt=""><div class="tx"><b>Install the app · ${nm}</b><small>Full screen on your phone, own home-screen icon, keeps working offline (sample data).</small>
 <ol class="cxi-steps"><li><b>Android (Chrome):</b> open ${pg} on the phone → tap <b>Install</b> (or ⋮ → <b>Install app</b>).</li><li><b>iPhone (Safari):</b> Share → <b>Add to Home Screen</b> → Add.</li></ol>${btn}</div><img class="qr" src="${BASE}assets/pwa/qr-${kind}.svg" alt="QR code: ${LIVE.replace(PAGE,pg)}" title="Scan with your phone camera"></div>`}
function mount(el,kind){if(!el)return;style();const draw=()=>{el.innerHTML=card(kind)};draw();subs.push(draw);el.addEventListener('click',async e=>{const b=e.target.closest('[data-cxi]');if(!b)return;if(b.dataset.cxi==='install')prompt();else iosSheet()})}
function banner(){if(!appMode()||standalone())return;try{if(localStorage.getItem('cx.pwa.ban.'+APP))return}catch(e){}
 style();const show=()=>{if(document.getElementById('cxiBan')||standalone())return;if(!deferred&&!isIOS)return;const b=document.createElement('div');b.className='cxi-ban';b.id='cxiBan';
  b.innerHTML=`<img src="${BASE}assets/pwa/${APP}-192.png" alt=""><div class="tx"><b>Install ${NAME}</b><small>Full screen · works offline</small></div><button class="cxi-btn" id="cxiBanGo">${deferred?'Install':'How'}</button><button class="cxi-x" id="cxiBanX" aria-label="Not now">×</button>`;
  document.body.appendChild(b);b.querySelector('#cxiBanGo').onclick=async()=>{if(deferred){await prompt();b.remove()}else iosSheet()};b.querySelector('#cxiBanX').onclick=()=>{try{localStorage.setItem('cx.pwa.ban.'+APP,'1')}catch(e){}b.remove()}};
 setTimeout(show,2500);subs.push(()=>setTimeout(show,300))}
window.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-cxi-mount]').forEach(el=>mount(el,el.dataset.cxiMount));banner()});
window.CXPWA={app:APP,isIOS,isAndroid,standalone,appMode,sw,canPrompt:()=>!!deferred,prompt,card,mount,iosSheet};
})();
