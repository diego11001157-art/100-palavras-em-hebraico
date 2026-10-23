const CACHE='alef-v2.0.0-laboratorio-completo';
const STATIC=[
  './','./index.html','./styles.css','./app.js','./simulado.js','./v18-bootstrap.js','./p2.html','./p2.js','./course.html','./course.js','./course.css','./config.js','./manifest.webmanifest',
  './icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png',
  './content/core.json','./content/morphology.json','./content/kelley.json','./content/vocabulario.json','./content/vocab-extra-v18.json','./content/course-v2.json','./content/version.json','./content/week.json'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);if(url.origin!==location.origin)return;
  const isFresh=url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')||url.pathname.includes('/content/')||/\/(app|simulado|v18-bootstrap|p2|course)\.js$/.test(url.pathname)||/\/(styles|course)\.css$/.test(url.pathname)||url.pathname.endsWith('/p2.html')||url.pathname.endsWith('/course.html');
  if(isFresh){e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))}
  else{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp})))}
});
