/* ChainEx V06 service worker · scope v06/ · network-first (bypassing the HTTP cache) for every same-origin GET so pages, scripts and data
   always come from the same deploy; cache fallback only when offline so the driver app still opens on weak signal. */
const V='cx-v06-10',SHELL=['driver.html','assets/v06.css','assets/driver6.css','assets/v06.js','assets/driver6.js','assets/testtools6.js','assets/scanner6.js','assets/loadout6.js','assets/delivery6.js','../assets/vendor/zxing/zxing.min.js','assets/integ6.js','assets/integ6.css','assets/storeguard6.js','assets/v06-seed.js','driver.webmanifest','assets/icons/driver-192.png','../assets/store.js','../assets/geo.js','../assets/lines/pd.js','../assets/lines/bulky.js','../assets/lines/wg.js','../assets/lines/ltl.js','../assets/lines/shuttle.js','../assets/session.js','../assets/partners.js','../assets/fieldops.js','../assets/v02.js','../assets/dlink.js','../assets/whp-data.js','../assets/nav.js','../assets/vendor/maplibre-gl.js','../assets/vendor/maplibre-gl.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('cx-v06-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(fetch(u.href,{cache:'no-cache',credentials:'same-origin'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{})}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('driver.html'):Response.error()))))});
self.addEventListener('push',e=>{
  let d={title:'ChainEx',body:'You have an update.',data:{}};
  try{if(e.data)d=Object.assign(d,e.data.json())}catch(x){try{d.body=e.data.text()}catch(y){}}
  e.waitUntil(self.registration.showNotification(d.title||'ChainEx',{body:d.body||'',data:d.data||{},icon:'assets/icons/driver-192.png'}));
});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'driver.html';e.waitUntil(clients.openWindow(u))});
/* Real push to a closed app needs a ChainEx push server and a VAPID key. This handler is the client side of that contract. */
