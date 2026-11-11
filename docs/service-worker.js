const CACHE='alef-v3.2.0-vocab100-semestre-interativo';
const STATIC=[
 './','./index.html','./styles.css','./app.js','./simulado.js','./v18-bootstrap.js','./vocab-groups-v32.js',
 './semester-shell.js','./semester-shell.css','./semestre1.html','./semestre2.html','./semester.js','./semester.css',
 './alfabeto-cards.html','./alfabeto-cards.js','./alfabeto-cards.css',
 './fundamentos-game.html','./fundamentos-game.js','./fundamentos-game.css',
 './course.html','./course.js','./course.css','./p2.html','./p2.js','./config.js','./manifest.webmanifest',
 './icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png',
 './content/core.json','./content/morphology.json','./content/kelley.json','./content/vocabulario.json',
 './content/vocab-extra-v18.json','./content/vocab-extra-v30.json','./content/version.json',
 './content/semester1.json','./content/semester2.json','./content/alphabet.json','./content/alphabet-v3.json','./content/vowels.json'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin)return;const fresh=u.pathname.endsWith('/')||u.pathname.includes('/content/')||/\.(html|js|css|json)$/.test(u.pathname);if(fresh)e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))})