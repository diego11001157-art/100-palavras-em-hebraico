const CACHE='alef-v1.5.2-battle-modes';
const STATIC=[
  './','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest',
  './icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png',
  './content/core.json','./content/morphology.json','./content/kelley.json','./content/vocabulario.json','./content/version.json'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  const isFresh=url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')||url.pathname.includes('/content/')||url.pathname.endsWith('/app.js')||url.pathname.endsWith('/styles.css');
  if(isFresh){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp})));
  }
});
