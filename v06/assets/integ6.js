/* V06 integrations core: canonical scan events, mock order API, webhooks, health,
   geocoding, GPS helpers, notifications, scan outbox, and versioned terms.
   Sample data only. Lives on S.v06.integ so V03/V04 ignore it. */
(function(){
const C=window.CX; if(!C) return;
const TYPES={
  created:{label:'Created',status:'created',edi:'990',desc:'Order accepted into ChainEx'},
  received:{label:'Received at hub',status:'in_transit',edi:'X4',desc:'Induction scan at a hub'},
  loaded:{label:'Loaded on route',status:'in_transit',edi:'AM',desc:'Load-out scan onto a route'},
  out_for_delivery:{label:'Out for delivery',status:'in_transit',edi:'X6',desc:'Route started'},
  arrived:{label:'Arrived at stop',status:'in_transit',edi:'X1',desc:'Arrival scan or geofence'},
  delivered:{label:'Delivered',status:'delivered',edi:'D1',desc:'Proof of delivery captured'},
  attempted:{label:'Delivery attempted',status:'attempted',edi:'AH',desc:'Failed stop with a reason'},
  exception:{label:'Exception',status:'exception',edi:'SD',desc:'Delay, damage, refusal or address issue'},
  returned:{label:'Returned',status:'returned',edi:'A3',desc:'End-of-day return or return to shipper'},
  closed_out:{label:'Closed out',status:'closed',edi:'',desc:'Route close-out finished'},
  eta_updated:{label:'ETA updated',status:'in_transit',edi:'AG',desc:'Re-optimize, move or delay'}
};
const TZ='America/Los_Angeles';
const nowClock=()=>(C.S&&C.S.clock)||'Sample day';
function emptyInteg(){return {events:[],idem:{},keys:[],hooks:[],log:[],geoCache:{},outbox:[],notify:[],gps:{},accept:[],ondemand:[],rl:{},settings:{idleMin:15,inactiveMin:30,silentMin:20,replayDays:30},terms:{current:{},history:[]}}}function desk(){if(!C.S){try{if(typeof C.load==='function')C.load()}catch(e){} }if(!C.S)return emptyInteg();C.S.v06=C.S.v06||{};const v=C.S.v06;v.integ=v.integ||{};const I=v.integ;
  I.events=I.events||[];I.idem=I.idem||{};I.keys=I.keys||[];I.hooks=I.hooks||[];I.log=I.log||[];
  I.geoCache=I.geoCache||{};I.outbox=I.outbox||[];I.notify=I.notify||[];I.gps=I.gps||{};
  I.accept=I.accept||[];I.ondemand=I.ondemand||[];I.rl=I.rl||{};
  I.settings=Object.assign({idleMin:15,inactiveMin:30,silentMin:20,replayDays:30},I.settings||{});
  I.terms=I.terms||{current:{},history:[]};
  return I}
function cap(arr,n){if(arr.length>n)arr.splice(0,arr.length-n);return arr}
function rid(p){return (p||'EV')+'-'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3)}
function save(fn){if(!C.S||!C.update)return;C.update(S=>{desk();if(fn)fn(S.v06.integ,S)})}

/* ---- events ---- */
function ev(o){const I=desk();const t=TYPES[o.type]||TYPES.exception;
  const e={id:o.id||rid('EV'),type:o.type,status:t.status,edi:t.edi,label:t.label,
    taskId:o.taskId||'',tracking:o.tracking||o.taskId||'',at:o.at||nowClock(),
    atUtc:o.atUtc||new Date().toISOString(),tz:TZ,hub:o.hub||'',ll:o.ll||null,acc:o.acc||null,
    actor:o.actor||'System',idem:o.idem||'',ref:o.ref||'',shipper:o.shipper||'',
    payload:o.payload||{}};
  return e}
function emit(type,extra){if(type&&typeof type==='object'){extra=type;type=extra.type}extra=extra||{};
  let out=null;
  save(I=>{
    if(extra.idem&&I.idem[extra.idem]){out=I.events.find(x=>x.id===I.idem[extra.idem])||null;return}
    const e=ev(Object.assign({type},extra));
    I.events.push(e);cap(I.events,250);
    if(extra.idem)I.idem[extra.idem]=e.id;
    out=e;
  });
  if(out&&!extra.silent)queueHooks(out);
  return out}
function eventsFor(id){return desk().events.filter(e=>e.taskId===id||e.tracking===id||e.ref===id)}
function lastStatus(id){const es=eventsFor(id);return es.length?es[es.length-1]:null}

/* ---- hmac (SHA-256, compact) for signed webhook payloads ---- */
function rotr(x,n){return (x>>>n)|(x<<(32-n))}
function sha256(bytes){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const b=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;
  const l=b.length*8;const withPad=new Uint8Array(((b.length+9+63)>>6)<<6);withPad.set(b);withPad[b.length]=0x80;
  const dv=new DataView(withPad.buffer);dv.setUint32(withPad.length-4,l);
  let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w=new Uint32Array(64);
  for(let i=0;i<withPad.length;i+=64){
    for(let j=0;j<16;j++)w[j]=dv.getUint32(i+j*4);
    for(let j=16;j<64;j++){const s0=rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);const s1=rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);w[j]=(w[j-16]+s0+w[j-7]+s1)>>>0}
    let [a,b2,c,d,e,f,g,h]=H;
    for(let j=0;j<64;j++){const S1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^((~e)&g),t1=(h+S1+ch+K[j]+w[j])>>>0,S0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b2)^(a&c)^(b2&c),t2=(S0+maj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b2;b2=a;a=(t1+t2)>>>0}
    H=[(H[0]+a)>>>0,(H[1]+b2)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0]
  }
  return H.map(x=>('00000000'+x.toString(16)).slice(-8)).join('')}
