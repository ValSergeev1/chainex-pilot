/* ChainEx V06 · Rush UI: shipper request + live tracking, driver duty mode + offer card + job flow,
   dispatch Rush layer + queue, control-tower counts, rate card (Dispatch settings), DSP/carrier opt-in, API docs. */
(function(){
const C=window.CX,R=window.CXR;if(!C||!R)return;
const V=window.V5||{};const esc=R.esc;const ic=(n,s)=>V.ic?V.ic(n,s||16):'';
const toast=(m,i)=>{try{V.toast?V.toast(m,i):console.log(m)}catch(e){}};
const page=(location.pathname.split('/').pop()||'index.html').replace(/\?.*/,'');
const money=n=>'$'+(+n||0).toFixed(2);
const S2=o=>R.STATUS[o.status]||[o.status,''];
const chip=o=>`<span class="rx-chip ${S2(o)[1]}">${esc(S2(o)[0])}</span>`;
const sizeL=s=>(R.SIZES[s]||{}).label||s;
const mob=()=>innerWidth<900;
function el(html){const d=document.createElement('div');d.innerHTML=html.trim();return d.firstChild}
function stageIx(o){return {matching:0,queue:0,assigned:1,at_pickup:1,picked_up:2,at_dropoff:2,delivered:3}[o.status]??-1}
function steps(o){const i=stageIx(o);return `<div class="rx-steps">${[0,1,2,3].map(k=>`<div class="${k<=i?'on':''}"></div>`).join('')}</div><div class="rx-steps-l"><span>Placed</span><span>Driver</span><span>Picked up</span><span>Delivered</span></div>`}
function routeHTML(o){return `<div class="rx-route"><i></i><div><b>Pickup</b> · ${esc(o.pickup.address)}</div><i class="d"></i><div><b>Drop-off</b> · ${esc(o.dropoff.address)}</div></div>`}
function miniMap(o){const pts=[o.pickup.ll,o.dropoff.ll];const lv=R.liveLL(o);if(lv)pts.push(lv);
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const W=400,H=120,pad=22;const sx=v=>pad+(v-x0)/((x1-x0)||1e-3)*(W-2*pad),sy=v=>H-pad-(v-y0)/((y1-y0)||1e-3)*(H-2*pad);
  const P=o.pickup.ll,D=o.dropoff.ll;return `<svg class="rx-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Live track"><line x1="${sx(P[0])}" y1="${sy(P[1])}" x2="${sx(D[0])}" y2="${sy(D[1])}" stroke="#9AACC4" stroke-dasharray="4 4" stroke-width="2"/>
   <circle cx="${sx(P[0])}" cy="${sy(P[1])}" r="7" fill="#F25F9C"/><text x="${sx(P[0])+10}" y="${sy(P[1])+4}" font-size="11" fill="currentColor">Pickup</text>
   <circle cx="${sx(D[0])}" cy="${sy(D[1])}" r="7" fill="#3B82F6"/><text x="${sx(D[0])+10}" y="${sy(D[1])+4}" font-size="11" fill="currentColor">Drop-off</text>
   ${lv?`<circle cx="${sx(lv[0])}" cy="${sy(lv[1])}" r="9" fill="#111" stroke="#F25F9C" stroke-width="3"><animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite"/></circle>`:''}</svg>`}
function tlHTML(o,n){return `<ul class="rx-tl">${(o.timeline||[]).slice(-(n||8)).reverse().map(t=>`<li><b>${esc(R.clock(t.t))}</b> · ${esc(t.text)}</li>`).join('')}</ul>`}
function podHTML(o){const p=o.pod;if(!p)return '';return `<div class="rx-card" style="margin-top:10px"><b>Proof of delivery</b><div class="rx-podg">${(p.photos||[]).map(ph=>`<img alt="POD photo" src="${ph.src}">`).join('')}${p.signatureImg?`<img alt="Signature" src="${p.signatureImg}" style="background:#fff;object-fit:contain">`:''}</div>
  <div class="rx-sm rx-t2" style="margin-top:6px">${esc(p.placement||'')}${p.signer?' · signed by '+esc(p.signer):''} · ${p.distanceFt} ft from the address${p.notes?' · “'+esc(p.notes)+'”':''}</div></div>`}
function samplePhoto(label){const c=document.createElement('canvas');c.width=320;c.height=240;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,320,240);gr.addColorStop(0,'#25486F');gr.addColorStop(1,'#5EC8E8');g.fillStyle=gr;g.fillRect(0,0,320,240);
  g.fillStyle='#C8A16B';g.fillRect(110,95,100,80);g.strokeStyle='#7a5a32';g.lineWidth=3;g.strokeRect(110,95,100,80);g.fillStyle='#fff';g.font='bold 15px sans-serif';g.fillText('ChainEx Rush · sample',12,24);g.font='12px sans-serif';g.fillText(label||'Delivered',12,226);return c.toDataURL('image/jpeg',.72)}
function shrink(file){return new Promise(res=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,640/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.7))};im.onerror=()=>res(null);im.src=fr.result};fr.readAsDataURL(file)})}
function drawer(id,title){let d=document.getElementById(id);if(d)return d;const sc=el(`<div class="rx-scrim" id="${id}-s"></div>`);d=el(`<aside class="rx-drawer" id="${id}" role="dialog" aria-label="${esc(title)}"><div class="rx-dh">${ic('bolt',18)}<h2>${esc(title)}</h2><button class="rx-x" data-rx="close" aria-label="Close">×</button></div><div class="rx-tabs"></div><div class="rx-db"></div></aside>`);
  document.body.appendChild(sc);document.body.appendChild(d);sc.onclick=()=>openDrawer(id,false);return d}
