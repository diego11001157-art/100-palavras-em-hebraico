(()=>{
'use strict';
const EXTRA_86_95=[{"n": 86, "h": "אוֹ", "p": "ou", "occurrences": 321, "example": "Gn 24:49, 55", "analysis": "Conjunção = ‘ou’. Fonte: Vocabulário 8 (18).", "release": "vocab-18"}, {"n": 87, "h": "אֵלֶּה", "p": "estes, estas", "occurrences": 320, "example": "Gn 2:4; 6:9", "analysis": "Pronome demonstrativo plural = ‘estes, estas’. Fonte: Vocabulário 8 (18).", "release": "vocab-18"}, {"n": 88, "h": "הַהוּא", "p": "aquele, aquela; naquele, naquela", "occurrences": 314, "example": "Gn 15:18; 19:35; 21:32", "analysis": "Artigo + pronome independente 3ms; o material observa que geralmente é traduzido como aquele(a) / naquele(a).", "release": "vocab-18"}, {"n": 89, "h": "זֶה", "p": "este", "occurrences": 314, "example": "Gn 5:1, 29; 15:4", "analysis": "Pronome demonstrativo masculino singular = ‘este’. Fonte: Vocabulário 8 (18).", "release": "vocab-18"}, {"n": 90, "h": "הָעִיר", "p": "a cidade", "occurrences": 312, "example": "Gn 4:17; 10:12", "analysis": "Artigo + substantivo feminino singular absoluto = ‘a cidade’. Fonte: Vocabulário 8 (18).", "release": "vocab-18"}, {"n": 91, "h": "מֵאוֹת", "p": "cem, centenas", "occurrences": 302, "example": "Êx 12:37, 40, 41; 2Cr 17:11", "analysis": "Numeral cardinal feminino plural construto: cem / centenas. Fonte: Vocabulário 9 (19).", "release": "vocab-19"}, {"n": 92, "h": "וַיֹּאמְרוּ", "p": "então disseram eles, e disseram eles", "occurrences": 301, "example": "Gn 11:3; 18:5", "analysis": "Qal - Wayyiqtol (imperfeito com Waw consecutivo), 3ª pessoa masculina plural, do verbo dizer. Fonte: Vocabulário 9 (19).", "release": "vocab-19"}, {"n": 93, "h": "אֶתְכֶם", "p": "para vós", "occurrences": 297, "example": "Gn 47:23; 48:21", "analysis": "I.O.D. + sufixo pronominal 2ª pessoa masculina plural = ‘para vós’, conforme o material enviado. Fonte: Vocabulário 9 (19).", "release": "vocab-19"}, {"n": 94, "h": "אָנֹכִי", "p": "eu", "occurrences": 293, "example": "Gn 3:10; 4:9; 7:4", "analysis": "Pronome independente 1ª pessoa comum singular = ‘eu’. Fonte: Vocabulário 9 (19).", "release": "vocab-19"}, {"n": 95, "h": "מְאֹד", "p": "muito", "occurrences": 291, "example": "Gn 1:31; 4:5", "analysis": "Partícula adverbial = ‘muito’. Fonte: Vocabulário 9 (19).", "release": "vocab-19"}];
const EXTRA_96_100=[{"n": 96, "h": "טוֹב", "p": "bom, agradável", "occurrences": 290, "example": "Gn 1:4, 10", "analysis": "Adjetivo masculino singular absoluto = “bom”, “agradável”. Fonte: Vocabulário 10 (20).", "release": "vocab-20"}, {"n": 97, "h": "מִצְרַיִם", "p": "Egito, Mizraim", "occurrences": 289, "example": "Gn 10:6; 21:21; 25:18", "analysis": "Substantivo próprio = “Egito”, “Mizraim”. Fonte: Vocabulário 10 (20).", "release": "vocab-20"}, {"n": 98, "h": "אֹתָם", "p": "a eles", "occurrences": 284, "example": "Gn 35:4; Nm 31:6 (2x)", "analysis": "I.O.D. + sufixo pronominal 3ª pessoa masculina plural = “a eles”, conforme o material enviado. Fonte: Vocabulário 10 (20).", "release": "vocab-20"}, {"n": 99, "h": "צְבָאוֹת", "p": "exércitos", "occurrences": 283, "example": "2Sm 5:10; 6:2, 18", "analysis": "Substantivo comum plural absoluto = “exércitos”. Fonte: Vocabulário 10 (20).", "release": "vocab-20"}, {"n": 100, "h": "וְאִם", "p": "e se", "occurrences": 279, "example": "Gn 4:7; 13:9", "analysis": "Waw conjuntivo + conjunção “se” = “e se”. Fonte: Vocabulário 10 (20).", "release": "vocab-20"}];
const VERSION={"appVersion": "3.2.0", "contentVersion": "2026-11-11-vocab100-semestre-interativo-v32", "wordsAvailable": 100, "targetWords": 100, "weeklyBlockSize": 5, "firstSemesterVocabStart": "2027-02-01", "message": "Alef v3.2: banco íntegro com 100 palavras, vocabulário em blocos de 5 e 1º semestre com opções internas de estudo."};
const originalFetch=window.fetch.bind(window);

window.fetch=async function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  const response=await originalFetch(input,init);
  if(/content\/vocabulario\.json(?:\?|$)/.test(url)&&response.ok){
    try{
      const base=await response.clone().json();
      const map=new Map();
      [...base,...EXTRA_86_95,...EXTRA_96_100].forEach(x=>map.set(Number(x.n),x));
      const merged=[...map.values()].sort((a,b)=>a.n-b.n);
      return new Response(JSON.stringify(merged),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }catch(e){console.error('ALEF v3.2 vocab merge',e)}
  }
  if(/content\/version\.json(?:\?|$)/.test(url)){
    return new Response(JSON.stringify(VERSION),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
  return response;
};

function loadAsset(tag,attrs){
 const el=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='text')el.textContent=v;else el[k]=v});document.head.appendChild(el);return el;
}
function setup(){
 const a=document.querySelector('#authView .kicker');if(a)a.textContent='Hebraico Bíblico I & II';
 const b=document.querySelector('.brand span');if(b)b.textContent='Jornada Hebraico Bíblico';
 if(!document.querySelector('link[data-v32]')){const c=document.createElement('link');c.rel='stylesheet';c.href='semester-shell.css';c.dataset.v32='1';document.head.appendChild(c)}
 if(!document.querySelector('script[data-v32-shell]')){const s=document.createElement('script');s.src='semester-shell.js';s.dataset.v32Shell='1';document.body.appendChild(s)}
 if(!document.querySelector('script[data-v32-vocab]')){const s=document.createElement('script');s.src='vocab-groups-v32.js';s.dataset.v32Vocab='1';document.body.appendChild(s)}
 const go=new URLSearchParams(location.search).get('go');
 if(go){let n=0;const t=setInterval(()=>{n++;const app=document.querySelector('#appView'),btn=document.querySelector(`[data-go="${CSS.escape(go)}"]`);if(app&&!app.classList.contains('hidden')&&btn){btn.click();clearInterval(t);history.replaceState({},'',location.pathname)}if(n>120)clearInterval(t)},120)}
}
document.addEventListener('DOMContentLoaded',setup);
})();