function hmacSha256(secret,msg){
  const enc=new TextEncoder();const key=enc.encode(secret);const text=typeof msg==='string'?enc.encode(msg):msg;
  const block=64;const k=key.length>block?Uint8Array.from(sha256(key).match(/.{2}/g).map(x=>parseInt(x,16))):key;
  const kp=new Uint8Array(block);kp.set(k);
  const ip=new Uint8Array(block+text.length),op=new Uint8Array(block+32);
  for(let i=0;i<block;i++){ip[i]=kp[i]^0x36;op[i]=kp[i]^0x5c}
  ip.set(text,block);const inner=sha256(ip);
  for(let i=0;i<32;i++)op[block+i]=parseInt(inner.slice(i*2,i*2+2),16);
  return sha256(op)}
function signPayload(secret,body){const ts=Math.floor(Date.now()/1000);const payload=typeof body==='string'?body:JSON.stringify(body);
  const sig=hmacSha256(secret,ts+'.'+payload);return {ts,sig,header:'t='+ts+',v1='+sig,payload}}

/* ---- API keys + mock REST ---- */
function seedKeys(I){if(I.keys.length)return;
  I.keys.push({id:'key_demo',name:'Summit Parcel · sandbox',token:'cx_test_summit_demo',scopes:['orders:write','orders:read','tracking:read','webhooks:write'],shipper:'SPN-PNW',created:nowClock(),active:true});
  I.keys.push({id:'key_live_demo',name:'Harborline Parcel · demo live',token:'cx_live_harbor_demo',scopes:['orders:read','tracking:read'],shipper:'HPL-SEA',created:nowClock(),active:true})}
function findKey(token){return desk().keys.find(k=>k.token===token&&k.active)}
function createKey(o){const k={id:rid('key'),name:o.name||'API key',token:(o.test===false?'cx_live_':'cx_test_')+Math.random().toString(36).slice(2,14),scopes:o.scopes||['orders:write','orders:read','tracking:read'],shipper:o.shipper||'',created:nowClock(),active:true};
  save(I=>I.keys.push(k));return k}
function revokeKey(id){save(I=>{const k=I.keys.find(x=>x.id===id);if(k)k.active=false})}
function rateOk(token){const I=desk();const now=Date.now();I.rl[token]=(I.rl[token]||[]).filter(t=>now-t<1000);if(I.rl[token].length>=20)return false;I.rl[token].push(now);return true}
function apiError(status,code,msg){return {ok:false,status,headers:{'Content-Type':'application/json'},body:{error:{code,message:msg}}}}
function apiOk(body,extra){return Object.assign({ok:true,status:200,headers:{'Content-Type':'application/json','X-RateLimit-Limit':'20','X-RateLimit-Remaining':'19'}},extra||{},{body})}
function request(method,path,opts){
  opts=opts||{};const headers=Object.assign({},opts.headers||{});
  const auth=(headers.Authorization||headers.authorization||'').replace(/^Bearer\s+/i,'')||opts.token||'';
  const key=findKey(auth);
  if(!key)return apiError(401,'unauthorized','A scoped API key is required. Use Authorization: Bearer cx_test_…');
  if(!rateOk(key.token))return apiError(429,'rate_limited','Rate limit is 20 requests per second per key.');
  const idem=headers['Idempotency-Key']||headers['idempotency-key']||opts.idem;
  const parts=String(path||'').replace(/^\/+/,'').split('/');
  const body=opts.body||{};
  const need=sc=>key.scopes.indexOf(sc)>=0||key.scopes.indexOf('*')>=0;
  try{
    if(method==='POST'&&parts[0]==='v1'&&parts[1]==='orders'&&parts[2]==='batch'){
      if(!need('orders:write'))return apiError(403,'forbidden','This key cannot create orders.');
      return batchOrders(body,key,idem)}
    if(method==='POST'&&parts[0]==='v1'&&parts[1]==='orders'&&parts[2]&&parts[3]==='cancel'){
      if(!need('orders:write'))return apiError(403,'forbidden','This key cannot cancel orders.');
      return cancelOrder(parts[2],key)}
    if(method==='POST'&&parts[0]==='v1'&&parts[1]==='orders'){
      if(!need('orders:write'))return apiError(403,'forbidden','This key cannot create orders.');
      return createOrderApi(body,key,idem)}
    if(method==='POST'&&parts[0]==='v1'&&parts[1]==='quotes'){
      return quoteOrder(body,key)}
    if(method==='GET'&&parts[0]==='v1'&&(parts[1]==='tracking'||parts[1]==='track')&&parts[2]){
      if(!need('tracking:read')&&!need('orders:read'))return apiError(403,'forbidden','This key cannot read tracking.');
      return getTracking(parts[2])}
    if(method==='GET'&&parts[0]==='v1'&&parts[1]==='events'){
      if(!need('tracking:read'))return apiError(403,'forbidden','This key cannot list events.');
      const evs=desk().events.slice(-100);return apiOk({events:evs,has_more:desk().events.length>100})}
    return apiError(404,'not_found','No such endpoint. See the OpenAPI file on the developer portal.')}
  catch(e){return apiError(500,'server_error',String(e.message||e))}}

