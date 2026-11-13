/* ChainEx V06 · for reskinned legacy pages: V06 toasts + a floating pill back to V06 (home, Cmd-K, theme). */
(function(){const V=window.V5;if(window.CX)CX.toast=m=>V.toast(m);
function pill(){if(document.querySelector('.v6-pill'))return;const p=document.createElement('nav');p.className='v6-pill';p.setAttribute('aria-label','ChainEx V06');p.innerHTML=`<a href="start.html" title="V06 start"><span class="m">Ex</span>V06</a><button data-x="cmd" title="Search (⌘K)">${V.ic('search',15)}<span class="x-hide-m">Search</span></button><a href="workspaces.html" title="All V06 workspaces">${V.ic("grid",15)}</a><button data-x="theme" title="Theme">${V.ic('moon',15)}</button>`;document.body.appendChild(p)}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>setTimeout(pill,50));else setTimeout(pill,50);
new MutationObserver(()=>{if(!document.querySelector('.v6-pill'))pill()}).observe(document.documentElement,{childList:true,subtree:false});setInterval(pill,1500)})();
