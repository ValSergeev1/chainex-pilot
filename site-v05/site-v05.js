/* ChainEx Website V05: mega menu, full-height mobile menu, footer accordion, market map. */
(function(){
  if(window.__v5site)return; window.__v5site=1;
  const D=document;
  const IC={
    services:'<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    how:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
    coverage:'<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    about:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    shippers:'<path d="M21 8 12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8"/>',
    carriers:'<path d="M2 7h12v9H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    drivers:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M4.5 16l5.5-3M19.5 16l-5.5-3"/>',
    careers:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    chev:'<path d="m6 9 6 6 6-6"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    track:'<path d="M3 12h4l3-8 4 16 3-8h4"/>'
  };
  const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const key=h=>/services/.test(h)?'services':/how-it/.test(h)?'how':/coverage/.test(h)?'coverage':/about/.test(h)?'about':/shippers/.test(h)?'shippers':/carriers/.test(h)?'carriers':/drivers/.test(h)?'drivers':/careers/.test(h)?'careers':'track';

  function mega(){
    const drops=[...D.querySelectorAll('.v5-drop')];
    const closeAll=(keep)=>{drops.forEach(d=>{if(d!==keep){d.classList.remove('open');const b=d.querySelector('button');if(b)b.setAttribute('aria-expanded','false')}})};
    drops.forEach(d=>{
      const btn=d.querySelector(':scope > button'); if(!btn)return;
      btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const on=!d.classList.contains('open');closeAll(d);d.classList.toggle('open',on);btn.setAttribute('aria-expanded',on?'true':'false');});
      d.addEventListener('mouseenter',()=>{if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){closeAll(d);d.classList.add('open');btn.setAttribute('aria-expanded','true')}});
      d.addEventListener('mouseleave',()=>{if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){d.classList.remove('open');btn.setAttribute('aria-expanded','false')}});
    });
    D.addEventListener('click',e=>{if(!e.target.closest('.v5-drop'))closeAll()});
    D.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAll();const b=D.querySelector('.v5-drop.open > button,.v5-ham');}});
  }

  function mobile(){
    if(D.getElementById('v5m'))return;
    const h=D.querySelector('header.st-top'); const f=D.querySelector('footer.st-foot');
    if(!h)return;
    const nav=[...h.querySelectorAll('.v5-nav > a, .v5-nav .v5-drop > button')];
    const cols=f?[...f.querySelectorAll('.cols > div')].slice(1):[];
    const groups=[];
    cols.forEach(c=>{let cur=null;[...c.children].forEach(el=>{if(el.tagName==='H4'){cur={t:el.textContent.trim(),a:[]};groups.push(cur)}else if(el.tagName==='A'&&cur&&!/^mailto:/.test(el.getAttribute('href')||''))cur.a.push(el)})});
    const svc=groups.filter(g=>/solutions/i.test(g.t));
    const rest=groups.filter(g=>!/solutions/i.test(g.t));
    const A=a=>`<a href="${esc(a.getAttribute('href'))}"${a.classList.contains('on')?' class="on" aria-current="page"':''}>${esc(a.textContent.trim())}</a>`;
    const quote=h.querySelector('.v5-cta .st-btn.pri, a.st-btn.pri');
    const apply=h.querySelector('[data-v5="apply"]');
    const sign=h.querySelector('#partnerLogin');
    const tel=(f&&f.querySelector('a[href^="tel:"]'))||D.querySelector('a[href^="tel:"]');
    const mail=(f&&f.querySelector('a[href^="mailto:"]'))||D.querySelector('a[href^="mailto:"]');
    const items=[];
    // Prefer labeled nav anchors; Services is a drop
    const servicesBtn=h.querySelector('.v5-drop[data-menu="services"] > button');
    const otherLinks=[...h.querySelectorAll('.v5-nav > a')];
    if(servicesBtn && svc.length){
      items.push(`<div class="v5m-acc" data-acc><button class="v5m-row" type="button" aria-expanded="false">${ic('services')}<span>Services</span>${ic('chev',18)}</button><div class="v5m-sub"><a href="services.html" class="v5m-all">All services</a>${svc.map(g=>`<div class="v5m-h">${esc(g.t)}</div>${g.a.map(A).join('')}`).join('')}</div></div>`);
    }
    otherLinks.forEach(a=>{
      const k=key(a.getAttribute('href')||'');
      items.push(`<a class="v5m-row${a.classList.contains('on')?' on':''}" href="${esc(a.getAttribute('href'))}">${ic(k)}<span>${esc(a.textContent.trim())}</span></a>`);
    });
    const accs=rest.map(g=>`<div class="v5m-acc" data-acc><button class="v5m-row sm" type="button" aria-expanded="false"><span>${esc(g.t)}</span>${ic('chev',18)}</button><div class="v5m-sub">${g.a.map(A).join('')}</div></div>`).join('');
    const el=D.createElement('div'); el.id='v5m'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Site menu');
    const home=(h.querySelector('.wordmark')||{}).getAttribute?.('href')||'index.html';
    el.innerHTML=`<div class="v5m-back" data-v5m-close></div><aside class="v5m-panel"><div class="v5m-top"><a class="v5m-wm" href="${esc(home)}">Chain<b>Ex</b></a><button class="v5m-x" type="button" data-v5m-close aria-label="Close menu">${ic('x',22)}</button></div>
      <div class="v5m-scroll">
        <div class="v5m-cta">${quote?`<a class="v5m-btn pri" href="${esc(quote.getAttribute('href'))}">${esc(quote.textContent.trim())}</a>`:''}${apply?`<a class="v5m-btn ghost" href="${esc(apply.getAttribute('href'))}">${esc(apply.textContent.trim())}</a>`:''}</div>
        ${sign?`<a class="v5m-signin" href="${esc(sign.getAttribute('href'))}">${ic('user',18)} ${esc(sign.textContent.trim())}</a>`:''}
        <nav class="v5m-nav" aria-label="Main">${items.join('')}</nav>
        <div class="v5m-sec">${accs}</div>
        <div class="v5m-quick">${tel?`<a href="${esc(tel.getAttribute('href'))}">${ic('phone',18)}<span><small>Urgent freight / operations</small>${esc(tel.textContent.trim())}</span></a>`:''}${mail?`<a href="${esc(mail.getAttribute('href'))}">${ic('mail',18)}<span><small>Email our team</small>${esc(mail.textContent.trim())}</span></a>`:''}</div>
        <div class="v5m-theme"><span>Appearance</span><div class="v5m-tsw"></div></div>
      </div></aside>`;
    D.body.appendChild(el);
    const tw=el.querySelector('.v5m-tsw');
    if(window.CXUI&&CXUI.switcherHTML)tw.innerHTML=CXUI.switcherHTML();
    const ham=h.querySelector('.v5-ham');
    let sy=0;
    function open(){sy=window.scrollY;D.documentElement.classList.add('v5m-on');D.body.style.top=-sy+'px';ham&&ham.setAttribute('aria-expanded','true');setTimeout(()=>{const x=el.querySelector('.v5m-x');x&&x.focus()},60)}
    function close(){if(!D.documentElement.classList.contains('v5m-on'))return;D.documentElement.classList.remove('v5m-on');D.body.style.top='';window.scrollTo(0,sy);if(ham){ham.setAttribute('aria-expanded','false');ham.focus()}}
    if(ham)ham.addEventListener('click',open);
    el.addEventListener('click',e=>{
      if(e.target.closest('[data-v5m-close]')){close();return}
      const r=e.target.closest('.v5m-acc > .v5m-row');
      if(r){const acc=r.parentNode,on=!acc.classList.contains('open');acc.classList.toggle('open',on);r.setAttribute('aria-expanded',on?'true':'false');return}
      if(e.target.closest('a'))close();
    });
    D.addEventListener('keydown',e=>{if(e.key==='Escape'&&D.documentElement.classList.contains('v5m-on'))close()});
    window.V5Menu={open,close};
  }

  function footer(){
    const f=D.querySelector('footer.st-foot'); if(!f||f.dataset.v5f)return; f.dataset.v5f=1; f.classList.add('cxf');
    f.querySelectorAll('.cols > div').forEach((c,i)=>{
      if(i===0)return;
      c.querySelectorAll('h4').forEach(h=>{
        h.setAttribute('role','button'); h.tabIndex=0; h.setAttribute('aria-expanded','false');
        if(!h.querySelector('.cxf-chev'))h.insertAdjacentHTML('beforeend',`<i class="cxf-chev">${ic('chev',16)}</i>`);
      });
    });
    f.addEventListener('click',e=>{
      const h=e.target.closest('.cols h4'); if(!h||!window.matchMedia('(max-width:700px)').matches)return;
      const on=!h.classList.contains('open'); h.classList.toggle('open',on); h.setAttribute('aria-expanded',on?'true':'false');
    });
    f.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.cols h4')){e.preventDefault();e.target.click()}});
  }

  function map(){
    function setCity(c){
      D.querySelectorAll('.mp-b').forEach(b=>b.classList.toggle('on',b.dataset.city===c));
      D.querySelectorAll('.st-map .mp-p').forEach(p=>p.classList.toggle('on',p.dataset.city===c));
      D.querySelectorAll('.st-map .mp-l').forEach(l=>l.classList.toggle('on',l.dataset.c===c));
      const cap=D.getElementById('mpCity'); if(cap)cap.textContent=c;
    }
    D.addEventListener('click',e=>{const b=e.target.closest('.mp-b,.st-map .mp-p'); if(b)setCity(b.dataset.city)});
    window.CXSite={setCity};
  }


  /* Live network behind the footer. Markets come from assets/markets.js (window.CX_MARKETS). */
  function footerNet(){
    const f=D.querySelector('footer.st-foot'); if(!f||f.querySelector('.v5-footnet'))return;
    const cfg=window.CX_MARKETS||{};
    const markets=Array.isArray(cfg.markets)?cfg.markets.filter(m=>m&&isFinite(+m.x)&&isFinite(+m.y)):[];
    if(!markets.length)return;
    const byId=Object.fromEntries(markets.map(m=>[String(m.id),m]));
    let links=(Array.isArray(cfg.links)?cfg.links:[]).map(p=>[byId[p[0]],byId[p[1]]]).filter(p=>p[0]&&p[1]);
    if(!links.length){
      markets.forEach(a=>{
        const near=markets.filter(b=>b!==a).map(b=>{
          const dx=a.x-b.x, dy=a.y-b.y; return {b,d:dx*dx+dy*dy};
        }).sort((x,y)=>x.d-y.d).slice(0,2);
        near.forEach(n=>{if(!links.some(p=>(p[0]===a&&p[1]===n.b)||(p[0]===n.b&&p[1]===a)))links.push([a,n.b])});
      });
    }
    const c=D.createElement('canvas');
    c.className='v5-footnet';
    c.setAttribute('aria-hidden','true');
    const scrim=D.createElement('div');
    scrim.className='v5-footnet-scrim';
    scrim.setAttribute('aria-hidden','true');
    f.insertBefore(c,f.firstChild);
    f.insertBefore(scrim,c.nextSibling);

    const ctx=c.getContext('2d'); if(!ctx)return;
    const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w=0,h=0,dpr=1,raf=0,running=false,packets=[],t0=performance.now();

    function resize(){
      const r=f.getBoundingClientRect();
      dpr=Math.min(window.devicePixelRatio||1,2);
      w=Math.max(1,Math.floor(r.width));
      h=Math.max(1,Math.floor(r.height));
      c.width=w*dpr; c.height=h*dpr;
      c.style.width=w+'px'; c.style.height=h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    /* On small screens, keep the network's proportions and place it behind
       the ChainEx brand block (not the CTA). Desktop layout is unchanged. */
    function mapBox(){
      if(!window.matchMedia('(max-width:700px)').matches) return {x:0,y:0,w,h};
      const mh=Math.min(280,Math.max(200,Math.round(w*0.68)));
      let y=0;
      const brand=f.querySelector('.cols > div:first-child');
      if(brand){
        const fr=f.getBoundingClientRect();
        const br=brand.getBoundingClientRect();
        const mid=(br.top-fr.top)+br.height/2;
        y=Math.round(mid-mh/2);
        y=Math.max(0,Math.min(y,Math.max(0,h-mh)));
      }
      return {x:0,y,w,h:mh};
    }
    function px(m){
      const b=mapBox();
      const padX=b.w*0.06, padY=b.h*0.10;
      return {x:b.x+padX+m.x*(b.w-padX*2), y:b.y+padY+m.y*(b.h-padY*2)};
    }
    function spawn(){
      if(!links.length)return;
      const [a,b]=links[Math.floor(Math.random()*links.length)];
      const dir=Math.random()<0.5;
      packets.push({a:dir?a:b,b:dir?b:a,p:Math.random()*0.4,s:0.002+Math.random()*0.0025});
      if(packets.length>14)packets.shift();
    }
    function draw(now){
      ctx.clearRect(0,0,w,h);
      const b=mapBox();
      ctx.save();
      ctx.beginPath(); ctx.rect(b.x,b.y,b.w,b.h); ctx.clip();
      // faint grid
      ctx.strokeStyle='rgba(148,180,220,.07)';
      ctx.lineWidth=1;
      const step=46;
      ctx.beginPath();
      for(let x=b.x;x<=b.x+b.w;x+=step){ctx.moveTo(x,b.y);ctx.lineTo(x,b.y+b.h)}
      for(let y=b.y;y<=b.y+b.h;y+=step){ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y)}
      ctx.stroke();
      // arcs
      links.forEach(([a,c2])=>{
        const A=px(a), B=px(c2);
        const cx=(A.x+B.x)/2, cy=(A.y+B.y)/2-Math.min(36,b.h*0.08);
        ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.quadraticCurveTo(cx,cy,B.x,B.y);
        ctx.strokeStyle='rgba(106,168,247,.42)'; ctx.lineWidth=1.25; ctx.stroke();
      });
      if(!reduce()){
        packets.forEach(p=>{
          p.p+=p.s; if(p.p>1)p.p-=1;
          const A=px(p.a), B=px(p.b);
          const t=p.p, cx=(A.x+B.x)/2, cy=(A.y+B.y)/2-Math.min(36,b.h*0.08);
          const x=(1-t)*(1-t)*A.x+2*(1-t)*t*cx+t*t*B.x;
          const y=(1-t)*(1-t)*A.y+2*(1-t)*t*cy+t*t*B.y;
          ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2);
          ctx.fillStyle='rgba(125,211,252,.16)'; ctx.fill();
          ctx.beginPath(); ctx.arc(x,y,2.1,0,Math.PI*2);
          ctx.fillStyle='#9ed8ff'; ctx.fill();
        });
      }
      const pulse=reduce()?0.5:(Math.sin((now-t0)/800)+1)/2;
      markets.forEach(m=>{
        const P=px(m);
        ctx.beginPath(); ctx.arc(P.x,P.y,9+pulse*3,0,Math.PI*2);
        ctx.fillStyle='rgba(46,116,230,'+(0.10+pulse*0.08)+')'; ctx.fill();
        ctx.beginPath(); ctx.arc(P.x,P.y,2.8,0,Math.PI*2);
        ctx.fillStyle='#8ec0ff'; ctx.fill();
        /* Labels stay off — names would collide with footer links. Markets still drive nodes and arcs. */
      });
      ctx.restore();
    }
    function loop(now){
      if(!running)return;
      if(!reduce() && packets.length<12 && Math.random()<0.07)spawn();
      draw(now); raf=requestAnimationFrame(loop);
    }
    function start(){
      if(running)return; running=true;
      if(reduce()){ packets=[]; for(let i=0;i<8;i++)spawn(); resize(); draw(0); running=false; return; }
      cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
    }
    function stop(){ running=false; cancelAnimationFrame(raf); }
    resize();
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(ents=>{
        if(ents[0]&&ents[0].isIntersecting) start(); else stop();
      },{threshold:0.05});
      io.observe(f);
    } else start();
    window.addEventListener('resize',()=>{resize(); if(reduce())draw(0)},{passive:true});
  }

  function build(){ mega(); mobile(); footer(); map(); footerNet(); }
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',build); else build();
})();