function stopFromOrder(o,key){
  const addr=o.address||[o.street,o.city,o.state,o.zip].filter(Boolean).join(', ');
  const ll=o.ll||(o.lng!=null&&o.lat!=null?[+o.lng,+o.lat]:null);
  return {name:o.name||o.recipient||'API stop',address:addr,ll,units:+o.packages||+o.units||1,line:o.line||'pd',
    ref:o.reference||o.ref||'',shipper:o.shipper||key.shipper||'SPN-PNW',window:o.window,tags:['API']}}
function materializeStop(s,key,idem){
  if(!window.CXO||!CXO.createStop)throw new Error('Dispatch tools are not loaded on this page.');
  const t=CXO.createStop({name:s.name,address:s.address,ll:s.ll,units:s.units,line:s.line,x:{ref:s.ref,shipper:s.shipper,source:'api'},tags:s.tags}, 'API · '+(key.name||'key'));
  if(t){t.ref=s.ref;t.shipper=s.shipper;t.source='api';if(!t.ll&&s.ll)t.ll=s.ll;
    emit('created',{taskId:t.id,tracking:t.id,ref:s.ref,shipper:s.shipper,hub:t.opHub,actor:'API',idem:idem||('ord:'+t.id),payload:{packages:s.units,line:s.line}})}
  return t}
function createOrderApi(body,key,idem){
  const I=desk();if(idem&&I.idem[idem]){const ev=I.events.find(x=>x.id===I.idem[idem]);return apiOk({id:ev&&ev.taskId,idempotent:true,tracking_url:trackUrl(ev&&ev.taskId)})}
  const t=materializeStop(stopFromOrder(body,key),key,idem);
  if(t&&(!t.ll||!(t.tags||[]).includes('GEO_OK')))maybeGeocode(t);
  return apiOk({id:t.id,status:'created',tracking_number:t.id,tracking_url:trackUrl(t.id),events:eventsFor(t.id)})}
function batchOrders(body,key,idem){
  const rows=body.orders||body.stops||[];
  if(!rows.length)return apiError(400,'invalid','Provide orders: [{name, address, packages}].');
  const created=[];const errors=[];
  rows.forEach((o,i)=>{try{const t=materializeStop(stopFromOrder(o,key),key,idem?idem+':'+i:undefined);created.push({id:t.id,tracking_url:trackUrl(t.id)});if(t)maybeGeocode(t)}catch(e){errors.push({index:i,error:String(e.message||e)})}});
  return apiOk({created:created.length,orders:created,errors})}
function cancelOrder(id){const t=C.task(id);if(!t)return apiError(404,'not_found','Order not found.');
  C.update(()=>{t.state='cancelled';t.tags=(t.tags||[]).concat('CANCELLED')});
  emit('exception',{taskId:id,tracking:id,actor:'API',payload:{reason:'Cancelled by API'}});
  return apiOk({id,status:'cancelled'})}
function quoteOrder(body){
  const line=body.line||'pd';
  const pkg=+body.packages||1;
  const base={pd:8.5,bulky:28,wg:55,ltl:96,shuttle:140}[line]||12;
  const days={pd:[1,2],bulky:[2,4],wg:[3,6],ltl:[2,5],shuttle:[1,2]}[line]||[2,4];
  return apiOk({quotes:[{service:line,service_name:line.toUpperCase(),amount:Math.round((base+pkg*1.4)*100)/100,currency:'USD',min_days:days[0],max_days:days[1],note:'Sample rates for the pilot. Not a live tariff.'}]})}
function getTracking(id){const t=C.task(id)||(C.S.tasks||[]).find(x=>x.id===id||x.ref===id||(x.items||[]).some(p=>p.id===id));
  if(!t){const evs=eventsFor(id);if(!evs.length)return apiError(404,'not_found','No shipment with that tracking number or reference.');}
  const evs=eventsFor(t?t.id:id);
  const last=evs[evs.length-1];
  return apiOk({id:t?t.id:id,tracking_number:t?t.id:id,reference:t&&(t.ref||''),status:last?last.status:'created',last_event:last||null,events:evs,pod:t&&t.pod||null,eta:t&&t.window,tracking_url:trackUrl(t?t.id:id)})}
