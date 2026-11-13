/* ChainEx V03 service worker: installable driver + dispatch apps, offline app shell, map-tile cache.
   Scope = the folder this file lives in (works at / and at the GitHub Pages subpath /chainex-pilot/).
   Frozen copies under v01/ and v02/ are left alone (network only). */
const VER='cx-v03-2026-11-12g';
const SHELL='shell-'+VER, TILES='tiles-v1', TILE_MAX=1500;
const SCOPE=new URL('./',self.location).href;
const A=p=>new URL(p,SCOPE).href;
const PRE=['driver.html','board.html','start.html','driver.webmanifest','board.webmanifest','offline.html',
 'assets/vendor/maplibre-gl.css','assets/vendor/maplibre-gl.js','assets/brand.css','assets/theme.css','assets/driver.css','assets/drv3.css','assets/v03.css','assets/board3.css','assets/rwd.css','assets/rwd.js',
 'assets/cx-ui.js','assets/pwa.js','assets/store.js','assets/geo.js','assets/lines/pd.js','assets/lines/bulky.js','assets/lines/wg.js','assets/lines/ltl.js','assets/lines/shuttle.js',
 'assets/partners.js','assets/fieldops.js','assets/session.js','assets/v02.js','assets/dlink.js','assets/map.js','assets/nav.js','assets/drv3.js','assets/driver.js','assets/driver-chat.js','assets/board3.js',
 'assets/pwa/driver-192.png','assets/pwa/driver-512.png','assets/pwa/driver-apple-180.png','assets/pwa/board-192.png','assets/pwa/board-512.png','portal-warehouse.html','wh-supervisor.html','warehouse.webmanifest','assets/whp.css','assets/whp.js','assets/whp-data.js','assets/portal-self.js','assets/pwa/warehouse-192.png','dsp-fleet.html','dsp.webmanifest','assets/dspf.css','assets/dspf.js','assets/pwa/dsp-192.png'].map(A);
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.all(PRE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>null)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting();if(e.data==='version'&&e.source)e.source.postMessage({sw:VER})});
async function trimTiles(){const c=await caches.open(TILES);const ks=await c.keys();if(ks.length>TILE_MAX)for(const k of ks.slice(0,ks.length-TILE_MAX))await c.delete(k)}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 // map tiles, style, glyphs, sprites: cache-first, fill from network, keep last 1500
 if(u.hostname==='tiles.openfreemap.org'){e.respondWith(caches.open(TILES).then(async c=>{const hit=await c.match(r);const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){c.put(r,res.clone());trimTiles()}return res}).catch(()=>null);
   if(hit){e.waitUntil(net);return hit}const res=await net;return res||new Response('',{status:504,statusText:'offline'})}));return}
 if(!r.url.startsWith(SCOPE))return;                      // routing API etc: network only
 const rel=r.url.slice(SCOPE.length);if(/^v0[12]\//.test(rel))return; // frozen versions untouched
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(SHELL).then(c=>c.put(r.url.split('?')[0],cp))}return res}).catch(async()=>(await caches.match(r,{ignoreSearch:true}))||(await caches.match(A('offline.html')))));return}
 // app assets: stale-while-revalidate
 e.respondWith(caches.open(SHELL).then(async c=>{const hit=await c.match(r,{ignoreSearch:true});const net=fetch(r).then(res=>{if(res&&res.ok)c.put(r,res.clone());return res}).catch(()=>null);if(hit){e.waitUntil(net);return hit}return (await net)||new Response('',{status:504})}));
});
