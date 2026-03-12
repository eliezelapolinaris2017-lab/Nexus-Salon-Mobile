const CACHE_NAME='nexus-salon-v5';
const APP_SHELL=['./','./index.html','./styles.css','./app.js','./firebase-config.js','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const clone=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));return r;}).catch(()=>caches.match('./index.html'))));});