function trackUrl(id){return 'track.html?id='+encodeURIComponent(id||'')}

/* ---- webhooks ---- */
function addHook(o){const h={id:rid('wh'),url:o.url,secret:o.secret||('whsec_'+Math.random().toString(36).slice(2,14)),events:o.events||['*'],customer:o.customer||'',active:o.active!==false,failures:0,created:nowClock()};
  save(I=>I.hooks.push(h));return h}
function queueHooks(e){const hooks=desk().hooks.filter(h=>h.active&&(h.events.indexOf('*')>=0||h.events.indexOf(e.type)>=0));
  hooks.forEach(h=>deliverHook(h,e,1))}
function deliverHook(h,e,attempt){
  const signed=signPayload(h.secret,{id:e.id,type:e.type,status:e.status,created:e.atUtc,data:e});
  const rec={id:rid('dl'),hookId:h.id,eventId:e.id,url:h.url,at:nowClock(),attempt:attempt||1,status:0,ok:false,sig:signed.header,body:signed.payload,note:''};
  /* Pilot: deliveries are simulated in the browser. A real sender belongs on ChainEx's own servers. */
  const fail=/fail|down|timeout/i.test(h.url||'');
  rec.status=fail?500:200;rec.ok=!fail;rec.note=fail?'Simulated failure (URL contains fail/down/timeout).':'Simulated 200 in the pilot. A production webhook sender would POST this signed body to the URL.';
  save(I=>{I.log.push(rec);cap(I.log,150);const hook=I.hooks.find(x=>x.id===h.id);if(hook){if(rec.ok)hook.failures=0;else hook.failures=(hook.failures||0)+1}});
  if(!rec.ok&&(attempt||1)<6){/* backoff recorded only; next retry is manual or via retryFailed */}
  return rec}
function retryFailed(hookId){const I=desk();const failed=I.log.filter(l=>!l.ok&&(!hookId||l.hookId===hookId));
  const evs=I.events;let n=0;failed.slice(-20).forEach(l=>{const e=evs.find(x=>x.id===l.eventId);const h=I.hooks.find(x=>x.id===l.hookId);if(e&&h){deliverHook(h,e,(l.attempt||1)+1);n++}});return n}
function replay(hookId,fromIso){const I=desk();const h=I.hooks.find(x=>x.id===hookId);if(!h)return 0;
  const from=fromIso?Date.parse(fromIso):0;const evs=I.events.filter(e=>!from||Date.parse(e.atUtc)>=from);
  evs.forEach(e=>deliverHook(h,e,1));return evs.length}
function testFire(hookId,type){const h=desk().hooks.find(x=>x.id===hookId);if(!h)return null;
  const e=ev({type:type||'created',taskId:'TEST-EVT',tracking:'TEST-EVT',actor:'Developer portal',payload:{sample:true}});
  return deliverHook(h,e,1)}

/* ---- EDI samples ---- */
function edi214(id){const t=C.task(id)||{id:id||'PD-SEA-00',address:'Kent, WA',name:'Sample stop'};const evs=eventsFor(t.id);
  const lines=['ISA*00*          *00*          *02*CHAINEX        *01*CUSTOMER       *261113*1321*U*00401*000000001*0*P*>~',
    'GS*QM*CHAINEX*CUSTOMER*20261113*1321*1*X*004010~','ST*214*0001~','B10*'+t.id+'*'+t.id+'*CHAINEX~'];
  evs.forEach((e,i)=>{lines.push('LX*'+(i+1)+'~');lines.push('AT7*'+ (e.edi||'X4') +'*NS***'+ (e.atUtc||'').replace(/[-:TZ.]/g,'').slice(0,12) +'*LT~');if(e.ll)lines.push('MS1*'+e.ll[1].toFixed(4)+'*'+e.ll[0].toFixed(4)+'*US~')});
  lines.push('SE*'+(lines.length)+'*0001~','GE*1*1~','IEA*1*000000001~');
  return lines.join('\n')}
function edi210(id){const t=C.task(id)||{id:id||'PD-SEA-00',name:'Sample stop'};
  return ['ISA*00*          *00*          *02*CHAINEX        *01*CUSTOMER       *261113*1321*U*00401*000000002*0*P*>~',
    'GS*IM*CHAINEX*CUSTOMER*20261113*1321*2*X*004010~','ST*210*0001~','B3*B*INV-'+t.id+'*'+t.id+'*PP*C*20261113*12500**CHAINEX~',
    'N1*SH*ChainEx Global~','N1*CN*'+(t.name||'Consignee')+'~','LX*1~','L5*1*Final-mile delivery~','L0*1***1*PC~','L1*1*12500*FR*12500~',
    'SE*10*0001~','GE*1*2~','IEA*1*000000002~'].join('\n')}

