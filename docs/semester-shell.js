(()=>{
'use strict';
function patchGroups(){
  if(window.__alefV31Groups||typeof window.groupDefinitions!=='function')return;
  window.__alefV31Groups=true;
  window.groupDefinitions=function(){
    const g=[];for(let s=1;s<=100;s+=5)g.push({key:`${s}-${s+4}`,label:`${s}–${s+4}`,start:s,end:s+4,future:false});
    g.push({key:'new',label:'✨ Novas',special:true},{key:'errors',label:'❌ Erros',special:true},{key:'all',label:'Todas',special:true});return g;
  };
  try{if(typeof window.renderVocabGroups==='function')window.renderVocabGroups()}catch(_){}
}
function injectHome(){
  const home=document.querySelector('#home'),old=home?.querySelector('.grid');if(!home||!old||document.querySelector('#v31Home'))return;
  old.id='legacyHomeGrid';old.style.display='none';const hero=home.querySelector('.hero');if(hero)hero.style.display='none';const metric=home.querySelector('.metric');if(metric)metric.style.display='none';
  const w=document.createElement('div');w.id='v31Home';w.className='v3-home';w.innerHTML=`
  <section class="v3-welcome"><div class="eyebrow">ALEF v3.1 • HEBRAICO I & II</div><h1>Do Alef à leitura do texto bíblico</h1><p>Novos ingressantes começam pelo 1º semestre; veteranos podem revisar livremente.</p></section>
  <section class="v3-100"><b>100/100</b><div><strong>Vocabulário completo</strong><br><small>O bloco 96–100 está no arquivo principal.</small></div></section>
  <section class="v3-semesters"><a class="v3-sem-card sem1" href="semestre1.html"><div class="v3-sem-icon">🌱</div><h2>1º Semestre</h2><p>Alfabeto, vogais, sílaba, artigo, preposições, nominais, pronomes e introdução aos verbos.</p><div class="v3-chips"><span class="v3-chip">Palavras 1–50</span><span class="v3-chip">5 por semana</span><span class="v3-chip">Kelley I–XI</span></div><span class="v3-open">Começar →</span></a><a class="v3-sem-card sem2" href="semestre2.html"><div class="v3-sem-icon">📜</div><h2>2º Semestre</h2><p>BHS, Qal, troncos, morfologia, tradução e Kelley XII–XXI.</p><div class="v3-chips"><span class="v3-chip">Palavras 51–100</span><span class="v3-chip">Morfologia</span><span class="v3-chip">Verbos</span></div><span class="v3-open">Continuar →</span></a></section>
  <div class="v3-access-title"><div><h2>Acesso rápido</h2><p>Assuntos organizados em caixas simples.</p></div></div>
  <section class="v3-access-grid"><a class="v3-box" href="alfabeto-cards.html"><span class="ico">א</span><strong>22 letras</strong><small>Cards, flashcards e reconhecimento.</small></a><a class="v3-box" href="fundamentos-game.html"><span class="ico">🎮</span><strong>Fundamentos</strong><small>Vogais, sheva, daguesh, guturais e artigo.</small></a><a class="v3-box" href="index.html?go=vocab"><span class="ico">📚</span><strong>100 palavras</strong><small>Blocos de 5.</small></a><a class="v3-box" href="course.html"><span class="ico">📖</span><strong>Curso</strong><small>Trilha completa.</small></a></section>`;
  home.insertBefore(w,old);
}
document.addEventListener('DOMContentLoaded',()=>{let n=0;const t=setInterval(()=>{n++;patchGroups();injectHome();if(n>100)clearInterval(t)},100)});
})();