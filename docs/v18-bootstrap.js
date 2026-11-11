(()=>{
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const response=await originalFetch(input,init);
    if(!/content\/vocabulario\.json(?:\?|$)/.test(url)||!response.ok)return response;
    try{
      const base=await response.clone().json();
      const sources=['content/vocab-extra-v18.json','content/vocab-extra-v30.json'];
      const extras=[];
      for(const src of sources){
        try{
          const r=await originalFetch(src,{cache:'no-store'});
          if(r.ok) extras.push(...await r.json());
        }catch(_){}
      }
      const map=new Map();
      [...base,...extras].forEach(item=>map.set(Number(item.n),item));
      const merged=[...map.values()].sort((a,b)=>Number(a.n)-Number(b.n));
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers});
    }catch(err){
      console.error('Alef v3.0: não foi possível mesclar o vocabulário adicional.',err);
      return response;
    }
  };

  function loadShell(){
    if(document.querySelector('script[data-alef-v3-shell]')) return;
    const css=document.createElement('link');
    css.rel='stylesheet'; css.href='semester-shell.css'; css.dataset.alefV3Shell='1';
    document.head.appendChild(css);
    const s=document.createElement('script');
    s.src='semester-shell.js'; s.defer=true; s.dataset.alefV3Shell='1';
    document.body.appendChild(s);
  }

  function brandV3(){
    const auth=document.querySelector('#authView .kicker');
    if(auth) auth.textContent='Hebraico Bíblico I & II';
    const brand=document.querySelector('.brand span');
    if(brand) brand.textContent='Jornada Hebraico Bíblico';
  }

  function deepLink(){
    const go=new URLSearchParams(location.search).get('go');if(!go)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const app=document.querySelector('#appView');
      const b=document.querySelector(`[data-go="${CSS.escape(go)}"]`);
      if(app&&!app.classList.contains('hidden')&&b){
        b.click(); clearInterval(timer);
        history.replaceState({},'',location.pathname);
      }
      if(tries>100) clearInterval(timer);
    },150);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    brandV3(); loadShell(); deepLink();
  });
})();