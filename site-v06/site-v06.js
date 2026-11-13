/* ChainEx Website V06: live-network canvas, bottom-sheet nav, mega menu, scroll reveals, counters. No heavy libs. */
(function(){
  if(window.__v6site)return; window.__v6site=1;
  const D=document;
  const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||''}</svg>`;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const key=h=>/services/.test(h)?'services':/how-it/.test(h)?'how':/coverage/.test(h)?'coverage':/about/.test(h)?'about':/shippers/.test(h)?'shippers':/carriers/.test(h)?'carriers':/drivers/.test(h)?'drivers':/careers/.test(h)?'careers':'track';

  /* ---------- live network canvas (original, lightweight) ---------- */
  function network(){
    const c=D.getElementById('v6net'); if(!c)return;
    const ctx=c.getContext('2d'); if(!ctx)return;
    const nodes=[
      {n:'Seattle',x:.14,y:.22},{n:'Portland',x:.13,y:.30},{n:'Bay Area',x:.12,y:.46},
      {n:'Los Angeles',x:.16,y:.58},{n:'Phoenix',x:.24,y:.58},{n:'Denver',x:.34,y:.42},
      {n:'Dallas',x:.42,y:.60},{n:'Chicago',x:.54,y:.36},{n:'Atlanta',x:.60,y:.58},
      {n:'Miami',x:.66,y:.74},{n:'New York',x:.76,y:.32},{n:'Boston',x:.80,y:.26}
    ];
    const edges=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[5,7],[6,8],[7,8],[8,9],[7,10],[10,11],[4,6],[2,5]];
    let packets=[], w=0,h=0,dpr=1,raf=0,t0=performance.now(), running=true;
    function resize(){
      const r=c.getBoundingClientRect();
      dpr=Math.min(window.devicePixelRatio||1,2);
      w=Math.max(1,Math.floor(r.width)); h=Math.max(1,Math.floor(r.height));
      c.width=w*dpr; c.height=h*dpr; c.style.width=w+'px'; c.style.height=h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function px(n){
      if(w>800){return {x:n.x*0.62*w + w*0.34, y:n.y*0.78*h + h*0.10};}
      return {x:n.x*w, y:n.y*0.46*h + 24};
    }
    function spawn(){
      const e=edges[Math.floor(Math.random()*edges.length)];
      const a=nodes[e[0]], b=nodes[e[1]];
      const dir=Math.random()<.5;
      packets.push({a:dir?a:b,b:dir?b:a,p:0,s:.0025+.002*Math.random()});
      if(packets.length>18)packets.shift();
    }
    function draw(now){
      ctx.clearRect(0,0,w,h);
      // vignette field
      const g=ctx.createRadialGradient(w*.72,h*.4,40,w*.6,h*.45,Math.max(w,h)*.8);
      g.addColorStop(0,'rgba(37,99,235,.16)'); g.addColorStop(1,'rgba(7,11,18,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      // faint grid
      ctx.strokeStyle='rgba(255,255,255,.035)'; ctx.lineWidth=1;
      const step=48;
      ctx.beginPath();
      for(let x=0;x<w;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,h)}
      for(let y=0;y<h;y+=step){ctx.moveTo(0,y);ctx.lineTo(w,y)}
      ctx.stroke();
      // routes
      ctx.lineWidth=1.2;
      edges.forEach(([i,j],k)=>{
        const A=px(nodes[i]), B=px(nodes[j]);
        ctx.strokeStyle='rgba(96,165,250,.22)';
        ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.quadraticCurveTo((A.x+B.x)/2,(A.y+B.y)/2-40,B.x,B.y); ctx.stroke();
      });
      // packets
      if(!reduce()){
        packets.forEach(p=>{
          p.p+=p.s;
          if(p.p>1)p.p=0;
          const A=px(p.a), B=px(p.b);
          const t=p.p, cx=(A.x+B.x)/2, cy=(A.y+B.y)/2-40;
          const x=(1-t)*(1-t)*A.x+2*(1-t)*t*cx+t*t*B.x;
          const y=(1-t)*(1-t)*A.y+2*(1-t)*t*cy+t*t*B.y;
          ctx.fillStyle='#7dd3fc';
          ctx.beginPath(); ctx.arc(x,y,2.4,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(125,211,252,.2)';
          ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill();
        });
      }
      // nodes
      const pulse=reduce()?1: (Math.sin((now-t0)/700)+1)/2;
      nodes.forEach((n,i)=>{
        const P=px(n);
        ctx.beginPath(); ctx.arc(P.x,P.y,10+pulse*4,0,Math.PI*2);
        ctx.fillStyle='rgba(59,130,246,'+(0.08+pulse*0.06)+')'; ctx.fill();
        ctx.beginPath(); ctx.arc(P.x,P.y,3.2,0,Math.PI*2);
        ctx.fillStyle=i===0?'#7dd3fc':'#60a5fa'; ctx.fill();
        if(w>700){
          ctx.font='600 11px Inter,system-ui,sans-serif';
          ctx.fillStyle='rgba(226,232,240,.7)';
          ctx.fillText(n.n, P.x+8, P.y-8);
        }
      });
    }
    function loop(now){
      if(!running)return;
      if(!reduce() && packets.length<14 && Math.random()<.08)spawn();
      draw(now); raf=requestAnimationFrame(loop);
    }
    const io=new IntersectionObserver(ents=>{
      running=ents[0]&&ents[0].isIntersecting;
      if(running){cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
    });
    io.observe(c);
    resize();
    if(reduce()){for(let i=0;i<8;i++)spawn(); draw(0)}
    else raf=requestAnimationFrame(loop);
    window.addEventListener('resize',()=>{resize(); if(reduce())draw(0)}, {passive:true});
  }

  function mega(){
    const drops=[...D.querySelectorAll('.v6-drop')];
    const closeAll=(keep)=>{drops.forEach(d=>{if(d!==keep){d.classList.remove('open');const b=d.querySelector('button');if(b)b.setAttribute('aria-expanded','false')}})};
    drops.forEach(d=>{
      const btn=d.querySelector(':scope > button'); if(!btn)return;
      btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const on=!d.classList.contains('open');closeAll(d);d.classList.toggle('open',on);btn.setAttribute('aria-expanded',on?'true':'false')});
      d.addEventListener('mouseenter',()=>{if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){closeAll(d);d.classList.add('open');btn.setAttribute('aria-expanded','true')}});
      d.addEventListener('mouseleave',()=>{if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){d.classList.remove('open');btn.setAttribute('aria-expanded','false')}});
    });
    D.addEventListener('click',e=>{if(!e.target.closest('.v6-drop'))closeAll()});
    D.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
  }

  function sheet(){
    if(D.getElementById('v6m'))return;
    const h=D.querySelector('header.st-top'); const f=D.querySelector('footer.st-foot');
    if(!h)return;
    const cols=f?[...f.querySelectorAll('.cols > div')].slice(1):[];
    const groups=[];
    cols.forEach(c=>{let cur=null;[...c.children].forEach(el=>{if(el.tagName==='H4'){cur={t:el.textContent.trim(),a:[]};groups.push(cur)}else if(el.tagName==='A'&&cur&&!/^mailto:/.test(el.getAttribute('href')||''))cur.a.push(el)})});
    const svc=groups.filter(g=>/solutions/i.test(g.t));
    const rest=groups.filter(g=>!/solutions/i.test(g.t));
    const A=a=>`<a href="${esc(a.getAttribute('href'))}"${a.classList.contains('on')?' class="on" aria-current="page"':''}>${esc(a.textContent.trim())}</a>`;
    const quote=h.querySelector('.v6-cta .st-btn.pri, a.st-btn.pri');
    const apply=h.querySelector('[data-v6="apply"]');
    const sign=h.querySelector('#partnerLogin');
    const tel=(f&&f.querySelector('a[href^="tel:"]'))||D.querySelector('a[href^="tel:"]');
    const mail=(f&&f.querySelector('a[href^="mailto:"]'))||D.querySelector('a[href^="mailto:"]');
    const items=[];
    if(svc.length){
      items.push(`<div class="v6-acc" data-acc><button class="v6-row" type="button" aria-expanded="false">${ic('services')}<span>Services</span>${ic('chev',18)}</button><div class="v6-sub"><a href="services.html">All services</a>${svc.map(g=>`<div class="v6-h">${esc(g.t)}</div>${g.a.map(A).join('')}`).join('')}</div></div>`);
    }
    [...h.querySelectorAll('.v6-nav > a')].forEach(a=>{
      const k=key(a.getAttribute('href')||'');
      items.push(`<a class="v6-row${a.classList.contains('on')?' on':''}" href="${esc(a.getAttribute('href'))}">${ic(k)}<span>${esc(a.textContent.trim())}</span></a>`);
    });
    const accs=rest.map(g=>`<div class="v6-acc" data-acc><button class="v6-row sm" type="button" aria-expanded="false"><span>${esc(g.t)}</span>${ic('chev',18)}</button><div class="v6-sub">${g.a.map(A).join('')}</div></div>`).join('');
    const el=D.createElement('div'); el.id='v6m'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Site menu');
    const home=(h.querySelector('.wordmark')||{}).getAttribute?.('href')||'index.html';
    el.innerHTML=`<div class="v6-back" data-v6-close></div><aside class="v6-sheet"><div class="v6-handle" aria-hidden="true"></div>
      <div class="v6-mtop"><a class="v6-mwm" href="${esc(home)}">Chain<b>Ex</b></a><button class="v6-x" type="button" data-v6-close aria-label="Close menu">${ic('x',22)}</button></div>
      <div class="v6-scroll">
        <div class="v6-mcta">${quote?`<a class="v6-mbtn pri" href="${esc(quote.getAttribute('href'))}">${esc(quote.textContent.trim())}</a>`:''}${apply?`<a class="v6-mbtn ghost" href="${esc(apply.getAttribute('href'))}">${esc(apply.textContent.trim())}</a>`:''}</div>
        ${sign?`<a class="v6-signin" href="${esc(sign.getAttribute('href'))}">${ic('user',18)} ${esc(sign.textContent.trim())}</a>`:''}
        <nav class="v6-mnav" aria-label="Main">${items.join('')}</nav>
        <div class="v6-msec">${accs}</div>
        <div class="v6-quick">${tel?`<a href="${esc(tel.getAttribute('href'))}">${ic('phone',18)}<span><small>Urgent freight / operations</small>${esc(tel.textContent.trim())}</span></a>`:''}${mail?`<a href="${esc(mail.getAttribute('href'))}">${ic('mail',18)}<span><small>Email our team</small>${esc(mail.textContent.trim())}</span></a>`:''}</div>
        <div class="v6-theme"><span>Appearance</span><div class="v6-tsw"></div></div>
      </div></aside>`;
    D.body.appendChild(el);
    const tw=el.querySelector('.v6-tsw');
    if(window.CXUI&&CXUI.switcherHTML)tw.innerHTML=CXUI.switcherHTML();
    const ham=h.querySelector('.v6-ham');
    let sy=0;
    function open(){sy=window.scrollY;D.documentElement.classList.add('v6m-on');D.body.style.top=-sy+'px';ham&&ham.setAttribute('aria-expanded','true');setTimeout(()=>{const x=el.querySelector('.v6-x');x&&x.focus()},60)}
    function close(){if(!D.documentElement.classList.contains('v6m-on'))return;D.documentElement.classList.remove('v6m-on');D.body.style.top='';window.scrollTo(0,sy);if(ham){ham.setAttribute('aria-expanded','false');ham.focus()}}
    if(ham)ham.addEventListener('click',open);
    el.addEventListener('click',e=>{
      if(e.target.closest('[data-v6-close]')){close();return}
      const r=e.target.closest('.v6-acc > .v6-row');
      if(r){const acc=r.parentNode,on=!acc.classList.contains('open');acc.classList.toggle('open',on);r.setAttribute('aria-expanded',on?'true':'false');return}
      if(e.target.closest('a'))close();
    });
    D.addEventListener('keydown',e=>{if(e.key==='Escape'&&D.documentElement.classList.contains('v6m-on'))close()});
    window.V6Menu={open,close};
  }

  function footer(){
    const f=D.querySelector('footer.st-foot'); if(!f||f.dataset.v6f)return; f.dataset.v6f=1; f.classList.add('cxf');
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

  function reveal(){
    const els=[...D.querySelectorAll('[data-reveal]')];
    if(!els.length)return;
    if(reduce()||!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('is-in'));return}
    const io=new IntersectionObserver(ents=>{
      ents.forEach(en=>{if(en.isIntersecting){en.target.classList.add('is-in');io.unobserve(en.target)}});
    },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    els.forEach(e=>io.observe(e));
  }

  function counters(){
    const els=[...D.querySelectorAll('[data-count]')];
    if(!els.length)return;
    const run=el=>{
      const to=parseFloat(el.getAttribute('data-count')); if(!isFinite(to))return;
      if(reduce()){el.textContent=String(to);return}
      const start=performance.now(), dur=900;
      const tick=now=>{
        const t=Math.min(1,(now-start)/dur);
        const e=1-Math.pow(1-t,3);
        el.textContent=String(Math.round(to*e));
        if(t<1)requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if(!('IntersectionObserver' in window)){els.forEach(run);return}
    const io=new IntersectionObserver(ents=>{
      ents.forEach(en=>{if(en.isIntersecting){run(en.target);io.unobserve(en.target)}});
    },{threshold:.4});
    els.forEach(e=>io.observe(e));
  }

  function scrolled(){
    const hero=D.querySelector('.st-hero');
    const on=()=>{
      D.documentElement.classList.toggle('v6-scrolled', window.scrollY>12);
      const past=hero ? hero.getBoundingClientRect().bottom < 100 : window.scrollY>500;
      D.documentElement.classList.toggle('v6-stick-on', past);
    };
    on(); window.addEventListener('scroll',on,{passive:true});
  }

  function build(){ network(); mega(); sheet(); footer(); map(); reveal(); counters(); scrolled(); }
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',build); else build();
})();
