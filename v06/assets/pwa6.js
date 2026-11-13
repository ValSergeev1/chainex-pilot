/* Installable Dispatch + Control tower: register the V06 network-first service worker (same one the driver app uses). */
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});
