/* ChainEx V02 · responsive helper: hamburger + off-canvas drawer on phones/tablets. Not used by the driver app. */
(function(){if(window.__rwd)return;window.__rwd=1;
const MQ=window.matchMedia('(max-width:900px)'),MQS=window.matchMedia('(max-width:1180px)');const mq=()=>{const h=header();return h&&h.classList.contains('st-top')?MQS:MQ};const D=document;
function header(){return D.querySelector('header.sx-top, header.topbar, header.st-top')}
function ensure(){const h=header();if(!h)return;
  if(!h.querySelector('.rwd-ham')){const b=D.createElement('button');b.className='rwd-ham';b.id='hamb';b.type='button';b.setAttribute('aria-label','Menu');b.setAttribute('data-menu','1');b.textContent='☰';b.onclick=e=>{e.stopPropagation();D.body.classList.toggle('nav-open')};h.insertBefore(b,h.firstChild)}
  if(!D.querySelector('.rwd-back')){const k=D.createElement('div');k.className='rwd-back';k.onclick=()=>D.body.classList.remove('nav-open');D.body.appendChild(k)}
  if(h.classList.contains('sx-top'))return; // staff shell uses its own side drawer
  let dr=D.querySelector('.rwd-drawer');if(!dr){dr=D.createElement('aside');dr.className='rwd-drawer'+(h.classList.contains('st-top')?' site':'');dr.setAttribute('aria-label','Menu');D.body.appendChild(dr);
    dr.addEventListener('click',e=>{if(e.target.closest('a'))D.body.classList.remove('nav-open')})}
  place()}
const moved=[];
function place(){const h=header();const dr=D.querySelector('.rwd-drawer');if(!h||!dr)return;
  const sel=h.classList.contains('st-top')?['nav','#partnerLogin','.st-btn.pri']:['.topnav','.tb-right'];
  if(mq().matches){sel.forEach(s=>{const el=h.querySelector(':scope > '+s);if(el){const ph=D.createComment('rwd');el.parentNode.insertBefore(ph,el);moved.push([el,ph]);dr.appendChild(el)}})}
  else{while(moved.length){const [el,ph]=moved.pop();if(ph.parentNode)ph.parentNode.insertBefore(el,ph),ph.remove()}D.body.classList.remove('nav-open')}}
[MQ,MQS].forEach(m=>m.addEventListener?m.addEventListener('change',place):m.addListener(place));
D.addEventListener('click',e=>{if(!D.body.classList.contains('nav-open'))return;const s=e.target.closest('.sx-side [data-nav], .sx-side a');if(s)D.body.classList.remove('nav-open')});
function boot(){ensure();new MutationObserver(()=>{const h=header();if(h&&!h.querySelector('.rwd-ham'))ensure()}).observe(D.body,{childList:true})}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
window.CXRwd={ensure,place,open:()=>D.body.classList.add('nav-open'),close:()=>D.body.classList.remove('nav-open')};
})();