function openDrawer(id,on){const d=document.getElementById(id),s=document.getElementById(id+'-s');if(!d)return;d.classList.toggle('on',on);s&&s.classList.toggle('on',on)}
function ensureCss(){if(document.querySelector('link[href*="rush6.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='assets/rush6.css';document.head.appendChild(l)}
ensureCss();
let painters=[];C.subscribe&&C.subscribe(()=>painters.forEach(f=>{try{f()}catch(e){}}));
setInterval(()=>painters.forEach(f=>{try{f(true)}catch(e){}}),1000);

/* =================== SHIPPER =================== */
function shipper(){
  const login=()=>{try{return localStorage.getItem('cx.v06.shipper.login')||'SHIPPER'}catch(e){return 'SHIPPER'}};
  const st={tab:'new',size:'parcel',priority:'standard',q:null,sel:null,cancel:null,form:{pickup:R.PLACES[0][0],dropoff:R.PLACES[5][0],items:1,deadline:120}};
  const mine=()=>R.desk().orders.filter(o=>o.shipper===login()).slice().reverse();
  const fab=el(`<button class="rx-fab" id="rxfab" aria-label="Request a Rush delivery">${ic('bolt',18)} Rush <b id="rxfabn" hidden></b></button>`);document.body.appendChild(fab);
  const d=drawer('rxship','Rush delivery');fab.onclick=()=>{openDrawer('rxship',true);paint()};
  function tabs(){const live=mine().filter(o=>!['delivered','cancelled','expired'].includes(o.status)).length;d.querySelector('.rx-tabs').innerHTML=`<button data-rx="tab" data-v="new" class="${st.tab==='new'?'on':''}">New request</button><button data-rx="tab" data-v="orders" class="${st.tab==='orders'?'on':''}">My Rush orders${live?' ('+live+')':''}</button>`;
    const n=document.getElementById('rxfabn');if(n){n.hidden=!live;n.textContent=live}}
  function form(){const f=st.form;const q=st.q&&R.desk().quotes.find(x=>x.id===st.q);
    return `<p class="rx-sm rx-t2" style="margin:0">Same-day delivery within hours. Get an instant price, held for ${R.rate().holdMin} minutes.</p>
    <datalist id="rxplaces">${R.PLACES.map(p=>`<option value="${esc(p[0])}">`).join('')}</datalist>
    <label class="rx-lab" for="rxpu">Pickup address</label><input class="rx-in" id="rxpu" list="rxplaces" value="${esc(f.pickup)}" autocomplete="off">
    <input class="rx-in" id="rxpuc" placeholder="Pickup contact and phone (optional)" value="${esc(f.puc||'')}" style="margin-top:6px">
    <label class="rx-lab" for="rxdo">Drop-off address</label><input class="rx-in" id="rxdo" list="rxplaces" value="${esc(f.dropoff)}" autocomplete="off">
    <input class="rx-in" id="rxdoc" placeholder="Recipient name and phone" value="${esc(f.doc||'')}" style="margin-top:6px">
    <label class="rx-lab">Size</label><div class="rx-seg" style="grid-template-columns:repeat(2,1fr);grid-auto-flow:row">${Object.entries(R.SIZES).map(([k,v])=>`<button data-rx="size" data-v="${k}" class="${st.size===k?'on':''}">${esc(v.label)}<small>${esc(v.hint)}</small></button>`).join('')}</div>
    <div class="rx-row" style="gap:10px;align-items:flex-start"><div class="rx-grow"><label class="rx-lab" for="rxdl">Deliver within</label><select class="rx-in" id="rxdl">${[[60,'1 hour'],[120,'2 hours'],[180,'3 hours'],[240,'4 hours'],[360,'6 hours']].map(([v,l])=>`<option value="${v}"${+f.deadline===v?' selected':''}>${l}</option>`).join('')}</select></div>
      <div style="width:110px"><label class="rx-lab" for="rxit">Items</label><input class="rx-in" id="rxit" type="number" min="1" max="40" value="${f.items}"></div></div>
    <label class="rx-lab">Priority</label><div class="rx-seg">${Object.entries(R.PRIORITY).map(([k,v])=>`<button data-rx="prio" data-v="${k}" class="${st.priority===k?'on':''}">${esc(v.label)}<small>${R.rate().priorityFee[k]?'+'+money(R.rate().priorityFee[k]):'No fee'}</small></button>`).join('')}</div>
    <label class="rx-lab" for="rxnt">Notes for the driver</label><textarea class="rx-in" id="rxnt" placeholder="Gate code, dock, what to ask for">${esc(f.notes||'')}</textarea>
    <div style="margin-top:14px"><button class="rx-btn rush lg" style="width:100%" data-rx="quote">${ic('bolt',16)} Get instant quote</button></div>
    ${q?quoteCard(q):''}`}
  function quoteCard(q){const left=q.expires-R.now();const exp=left<=0||q.status==='expired';
    return `<div class="rx-quote" id="rxquote"><div class="rx-row"><div class="rx-grow"><div class="rx-sm rx-t2">Rush · ${esc(sizeL(q.size))} · ${q.trip.miles} mi · about ${q.trip.minutes} min</div><div class="rx-fee">${money(q.fee)}</div></div>
      <div style="text-align:right"><div class="rx-hold" id="rxhold">${exp?'Quote expired':'Price held '+R.fmtLeft(left)}</div><div class="rx-sm rx-t3">${esc(q.id)}</div></div></div>
      <ul class="rx-break">${q.lines.filter(l=>l[1]).map(l=>`<li><span>${esc(l[0])}</span><span class="rx-mono">${money(l[1])}</span></li>`).join('')}</ul>
      <div class="rx-kv"><div><b>${R.clock(q.pickupEta)}</b><span>Pickup by</span></div><div><b>${R.clock(q.dropoffEta)}</b><span>Delivered by</span></div><div><b>${R.clock(q.deadline)}</b><span>Your deadline</span></div></div>
      ${q.pickup.approx||q.dropoff.approx?'<div class="rx-note">One address was placed approximately. The driver will confirm on site.</div>':''}
      ${q.needsApproval?'<div class="rx-note">This price is above the rate-card cap, so ChainEx dispatch approves it before booking.</div>':''}
      <div class="rx-row" style="margin-top:12px"><button class="rx-btn" data-rx="requote">${exp?'Get a new quote':'Edit'}</button><button class="rx-btn rush rx-grow" data-rx="accept" ${exp||q.status!=='open'?'disabled':''}>Accept and book ${money(q.fee)}</button></div></div>`}
  function orders(){const os=mine();if(!os.length)return '<div class="rx-card rx-t2">No Rush orders yet. Request one from the New request tab.</div>';
    return os.map(o=>{const sel=st.sel===o.id;const lv=R.liveLL(o);const term=['delivered','cancelled','expired'].includes(o.status);
      return `<div class="rx-ord ${sel?'sel':''}" data-rx="sel" data-v="${o.id}"><div class="rx-row"><h4 class="rx-grow">${esc(o.id)} · ${esc(sizeL(o.size))}</h4>${chip(o)}</div>
      ${routeHTML(o)}${steps(o)}
      <div class="rx-sm rx-t2" style="margin-top:8px">${o.status==='matching'?'Finding the closest driver · wave '+o.wave:o.status==='queue'?'Our dispatch team is assigning a driver':o.driverName&&!term?esc(o.driverName.split(' ')[0])+' · '+(o.status==='assigned'?'pickup ETA '+R.clock(o.etaPickup):'drop-off ETA '+R.clock(o.etaDrop)):o.status==='delivered'?'Delivered '+R.clock(o.deliveredAt)+(o.onTime?' · on time':' · late'):esc(o.endReason||'')} · ${money(o.fee)}${o.cancelFee?' · cancel fee '+money(o.cancelFee):''}</div>
      ${sel?`${!term||o.status==='delivered'?miniMap(o):''}${podHTML(o)}${tlHTML(o)}
        ${!term&&!['picked_up','at_dropoff'].includes(o.status)?(st.cancel===o.id?`<div class="rx-card" style="margin-top:10px"><label class="rx-lab" for="rxcr">Reason for cancelling</label><select class="rx-in" id="rxcr">${R.CANCEL_REASONS.filter(r=>!/driver|No drivers/.test(r)).map(r=>`<option>${esc(r)}</option>`).join('')}</select>
          <div class="rx-sm rx-t3" style="margin-top:6px">${o.status==='matching'||o.status==='queue'?'No fee before a driver is assigned.':'A driver is on the way, so a cancel fee applies.'}</div><div class="rx-row" style="margin-top:8px"><button class="rx-btn" data-rx="nocancel">Keep order</button><button class="rx-btn danger rx-grow" data-rx="docancel" data-v="${o.id}">Cancel order</button></div></div>`:`<button class="rx-btn danger" style="margin-top:10px" data-rx="cancel" data-v="${o.id}">Cancel…</button>`):''}
        <a class="rx-btn sm" style="margin-top:10px" href="track.html?id=${o.id}">Tracking link</a>`:''}</div>`}).join('')}
  function readForm(){const v=id=>{const e=document.getElementById(id);return e?e.value:''};if(!document.getElementById('rxpu'))return;Object.assign(st.form,{pickup:v('rxpu'),puc:v('rxpuc'),dropoff:v('rxdo'),doc:v('rxdoc'),deadline:+v('rxdl')||120,items:+v('rxit')||1,notes:v('rxnt')})}
  function paint(tickOnly){tabs();if(!d.classList.contains('on'))return;const b=d.querySelector('.rx-db');
    if(tickOnly){if(st.tab==='new'){const q=st.q&&R.desk().quotes.find(x=>x.id===st.q);const h=document.getElementById('rxhold');if(q&&h){const left=q.expires-R.now();if(left<=0&&!h.dataset.exp){h.dataset.exp=1;b.querySelector('#rxquote').outerHTML=quoteCard(q)}else if(left>0)h.textContent='Price held '+R.fmtLeft(left)}}else if(!st.cancel)b.innerHTML=orders();return}
    if(st.tab==='new'){if(document.activeElement&&b.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;b.innerHTML=form()}else b.innerHTML=orders()}
  painters.push(paint);
  d.addEventListener('click',e=>{const t=e.target.closest('[data-rx]');if(!t)return;const a=t.dataset.rx,v=t.dataset.v;
    if(a==='close')return openDrawer('rxship',false);
    if(a==='tab'){readForm();st.tab=v;st.cancel=null;return paint()}
    if(a==='size'||a==='prio'){readForm();if(a==='size')st.size=v;else st.priority=v;st.q=null;return paint()}
    if(a==='quote'||a==='requote'){readForm();if(a==='requote'&&st.q){const q=R.desk().quotes.find(x=>x.id===st.q);if(q&&q.status==='open'&&q.expires>R.now()){st.q=null;return paint()}}
      const f=st.form;const q=R.quote({pickup:{address:f.pickup,contact:f.puc},dropoff:{address:f.dropoff,name:(f.doc||'').split(/[,·]/)[0]||'Recipient',contact:f.doc},size:st.size,priority:st.priority,deadline:f.deadline,items:f.items,notes:f.notes},{source:'portal',shipper:login()});
      if(q.error){toast(q.error,'alert');return}st.q=q.id;paint();setTimeout(()=>{const x=document.getElementById('rxquote');x&&x.scrollIntoView({block:'nearest',behavior:'smooth'})},30);return}
    if(a==='accept'){const r=R.acceptQuote(st.q,{actor:'Shipper portal'});if(r.error){toast(r.message||r.error,'alert');return paint()}st.q=null;st.tab='orders';st.sel=r.order.id;toast('Rush order '+r.order.id+' booked · finding a driver','check');return paint()}
    if(a==='sel'){if(e.target.closest('button,a,select'))return;st.sel=st.sel===v?null:v;st.cancel=null;return paint()}
    if(a==='cancel'){st.cancel=v;return paint()}if(a==='nocancel'){st.cancel=null;return paint()}
    if(a==='docancel'){const reason=(document.getElementById('rxcr')||{}).value;const r=R.cancel(v,reason,'Shipper portal');st.cancel=null;toast(r.ok?'Order cancelled'+(r.order.cancelFee?' · fee '+money(r.order.cancelFee):''):r.msg,r.ok?'check':'alert');return paint()}});
  if(/[?&]rush=1/.test(location.search))setTimeout(()=>fab.click(),600);
  tabs()}

/* =================== DRIVER APP =================== */
function driver(){
  const wid=()=>{try{return (JSON.parse(localStorage.getItem('cx.v06.driver')||'{}')||{}).wid||null}catch(e){return null}};
  const D=()=>wid()&&C.driver(wid());
  let pass=false,lastOffer='',jobUi={scans:[],photos:[],placement:'',sig:null};
  const MODES=[['routes','Routes','Your scheduled route only','route'],['rush','Rush','Rush jobs near you, no route','bolt'],['both','Both','Your route, plus Rush jobs you choose to take','layers']];
  function modeSheet(onPick,title){const cur=R.mode(wid());const m=el(`<div class="rx-mode" id="rxmode"><div class="rx-sheet" role="dialog" aria-label="Choose how you work"><h3>${esc(title||'How do you want to work today?')}</h3><div class="rx-sm rx-t2">You can change this any time from the pill at the top of the map.</div>
      ${MODES.map(([k,l,s,i])=>`<button class="rx-opt ${cur===k?'on':''}" data-m="${k}"><span class="ico">${ic(i,20)}</span><span><b>${l}</b><small>${s}</small></span></button>`).join('')}
      <button class="rx-btn" style="width:100%;margin-top:12px" data-m="">Not now</button></div></div>`);
    document.body.appendChild(m);m.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b&&e.target!==m)return;const k=b?b.dataset.m:'';m.remove();if(k){R.setMode(wid(),k);onPick&&onPick(k)}})}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-a="duty"]');if(!b||pass)return;const d=D();if(!d||d.duty)return;
    e.stopImmediatePropagation();e.preventDefault();
    modeSheet(k=>{pass=true;try{const btn=document.querySelector('[data-a="duty"]')||b;btn.click()}finally{pass=false}
      toast(k==='routes'?'On duty · Routes':k==='rush'?'On duty · Rush jobs only':'On duty · Routes + Rush','check')})},true);
  const pill=el(`<button class="rx-pill" id="rxpill" hidden aria-label="Change work mode"><i></i><span></span></button>`);document.body.appendChild(pill);
  pill.onclick=()=>modeSheet(k=>toast('Work mode · '+MODES.find(x=>x[0]===k)[1],'check'),'Change work mode');
  const offerBox=el(`<div class="rx-offer" id="rxoffer" hidden role="alertdialog" aria-label="Rush job offer"></div>`);document.body.appendChild(offerBox);
  const jobBox=el(`<div class="rx-job" id="rxjob" hidden></div>`);document.body.appendChild(jobBox);
  function notify(o,f){try{navigator.vibrate&&navigator.vibrate([120,60,120])}catch(e){}
    const title='Rush job · '+money(f.pay)+' · '+o.trip.miles+' mi · '+o.trip.minutes+' min',body=o.pickup.address.split(',')[0]+' → '+o.dropoff.address.split(',')[0];
    const cap=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
    if(cap&&document.visibilityState!=='visible'){cap.schedule({notifications:[{id:Date.now()%2e9|0,title,body,extra:{oid:o.id}}]}).catch(()=>{})}
    else if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&document.visibilityState!=='visible'){try{new Notification(title,{body,tag:'rush-'+o.id})}catch(e){}}}
  function offerHTML(o,f){const left=Math.max(0,f.until-R.now()),tot=R.rate().waveSec*1000,fr=left/tot,C2=2*Math.PI*22;
    return `<div class="rx-row" style="align-items:flex-start"><div class="rx-grow"><span class="rx-chip">${ic('bolt',12)} Rush · ${esc(sizeL(o.size))}${o.priority!=='standard'?' · '+esc(R.PRIORITY[o.priority].label):''}</span>
      <div class="hd" style="margin-top:6px">Rush job · ${money(f.pay)} · ${o.trip.miles} mi · ${o.trip.minutes} min</div>
      <div class="rx-sm rx-t2">${f.deadMi} mi to pickup · deliver by ${R.clock(o.deadline)}${f.topUp?' · includes pay-floor top-up':''}</div></div>
      <div class="rx-ring"><svg width="52" height="52"><circle cx="26" cy="26" r="22" stroke="var(--s3)" stroke-width="5" fill="none"/><circle cx="26" cy="26" r="22" stroke="var(--rx)" stroke-width="5" fill="none" stroke-dasharray="${C2}" stroke-dashoffset="${C2*(1-fr)}" stroke-linecap="round"/></svg><b id="rxsec">${Math.ceil(left/1000)}</b></div></div>
      ${routeHTML(o)}
      <div class="rx-sm rx-t3" style="margin-top:6px">${o.items} item${o.items>1?'s':''}${o.notes?' · '+esc(o.notes):''}</div>
      <div class="rx-row" style="margin-top:12px"><button class="rx-btn lg" data-ro="decline" data-v="${o.id}">Decline</button><button class="rx-btn rush lg rx-grow" data-ro="accept" data-v="${o.id}">Accept</button></div>`}
  function jobHTML(o){const s=o.status;const nav=ll=>`https://www.google.com/maps/dir/?api=1&destination=${ll[1]},${ll[0]}`;
    const head=`<div class="rx-row"><span class="rx-chip">${ic('bolt',12)} Rush ${esc(o.id)}</span><span class="rx-grow"></span><b class="rx-mono">${money(o.pay||0)}</b></div>`;
    if(s==='assigned')return head+`<h3 style="margin:8px 0 2px;font-size:18px">Go to pickup</h3><div class="rx-sm rx-t2">${esc(o.pickup.name)} · ${esc(o.pickup.address)}</div>${o.pickup.contact?`<div class="rx-sm rx-t3">${esc(o.pickup.contact)}</div>`:''}
      <div class="rx-sm rx-t3" style="margin-top:4px">ETA ${R.clock(o.etaPickup)} · then ${o.trip.miles} mi to drop-off · deliver by ${R.clock(o.deadline)}</div>
      <div class="rx-row" style="margin-top:10px"><a class="rx-btn lg" href="${nav(o.pickup.ll)}" target="_blank" rel="noopener">${ic('nav',16)} Navigate</a><button class="rx-btn rush lg rx-grow" data-ro="arrive_pickup" data-v="${o.id}">Arrived at pickup</button></div>
      <button class="rx-btn sm" style="margin-top:8px" data-ro="fail" data-v="${o.id}">Can't do this job</button>`;
    if(s==='at_pickup'){const n=jobUi.scans.length;return head+`<h3 style="margin:8px 0 2px;font-size:18px">Scan ${o.items} item${o.items>1?'s':''} at pickup</h3><div class="rx-sm rx-t2">${n} of ${o.items} scanned</div>
      <div class="rx-scan"><input class="rx-in" id="rxscan" placeholder="Scan or type label" autocomplete="off" inputmode="text"><button class="rx-btn" data-ro="scan">${ic('scan',15)} Add</button></div>
      <div class="rx-row" style="margin-top:6px"><button class="rx-btn sm" data-ro="camscan">${ic('camera',14)} Camera scan</button><button class="rx-btn sm" data-ro="simscan">Scan next label (sample)</button></div>
      <div class="rx-scanned">${jobUi.scans.map(c=>`<span class="rx-chip ok rx-mono">${esc(c)}</span>`).join('')}</div>
      <button class="rx-btn rush lg" style="width:100%;margin-top:12px" data-ro="pickup" data-v="${o.id}" ${n<o.items?'disabled':''}>Confirm pickup</button>`}
    if(s==='picked_up')return head+`<h3 style="margin:8px 0 2px;font-size:18px">Deliver to ${esc(o.dropoff.name)}</h3><div class="rx-sm rx-t2">${esc(o.dropoff.address)}</div>${o.dropoff.contact?`<div class="rx-sm rx-t3">${esc(o.dropoff.contact)}</div>`:''}
      <div class="rx-sm rx-t3" style="margin-top:4px">ETA ${R.clock(o.etaDrop)} · deadline ${R.clock(o.deadline)}</div>
      <div class="rx-row" style="margin-top:10px"><a class="rx-btn lg" href="${nav(o.dropoff.ll)}" target="_blank" rel="noopener">${ic('nav',16)} Navigate</a><button class="rx-btn rush lg rx-grow" data-ro="arrive_dropoff" data-v="${o.id}">Arrived at drop-off</button></div>`;
    if(s==='at_dropoff'){const needSig=o.size!=='parcel';const ok=jobUi.photos.length&&(!needSig||(jobUi.sig&&(document.getElementById('rxsigner')||{}).value!==''));
      return head+`<h3 style="margin:8px 0 2px;font-size:18px">Proof of delivery</h3><div class="rx-sm rx-t2">Photo${needSig?', signature and name':''} required · placement and note optional</div>
      <label class="rx-lab">Photo</label><div class="rx-row"><label class="rx-btn">${ic('camera',15)} Take photo<input type="file" accept="image/*" capture="environment" id="rxphoto" hidden></label><button class="rx-btn sm" data-ro="samplephoto">Use sample photo</button></div>
      <div class="rx-ph">${jobUi.photos.map(p=>`<img alt="POD" src="${p.src}">`).join('')}</div>
      <label class="rx-lab">Left at</label><div class="rx-pl">${['Handed to recipient','Front door','Reception','Mailroom','Loading dock','Room of choice'].map(p=>`<button data-ro="place" data-v="${p}" class="${jobUi.placement===p?'on':''}">${p}</button>`).join('')}</div>
      <label class="rx-lab" for="rxsigner">Signer name${needSig?'':' (optional)'}</label><input class="rx-in" id="rxsigner" value="${esc(jobUi.signer||'')}" placeholder="Who received it">
      <label class="rx-lab">Signature${needSig?'':' (optional)'}</label><canvas class="rx-sig" id="rxsig" width="600" height="200"></canvas><button class="rx-btn sm" style="margin-top:4px" data-ro="clearsig">Clear</button>
      <label class="rx-lab" for="rxnote">Note</label><input class="rx-in" id="rxnote" value="${esc(jobUi.note||'')}" placeholder="Anything dispatch should know">
      <button class="rx-btn rush lg" style="width:100%;margin-top:12px" data-ro="deliver" data-v="${o.id}">Complete delivery</button>`}
    return ''}
  function bindSig(){const c=document.getElementById('rxsig');if(!c||c._b)return;c._b=1;const g=c.getContext('2d');g.lineWidth=3;g.lineCap='round';g.strokeStyle='#0F2440';let dn=false;
    if(jobUi.sig){const im=new Image();im.onload=()=>g.drawImage(im,0,0);im.src=jobUi.sig}
    const pt=e=>{const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return [(t.clientX-r.left)*c.width/r.width,(t.clientY-r.top)*c.height/r.height]};
    const s=e=>{dn=true;const p=pt(e);g.beginPath();g.moveTo(p[0],p[1]);e.preventDefault()},m=e=>{if(!dn)return;const p=pt(e);g.lineTo(p[0],p[1]);g.stroke();e.preventDefault()},u=()=>{if(dn){dn=false;jobUi.sig=c.toDataURL('image/png')}};
    c.addEventListener('pointerdown',s);c.addEventListener('pointermove',m);window.addEventListener('pointerup',u);
    const ph=document.getElementById('rxphoto');if(ph)ph.onchange=async()=>{const f=ph.files&&ph.files[0];if(!f)return;const src=await shrink(f);if(src){jobUi.photos.push({src,kind:'photo',label:'Rush POD'});keepInputs();paint()}}}
  function keepInputs(){const a=document.getElementById('rxsigner'),b=document.getElementById('rxnote');if(a)jobUi.signer=a.value;if(b)jobUi.note=b.value}
  let jobKey='';
  function paint(tickOnly){const d=D();const w=wid();
    pill.hidden=!(d&&d.duty&&document.body.classList.contains('dv-onmap'));if(d&&d.duty){const m=R.mode(w);pill.querySelector('span').textContent=m==='routes'?'Routes':m==='rush'?'Rush':'Routes + Rush';pill.querySelector('i').style.background=m==='routes'?'var(--t3)':'var(--rx)'}
    const job=w&&R.activeJob(w);
    if(job){offerBox.hidden=true;const k=job.id+job.status+(job.status==='at_pickup'?jobUi.scans.length:'')+(job.status==='at_dropoff'?jobUi.photos.length+jobUi.placement:'');
      if(k!==jobKey){if(document.activeElement&&jobBox.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&jobKey.slice(0,job.id.length+job.status.length)===job.id+job.status)return;keepInputs();jobKey=k;jobBox.innerHTML=jobHTML(job);jobBox.hidden=false;bindSig()}return}
    jobBox.hidden=true;jobKey='';
    const offs=d&&d.duty?R.offersFor(w):[];
    if(!offs.length){offerBox.hidden=true;lastOffer='';return}
    const {o,f}=offs[0];if(lastOffer!==o.id){lastOffer=o.id;notify(o,f);offerBox.innerHTML=offerHTML(o,f);offerBox.hidden=false}
    else{const s=document.getElementById('rxsec');if(s){const left=Math.max(0,f.until-R.now());s.textContent=Math.ceil(left/1000);const c=offerBox.querySelectorAll('circle')[1];if(c){const C2=2*Math.PI*22;c.setAttribute('stroke-dashoffset',C2*(1-left/(R.rate().waveSec*1000)))}}}}
  painters.push(paint);
  async function camScan(){const BS=window.Capacitor&&Capacitor.Plugins&&(Capacitor.Plugins.BarcodeScanner);
    if(BS&&BS.scan){try{const r=await BS.scan();const c=r&&r.barcodes&&r.barcodes[0]&&(r.barcodes[0].rawValue||r.barcodes[0].displayValue);if(c)return c}catch(e){toast('Camera scan cancelled','alert');return null}}
    if('BarcodeDetector' in window){toast('Point the camera at the label · in the store app this uses the native scanner','scan')}else toast('Camera scanning runs in the ChainEx Driver app. Type the label or use the sample scan.','scan');return null}
  document.addEventListener('click',async e=>{const b=e.target.closest('[data-ro]');if(!b)return;e.preventDefault();e.stopPropagation();const a=b.dataset.ro,v=b.dataset.v,w=wid();
    if(a==='accept'){const r=R.accept(v,w);toast(r.ok?'Rush job accepted · head to pickup':r.msg,r.ok?'check':'alert');jobUi={scans:[],photos:[],placement:'',sig:null};lastOffer='';return paint()}
    if(a==='decline'){R.decline(v,w,'Declined in app');lastOffer='';toast('Declined · it goes to the next driver');return paint()}
    if(a==='arrive_pickup'||a==='arrive_dropoff'){const r=R.act(v,w,a);if(!r.ok)toast(r.msg,'alert');return paint()}
    if(a==='scan'||a==='simscan'||a==='camscan'){let code=a==='simscan'?'RX'+Math.random().toString(36).slice(2,8).toUpperCase():a==='camscan'?await camScan():((document.getElementById('rxscan')||{}).value||'').trim();
      if(!code)return;if(jobUi.scans.includes(code)){toast('Already scanned','alert');return}jobUi.scans.push(code);try{navigator.vibrate&&navigator.vibrate(18)}catch(x){}return paint()}
    if(a==='pickup'){const r=R.act(v,w,'pickup',{scans:jobUi.scans});toast(r.ok?'Picked up · head to drop-off':r.msg,r.ok?'check':'alert');return paint()}
    if(a==='samplephoto'){keepInputs();jobUi.photos.push({src:samplePhoto('Rush · '+(jobUi.placement||'drop-off')),kind:'photo',label:'Sample'});return paint()}
    if(a==='place'){keepInputs();jobUi.placement=v;return paint()}
    if(a==='clearsig'){jobUi.sig=null;const c=document.getElementById('rxsig');c&&c.getContext('2d').clearRect(0,0,c.width,c.height);return}
    if(a==='deliver'){keepInputs();const d=D();const pod={photos:jobUi.photos,signatureImg:jobUi.sig,signer:jobUi.signer||'',placement:jobUi.placement||'',notes:jobUi.note||'',dropLL:(window.CXI&&CXI.lastGps&&(CXI.lastGps(w)||{}).ll)||null};
      const r=R.act(v,w,'deliver',{pod});toast(r.ok?'Delivered · Rush job complete':r.msg,r.ok?'check':'alert');if(r.ok)jobUi={scans:[],photos:[],placement:'',sig:null};return paint()}
    if(a==='fail'){const reason=prompt('Why can’t you do this job?','Vehicle issue');if(reason==null)return;const r=R.act(v,w,'fail',{reason});toast(r.ok?'Sent back to dispatch':r.msg,r.ok?'check':'alert');return paint()}},true);
  setTimeout(paint,600)}

