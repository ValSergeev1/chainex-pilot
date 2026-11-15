/* ChainEx V06 · live turn-by-turn navigation engine for the driver app.
   Follows the phone's real location (watchPosition, high accuracy) along a road route from the public OSRM router:
   map-matched position, current + next maneuver, distance to the turn counting down, remaining distance and ETA,
   off-route detection with a throttled reroute from where the driver is, offline/failed-route fallback (keeps the last route),
   optional voice prompts, arrival detection, and a "Simulate drive" mode that moves along the route at street speed.
   GPS is only watched while navigating and the page is visible. Sample data only. */
(function(){
const R=6371000,rad=x=>x*Math.PI/180;
function hav(a,b){const dLat=rad(b[1]-a[1]),dLon=rad(b[0]-a[0]);const h=Math.sin(dLat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(Math.min(1,h)))}
function brg(a,b){const y=Math.sin(rad(b[0]-a[0]))*Math.cos(rad(b[1])),x=Math.cos(rad(a[1]))*Math.sin(rad(b[1]))-Math.sin(rad(a[1]))*Math.cos(rad(b[1]))*Math.cos(rad(b[0]-a[0]));return (Math.atan2(y,x)*180/Math.PI+360)%360}
const fmtD=m=>m>=160?(m/1609.34).toFixed(1)+' mi':Math.max(0,Math.round(m*3.281/10)*10)+' ft';
const ARW={left:'↰','slight left':'↖','sharp left':'↰',right:'↱','slight right':'↗','sharp right':'↱',straight:'↑',uturn:'↶',arrive:'⚑',depart:'↑'};
const DIRS=['north','northeast','east','southeast','south','southwest','west','northwest'];
function instr(t,m,n,s){m=m||'straight';n=n||'the road';if(t==='depart')return `Head ${DIRS[Math.round((s.bearing_after||0)/45)%8]} on ${n}`;if(t==='arrive')return 'Arrive at the stop';if(t==='roundabout'||t==='rotary')return `At the roundabout, take exit ${s.exit||1} onto ${n}`;if(m==='uturn')return `Make a U-turn onto ${n}`;if(m==='straight')return `Continue on ${n}`;if(t==='merge')return `Merge ${m.replace('slight ','')} onto ${n}`;if(t==='on ramp')return `Take the ramp onto ${n}`;if(t==='off ramp')return `Take the exit toward ${n}`;if(t==='fork')return `Keep ${m.includes('left')?'left':'right'} onto ${n}`;return `Turn ${m} onto ${n}`}
/* road route; throws when the router can't be reached (callers decide the fallback) */
async function osrm(a,b,ms){const ctl=typeof AbortController!=='undefined'?new AbortController():null;const to=setTimeout(()=>{try{ctl&&ctl.abort()}catch(e){}},ms||6000);
 try{const u=`https://router.project-osrm.org/route/v1/driving/${a[0].toFixed(6)},${a[1].toFixed(6)};${b[0].toFixed(6)},${b[1].toFixed(6)}?overview=full&geometries=geojson&steps=true`;
  const r=await fetch(u,ctl?{signal:ctl.signal}:{});if(!r.ok)throw new Error('router '+r.status);const j=await r.json();const rt=j&&j.routes&&j.routes[0];if(!rt||!rt.geometry||!rt.legs||!rt.legs[0])throw new Error('no route');
  const steps=rt.legs[0].steps.map(s=>{const M=s.maneuver||{},t=M.type,m=M.modifier;return{text:instr(t,m,s.name,M),arrow:t==='arrive'?ARW.arrive:ARW[m||'straight']||'↑',type:t,mod:m||'',name:s.name||'',loc:M.location,dist:s.distance,dur:s.duration}});
  return{coords:rt.geometry.coordinates,steps,src:'road',dur:rt.duration,dist:rt.distance}}finally{clearTimeout(to)}}
function straight(a,b){const mid=[b[0],a[1]];const d1=b[0]>a[0]?'east':'west',d2=b[1]>a[1]?'north':'south';const turn=(d1==='east')===(d2==='north')?'left':'right';
 return{coords:[a,mid,b],steps:[{text:`Head ${d1}`,arrow:'↑',type:'depart',loc:a},{text:`Turn ${turn} and head ${d2}`,arrow:ARW[turn],type:'turn',mod:turn,loc:mid},{text:'Arrive at the stop',arrow:ARW.arrive,type:'arrive',loc:b}],src:'straight'}}
async function route(a,b){try{return await osrm(a,b)}catch(e){return straight(a,b)}}
/* densify to ~12 m, cumulative distance, and where each maneuver sits along the path (kept in order) */
function prep(rt){const c=(rt.coords||[]).filter(p=>p&&isFinite(p[0])&&isFinite(p[1]));if(c.length<2)c.push(c[0]||[0,0]);const path=[c[0]];
 for(let i=1;i<c.length;i++){const d=hav(c[i-1],c[i]),n=Math.max(1,Math.ceil(d/12));for(let k=1;k<=n;k++)path.push([c[i-1][0]+(c[i][0]-c[i-1][0])*k/n,c[i-1][1]+(c[i][1]-c[i-1][1])*k/n])}
 const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+hav(path[i-1],path[i]));const total=cum[cum.length-1];
 let from=0;const steps=(rt.steps||[]).map((s,j,arr)=>{let b=from,bd=1e12;const loc=s.loc||path[path.length-1];if(s.type==='arrive'||j===arr.length-1)b=path.length-1;else for(let i=from;i<path.length;i++){const d=hav(path[i],loc);if(d<bd){bd=d;b=i}if(d>bd+400)break}from=b;return Object.assign({},s,{idx:b,at:cum[b]})});
 if(!steps.length)steps.push({text:'Arrive at the stop',arrow:'⚑',type:'arrive',idx:path.length-1,at:total});
 const avg=rt.dur&&total>50?Math.max(4,Math.min(22,total/rt.dur)):9.5;
 return{rt,path,cum,total,steps,si:steps.map(s=>s.idx),src:rt.src||'road',avg,i:0,along:0,pos:path[0]}}
/* nearest point on the path (local metric projection); searches near the last position first */
function snap(L,ll,hint){const kx=Math.cos(rad(ll[1]))*R*Math.PI/180,ky=R*Math.PI/180,P=L.path;
 const scan=(a,b)=>{let best=null;for(let i=Math.max(0,a);i<Math.min(P.length-1,b);i++){const ax=(P[i][0]-ll[0])*kx,ay=(P[i][1]-ll[1])*ky,bx=(P[i+1][0]-ll[0])*kx,by=(P[i+1][1]-ll[1])*ky,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;let t=l2?-(ax*dx+ay*dy)/l2:0;t=t<0?0:t>1?1:t;const px=ax+dx*t,py=ay+dy*t,d=Math.sqrt(px*px+py*py);if(!best||d<best.d)best={seg:i,t,d}}return best};
 let s=hint!=null?scan(hint-25,hint+160):null;if(!s||s.d>35)s=scan(0,P.length)||{seg:0,t:0,d:hav(ll,P[0])};
 const i=s.seg,j=Math.min(P.length-1,i+1);s.pt=[P[i][0]+(P[j][0]-P[i][0])*s.t,P[i][1]+(P[j][1]-P[i][1])*s.t];s.along=L.cum[i]+(L.cum[j]-L.cum[i])*s.t;s.bearing=hav(P[i],P[j])>.5?brg(P[i],P[j]):null;return s}
function pointAt(L,along){const c=L.cum,P=L.path;along=Math.max(0,Math.min(L.total,along));let lo=0,hi=c.length-1;while(lo<hi-1){const m=(lo+hi)>>1;if(c[m]<=along)lo=m;else hi=m}const seg=c[hi]-c[lo],t=seg?(along-c[lo])/seg:0;
 const a=P[lo],b=P[hi];return{pt:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],seg:lo,bearing:hav(a,b)>.5?brg(a,b):null}}
