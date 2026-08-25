const CACHE_NAME="alef-v1-2";
const CORE=["./","./index.html","./dados.js","./config.js","./manifest.webmanifest","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 if(e.request.mode==="navigate"){
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put("./index.html",c));return r}).catch(()=>caches.match("./index.html")));
  return;
 }
 e.respondWith(fetch(e.request).then(r=>{if(e.request.url.startsWith(self.location.origin)){const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));
});