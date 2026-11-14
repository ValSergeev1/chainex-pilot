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


  /* Contained regional network map, aligned to the footer column grid.
     Markets come from assets/markets.js (window.CX_MARKETS). */
  function footerNet(){
    const f=D.querySelector('footer.st-foot'); if(!f||f.querySelector('.v5-footnet'))return;
    const cfg=window.CX_MARKETS||{};
    const markets=Array.isArray(cfg.markets)?cfg.markets.filter(m=>m&&(isFinite(+m.lon)&&isFinite(+m.lat)||isFinite(+m.x)&&isFinite(+m.y))):[];
    if(!markets.length)return;
    const byId=Object.fromEntries(markets.map(m=>[String(m.id),m]));
    let links=(Array.isArray(cfg.links)?cfg.links:[]).map(p=>[byId[p[0]],byId[p[1]]]).filter(p=>p[0]&&p[1]);
    if(!links.length){
      markets.forEach(a=>{
        const near=markets.filter(b=>b!==a).map(b=>{
          const A=ll(a), B=ll(b);
          const dx=A[0]-B[0], dy=A[1]-B[1]; return {b,d:dx*dx+dy*dy};
        }).sort((x,y)=>x.d-y.d).slice(0,2);
        near.forEach(n=>{if(!links.some(p=>(p[0]===a&&p[1]===n.b)||(p[0]===n.b&&p[1]===a)))links.push([a,n.b])});
      });
    }

    const hold=D.createElement('div');
    hold.className='st-wrap v5-footnet-wrap';
    const box=D.createElement('div');
    box.className='v5-footnet';
    box.setAttribute('role','img');
    box.setAttribute('aria-label', cfg.label||'ChainEx regional network');
    const c=D.createElement('canvas');
    c.setAttribute('aria-hidden','true');
    box.appendChild(c);
    hold.appendChild(box);
    const cols=f.querySelector('.cols');
    if(cols) f.insertBefore(hold, cols);
    else { const legal=f.querySelector('.st-legal'); if(legal) f.insertBefore(hold, legal); else f.appendChild(hold); }

    const ctx=c.getContext('2d'); if(!ctx)return;
    const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w=0,h=0,dpr=1,raf=0,running=false,packets=[],t0=performance.now(),fit=null;

    /* Simplified contiguous US outline (lon, lat). Decorative; not a legal boundary. */
    const US=[[-124.72,48.18],[-124.25,47.1],[-124.05,46.2],[-124.15,44.6],[-124.4,42.85],[-124.3,41.5],[-124.15,40.3],[-123.6,39.1],[-122.9,38],[-122.5,37.15],[-122.05,36.3],[-121.5,35.5],[-120.8,34.75],[-119.6,34.35],[-118.7,34],[-117.3,33.15],[-117.12,32.53],[-114.75,32.72],[-112.5,32.5],[-110.85,31.33],[-108.2,31.33],[-106.5,31.75],[-103.4,29.15],[-101.7,29.7],[-99.3,27.35],[-97.55,25.84],[-97.15,26.85],[-96.9,27.85],[-95.6,28.85],[-93.9,29.7],[-91.1,29.15],[-89.4,28.9],[-89.05,30.2],[-87.5,30.25],[-85.95,30.38],[-85,29.9],[-84.25,30.15],[-83,29.15],[-82.55,27.75],[-81.95,26.45],[-81.15,25.18],[-80.38,25.15],[-80.08,25.9],[-80.22,27.2],[-80.5,28.45],[-81.2,29.75],[-81.42,30.7],[-81.28,31.55],[-80.85,32.55],[-79.2,33.2],[-77.9,33.9],[-76.4,34.7],[-75.62,35.5],[-75.5,37.15],[-75.95,38.2],[-75.2,39],[-74.95,39.85],[-74.05,40.5],[-73.2,40.85],[-71.95,41.25],[-70.55,41.7],[-69.95,41.85],[-70.75,42.45],[-70.75,43.05],[-68.9,43.85],[-67.05,44.8],[-67.75,47.05],[-69.05,47.28],[-70.05,46.35],[-71.5,45.08],[-73.35,45],[-74.9,45],[-76.15,43.7],[-79,43.25],[-80.1,42.2],[-81.85,41.55],[-83.05,42.15],[-83.55,43.55],[-84.6,45.35],[-85.5,46.05],[-87.4,46.4],[-89.2,47.5],[-91.2,47.7],[-93.2,48.6],[-95.15,49.2],[-100,49],[-104,49],[-110,49],[-116,49],[-122.2,49],[-123.15,48.3],[-124.72,48.18]];

    function ll(m){
      if(isFinite(+m.lon)&&isFinite(+m.lat)) return [+m.lon,+m.lat];
      return [-124.8+(+m.x)*57.8, 49.2-(+m.y)*24.6];
    }
    /* Albers equal-area conic, CONUS standard parallels. */
    function proj(lon,lat){
      const R=Math.PI/180, p1=29.5*R, p2=45.5*R, p0=37.5*R, l0=-96*R;
      const n=.5*(Math.sin(p1)+Math.sin(p2));
      const C=Math.cos(p1)*Math.cos(p1)+2*n*Math.sin(p1);
      const rho0=Math.sqrt(C-2*n*Math.sin(p0))/n;
      const phi=lat*R, lam=lon*R;
      const rho=Math.sqrt(C-2*n*Math.sin(phi))/n;
      const th=n*(lam-l0);
      return {x:rho*Math.sin(th), y:rho0-rho*Math.cos(th)};
    }
    function bounds(){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      US.forEach(([lo,la])=>{const p=proj(lo,la); if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y;});
      return {minX,minY,maxX,maxY};
    }
    const B=bounds();
    function layout(){
      const padX=Math.max(22,w*0.06), padY=Math.max(16,h*0.08);
      const bw=B.maxX-B.minX, bh=B.maxY-B.minY;
      const scale=Math.min((w-padX*2)/bw,(h-padY*2)/bh);
      const ox=(w-bw*scale)/2-B.minX*scale;
      const oy=(h-bh*scale)/2+B.maxY*scale; /* y is flipped to canvas */
      return {scale,ox,oy};
    }
    function xy(lon,lat){
      const p=proj(lon,lat);
      return {x:fit.ox+p.x*fit.scale, y:fit.oy-p.y*fit.scale};
    }
    function bow(A,B){
      const dx=B.x-A.x, dy=B.y-A.y, len=Math.hypot(dx,dy)||1;
      const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
      const nx=-dy/len, ny=dx/len;
      const sign=ny<0?1:-1;
      const amp=Math.min(22,len*0.1);
      return {x:mx+nx*amp*sign, y:my+ny*amp*sign};
    }

    function resize(){
      const r=box.getBoundingClientRect();
      dpr=Math.min(window.devicePixelRatio||1,2);
      w=Math.max(1,Math.floor(r.width));
      h=Math.max(1,Math.floor(r.height));
      c.width=w*dpr; c.height=h*dpr;
      c.style.width=w+'px'; c.style.height=h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      fit=layout();
    }
    function spawn(){
      if(!links.length)return;
      const [a,b]=links[Math.floor(Math.random()*links.length)];
      const dir=Math.random()<0.5;
      packets.push({a:dir?a:b,b:dir?b:a,p:Math.random()*0.4,s:0.0016+Math.random()*0.0018});
      if(packets.length>5)packets.shift();
    }
    function drawUS(){
      ctx.beginPath();
      US.forEach((pt,i)=>{const P=xy(pt[0],pt[1]); i?ctx.lineTo(P.x,P.y):ctx.moveTo(P.x,P.y);});
      ctx.closePath();
      ctx.fillStyle='rgba(48,88,128,.58)';
      ctx.fill();
      ctx.strokeStyle='rgba(155,195,230,.88)';
      ctx.lineWidth=1.2;
      ctx.stroke();
    }
    function draw(now){
      ctx.clearRect(0,0,w,h);
      if(!fit)return;
      drawUS();
      /* Lanes under the markers — thin, even, no grid. */
      links.forEach(([a,b])=>{
        const A=xy(...ll(a)), B=xy(...ll(b)), C=bow(A,B);
        ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.quadraticCurveTo(C.x,C.y,B.x,B.y);
        ctx.strokeStyle='rgba(125,180,230,.38)'; ctx.lineWidth=1; ctx.stroke();
      });
      if(!reduce()){
        packets.forEach(p=>{
          p.p+=p.s; if(p.p>1)p.p-=1;
          const A=xy(...ll(p.a)), B=xy(...ll(p.b)), C=bow(A,B);
          const t=p.p;
          const x=(1-t)*(1-t)*A.x+2*(1-t)*t*C.x+t*t*B.x;
          const y=(1-t)*(1-t)*A.y+2*(1-t)*t*C.y+t*t*B.y;
          ctx.beginPath(); ctx.arc(x,y,4.5,0,Math.PI*2);
          ctx.fillStyle='rgba(158,216,255,.16)'; ctx.fill();
          ctx.beginPath(); ctx.arc(x,y,1.7,0,Math.PI*2);
          ctx.fillStyle='#c8e7ff'; ctx.fill();
        });
      }
      const pulse=reduce()?0.4:(Math.sin((now-t0)/1100)+1)/2;
      markets.forEach(m=>{
        const P=xy(...ll(m));
        ctx.beginPath(); ctx.arc(P.x,P.y,6+pulse*1.6,0,Math.PI*2);
        ctx.fillStyle='rgba(46,116,230,'+(0.14+pulse*0.08)+')'; ctx.fill();
        ctx.beginPath(); ctx.arc(P.x,P.y,2.4,0,Math.PI*2);
        ctx.fillStyle='#d7ebff'; ctx.strokeStyle='#1a4f9a'; ctx.lineWidth=1;
        ctx.fill(); ctx.stroke();
      });
    }
    function loop(now){
      if(!running)return;
      if(!reduce() && packets.length<4 && Math.random()<0.04)spawn();
      draw(now); raf=requestAnimationFrame(loop);
    }
    function start(){
      if(running)return; running=true;
      if(reduce()){ packets=[]; resize(); draw(0); running=false; return; }
      cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
    }
    function stop(){ running=false; cancelAnimationFrame(raf); }
    resize();
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(ents=>{
        if(ents[0]&&ents[0].isIntersecting) start(); else stop();
      },{threshold:0.05});
      io.observe(box);
    } else start();
    if('ResizeObserver' in window){
      const ro=new ResizeObserver(()=>{resize(); if(!running)draw(0)});
      ro.observe(box);
    } else {
      window.addEventListener('resize',()=>{resize(); if(!running)draw(0)},{passive:true});
    }
  }

  function build(){ mega(); mobile(); footer(); map(); footerNet(); }
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',build); else build();
})();
