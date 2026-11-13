/* V03 dashboard phone layout: bottom tab bar from the section nav, More sheet, tables as labelled cards. */
(function(){const de=document.documentElement;const mq=window.matchMedia('(max-width: 899px)');let bot=null,sheet=null;
const PRIMARY=['overview','queue','partners','onboard'];
function label(){document.querySelectorAll('#main table').forEach(t=>{const hs=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());if(!hs.length)return;t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(hs[i]&&!td.hasAttribute('data-l'))td.setAttribute('data-l',hs[i])}))})}
function links(){return [...document.querySelectorAll('#sideNav a[data-nav]')].map(a=>({k:a.dataset.nav,href:a.getAttribute('href'),ic:(a.querySelector('.ic')||{}).textContent||'•',lb:(a.querySelector('.lb')||{}).textContent||a.dataset.nav,nb:(a.querySelector('.nb')||{}).textContent||'',on:a.classList.contains('on')}))}
function build(){if(!mq.matches){de.classList.remove('dm');if(bot)bot.remove(),bot=null;if(sheet)sheet.remove(),sheet=null;return}
 de.classList.add('dm');label();const L=links();if(!L.length)return;const cur=L.find(x=>x.on);const morOn=cur&&!PRIMARY.includes(cur.k);
 const html=L.filter(x=>PRIMARY.includes(x.k)).map(x=>`<a href="${x.href}" class="${x.on?'on':''}" id="dm-${x.k}"><span class="ic">${x.ic}</span><span>${x.k==='onboard'?'Onboarding':x.lb}</span>${x.nb?`<i>${x.nb}</i>`:''}</a>`).join('')+`<button id="dm-more" class="${morOn||sheet?'on':''}"><span class="ic">⋯</span><span>${morOn?cur.lb.split(' ')[0]:'More'}</span></button>`;
 if(!bot){bot=document.createElement('nav');bot.className='dm-bot';bot.setAttribute('aria-label','Dashboard sections');document.body.appendChild(bot);bot.addEventListener('click',e=>{if(e.target.closest('#dm-more')){toggle()}else if(sheet){sheet.remove();sheet=null}})}
 if(bot.innerHTML!==html)bot.innerHTML=html}
function toggle(){if(sheet){sheet.remove();sheet=null;build();return}const L=links();const B=/dashboard-alt/.test(location.pathname);
 sheet=document.createElement('div');sheet.className='dm-sheet';sheet.id='dmSheet';sheet.innerHTML=`<div class="dm-ms">${L.filter(x=>!PRIMARY.includes(x.k)).map(x=>`<a href="${x.href}" class="${x.on?'on':''}" id="dmm-${x.k}"><span>${x.ic}</span><span>${x.lb}</span></a>`).join('')}<h4>Design</h4><a href="dashboard.html${location.hash}" class="${B?'':'on'}" id="dmm-designA">Design A</a><a href="dashboard-alt.html${location.hash}" class="${B?'on':''}" id="dmm-designB">Design B</a><h4>Apps</h4><a href="board.html">◎ Dispatch board</a><a href="workspaces.html">▦ Workspaces</a></div>`;
 document.body.appendChild(sheet);sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('a')){sheet.remove();sheet=null;build()}});build()}
const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(build,30)});
function start(){const m=document.getElementById('main'),s=document.getElementById('sideNav');if(m)mo.observe(m,{childList:true,subtree:true});if(s)mo.observe(s,{childList:true,subtree:true,attributes:true});build()}
mq.addEventListener?mq.addEventListener('change',build):mq.addListener(build);window.addEventListener('hashchange',()=>setTimeout(build,50));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();window.__dm={build,toggle};
})();
