(()=>{
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const response=await originalFetch(input,init);
    if(!/content\/vocabulario\.json(?:\?|$)/.test(url)||!response.ok)return response;
    try{
      const base=await response.clone().json();
      const extraResponse=await originalFetch('content/vocab-extra-v18.json',{cache:'no-store'});
      if(!extraResponse.ok)return response;
      const extra=await extraResponse.json();
      const map=new Map();
      [...base,...extra].forEach(item=>map.set(Number(item.n),item));
      const merged=[...map.values()].sort((a,b)=>Number(a.n)-Number(b.n));
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers});
    }catch(err){
      console.error('Alef v2.0: não foi possível mesclar o vocabulário adicional.',err);
      return response;
    }
  };

  function injectV2(){
    const grid=document.querySelector('#home .grid');
    if(grid&&!document.querySelector('.course-v2-home')){
      const card=document.createElement('article');
      card.className='card action-card course-v2-home';
      card.innerHTML='<div class="ico">📖</div><h2>Curso Completo</h2><p>Hebraico do zero ao texto bíblico: 31 lições, progresso, laboratório e revisão inteligente.</p><a class="btn gold" href="course.html">Abrir curso v2.2</a>';
      grid.prepend(card);
    }
    const hero=document.querySelector('#home .hero p');
    if(hero)hero.textContent='O Alef agora é um Laboratório Completo de Hebraico Bíblico: curso progressivo, vocabulário, morfologia, verbos, preparação para provas, duelos e análise.';
    const auth=document.querySelector('#authView .kicker');if(auth)auth.textContent='Laboratório de Hebraico Bíblico';
    const brand=document.querySelector('.brand span');if(brand&&!brand.dataset.v2){brand.dataset.v2='1';brand.textContent='Laboratório de Hebraico Bíblico'}
  }

  function deepLink(){
    const go=new URLSearchParams(location.search).get('go');if(!go)return;
    let tries=0;const timer=setInterval(()=>{tries++;const app=document.querySelector('#appView');const b=document.querySelector(`[data-go="${CSS.escape(go)}"]`);if(app&&!app.classList.contains('hidden')&&b){b.click();clearInterval(timer);history.replaceState({},'',location.pathname)}if(tries>80)clearInterval(timer)},150);
  }
  document.addEventListener('DOMContentLoaded',()=>{injectV2();deepLink()});
})();
