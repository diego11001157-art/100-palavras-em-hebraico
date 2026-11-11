(()=>{
'use strict';
function build(){
 const home=document.querySelector('#home'),old=home?.querySelector('.grid');if(!home||!old||document.querySelector('#v32Home'))return false;
 old.style.display='none';const hero=home.querySelector('.hero');if(hero)hero.style.display='none';const metric=home.querySelector('.metric');if(metric)metric.style.display='none';
 const w=document.createElement('div');w.id='v32Home';w.className='v3-home';w.innerHTML=`
 <section class="v3-welcome"><div class="eyebrow">ALEF v3.2 • HEBRAICO I & II</div><h1>Do Alef à leitura do texto bíblico</h1><p>O banco geral contém 100 palavras. O primeiro semestre usa apenas 1–50 em blocos semanais de 5; o segundo semestre trabalha 51–100.</p></section>
 <section class="v3-100"><b>100/100</b><div><strong>Banco completo verificado</strong><br><small>Vocabulário geral 1–100, sem eliminar os blocos do segundo semestre.</small></div></section>
 <section class="v3-semesters"><a class="v3-sem-card sem1" href="semestre1.html"><div class="v3-sem-icon">🌱</div><h2>1º Semestre</h2><p>Toque nos assuntos e escolha cards, flashcards, jogos e revisões dentro da própria jornada.</p><div class="v3-chips"><span class="v3-chip">1–50</span><span class="v3-chip">5 por semana</span><span class="v3-chip">Alfabeto</span><span class="v3-chip">Vogais</span></div><span class="v3-open">Entrar →</span></a><a class="v3-sem-card sem2" href="semestre2.html"><div class="v3-sem-icon">📜</div><h2>2º Semestre</h2><p>Vocabulário 51–100, verbos, morfologia e preparação avançada.</p><div class="v3-chips"><span class="v3-chip">51–100</span><span class="v3-chip">Qal</span><span class="v3-chip">Morfologia</span></div><span class="v3-open">Entrar →</span></a></section>`;
 home.insertBefore(w,old);return true;
}
document.addEventListener('DOMContentLoaded',()=>{let n=0;const t=setInterval(()=>{n++;if(build()||n>120)clearInterval(t)},100)});
})();