/* =================== DISPATCH =================== */
function dispatch(){
  const st={on:/[?&]rush=1/.test(location.search),layer:true,f:'live',sel:null,asg:null};
  try{const s=JSON.parse(localStorage.getItem('cx.v06.rushui')||'{}');if(s.layer===false)st.layer=false}catch(e){}
  const can=a=>!window.CXA||!CXA.can||CXA.can(a);
  const scope=o=>!window.CXA||!CXA.inHub||CXA.inHub(o);
  const panel=el(`<section class="rx-dp" id="rxdp" aria-label="Rush queue"><div class="rx-dh">${ic('bolt',16)}<h2>Rush</h2><button class="rx-btn sm" data-rd="layer" id="rxlayer"></button><button class="rx-x" data-rd="close" aria-label="Close">×</button></div><div class="rx-cnt" id="rxcnt"></div><div class="rx-tabs" id="rxdtabs"></div><div class="rx-db" id="rxdb"></div></section>`);
  document.body.appendChild(panel);
  function btn(){const bar=document.querySelector('.d5-bar-r');if(!bar)return;let b=document.getElementById('rxbtn');if(!b){b=el(`<button class="btn sm rx-tbtn" id="rxbtn" title="Rush jobs (on-demand)" aria-label="Rush jobs">${ic('bolt',15)}<span class="d5-bar-txt">Rush</span><span class="rx-dotn" id="rxbn" hidden></span></button>`);bar.insertBefore(b,bar.firstChild);b.onclick=()=>{st.on=!st.on;paint()}}
    const c=R.counts(scope),n=c.matching+c.queue+c.live,bn=document.getElementById('rxbn');if(bn){bn.hidden=!n;bn.textContent=n}b.classList.toggle('pri',st.on)}
  const list=()=>{const os=R.desk().orders.filter(scope).slice().reverse();if(st.f==='live')return os.filter(o=>!['delivered','cancelled','expired'].includes(o.status));if(st.f==='queue')return os.filter(o=>o.status==='queue'||o.status==='matching');return os};
  function sla(o){const t=R.now();if(o.status==='matching'){const l=o.waveUntil-t;return `<span class="rx-sla">Wave ${o.wave} · ${R.fmtLeft(l)}</span>`}
    if(o.status==='queue'){const l=o.slaUntil-t;return `<span class="rx-sla ${l<180000?'bad':'warn'}">SLA ${R.fmtLeft(l)}</span>`}
    if(['assigned','at_pickup','picked_up','at_dropoff'].includes(o.status)){const l=o.deadline-t;return `<span class="rx-sla ${l<0?'bad':l<900000?'warn':''}">${l<0?'Late '+R.fmtLeft(-l):'Due '+R.clock(o.deadline)}</span>`}return ''}
  function row(o){const sel=st.sel===o.id;const off=o.offers.filter(f=>f.wave===o.wave||sel);
    let h=`<div class="rx-ord ${sel?'sel':''}" data-rd="sel" data-v="${o.id}"><div class="rx-row"><h4 class="rx-grow">${esc(o.id)} · ${esc(sizeL(o.size))}${o.priority!=='standard'?' · '+esc(R.PRIORITY[o.priority].label):''}</h4>${sla(o)}</div>
      <div class="rx-row rx-sm" style="margin-top:4px">${chip(o)}<span class="rx-t2 rx-grow" style="text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${esc(o.pickup.address.split(',')[0])} → ${esc(o.dropoff.address.split(',')[0])}</span><b class="rx-mono">${money(o.fee)}</b></div>
      ${o.driverName?`<div class="rx-sm rx-t2" style="margin-top:4px">${ic('user',12)} ${esc(o.driverName)}${o.inserted?' · inserted in P&D route':''}</div>`:''}
      ${o.status==='matching'&&off.length?`<div class="rx-offers">${off.filter(f=>f.wave===o.wave).map(f=>`<span class="rx-chip ${f.status==='pending'?'acc':f.status==='declined'?'bad':'mute'}">${esc(f.name.split(' ')[0])}${f.dsp?' (DSP)':''} · ${f.deadMi} mi · ${f.status}</span>`).join('')}</div>`:''}`;
    if(sel){h+=routeHTML(o)+`<div class="rx-kv"><div><b>${o.trip.miles} mi</b><span>Trip</span></div><div><b>${money(o.pay||R.payFor(o,3).pay)}</b><span>Driver pay${o.pay?'':' (est.)'}</span></div><div><b>${R.clock(o.deadline)}</b><span>Deadline</span></div></div>`;
      if(['matching','queue'].includes(o.status)){const sug=R.insertSuggestion(o.id);
        if(sug)h+=`<div class="rx-sug"><b>Insert into a nearby P&D route</b><br>${esc(sug.name)} · +${sug.detourMi} mi detour after stop ${sug.after} of ${sug.stops}<div style="margin-top:6px"><button class="rx-btn sm pri" data-rd="insert" data-v="${o.id}" data-w="${sug.wid}" ${can('route.assign')?'':'disabled title="Access restricted, ask an admin."'}>Insert</button></div></div>`;
        h+=`<div class="rx-row" style="margin-top:8px;flex-wrap:wrap"><button class="rx-btn sm pri" data-rd="asg" data-v="${o.id}" ${can('route.assign')?'':'disabled title="Access restricted, ask an admin."'}>Assign driver…</button>${o.status==='queue'?`<button class="rx-btn sm" data-rd="rebroad" data-v="${o.id}">Re-broadcast</button>`:''}<button class="rx-btn sm danger" data-rd="cancel" data-v="${o.id}">Cancel</button></div>`;
        if(st.asg===o.id)h+=`<div class="rx-card" style="margin-top:8px;padding:8px"><table class="rx-tbl"><tbody>${R.eligibleList(o).slice(0,14).map(x=>`<tr><td>${esc(x.d.name)}<div class="rx-sm rx-t3">${esc((C.lines[x.d.line]||{}).name||x.d.line)} · ${x.mi} mi · ${esc(R.mode(x.d.id))}</div></td><td style="text-align:right">${x.w?`<span class="rx-sm rx-t3">${esc(x.w)}</span>`:`<button class="rx-btn sm pri" data-rd="doasg" data-v="${o.id}" data-w="${x.d.id}">Assign</button>`}</td></tr>`).join('')}</tbody></table></div>`}
      else if(['assigned','at_pickup'].includes(o.status))h+=`<div class="rx-row" style="margin-top:8px"><button class="rx-btn sm danger" data-rd="cancel" data-v="${o.id}">Cancel</button></div>`;
      if(o.pod&&window.__pod6&&__pod6.gallery){try{h+=__pod6.gallery({id:o.id,name:o.dropoff.address,pod:o.pod,state:'completed'})}catch(e){h+=podHTML(o)}}else h+=podHTML(o);
      if(o.status==='matching'||o.offers.length)h+=`<div class="rx-sm rx-t3" style="margin-top:8px">Offers: ${o.offers.map(f=>esc(f.name.split(' ')[0])+' w'+f.wave+' '+f.status).join(' · ')||'none yet'}</div>`;
      h+=tlHTML(o,10)}
    return h+'</div>'}
  function paint(tickOnly){btn();panel.classList.toggle('on',st.on);document.getElementById('rxlayer').textContent=st.layer?'Layer on':'Layer off';
    if(!st.on){if(!tickOnly)refreshMap();return}
    const c=R.counts(scope);document.getElementById('rxcnt').innerHTML=`<div><b>${c.matching}</b><span>Finding driver</span></div><div><b class="${c.slaRisk?'rx-sla bad':''}">${c.queue}</b><span>Dispatch queue</span></div><div><b>${c.live}</b><span>Live</span></div><div><b>${c.delivered}</b><span>Delivered</span></div>`;
    document.getElementById('rxdtabs').innerHTML=[['live','Live'],['queue','Needs a driver'],['all','All']].map(([k,l])=>`<button data-rd="f" data-v="${k}" class="${st.f===k?'on':''}">${l}</button>`).join('');
    const b=document.getElementById('rxdb');if(tickOnly&&(st.asg||(document.activeElement&&b.contains(document.activeElement)&&document.activeElement.tagName==='SELECT')))return;
    const os=list();b.innerHTML=os.length?os.map(row).join(''):`<div class="rx-card rx-t2 rx-sm">No Rush jobs ${st.f==='live'?'live':'here'} right now. Shippers request them in the shipper portal or through the API with service_level=on_demand.</div>`;
    if(!tickOnly)refreshMap()}
  let lastSig='';function refreshMap(){const m=window.__v5d&&__v5d.map;if(!m||!m.set)return;const sig=JSON.stringify(R.desk().orders.map(o=>[o.id,o.status]))+st.layer;if(sig===lastSig)return;lastSig=sig;try{m.set(m.data||__v5d.mapData(),false)}catch(e){}}
  function hookMap(){const m=window.__v5d&&__v5d.map;if(!m||!m.set||m._rush)return;m._rush=1;const _set=m.set.bind(m);
    m.set=function(d,fit){d=d||{};if(!st.layer)return _set(d,fit);const data={pins:(d.pins||[]).slice(),lines:(d.lines||[]).slice()};
      Object.keys(d).forEach(k=>{if(!(k in data))data[k]=d[k]});
      R.desk().orders.filter(scope).filter(o=>!['cancelled','expired'].includes(o.status)&&(o.status!=='delivered'||R.now()-o.deliveredAt<3600000)).forEach(o=>{
        const pick=()=>{st.on=true;st.sel=o.id;st.f='all';paint()};
        data.pins.push({ll:o.pickup.ll,label:'P',color:'#F25F9C',id:'rxp-'+o.id,cls:'rxp',title:'Rush '+o.id+' · pickup · '+S2(o)[0],onClick:pick});
        data.pins.push({ll:o.dropoff.ll,label:'D',color:'#3B82F6',id:'rxd-'+o.id,cls:'rxd',title:'Rush '+o.id+' · drop-off',onClick:pick});
        data.lines.push({coords:[o.pickup.ll,o.dropoff.ll],color:'#F25F9C',width:2.5,opacity:o.status==='delivered'?.35:.85});
        const lv=R.liveLL(o);if(lv&&o.status!=='delivered'){data.pins.push({ll:lv,label:'⚡',color:'#111',id:'rxv-'+o.id,cls:'rxv',title:(o.driverName||'Driver')+' · Rush '+o.id,onClick:pick})}});
      return _set(data,fit)}}
  panel.addEventListener('click',e=>{const t=e.target.closest('[data-rd]');if(!t)return;const a=t.dataset.rd,v=t.dataset.v;
    if(a==='close'){st.on=false;return paint()}
    if(a==='layer'){st.layer=!st.layer;try{localStorage.setItem('cx.v06.rushui',JSON.stringify({layer:st.layer}))}catch(x){}lastSig='';return paint()}
    if(a==='f'){st.f=v;return paint()}
    if(a==='sel'){if(e.target.closest('button,a,select,input'))return;st.sel=st.sel===v?null:v;st.asg=null;const o=R.find(v);if(st.sel&&o&&__v5d.map&&__v5d.map.m){try{__v5d.map.m.easeTo({center:o.pickup.ll,zoom:Math.max(__v5d.map.m.getZoom(),11)})}catch(x){}}return paint()}
    if(a==='asg'){st.asg=st.asg===v?null:v;return paint()}
    if(a==='doasg'||a==='insert'){const r=R.assign(v,t.dataset.w,{insert:a==='insert',actor:'Dispatch'});toast(r.ok?(a==='insert'?'Inserted into the P&D route':'Rush job assigned'):r.msg,r.ok?'check':'alert');st.asg=null;return paint()}
    if(a==='rebroad'){R.rebroadcast(v);toast('Re-broadcast to drivers');return paint()}
    if(a==='cancel'){const reason=prompt('Cancel reason',(R.find(v)||{}).status==='queue'?'No drivers available':'Shipper cancelled');if(reason==null)return;const r=R.cancel(v,reason,'Dispatch');toast(r.ok?'Cancelled':r.msg,r.ok?'check':'alert');return paint()}});
  const _after=window.__d5after;window.__d5after=function(){if(_after)_after();try{btn();hookMap()}catch(e){}};
  painters.push(paint);
  const boot=()=>{btn();hookMap();lastSig='';paint()};setTimeout(boot,300);setTimeout(boot,1500)}

