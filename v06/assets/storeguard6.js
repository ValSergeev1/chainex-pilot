/* ChainEx V06 · storage guard. All pilot versions share one browser origin (valsergeev1.github.io), so the V01, V02 and V03/V06 sample
   states together sit close to the ~5 MB localStorage limit on iPhone Safari. When a save hits the limit, the shared store fails silently
   and the next screen reloads the old state, so taps like "Go on duty" appear to do nothing. This guard catches the quota error on the
   shared V03/V06 key, trims history the apps can live without, and if still full drops the older V01/V02 sample states (they rebuild
   fresh the next time those versions open). Load before store.js. */
(function(){
const KEY='chainex.pilot.v03',OLD=['chainex.pilot.v02','chainex.pilot.v6'];
let P;try{P=Storage.prototype}catch(e){return}const orig=P.setItem;
const isQ=e=>!!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014);
function slim(v){try{const S=JSON.parse(v);const cut=(k,n,fromEnd)=>{if(Array.isArray(S[k])&&S[k].length>n)S[k]=fromEnd?S[k].slice(-n):S[k].slice(0,n)};
  cut('audit',300);cut('activity',80);cut('events',300,true);cut('ledger',400,true);
  (S.tasks||[]).forEach(t=>{if(Array.isArray(t.timeline)&&t.timeline.length>12)t.timeline=t.timeline.slice(-12);(t.items||[]).forEach(p=>{if(Array.isArray(p.events)&&p.events.length>10)p.events=p.events.slice(-10)})});
  return JSON.stringify(S)}catch(e){return v}}
const st={trimmed:0,dropped:[],failed:0};window.CXStorageGuard=st;
P.setItem=function(k,v){try{return orig.call(this,k,v)}catch(e){
  let ls=null;try{ls=window.localStorage}catch(x){}
  if(this!==ls||!isQ(e))throw e;
  if(k===KEY){v=slim(v);st.trimmed++;try{return orig.call(this,k,v)}catch(e2){if(!isQ(e2))throw e2}}
  OLD.forEach(o=>{if(o!==k&&ls.getItem(o)!=null){ls.removeItem(o);st.dropped.push(o)}});
  try{return orig.call(this,k,v)}catch(e3){st.failed++;try{dispatchEvent(new CustomEvent('cx-storage-full',{detail:k}))}catch(x){}throw e3}}};
})();
