(()=>{
'use strict';
const $=s=>document.querySelector(s);
function proxyGo(target){
  const legacy=document.querySelector(`#legacyHomeGrid [data-go="${target}"]`)||document.querySelector(`.bottom [data-go="${target}"]`);
  if(legacy){legacy.click();return}
  location.href=`index.html?go=${encodeURIComponent(target)}`;
}
function weekStatus(){
  const start=new Date('2027-02-01T00:00:00');
  const now=new Date();
  const d=Math.floor((now-start)/86400000);
  if(d<0)return {label:'Preparação para 2027.1',detail:'A liberação semanal começa em 1º de fevereiro de 2027.',pct:0};
  const w=Math.min(10,Math.floor(d/7)+1);
  return {label:`Semana ${w} • palavras ${(w-1)*5+1}–${w*5}`,detail:w<10?'Novo bloco liberado a cada 7 dias.':'Os 10 blocos do 1º semestre já foram liberados.',pct:w*10};
}
function build(){
  const home=$('#home'); const old=home?.querySelector('.grid'); if(!home||!old||$('#v3Home'))return false;
  old.id='legacyHomeGrid';
  const hero=home.querySelector('.hero'); if(hero) hero.style.display='none';
  const metric=home.querySelector('.metric'); if(metric) metric.style.display='none';
  const w=weekStatus();
  const wrap=document.createElement('div');wrap.id='v3Home';wrap.className='v3-home';
  wrap.innerHTML=`
    <section class="v3-welcome">
      <div class="eyebrow">ALEF v3.0 • JORNADA HEBRAICO I & II</div>
      <h1>Do Alef à leitura do texto bíblico</h1>
      <p>Escolha seu semestre e siga uma trilha organizada. Novos alunos começam pelo alfabeto, vogais e 5 palavras por semana; o segundo semestre avança para morfologia, verbos e análise.</p>
    </section>
    <section class="v3-100"><b>100/100</b><div><strong>Meta de vocabulário completa</strong><br><small>As 5 últimas palavras foram adicionadas ao banco geral.</small></div></section>
    <section class="v3-today">
      <div class="v3-panel"><h3>📅 Hoje no ALEF</h3><strong>${w.label}</strong><p>${w.detail}</p><div class="v3-progress"><span style="width:${w.pct}%"></span></div></div>
      <div class="v3-panel"><h3>🧭 Para novos alunos</h3><p>Comece no 1º semestre e avance na ordem. Se já cursou a disciplina, use o modo revisão dentro da jornada.</p></div>
    </section>
    <section class="v3-semesters">
      <a class="v3-sem-card sem1" href="semestre1.html">
        <div class="v3-sem-icon">🌱</div><h2>1º Semestre</h2><p>Hebraico Bíblico I • do zero aos primeiros verbos.</p>
        <div class="v3-chips"><span class="v3-chip">Alfabeto</span><span class="v3-chip">Vogais</span><span class="v3-chip">Sheva</span><span class="v3-chip">Artigo</span><span class="v3-chip">Palavras 1–50</span><span class="v3-chip">Kelley I–XI</span></div>
        <span class="v3-open">Entrar no 1º semestre →</span>
      </a>
      <a class="v3-sem-card sem2" href="semestre2.html">
        <div class="v3-sem-icon">📜</div><h2>2º Semestre</h2><p>Hebraico Bíblico II • sistema verbal, BHS, tradução e análise.</p>
        <div class="v3-chips"><span class="v3-chip">Palavras 51–100</span><span class="v3-chip">Qal</span><span class="v3-chip">7 troncos</span><span class="v3-chip">Morfologia</span><span class="v3-chip">Kelley XII–XXI</span></div>
        <span class="v3-open">Entrar no 2º semestre →</span>
      </a>
    </section>
    <div class="v3-access-title"><div><h2>Acesso rápido</h2><p>Ferramentas continuam disponíveis, agora organizadas por função.</p></div></div>
    <section class="v3-access-grid">
      <button class="v3-box" data-v3-go="vocab"><span class="ico">📚</span><strong>100 palavras</strong><small>Quiz, escrever, associação e flashcards.</small></button>
      <a class="v3-box" href="alfabeto-cards.html"><span class="ico">א</span><strong>Alfabeto completo</strong><small>22 cards, formas, sons, grupos e usos.</small></a>
      <a class="v3-box" href="fundamentos-game.html"><span class="ico">🎮</span><strong>Fundamentos</strong><small>Letras, vogais, sheva, daguesh e artigo em jogos.</small></a>
      <button class="v3-box" data-v3-go="morphology"><span class="ico">🧩</span><strong>Morfologia</strong><small>Forma, tronco, PGN, raiz e análise.</small></button>
      <button class="v3-box" data-v3-go="verbs"><span class="ico">🔤</span><strong>Verbos</strong><small>Raízes, troncos e paradigmas.</small></button>
      <a class="v3-box" href="course.html"><span class="ico">📖</span><strong>Curso completo</strong><small>Mapa sequencial das lições.</small></a>
      <button class="v3-box" data-v3-go="duels"><span class="ico">⚔️</span><strong>Duelos</strong><small>Desafios entre colegas.</small></button>
      <button class="v3-box" data-v3-go="ranking"><span class="ico">🏆</span><strong>Ranking</strong><small>XP e progresso social.</small></button>
    </section>`;
  home.insertBefore(wrap,old);
  wrap.querySelectorAll('[data-v3-go]').forEach(b=>b.addEventListener('click',()=>proxyGo(b.dataset.v3Go)));
  return true;
}
let tries=0;const timer=setInterval(()=>{tries++;if(build()||tries>120)clearInterval(timer)},100);
})();