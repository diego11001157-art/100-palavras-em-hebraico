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
      console.error('Alef v1.8: não foi possível mesclar o vocabulário adicional.',err);
      return response;
    }
  };
})();
