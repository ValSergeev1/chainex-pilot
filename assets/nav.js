/* ChainEx V02 · in-app turn-by-turn navigation (driver app). Route from the public OSRM demo router when reachable,
   else a straight-line fallback with simulated maneuvers. Simulated GPS for testing. No external navigation apps. */
(function(){
const R=6371000,rad=x=>x*Math.PI/180;
function hav(a,b){const dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]);const h=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function bearing(a,b){const y=Math.sin(rad(b[0]-a[0]))*Math.cos(rad(b[1])),x=Math.cos(rad(a[1]))*Math.sin(rad(b[1]))-Math.sin(rad(a[1]))*Math.cos(rad(b[1]))*Math.cos(rad(b[0]-a[0]));return (Math.atan2(y,x)*180/Math.PI+360)%360}
const fmtD=m=>m>=1000?(m/1609.34).toFixed(1)+' mi':m>=160?(m/1609.34).toFixed(1)+' mi':Math.round(m*3.281/10)*10+' ft';
const ARW={left:'↰','slight left':'↖','sharp left':'↰',right:'↱','slight right':'↗','sharp right':'↱',straight:'↑',uturn:'↶',arrive:'⚑',depart:'↑'};
function instr(st){const t=st.maneuver.type,m=st.maneuver.modifier||'straight',n=st.name||'the road';if(t==='depart')return `Head ${['north','northeast','east','southeast','south','southwest','west','northwest'][Math.round((st.maneuver.bearing_after||0)/45)%8]} on ${n}`;if(t==='arrive')return 'Arrive at the stop';if(t==='roundabout'||t==='rotary')return `At the roundabout, take exit ${st.maneuver.exit||1} onto ${n}`;if(m==='straight')return `Continue on ${n}`;if(t==='merge')return `Merge ${m.replace('slight ','')} onto ${n}`;if(t==='on ramp')return `Take the ramp onto ${n}`;if(t==='off ramp')return `Take the exit toward ${n}`;if(t==='fork')return `Keep ${m.includes('left')?'left':'right'} onto ${n}`;return `Turn ${m} onto ${n}`}
async function osrm(a,b){const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),4500);try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson&steps=true`,{signal:ctl.signal});clearTimeout(to);if(!r.ok)throw new Error('router '+r.status);const j=await r.json();const rt=j.routes&&j.routes[0];if(!rt)throw new Error('no route');
  const steps=rt.legs[0].steps.map(s=>({text:instr(s),arrow:s.maneuver.type==='arrive'?ARW.arrive:ARW[s.maneuver.modifier||'straight']||'↑',loc:s.maneuver.location,dist:s.distance}));return{coords:rt.geometry.coordinates,steps,src:'road',dur:rt.duration}}catch(e){clearTimeout(to);return null}}
function straight(a,b){const mid=[b[0],a[1]];const c=[a,mid,b];const dir1=b[0]>a[0]?'east':'west',dir2=b[1]>a[1]?'north':'south';const turn=(dir1==='east')===(dir2==='north')?'left':'right';
  return{coords:c,steps:[{text:`Head ${dir1}`,arrow:'↑',loc:a},{text:`Turn ${turn} and head ${dir2}`,arrow:ARW[turn],loc:mid},{text:'Arrive at the stop',arrow:ARW.arrive,loc:b}],src:'straight'}}
function densify(c){const out=[c[0]];for(let i=1;i<c.length;i++){const d=hav(c[i-1],c[i]),n=Math.max(1,Math.ceil(d/12));for(let k=1;k<=n;k++)out.push([c[i-1][0]+(c[i][0]-c[i-1][0])*k/n,c[i-1][1]+(c[i][1]-c[i-1][1])*k/n])}return out}
let cur=null;
function close(){if(!cur)return;clearInterval(cur.timer);try{cur.map&&cur.map.map&&cur.map.map.remove()}catch(e){}cur.el.remove();const c=cur;cur=null;c.o.onClose&&c.o.onClose()}
async function open(o){close();const host=o.host||document.body;const el=document.createElement('div');el.className='cxnav';el.setAttribute('role','dialog');el.setAttribute('aria-label','In-app navigation');
  el.innerHTML=`<div class="nv-ban"><div class="nv-arw">↑</div><div class="nv-t"><b class="nv-d">—</b><span class="nv-i">Finding the best route…</span></div><button class="nv-x" data-nv="exit" aria-label="Exit navigation">✕</button></div><div class="nv-then"></div><div class="nv-map"></div>
  <div class="nv-btns"><button data-nv="recenter" title="Recenter">◎</button><button data-nv="follow" class="on" title="Follow my position">➤</button><button data-nv="sim" title="Simulate driving (pilot)">▶</button><button data-nv="flat" title="Top-down view (see house numbers)" style="font-size:12px;font-weight:800">2D</button></div>
  <div class="nv-sheet"><div class="nv-eta"><b class="nv-eta-t">—</b><span class="nv-rem">—</span></div><div class="nv-dest"><b>${esc(o.title||'Stop')}</b><span>${esc(o.address||'')}</span></div><div class="nv-src"></div><div class="nv-acts"><button class="nv-arrive" data-nv="arrive">Arrive at stop</button></div></div>`;
  host.appendChild(el);cur={el,o,follow:true,sim:false,i:0,timer:null};const C=cur;
  const map=new CXMap(el.querySelector('.nv-map'),{controls:false,center:o.from,zoom:15,pad:()=>({top:120,left:30,right:30,bottom:170})});C.map=map;
  let rt=await osrm(o.from,o.to);if(!rt)rt=straight(o.from,o.to);if(cur!==C)return;C.rt=rt;C.path=densify(rt.coords);C.cum=[0];for(let i=1;i<C.path.length;i++)C.cum.push(C.cum[i-1]+hav(C.path[i-1],C.path[i]));C.total=C.cum[C.cum.length-1];
  C.stepIdx=rt.steps.map(s=>{let best=0,bd=1e12;C.path.forEach((p,i)=>{const d=hav(p,s.loc);if(d<bd){bd=d;best=i}});return best});
  el.querySelector('.nv-src').textContent=rt.src==='road'?'Road route · public routing service':'Offline route · straight line with simulated turns';el.dataset.src=rt.src;
  paint(true);el.addEventListener('click',ev=>{const b=ev.target.closest('[data-nv]');if(!b)return;const a=b.dataset.nv;
    if(a==='exit')close();if(a==='recenter'){C.follow=true;el.querySelector('[data-nv=follow]').classList.add('on');paint(true)}if(a==='follow'){C.follow=!C.follow;b.classList.toggle('on',C.follow)}
    if(a==='flat'){C.flat=!C.flat;b.classList.toggle('on',C.flat);b.textContent=C.flat?'3D':'2D';paint(false)}
    if(a==='sim'){C.sim=!C.sim;b.textContent=C.sim?'❚❚':'▶';b.classList.toggle('on',C.sim)}
    if(a==='arrive'){const cb=o.onArrive;C.o.onClose=null;close();cb&&cb()}});
  C.timer=setInterval(()=>{if(!C.sim)return;C.i=Math.min(C.path.length-1,C.i+(o.speed||6));paint(false);if(o.onMove&&C.i%30<(o.speed||6))o.onMove(C.path[C.i]);if(C.i>=C.path.length-1){C.sim=false;const sb=el.querySelector('[data-nv=sim]');if(sb){sb.textContent='▶';sb.classList.remove('on')}}},250);
  if(o.autoSim){C.sim=true;el.querySelector('[data-nv=sim]').textContent='❚❚'}
  return C}
function paint(refit){const C=cur;if(!C||!C.path)return;const el=C.el,pos=C.path[C.i],rem=C.total-C.cum[C.i];
  let k=C.stepIdx.findIndex(ix=>ix>C.i);if(k<0)k=C.rt.steps.length-1;const st=C.rt.steps[k],next=C.rt.steps[k+1];const toMan=Math.max(0,C.cum[C.stepIdx[k]]-C.cum[C.i]);
  el.querySelector('.nv-arw').textContent=st.arrow;el.querySelector('.nv-d').textContent=rem<25?'Arrived':fmtD(toMan);el.querySelector('.nv-i').textContent=rem<25?'You have arrived at the stop':st.text;
  el.querySelector('.nv-then').textContent=next&&rem>=25?'Then '+next.arrow+' '+next.text:'';el.querySelector('.nv-then').hidden=!(next&&rem>=25);
  const min=Math.max(1,Math.round(rem/9.5/60));const clock=window.CX&&CX.S?CX.S.clock:null;el.querySelector('.nv-eta-t').textContent=clock!=null?CX.fmt(clock+min):min+' min';el.querySelector('.nv-rem').textContent=`${min} min · ${fmtD(rem)}`;
  el.classList.toggle('near',rem<60);if(C.o.autoArrive&&rem<25&&!C.autoFired){C.autoFired=true;setTimeout(()=>{if(cur===C){const cb=C.o.onArrive;C.o.onClose=null;close();cb&&cb()}},C.o.arriveDelay||900)}el.dataset.remaining=Math.round(rem);
  const ahead=C.path.slice(C.i);C.map.set({pins:[{id:'dest',ll:C.o.to,state:'assigned',label:C.o.label||'★',sel:true,title:C.o.title}],lines:[{coords:ahead.length>1?ahead:[pos,C.o.to],sel:true}],drivers:[{id:'me',ll:pos,name:'You'}],fitTo:refit?[pos,C.o.to]:null,refit:!!refit});
  if(C.follow&&!refit&&C.map.mode==='gl'){const nb=C.path[Math.min(C.path.length-1,C.i+3)];try{C.map.map.easeTo({center:pos,zoom:16.2,bearing:hav(pos,nb)>1?bearing(pos,nb):C.map.map.getBearing(),pitch:C.flat?0:45,duration:240})}catch(e){}}}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const css=`.cxnav{position:absolute;inset:0;z-index:80;display:flex;flex-direction:column;background:#0b1420;border-radius:inherit;overflow:hidden;animation:nvIn .22s ease}
@keyframes nvIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.cxnav .nv-ban{position:absolute;top:0;left:0;right:0;z-index:3;display:flex;gap:12px;align-items:center;padding:44px 14px 14px;background:#0f6b4a;color:#fff;box-shadow:0 10px 24px -12px rgba(0,0,0,.6)}
.cxnav .nv-arw{font-size:34px;line-height:1;width:44px;text-align:center}.cxnav .nv-t{flex:1;display:flex;flex-direction:column;gap:2px}.cxnav .nv-d{font:800 24px/1.1 Inter,system-ui,sans-serif}.cxnav .nv-i{font:600 14.5px/1.25 Inter,system-ui,sans-serif;opacity:.95}
.cxnav .nv-x{background:rgba(255,255,255,.18);border:0;color:#fff;width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer}
.cxnav .nv-then{position:absolute;top:118px;left:12px;z-index:3;background:#0a4f37;color:#d9f5e8;font:600 12.5px/1 Inter,system-ui,sans-serif;padding:7px 10px;border-radius:0 0 10px 10px}
.cxnav .nv-map{flex:1;position:relative}.cxnav .nv-map>div{position:absolute;inset:0}
.cxnav .nv-btns{position:absolute;right:12px;bottom:190px;z-index:3;display:flex;flex-direction:column;gap:8px}.cxnav .nv-btns button{width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#172b45;font-size:18px;box-shadow:0 6px 16px -6px rgba(0,0,0,.5);cursor:pointer}.cxnav .nv-btns button.on{background:#2563c9;color:#fff}
.cxnav .nv-sheet{position:absolute;left:0;right:0;bottom:0;z-index:3;background:#fff;color:#172b45;border-radius:18px 18px 0 0;padding:14px 16px 18px;box-shadow:0 -10px 30px -12px rgba(0,0,0,.5)}
html.dark .cxnav .nv-sheet{background:#0f1b2d;color:#e7eefa}
.cxnav .nv-eta{display:flex;align-items:baseline;gap:10px}.cxnav .nv-eta-t{font:800 22px/1 Inter,system-ui,sans-serif;color:#16a34a}.cxnav .nv-rem{font:600 13px/1 Inter,system-ui,sans-serif;opacity:.75}
.cxnav .nv-dest{margin-top:8px;display:flex;flex-direction:column;font-size:13px}.cxnav .nv-dest span{opacity:.7;font-size:12px}.cxnav .nv-src{font-size:10.5px;opacity:.55;margin-top:6px}
.cxnav .nv-acts{margin-top:10px}.cxnav .nv-arrive{width:100%;border:0;border-radius:12px;padding:13px;font:750 15px/1 Inter,system-ui,sans-serif;background:#e8eef7;color:#172b45;cursor:pointer}.cxnav.near .nv-arrive{background:#16a34a;color:#fff;animation:pulse 1.6s infinite}`;
const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
window.CXNav={route:async(a,b)=>(await osrm(a,b))||straight(a,b),densify,bearing,fmtD,open,close,get current(){return cur},hav,_paint:()=>paint(false),jumpEnd(){if(cur&&cur.path){cur.i=cur.path.length-1;paint(false)}}};
})();