/* =================== CONTROL TOWER =================== */
function dashboard(){
  function card(){const pw=document.getElementById('db5pw');if(!pw)return;let c=document.getElementById('db5rush');
    if(!c){c=el(`<div class="db5-c" id="db5rush"><div class="db5-ch"><h3>${ic('bolt',14)} Rush</h3><a href="dispatch.html?rush=1">Queue ${ic('chev',13)}</a></div><div id="db5rushbody"></div></div>`);pw.parentNode.insertBefore(c,pw.nextSibling)}
    const scope=o=>!window.CXA||!CXA.inHub||CXA.inHub(o);const k=R.counts(scope);
    document.getElementById('db5rushbody').innerHTML=`<a class="db5-pw" href="dispatch.html?rush=1" style="grid-template-columns:repeat(4,1fr)"><div><b>${k.matching}</b><span>Finding driver</span></div><div><b class="${k.slaRisk?'warn':''}">${k.queue}</b><span>Dispatch queue</span></div><div><b>${k.live}</b><span>Live${k.late?' · '+k.late+' late':''}</span></div><div><b>${k.delivered}</b><span>Delivered${k.onTime!=null?' · '+k.onTime+'% on time':''}</span></div></a>
      <div class="rx-sm rx-t3" style="padding:0 12px 10px">Revenue today ${money(k.revenue)} · ${k.cancelled} cancelled · ${k.expired} expired</div>`;
    const tb=document.querySelector('#db5l table tbody');if(tb){let tr=tb.querySelector('[data-rx-line]');const cols=(tb.querySelector('tr:not([data-rx-line])')||{children:[]}).children.length||6;if(!tr){tr=document.createElement('tr');tr.setAttribute('data-rx-line','1');tb.appendChild(tr)}
      const pct=k.total?Math.round(k.delivered/k.total*100):0;const cells=[`<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:8px;height:8px;border-radius:2px;background:var(--rx);display:inline-block"></i>Rush</span>`,`<div style="height:6px;border-radius:4px;background:var(--s3);max-width:180px"><div style="width:${pct}%;height:6px;border-radius:4px;background:var(--ok)"></div></div>`,`${k.delivered}/${k.total}`,`${k.live} live`,k.onTime!=null?k.onTime+'%':'—',`${k.expired+k.cancelled}`];
      const h=cells.slice(0,cols).map((x,i)=>`<td class="${i>1?'rx-mono':''}" style="${i>1?'text-align:right':''}">${x}</td>`).join('');if(tr._h!==h){tr._h=h;tr.innerHTML=h}}}
  painters.push(()=>card());setTimeout(card,500);setTimeout(card,1500)}

