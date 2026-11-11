const CACHE='alef-v3.2.3-ajuste-visual';
const CORE=[
 './alfabeto-cards.html','./alfabeto-v323.js?v=323','./alfabeto-v323.css?v=323',
 './fundamentos-game.html','./fundamentos-v323.js?v=323','./fundamentos-v323.css?v=323'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async url=>{try{const r=await fetch(url,{cache:'reload'});if(r.ok)await cache.put(url,r.clone())}catch(_){}}));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;const u=new URL(event.request.url);if(u.origin!==location.origin)return;
 event.respondWith((async()=>{try{const r=await fetch(event.request,{cache:'no-store'});if(r.ok){const c=await caches.open(CACHE);c.put(event.request,r.clone()).catch(()=>{})}return r}catch(_){return(await caches.match(event.request))||(await caches.match('./index.html'))}})());
});