/* ---- CSV mapping + validation ---- */
const COLS=['name','address','city','state','zip','lat','lng','packages','ref','window','line'];
function parseCsv(text){const lines=String(text||'').split(/\r?\n/).filter(l=>l.trim());if(!lines.length)return {headers:[],rows:[]};
  const split=l=>l.split(',').map(s=>s.trim().replace(/^"|"$/g,''));
  const h=split(lines[0]);const headerish=h.some(x=>/name|address|street|lat|lng|lon|zip|package|ref/i.test(x));
  const headers=headerish?h:h.map((_,i)=>'col'+(i+1));
  const rows=(headerish?lines.slice(1):lines).map(split);
  return {headers,rows,headerish}}
function guessMap(headers){const map={};headers.forEach((h,i)=>{const n=h.toLowerCase();
  if(/^(name|recipient|customer|consignee)$/.test(n))map.name=i;
  else if(/address|street/.test(n)&&map.address==null)map.address=i;
  else if(/^city$/.test(n))map.city=i;
  else if(/state|province/.test(n))map.state=i;
  else if(/zip|postal/.test(n))map.zip=i;
  else if(/^lat|latitude$/.test(n))map.lat=i;
  else if(/^(lng|lon|long|longitude)$/.test(n))map.lng=i;
  else if(/package|units|pcs|pieces/.test(n))map.packages=i;
  else if(/ref|reference|po\b|tracking/.test(n))map.ref=i;
  else if(/window|appointment|time/.test(n))map.window=i;
  else if(/^line|service|product$/.test(n))map.line=i;
  else if(map.name==null&&i===0)map.name=i;
  else if(map.address==null&&i===1)map.address=i});
  return map}
function validateRows(parsed,map){const issues=[];const out=[];
  parsed.rows.forEach((r,i)=>{
    const get=k=>map[k]!=null?r[map[k]]:undefined;
    const city=[get('address'),get('city'),get('state'),get('zip')].filter(Boolean).join(', ');
    const row={name:get('name')||'',address:city,lat:get('lat'),lng:get('lng'),packages:+get('packages')||1,ref:get('ref')||'',window:get('window')||'',line:get('line')||''};
    const errs=[];if(!row.name)errs.push('Missing name');if(!row.address)errs.push('Missing address');
    if(row.lat&&isNaN(+row.lat))errs.push('Latitude is not a number');if(row.lng&&isNaN(+row.lng))errs.push('Longitude is not a number');
    if((row.lat&&!row.lng)||(!row.lat&&row.lng))errs.push('Provide both latitude and longitude, or neither');
    if(errs.length)issues.push({row:i+1,errs,name:row.name});else out.push(row)});
  return {ok:issues.length===0,rows:out,issues,total:parsed.rows.length}}