/* =================== DISPATCH SETTINGS: RATE CARD =================== */
function dset(){
  function html(){const r=R.rate(),can=!window.CXA||!CXA.can||CXA.can('settings.edit');const n=(k,v,step)=>`<label>${k}<input class="rx-in" type="number" step="${step||'0.01'}" data-rk="${v}" value="${v.split('.').reduce((a,x)=>a&&a[x],r)}"></label>`;
    const sample=R.price(R.tripOf(R.PLACES[0][1],R.PLACES[5][1],'parcel'),'parcel','standard');
    const parts=(C.S.partners||[]).filter(p=>p.type==='DSP'||p.type==='Carrier');
    return `<div class="pg-c rx-sec" id="rxrate" style="padding:16px"><div class="rx-row"><h3 style="margin:0" class="rx-grow">${ic('bolt',15)} Rush pricing and matching</h3><span class="rx-chip">Service line 6 · code on_demand</span></div>
    <p class="rx-sm rx-t2" style="margin:6px 0 0">Rush quotes = (base + miles × per mile + minutes × per minute) × size multiplier + priority fee, never below the minimum. Quotes above the cap need dispatch approval.</p>
    <div class="${can?'':'rx-lock'}" title="${can?'':'Access restricted, ask an admin.'}">
    <div class="rx-lab">Rate card</div><div class="rx-grid">${n('Base fare $','base')}${n('Per mile $','perMile')}${n('Per minute $','perMin')}${n('Minimum fare $','minimum')}${n('Quote cap $ (needs approval above)','maxQuote','1')}</div>
    <div class="rx-lab">Size multipliers</div><div class="rx-grid">${Object.keys(R.SIZES).map(s=>n(R.SIZES[s].label+' ×','sizeMult.'+s)).join('')}</div>
    <div class="rx-lab">Priority fees</div><div class="rx-grid">${Object.keys(R.PRIORITY).map(s=>n(R.PRIORITY[s].label+' $','priorityFee.'+s)).join('')}</div>
    <div class="rx-lab">Driver pay</div><div class="rx-grid">${n('Driver share of fee (0–1)','payShare')}${n('Floor per engaged minute $','floor.perMin')}${n('Floor per engaged mile $','floor.perMile')}${n('Floor per offer $','floor.perOffer')}<label>Pay floor<select class="rx-in" data-rk="floor.on"><option value="1"${r.floor.on?' selected':''}>On</option><option value="0"${r.floor.on?'':' selected'}>Off</option></select></label></div>
    <div class="rx-note"><b>Legal review needed.</b> ${esc(r.floor.note)}</div>
    <div class="rx-lab">Matching</div><div class="rx-grid">${n('Quote hold (minutes)','holdMin','1')}${n('Offer window (seconds)','waveSec','1')}${n('Wave 1 drivers','wave1.n','1')}${n('Wave 1 radius (mi)','wave1.radiusMi','1')}${n('Wave 2 drivers','wave2.n','1')}${n('Wave 2 radius (mi)','wave2.radiusMi','1')}${n('Dispatch SLA (minutes)','slaMin','1')}${n('Average speed (mph)','speedMph','1')}</div>
    <div class="rx-row" style="margin-top:12px"><button class="rx-btn pri" data-rx="saverate">Save rate card</button><button class="rx-btn" data-rx="resetrate">Restore defaults</button><span class="rx-sm rx-t3 rx-grow">Example: Bellevue Square → Westlake Center, parcel, standard = <b class="rx-mono">${money(sample.fee)}</b></span></div>
    <div class="rx-lab">DSP and carrier opt-in</div><table class="rx-tbl"><thead><tr><th>Partner</th><th>Type</th><th>Rush offers to their drivers</th></tr></thead><tbody>${parts.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td><button class="rx-switch ${R.desk().dspOpt[p.id]?'on':''}" data-rx="opt" data-v="${p.id}" aria-label="Opt in ${esc(p.name)}"></button></td></tr>`).join('')}</tbody></table>
    <div class="rx-sm rx-t3" style="margin-top:6px">Partners can also opt in from their DSP desk. ChainEx drivers get wave 1; opted-in partner drivers join in wave 2.</div></div></div>`}
  function mount(){const b=document.getElementById('pgbody');if(!b)return;if(!document.getElementById('rxrate'))b.insertAdjacentHTML('beforeend',html())}
  document.addEventListener('click',e=>{const t=e.target.closest('#rxrate [data-rx]');if(!t)return;const a=t.dataset.rx;
    if(a==='saverate'){const patch={};document.querySelectorAll('#rxrate [data-rk]').forEach(i=>{const ks=i.dataset.rk.split('.');let v=+i.value;if(isNaN(v))return;if(ks.length===1)patch[ks[0]]=v;else{patch[ks[0]]=patch[ks[0]]||{};patch[ks[0]][ks[1]]=ks[1]==='on'?!!v:v}});
      const ok=R.setRate(patch);toast(ok?'Rush rate card saved':'Access restricted, ask an admin.',ok?'check':'lock');rerender()}
    if(a==='resetrate'){if(R.setRate(JSON.parse(JSON.stringify(R.DEF_RATE))))toast('Defaults restored','check');rerender()}
    if(a==='opt'){R.dspOpt(t.dataset.v,!R.desk().dspOpt[t.dataset.v]);rerender()}});
  function rerender(){const x=document.getElementById('rxrate');if(x)x.outerHTML=html()}
  new MutationObserver(()=>mount()).observe(document.body,{childList:true,subtree:true});setTimeout(mount,400)}

/* =================== DSP / CARRIER (desk, portal, fleet) =================== */
/* The Rush card goes at the end of the desk: inserting it on top 0.5 s after load pushed the whole desk down (CLS 0.57 on phones). */
function dsp(){
  const pid=()=>{try{const L=C.S.contractorLogins||[];const lg=(localStorage.getItem('cx.v06.dsp.login')||'DSP-EEX-01').toUpperCase();const a=L.find(l=>l.login===lg)||L[0];return a&&a.partnerId}catch(e){return null}};
  const card=el(`<section class="rx-card" id="rxdsp" style="margin:12px 16px"></section>`);
  function drivers(p){return (C.S.drivers||[]).filter(d=>!d.dspSlot&&(R.partnerOf(d)||{}).id===p)}
  function html(){const p=pid();const pa=C.portal&&C.portal.partner(p);if(!pa)return '';const on=!!R.desk().dspOpt[p];const ds=drivers(p);const ids=new Set(ds.map(d=>d.id));
    const jobs=R.desk().orders.filter(o=>ids.has(o.wid)||o.offers.some(f=>ids.has(f.wid)&&f.status==='pending')).slice(-6).reverse();
    const earned=R.desk().orders.filter(o=>ids.has(o.wid)&&o.status==='delivered').reduce((a,o)=>a+(o.pay||0),0);
    return `<div class="rx-row">${ic('bolt',16)}<b class="rx-grow">Rush jobs for ${esc(pa.name)}</b><span class="rx-sm rx-t2">${on?'Opted in':'Not opted in'}</span><button class="rx-switch ${on?'on':''}" data-rx="dspopt" aria-label="Opt in to Rush"></button></div>
      <div class="rx-sm rx-t2" style="margin-top:6px">When you opt in, your on-duty drivers who chose Rush or Both get Rush offers in wave 2 (after ChainEx drivers have 45 seconds). Each offer shows pay, distance and time up front.</div>
      ${on?`<div class="rx-kv"><div><b>${ds.filter(d=>d.duty&&R.mode(d.id)!=='routes').length}</b><span>Drivers taking Rush now</span></div><div><b>${jobs.filter(o=>['assigned','at_pickup','picked_up','at_dropoff'].includes(o.status)).length}</b><span>Live Rush jobs</span></div><div><b>${money(earned)}</b><span>Rush pay today</span></div></div>
      <table class="rx-tbl" style="margin-top:8px"><thead><tr><th>Driver</th><th>Mode</th><th>Status</th></tr></thead><tbody>${ds.slice(0,8).map(d=>{const j=R.activeJob(d.id);return `<tr><td>${esc(d.name)}</td><td>${esc({routes:'Routes',rush:'Rush',both:'Both'}[R.mode(d.id)])}</td><td class="rx-sm">${j?'On Rush '+esc(j.id):d.duty?'On duty':'Off duty'}</td></tr>`}).join('')}</tbody></table>
      ${jobs.length?`<div class="rx-lab">Recent Rush jobs</div>${jobs.map(o=>`<div class="rx-row rx-sm" style="padding:4px 0;border-bottom:1px solid var(--line)"><span class="rx-mono">${esc(o.id)}</span>${chip(o)}<span class="rx-grow rx-t2">${esc(o.driverName||'Offered')}</span><b class="rx-mono">${money(o.pay||0)}</b></div>`).join('')}`:''}`:''}`}
  function mount(){const host=document.querySelector('#x-main')||document.querySelector('.x-main')||document.querySelector('main');if(!host)return;if(!host.contains(card)||card.nextElementSibling){host.appendChild(card)}const h=html();if(card._h!==h){card._h=h;card.innerHTML=h}}
  card.addEventListener('click',e=>{const t=e.target.closest('[data-rx=dspopt]');if(!t)return;const p=pid();R.dspOpt(p,!R.desk().dspOpt[p]);toast(R.desk().dspOpt[p]?'Opted in to Rush offers':'Opted out of Rush offers','check');mount()});
  painters.push(()=>mount());new MutationObserver(()=>{if(!document.body.contains(card))mount()}).observe(document.body,{childList:true,subtree:true});setTimeout(mount,500)}

/* =================== DEVELOPERS: Rush API =================== */
function developers(){
  const ex={quote:{service_level:'on_demand',pickup:{address:R.PLACES[0][0]},dropoff:{address:R.PLACES[4][0],name:'Front desk'},size:'parcel',priority:'standard',deadline_minutes:120,items:1}};
  function html(){return `<section class="rx-card rx-api" id="rxapi" style="margin:16px 0"><div class="rx-row">${ic('bolt',16)}<h3 style="margin:0" class="rx-grow">Rush (on-demand) API</h3><span class="rx-chip">service_level=on_demand</span></div>
    <p class="rx-sm rx-t2">Same /v1 API and keys. 1) POST /v1/quotes with service_level=on_demand returns a quote held ${R.rate().holdMin} minutes. 2) POST /v1/orders with quote_id and an Idempotency-Key books it. 3) GET /v1/orders/{id} or /v1/tracking/{id}. 4) POST /v1/orders/{id}/cancel with a reason. Webhooks fire created, assigned, arrived, picked_up, delivered and cancelled (with reason_code), all with payload.service_level=on_demand.</p>
    <div class="rx-row" style="flex-wrap:wrap"><button class="rx-btn" data-rx="q">1 · Quote</button><button class="rx-btn" data-rx="o">2 · Book quote</button><button class="rx-btn" data-rx="g">3 · Get order</button><button class="rx-btn" data-rx="c">4 · Cancel</button></div><pre id="rxapiout">Run a step to see the request and the response.</pre></section>`}
  let lastQ=null,lastO=null;const tok=()=>{const k=window.CXI&&CXI.desk().keys.find(x=>x.active&&x.scopes.includes('orders:write'));return k?k.token:''};
  function run(m,p,body,idem){const h={Authorization:'Bearer '+tok()};if(idem)h['Idempotency-Key']=idem;const r=CXI.request(m,p,{headers:h,body});document.getElementById('rxapiout').textContent=m+' '+p+'\n'+(body?JSON.stringify(body,null,2)+'\n':'')+'\n→ '+r.status+'\n'+JSON.stringify(r.body,null,2);return r}
  document.addEventListener('click',e=>{const t=e.target.closest('#rxapi [data-rx]');if(!t||!window.CXI)return;const a=t.dataset.rx;
    if(a==='q'){const r=run('POST','/v1/quotes',ex.quote);lastQ=r.body&&r.body.quotes&&r.body.quotes[0].id}
    if(a==='o'){if(!lastQ){const r=run('POST','/v1/quotes',ex.quote);lastQ=r.body.quotes[0].id}const r=run('POST','/v1/orders',{service_level:'on_demand',quote_id:lastQ},'rush-demo-'+lastQ);lastO=r.body&&r.body.id}
    if(a==='g'&&lastO)run('GET','/v1/orders/'+lastO);if(a==='c'&&lastO)run('POST','/v1/orders/'+lastO+'/cancel',{reason:'Order no longer needed'})});
  function mount(){const host=document.querySelector('.cxi-page');if(host&&!document.getElementById('rxapi'))host.insertAdjacentHTML('beforeend',html())}
  new MutationObserver(()=>mount()).observe(document.body,{childList:true,subtree:true});setTimeout(mount,500)}

const M={'shipper.html':shipper,'driver.html':driver,'dispatch.html':dispatch,'dashboard.html':dashboard,'dset.html':dset,'dsp.html':dsp,'portal-dsp.html':dsp,'portal-carrier.html':dsp,'dsp-fleet.html':dsp,'developers.html':developers};
const run=()=>{try{(M[page]||(()=>{}))()}catch(e){console.warn('rush ui',e)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
window.CXRUI={samplePhoto,openShipper:()=>{const f=document.getElementById('rxfab');f&&f.click()}};
})();