/* current maneuver = the first one still ahead of the driver */
function at(L,along){const S=L.steps;let k=S.findIndex((s,j)=>j>0&&s.at>along+4);if(k<0)k=S.length-1;const st=S[k],next=S[k+1]||null;return{k,step:st,next:next&&st.type!=='arrive'?next:null,toMan:Math.max(0,st.at-along),rem:Math.max(0,L.total-along)}}
const spokenD=m=>m<150?Math.max(50,Math.round(m*3.281/50)*50)+' feet':m<400?'a quarter mile':(m/1609.34).toFixed(1).replace(/\.0$/,'')+' miles';
const phrase=s=>{const t=s.text||'Continue';return t.charAt(0).toLowerCase()+t.slice(1)};
let simMult=1;
function start(o){let L=o.leg;const to=o.to;const S={mode:o.mode==='sim'?'sim':'live',status:o.mode==='sim'?'sim':'locating',msg:'',pos:null,acc:null,speed:0,heading:null,along:L.along||0,seg:L.i||0,k:0,toMan:0,rem:L.total,etaMin:Math.max(1,Math.ceil(L.total/L.avg/60)),arrived:false,offRoute:false,offDist:0,reroutes:0,rerouteFails:0,fixes:0,spoken:[],said:{},far:false,src:L.src};
 let watch=null,simT=null,noFixT=null,stopped=false,offSince=0,offN=0,lastRe=0,reBusy=false,lastFix=null,simAlong=S.along,simLast=0;
 const C={state:S,get leg(){return L},stop,toSim,toLive,reroute:f=>reroute(f||S.pos,true),get watching(){return watch!=null},get simulating(){return simT!=null}};
 const emit=()=>{try{o.onFix&&o.onFix(S)}catch(e){console.warn(e)}},status=()=>{try{o.onStatus&&o.onStatus(S)}catch(e){console.warn(e)}};
 function say(key,text){if(S.said[key])return;S.said[key]=1;S.spoken.push(text);if(S.spoken.length>30)S.spoken.shift();if(!(o.voice&&o.voice()))return;try{const ss=window.speechSynthesis;if(!ss||typeof SpeechSynthesisUtterance==='undefined')return;ss.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=1.02;ss.speak(u)}catch(e){}}
 function fix(ll,f){if(stopped||S.arrived||!ll)return;const now=f.t||Date.now();S.fixes++;S.acc=f.acc!=null?f.acc:S.acc;
  if(S.status==='locating'||S.status==='nofix'||S.status==='denied'||S.status==='unavailable'){if(S.mode==='live'){S.status='live';S.msg='';clearTimeout(noFixT);status()}}
  if(/^GPS signal/.test(S.msg)){S.msg='';status()}
  let sp=f.speed;if(!(sp>=0)&&lastFix){const dt=(now-lastFix.t)/1000;if(dt>.2)sp=hav(lastFix.ll,ll)/dt}if(sp>=0&&isFinite(sp))S.speed=S.speed?S.speed*.6+sp*.4:sp;
  const sn=snap(L,ll,S.seg);const thr=Math.max(45,Math.min(90,(S.acc||0)+25));S.offDist=Math.round(sn.d);
  if(S.fixes===1&&S.mode==='live'){const dStop=hav(ll,to);if(dStop>30000){S.far=true;S.farMsg=S.msg=o.live?`You're ${fmtD(dStop)} from this stop`:`You're ${fmtD(dStop)} from this sample stop`}if(sn.d>60){lastFix={ll,t:now};S.pos=ll;S.offRoute=true;emit();reroute(ll,true);return}}
  if(sn.d>thr){if(!offSince)offSince=now;offN++;S.offRoute=true;if(offN>=3&&now-offSince>=4000)reroute(ll,false)}else{offSince=0;offN=0;if(S.offRoute){S.offRoute=false;if(!reBusy&&/off route|keeping/i.test(S.msg)){S.msg='';status()}}}
  const onR=!S.offRoute;if(onR){S.along=sn.along;S.seg=sn.seg;S.pos=sn.pt}else S.pos=ll;
  const gh=f.heading;if(gh!=null&&isFinite(gh)&&S.speed>2)S.heading=gh;else if(onR&&sn.bearing!=null)S.heading=sn.bearing;else if(lastFix&&hav(lastFix.ll,ll)>3)S.heading=brg(lastFix.ll,ll);
  lastFix={ll,t:now};const a=at(L,S.along);const stepChanged=a.k!==S.k;S.k=a.k;S.toMan=a.toMan;S.rem=a.rem;S.step=a.step;S.next=a.next;
  const v=S.speed>3?S.speed*.5+L.avg*.5:L.avg;S.etaMin=Math.max(1,Math.ceil(S.rem/v/60));
  if(!S.said.start&&a.step.type!=='arrive'&&L.steps[0]&&!S.rerouting){const d0=L.steps[0];say('start',(d0.type==='depart'&&a.k===1?d0.text+', then ':'')+phrase(a.step)+' in '+spokenD(a.toMan));const sk='s'+L.steps.indexOf(a.step)+':'+S.reroutes;S.said[sk+':far']=1;if(a.toMan<=300)S.said[sk+':near']=1}
  if(a.step.type!=='arrive'){const key='s'+L.steps.indexOf(a.step)+':'+S.reroutes;if(stepChanged&&a.toMan>300)say(key+':far',`${a.step.text.replace(/^Head/,'Head')} in ${spokenD(a.toMan)}`);else if(a.toMan<=300&&a.toMan>60)say(key+':near',`In ${spokenD(a.toMan)}, ${phrase(a.step)}`);else if(a.toMan<=60)say(key+':now',a.step.text)}
  const dStop=hav(S.pos,to);if(dStop<30||(onR&&S.rem<20)){S.arrived=true;S.toMan=0;S.rem=0;S.msg='';say('arrive','You have arrived at the stop');emit();status();halt();setTimeout(()=>{if(!stopped&&o.onArrive)o.onArrive(S)},o.arriveDelay!=null?o.arriveDelay:650);return}
  emit()}
 async function reroute(from,force){if(stopped||reBusy||!from)return;const now=Date.now();
  if(typeof navigator!=='undefined'&&navigator.onLine===false){if(S.msg!=='Offline · keeping your last route'){S.msg='Offline · keeping your last route';status()}return}
  if(!force&&now-lastRe<12000)return;lastRe=now;
  reBusy=true;S.rerouting=true;S.msg='Rerouting…';status();if(!force)say('re'+S.reroutes,'Rerouting');
  try{const rt=await (o.route||osrm)(from,to);if(stopped)return;const N=prep(rt);N.tid=L.tid;L=N;S.src=N.src;S.reroutes++;offSince=0;offN=0;S.offRoute=false;S.msg=S.far&&S.mode==='live'?S.farMsg:'';simAlong=0;S.along=0;S.seg=0;S.k=0;o.onReroute&&o.onReroute(N,S)}
  catch(e){if(stopped)return;S.rerouteFails++;lastRe=now+15000;S.msg=navigator.onLine===false?'Offline · keeping your last route':"Couldn't get a new route · keeping the last one";}
  finally{reBusy=false;S.rerouting=false;if(!stopped){status();if(lastFix&&S.mode==='live'){const lf=lastFix;lastFix=null;S.fixes=Math.max(2,S.fixes);fix(lf.ll,{t:Date.now(),acc:S.acc})}}}}
 function armLive(){if(stopped||S.mode!=='live'||watch!=null||document.hidden)return;const G=typeof navigator!=='undefined'&&navigator.geolocation;
  if(!G||!window.isSecureContext&&location.protocol!=='file:'){S.status='unavailable';S.msg='';status();return}
  try{if(navigator.permissions&&navigator.permissions.query)navigator.permissions.query({name:'geolocation'}).then(p=>{if(!stopped&&p&&p.state==='denied'&&S.mode==='live'&&!S.fixes)fail({code:1})}).catch(()=>{})}catch(e){}
  watch=G.watchPosition(p=>{const c=p.coords;fix([c.longitude,c.latitude],{acc:c.accuracy,speed:c.speed,heading:c.heading,t:p.timestamp||Date.now()})},fail,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  clearTimeout(noFixT);noFixT=setTimeout(()=>{if(!stopped&&S.mode==='live'&&!S.fixes&&S.status==='locating'){S.status='nofix';status()}},10000)}
 function fail(e){if(stopped||S.mode!=='live')return;const code=e&&e.code;if(code===1){S.status='denied';disarm();status()}else if(code===2){if(!S.fixes){S.status='unavailable';status()}else if(!S.msg){S.msg='GPS signal lost · keeping your route';status()}}else{if(!S.fixes&&S.status==='locating'){S.status='nofix';status()}}}
 function disarm(){if(watch!=null){try{navigator.geolocation.clearWatch(watch)}catch(e){}watch=null}clearTimeout(noFixT)}
 function armSim(){if(stopped||S.mode!=='sim'||simT||document.hidden)return;simLast=performance.now();simT=setInterval(()=>{const t=performance.now(),dt=Math.min(1,(t-simLast)/1000);simLast=t;const a=at(L,simAlong);const near=a.toMan<45||(a.k>0&&simAlong-L.steps[a.k-1].at<25);const v=near?6.5:Math.min(13.4,L.avg*1.25);simAlong=Math.min(L.total,simAlong+v*dt*simMult);const p=pointAt(L,simAlong);fix(p.pt,{acc:5,speed:v,heading:p.bearing,t:Date.now()})},500)}
 function halt(){disarm();if(simT){clearInterval(simT);simT=null}}
 function toSim(){if(stopped)return;halt();S.mode='sim';S.status='sim';S.msg=S.far?'':S.msg;if(S.far){S.far=false;S.msg=''}simAlong=S.offRoute?0:S.along;S.offRoute=false;offN=0;offSince=0;S.fixes=Math.max(1,S.fixes);status();armSim()}
 function toLive(){if(stopped)return;halt();S.mode='live';S.status='locating';S.fixes=0;lastFix=null;status();armLive()}
 const vis=()=>{if(stopped)return;if(document.hidden){halt()}else{if(S.arrived)return;if(S.mode==='live')armLive();else armSim()}};document.addEventListener('visibilitychange',vis);
 function stop(){if(stopped)return;stopped=true;halt();document.removeEventListener('visibilitychange',vis);try{window.speechSynthesis&&window.speechSynthesis.cancel()}catch(e){}}
 if(S.mode==='sim'){S.pos=pointAt(L,simAlong).pt;armSim()}else armLive();
 {const a=at(L,S.along);S.step=a.step;S.next=a.next;S.toMan=a.toMan;S.k=a.k}
 return C}
window.CXNavLive={osrm,straight,route,prep,snap,at,pointAt,start,hav,brg,fmtD,spokenD,get simSpeed(){return simMult},set simSpeed(v){simMult=Math.max(.25,Math.min(40,+v||1))},
 mapsLinks(ll){return{google:`https://www.google.com/maps/dir/?api=1&destination=${ll[1]},${ll[0]}&travelmode=driving`,apple:`https://maps.apple.com/?daddr=${ll[1]},${ll[0]}&dirflg=d`}}};
})();