function importMapped(rows,line){if(!window.CXO||!CXO.importCsv)return {taskIds:[]};
  const csv='name,address,lng,lat,packages\n'+rows.map(r=>[r.name,r.address,r.lng||'',r.lat||'',r.packages||1].map(x=>'"'+String(x).replace(/"/g,'')+'"').join(',')).join('\n');
  const m=CXO.importCsv(csv,line||'pd');
  (m&&m.taskIds||[]).forEach(id=>{const t=C.task(id);if(!t)return;emit('created',{taskId:id,tracking:id,ref:t.ref,hub:t.opHub,actor:'CSV import'});maybeGeocode(t)});
  return m}

/* ---- geocode ---- */
let geoQ=Promise.resolve();
function maybeGeocode(t){if(!t)return;if(t.ll&&t.ll[0]&&t.ll[1]&&!(t.tags||[]).includes('GEO_SAMPLE'))return;
  const addr=t.address;if(!addr)return;
  geocode(addr).then(res=>{
    C.update(()=>{const T=C.task(t.id);if(!T)return;
      T.ll=res.ll;T.geo=res;
      const tags=T.tags||(T.tags=[]);
      if(res.low||res.conf<0.45||res.source==='sample'){if(tags.indexOf('GEO_REVIEW')<0)tags.push('GEO_REVIEW')}
      else {T.tags=tags.filter(x=>x!=='GEO_REVIEW');if(tags.indexOf('GEO_OK')<0)tags.push('GEO_OK')}});
    try{if(window.__v5d&&__v5d.draw)__v5d.draw()}catch(e){}
  })}
function geocode(addr){
  const I=desk();const key=String(addr||'').toLowerCase().trim();
  if(!key)return Promise.resolve({ll:null,conf:0,source:'none',low:true});
  if(I.geoCache[key]&&(Date.now()-I.geoCache[key].at<7*86400000))return Promise.resolve(I.geoCache[key]);
  const fallback=()=>{const ll=(window.CXO&&CXO.llForAddress)?CXO.llForAddress(addr):(C.S.hubs&&C.S.hubs.SEA1&&C.S.hubs.SEA1.ll)||[-122.23,47.58];
    const rec={ll,conf:0.2,source:'sample',low:true,label:addr,at:Date.now()};
    save(I=>I.geoCache[key]=rec);return rec};
  geoQ=geoQ.then(()=>new Promise(r=>setTimeout(r,1100))).then(()=>fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(addr)+'&limit=1&lat=47.6&lon=-122.3',{headers:{Accept:'application/json'}}).then(res=>res.ok?res.json():Promise.reject()).then(j=>{
    const f=j.features&&j.features[0];if(!f||!f.geometry)throw new Error('no hit');
    const ll=f.geometry.coordinates;const rec={ll:[ll[0],ll[1]],conf:0.75,source:'photon',label:(f.properties&&(f.properties.name||f.properties.street))||addr,at:Date.now(),low:false};
    save(I=>I.geoCache[key]=rec);return rec}).catch(()=>fallback()));
  return geoQ}

/* ---- health ---- */
function health(){
  const I=desk();const hour=Date.now()-3600000;
  const recent=I.log.filter(l=>Date.parse(l.atUtc||'')||true);
  const failed=I.log.filter(l=>!l.ok).slice(-50);
  const failRate=I.log.length?Math.round(100*I.log.filter(l=>!l.ok).length/I.log.length):0;
  const tasks=C.S.tasks||[];
  const delivered=tasks.filter(t=>t.state==='completed');
  const gaps=delivered.filter(t=>{const evs=eventsFor(t.id);const hasArr=evs.some(e=>e.type==='arrived');const hasPod=evs.some(e=>e.type==='delivered')||t.pod;return !hasArr||!hasPod}).length;
  const silent=(C.S.drivers||[]).filter(d=>{if(!d.duty||(d.route&&d.route.stage!=='on_road'))return false;const g=I.gps[d.id];if(!g)return true;return (Date.now()-(g.atMs||0))>(I.settings.silentMin||20)*60000}).length;
  const lag=failed.length?'Check failed deliveries':(I.events.length?'Under 5 min (pilot, in-browser)':'No events yet');
  const tone=failed.length||gaps||silent?'warn':'ok';
  return {lag,failed:failed.length,failRate,gaps,silent,hooks:I.hooks.length,events:I.events.length,pending:I.outbox.length,tone,failedRows:failed.slice(-8)}}

/* ---- notifications ---- */
function addNote(n){const rec=Object.assign({id:rid('nt'),at:nowClock(),atMs:Date.now(),read:false},n);save(I=>{I.notify.push(rec);cap(I.notify,80)});
  try{if(Notification.permission==='granted')new Notification(n.title||'ChainEx',{body:n.body||'',tag:n.tag||rec.id})}catch(e){}
  return rec}
function notesFor(wid){return desk().notify.filter(n=>!n.wid||n.wid===wid)}
function markRead(id){save(I=>{const n=I.notify.find(x=>x.id===id);if(n)n.read=true})}
function requestPush(){if(!('Notification' in window))return Promise.resolve('unsupported');
  return Notification.requestPermission()}
function checkDriverNotes(d){
  if(!d)return;const I=desk();const th=I.settings;const now=Date.now();
  const last=I.gps[d.id];
  if(d.duty&&d.route&&d.route.stage==='on_road'&&last&&last.stillMin>=(th.idleMin||15)){
    if(!I.notify.some(n=>n.tag==='idle:'+d.id&&now-n.atMs<30*60000))
      addNote({wid:d.id,kind:'idle',tag:'idle:'+d.id,title:'Continue your route',body:'It has been '+(th.idleMin||15)+' minutes since you last moved, and you are not at a stop.'})}
  const opened=+(localStorage.getItem('cx.v06.lastOpen')||0);
  if(opened&&(now-opened)>(th.inactiveMin||30)*60000 && d.duty){
    if(!I.notify.some(n=>n.tag==='inactive:'+d.id&&now-n.atMs<30*60000))
      addNote({wid:d.id,kind:'inactive',tag:'inactive:'+d.id,title:'You have been away',body:'It has been '+(th.inactiveMin||30)+' minutes since this app was last opened. Open it to keep dispatch up to date.'})}
}

/* ---- outbox ---- */
function enqueueScan(job){const rec=Object.assign({id:rid('ob'),at:nowClock(),atMs:Date.now(),tries:0,status:'pending'},job);
  save(I=>I.outbox.push(rec));return rec}
function pendingCount(){return desk().outbox.filter(x=>x.status==='pending'||x.status==='retry').length}
function flushOutbox(){
  if(typeof navigator!=='undefined'&&navigator.onLine===false)return {flushed:0,pending:pendingCount()};
  let n=0;const jobs=desk().outbox.filter(x=>x.status==='pending'||x.status==='retry');
  jobs.forEach(job=>{
    try{
      emit(job.type,Object.assign({},job.extra||{},{taskId:job.taskId,tracking:job.taskId,idem:job.idem||job.id,actor:job.actor||'Driver',ll:job.ll,hub:job.hub}));
      save(I=>{const j=I.outbox.find(x=>x.id===job.id);if(j)j.status='sent'});
      n++}catch(e){save(I=>{const j=I.outbox.find(x=>x.id===job.id);if(j){j.status='retry';j.tries=(j.tries||0)+1;j.error=String(e.message||e)}})}
  });
  return {flushed:n,pending:pendingCount()}}

/* ---- GPS ---- */
function setGps(wid,fix){save(I=>{const prev=I.gps[wid]||{};const still=prev.ll&&fix.ll&&Math.hypot(prev.ll[0]-fix.ll[0],prev.ll[1]-fix.ll[1])<0.0003;
  I.gps[wid]={ll:fix.ll,acc:fix.acc,at:nowClock(),atMs:Date.now(),source:fix.source||'live',stillMin:still?(prev.stillMin||0)+((Date.now()-(prev.atMs||Date.now()))/60000):0}});
  const d=C.driver&&C.driver(wid);if(d){C.update(()=>{const D=C.driver(wid);if(!D)return;D.loc=fix.ll.slice();D.gpsSource=fix.source||'live';D.gpsAt=nowClock();D.gpsAcc=fix.acc})}}
function lastGps(wid){return desk().gps[wid]||null}

/* ---- terms ---- */
const PLACEHOLDER='PLACEHOLDER FOR LEGAL REVIEW. This is sample terms text for the V06 pilot only. It is not a contract, not legal advice, and must be rewritten by counsel before any real customer or partner is asked to accept it.';
function seedTerms(I){if(I.terms.current&&I.terms.current.driver)return;
  const body=PLACEHOLDER+'\n\nBy continuing you agree that: (1) the pilot uses sample data; (2) location may be shared while you are on duty; (3) platform, portal and driver-app features may change, and a new version of these terms will be shown for acceptance before you continue; (4) uploads, payouts and signatures in the pilot are simulated.';
  ['driver','dsp','carrier','shipper','warehouse'].forEach(k=>{
    I.terms.current[k]={ver:'1.0',at:nowClock(),title:'ChainEx '+k+' terms (sample)',body,changelog:'Initial sample terms for the pilot.'}});
}
function termsFor(kind){return desk().terms.current[kind]||null}
function needsTerms(kind,who){const cur=termsFor(kind);if(!cur||!who)return cur;
  const ok=desk().accept.some(a=>a.who===who&&a.kind===kind&&a.ver===cur.ver);return ok?null:cur}
function acceptTerms(kind,who,name){const cur=termsFor(kind);if(!cur||!who)return;
  save(I=>{I.accept.push({who,name:name||who,kind,ver:cur.ver,at:nowClock(),atUtc:new Date().toISOString()});
    cap(I.accept,400)});
  try{C.S.audit=C.S.audit||[];C.S.audit.unshift({at:nowClock(),actor:name||who,action:'Accepted terms',target:kind+' v'+cur.ver,detail:'Version '+cur.ver,area:'terms'})}catch(e){}}
function publishTerms(kind,ver,changelog,body){save(I=>{const prev=I.terms.current[kind];if(prev)I.terms.history.push(prev);
  I.terms.current[kind]={ver,at:nowClock(),title:'ChainEx '+kind+' terms (sample)',body:body||(prev&&prev.body)||PLACEHOLDER,changelog:changelog||'Updated terms. PLACEHOLDER FOR LEGAL REVIEW.'};});
  try{C.S.audit=C.S.audit||[];C.S.audit.unshift({at:nowClock(),actor:(window.CXS&&CXS.staff&&CXS.staff().name)||'Admin',action:'Published terms',target:kind+' v'+ver,detail:changelog||'',area:'terms'})}catch(e){}}
function termsKindFromAccount(a){if(!a)return null;if(a.kind==='staff')return null;
  return {driver:'driver',dsp:'dsp',carrier:'carrier',shipper:'shipper',warehouse:'warehouse'}[a.kind]||null}

/* ---- on-demand sample offers (notifications only; not a full matching system) ---- */
function seedOnDemand(I){if(I.ondemand.length)return;
  I.ondemand.push({id:'OD-1042',customer:'Summit Parcel Network (sample)',stops:6,packages:11,window:'2:00 PM–6:00 PM',hub:'sea',status:'offered',note:'Same-day offer. Accept or decline from the driver notification center.'})}
function offerOnDemand(wid){const od=desk().ondemand.find(x=>x.status==='offered');if(!od||!wid)return;
  if(desk().notify.some(n=>n.tag==='od:'+od.id&&n.wid===wid))return;
  addNote({wid,kind:'ondemand',tag:'od:'+od.id,title:'On-demand order offer',body:od.customer+' · '+od.stops+' stops · '+od.window,offerId:od.id,actions:['accept','decline']})}

/* ---- seed ---- */
function seedInteg(){
  if(!C.S)return false;
  save(I=>{
    seedKeys(I);seedTerms(I);seedOnDemand(I);
    if(!I.hooks.length)I.hooks.push({id:'wh_demo',url:'https://hooks.example.com/chainex',secret:'whsec_demo_summit',events:['*'],customer:'SPN-PNW',active:true,failures:0,created:nowClock()});
    if(!I.hooks.some(h=>/fail/.test(h.url)))I.hooks.push({id:'wh_fail',url:'https://hooks.example.com/fail',secret:'whsec_demo_fail',events:['*'],customer:'HPL-SEA',active:true,failures:2,created:nowClock()});
    if(!(C.v2||C.portal)||I.seeded)return;
    const done=(C.S.tasks||[]).filter(t=>t.state==='completed'||t.state==='failed').slice(0,18);
    done.forEach((t,i)=>{
      const add=(type,payload)=>{I.events.push(ev({type,taskId:t.id,tracking:t.id,hub:t.opHub||'sea',ll:t.ll,actor:'Seed',payload:payload||{}}))};
      add('created');add('received');add('loaded');add('out_for_delivery');add('arrived');
      if(t.state==='completed')add('delivered',{pod:!!t.pod});else add('attempted',{reason:t.failReason||'Exception'});
      if(i===3)add('returned');if(i===4)add('closed_out');
    });
    cap(I.events,250);
    I.seeded=1});
    try{const I=desk();const e=I.events[I.events.length-1];if(e&&I.hooks[1])deliverHook(I.hooks[1],e,1);if(e&&I.hooks[0])deliverHook(I.hooks[0],e,1)}catch(e){}
  return true}


function showTermsOverlay(kind,who,name,onOk){
  const cur=needsTerms(kind,who);if(!cur){onOk&&onOk();return false}
  if(document.getElementById('cxi-terms'))return true;
  const el=document.createElement('div');el.id='cxi-terms';el.className='cxi-terms';
  el.innerHTML=`<div class="cxi-terms-c"><div class="chip warn">Placeholder for legal review</div>
    <h2>${esc(cur.title)} · v${esc(cur.ver)}</h2>
    <p class="small t2">A new version is in effect. You need to accept it before continuing. This text is a placeholder and is not a real contract.</p>
    ${cur.changelog?`<div class="card pad small"><b>What changed</b><br>${esc(cur.changelog)}</div>`:''}
    <pre class="cxi-terms-body">${esc(cur.body)}</pre>
    <label class="small"><input type="checkbox" id="cxi-ta"> I have read this placeholder and accept it for the pilot only.</label>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" id="cxi-ok" disabled>Accept and continue</button></div></div>`;
  document.body.appendChild(el);
  el.querySelector('#cxi-ta').onchange=e=>{el.querySelector('#cxi-ok').disabled=!e.target.checked};
  el.querySelector('#cxi-ok').onclick=()=>{acceptTerms(kind,who,name);el.remove();onOk&&onOk()};
  return true}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

function guardTerms(){
  const a=window.CXS&&CXS.get&&CXS.get();if(!a)return;
  const kind=termsKindFromAccount(a);if(!kind)return;
  const page=(location.pathname.split('/').pop()||'');
  if(/signin/.test(page))return; /* sign-in page handles this itself */
  showTermsOverlay(kind,a.id||a.email,a.name)}

try{if(!seedInteg()){const once=()=>{try{seedInteg()}catch(x){console.warn('integ6 seed',x)}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',once);else once()}}catch(e){console.warn('integ6 seed',e)}
try{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',guardTerms);else guardTerms()}catch(e){}
try{window.addEventListener('online',()=>{try{flushOutbox()}catch(x){}})}catch(e){}
try{
  if(!localStorage.getItem('cx.v06.lastOpen')) localStorage.setItem('cx.v06.lastOpen',String(Date.now()));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){try{localStorage.setItem('cx.v06.lastOpen',String(Date.now()))}catch(e){}}
    if(document.visibilityState==='visible'){try{const d=window.CX&&CX.S&&(CX.S.drivers||[]).find(x=>x.duty);if(d)checkDriverNotes(d);localStorage.setItem('cx.v06.lastOpen',String(Date.now()))}catch(e){}}
  });
}catch(e){}


function answerOnDemand(noteId,action){
  const n=desk().notify.find(x=>x.id===noteId);if(!n)return null;
  markRead(noteId);
  const act=action==='decline'?'declined':'accepted';
  save(I=>{const od=I.ondemand.find(x=>x.id===n.offerId);if(od)od.status=act;const nn=I.notify.find(x=>x.id===noteId);if(nn)nn.offerStatus=act});
  addNote({wid:n.wid,kind:'ondemand',tag:'odans:'+n.offerId,title:act==='accepted'?'On-demand offer accepted':'On-demand offer declined',body:n.body||''});
  return act}

window.CXI={TYPES,desk,emit,ev,eventsFor,lastStatus,signPayload,hmacSha256,
  request,createKey,revokeKey,findKey,addHook,deliverHook,retryFailed,replay,testFire,
  edi214,edi210,parseCsv,guessMap,validateRows,importMapped,COLS,maybeGeocode,geocode,
  health,addNote,notesFor,markRead,requestPush,checkDriverNotes,offerOnDemand,answerOnDemand,
  enqueueScan,pendingCount,flushOutbox,setGps,lastGps,
  termsFor,needsTerms,acceptTerms,publishTerms,showTermsOverlay,termsKindFromAccount,PLACEHOLDER,
  trackUrl,seedInteg,notes:notesFor,markNote:markRead,askPush:requestPush};
})();
