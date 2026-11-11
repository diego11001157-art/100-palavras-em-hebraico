(()=>{
'use strict';
const $=s=>document.querySelector(s);const term=Number(document.body.dataset.term||1);let PLAN=null,VOCAB=[],activeBlock=null,review=false,quizState=null;
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
async function load(){
 const [planR,baseR,e18R,e30R]=await Promise.all([
  fetch('content/semester-plan.json',{cache:'no-store'}),fetch('content/vocabulario.json',{cache:'no-store'}),
  fetch('content/vocab-extra-v18.json',{cache:'no-store'}),fetch('content/vocab-extra-v30.json',{cache:'no-store'})
 ]);
 PLAN=await planR.json();const all=[...await baseR.json(),...await e18R.json(),...await e30R.json()];
 const map=new Map();all.forEach(x=>map.set(Number(x.n),x));VOCAB=[...map.values()].sort((a,b)=>a.n-b.n);
 review=localStorage.getItem('alef_v3_review')==='1';render();
}
function proxy(target){location.href=`index.html?go=${encodeURIComponent(target)}`}
function releaseInfo(block){
 if(term===2)return {open:true,current:false,label:'Disponível'};
 if(review)return {open:true,current:false,label:'Revisão livre'};
 const now=new Date(),rel=new Date(block.releaseDate+'T00:00:00');const next=new Date(rel.getTime()+7*86400000);
 return {open:now>=rel,current:now>=rel&&now<next,label:now>=rel?'Liberado':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(rel)};
}
function currentWeek(){
 const start=new Date('2027-02-01T00:00:00'),now=new Date(),d=Math.floor((now-start)/86400000);
 if(d<0)return 0;return Math.min(10,Math.floor(d/7)+1);
}
function render(){
 const cfg=term===1?PLAN.firstSemester:PLAN.secondSemester;const blocks=cfg.blocks;
 const content=$('#semesterContent');
 const actions=term===1?[
  ['א','Alfabeto card por card','22 letras: forma, som, transliteração, grupos e usos.','alfabeto-cards.html'],
  ['🎮','Fundamentos interativos','Ordenar letras, vogais, sheva, daguesh, guturais e artigo.','fundamentos-game.html'],
  ['📖','Curso Kelley I–XI','Trilha do primeiro semestre alinhada à ementa.','course.html'],
  ['🔤','Vocabulário 1–50','5 palavras por semana, em 10 blocos.','#vocabulary'],
  ['🧠','Revisão e domínio','Veja o que já foi liberado e revise erros.','#mastery'],
  ['📝','Avaliações','P1: Kelley I–VI • P2: Kelley VII–XI.','#assessments']
 ]:[
  ['📚','Vocabulário 51–100','50 palavras em blocos de 5 para revisão e prática.','#vocabulary'],
  ['🔤','Verbos','Qal, raízes, sete troncos e paradigmas.','index.html?go=verbs'],
  ['🧩','Morfologia','Forma → tronco → PGN → raiz → contexto.','index.html?go=morphology'],
  ['🎓','Kelley XVI–XXI','Preparação específica para P2.','p2.html'],
  ['📖','Curso completo','Kelley XII–XXI + continuidade.','course.html'],
  ['⚔️','Duelos e ranking','Prática social com os módulos atuais.','index.html?go=duels']
 ];
 const wk=currentWeek();
 content.innerHTML=`
  <h2 class="section-title">${term===1?'🌱 Comece por aqui':'📜 Continue daqui'}</h2>
  <section class="grid">${actions.map(a=>`<a class="card action" href="${a[3]}"><div class="ico">${a[0]}</div><h3>${a[1]}</h3><p>${a[2]}</p></a>`).join('')}</section>
  <h2 class="section-title" id="vocabulary">${term===1?'📅 Vocabulário semanal 1–50':'📚 Vocabulário 51–100'}</h2>
  <section class="card">
   <div class="week-status"><div><h3 style="margin:0">${term===1?(wk?`Semana curricular ${wk}`:'Liberação começa em fevereiro de 2027'):'10 blocos de revisão'}</h3><p class="note">${term===1?'Cada bloco contém 5 palavras e é liberado a cada 7 dias a partir de 01/02/2027.':'O 2º semestre está disponível integralmente para quem já concluiu a base.'}</p></div>
   ${term===1?`<label class="switch"><input id="reviewMode" type="checkbox" ${review?'checked':''}> Modo veterano/revisão</label>`:''}</div>
   <div class="vocab-blocks" id="vocabBlocks">${blocks.map(b=>{const r=releaseInfo(b);return `<button class="vblock ${r.open?'open':'locked'} ${r.current?'current':''}" data-start="${b.start}" data-end="${b.end}" ${r.open?'':'disabled'}><b>${term===1?b.label:`Bloco ${b.block}`}</b><strong>${b.range}</strong><span>${r.label}</span></button>`}).join('')}</div>
   <div id="studyPanel" class="study-panel"></div>
  </section>
  <h2 class="section-title" id="mastery">🧭 Mapa de aprendizagem</h2>
  <section class="mastery">${(term===1?[
   ['Alfabeto',20],['Vogais',15],['Sheva/Daguesh',10],['Artigo',10],['Nominais',5],['Vocabulário',wk*10],['Leitura',5],['Kelley I–XI',5]
  ]:[
   ['Revisão HB I',70],['Vocabulário',100],['Qal',65],['Troncos',50],['Morfologia',55],['Wayyiqtol',45],['Kelley XII–XXI',60],['Tradução',35]
  ]).map(x=>`<div><b>${x[0]}</b><small>${Math.min(100,x[1])}% inicial</small><div class="bar"><span style="width:${Math.min(100,x[1])}%"></span></div></div>`).join('')}</section>
  <h2 class="section-title" id="assessments">📝 Organização curricular</h2>
  <section class="card"><div class="timeline">${cfg.curriculum.map((x,i)=>`<div class="timeline-row"><b>${i+1}</b><div>${x}</div></div>`).join('')}</div>
  <p class="note"><span class="pill">P1</span> ${cfg.examMap.P1} <span class="pill">P2</span> ${cfg.examMap.P2}</p></section>`;
 if(term===1)$('#reviewMode').onchange=e=>{review=e.target.checked;localStorage.setItem('alef_v3_review',review?'1':'0');render()};
 document.querySelectorAll('.vblock.open').forEach(b=>b.onclick=()=>openBlock(Number(b.dataset.start),Number(b.dataset.end)));
}
function openBlock(start,end){
 activeBlock=[start,end];const words=VOCAB.filter(x=>x.n>=start&&x.n<=end);const panel=$('#studyPanel');
 panel.innerHTML=`<div class="word-grid">${words.map(w=>`<article class="word-card"><div class="heb">${w.h}</div><strong>${w.p}</strong><small>#${w.n}${w.occurrences?` • ${w.occurrences}x`:''}</small></article>`).join('')}</div>
 <div class="quizbox"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="blockFlash">Flashcards</button><button class="btn ghost" id="blockQuiz">Quiz rápido</button><button class="btn ghost" id="allVocab">Abrir banco completo</button></div><div id="blockGame"></div></div>`;
 $('#blockFlash').onclick=()=>flash(words,0,false);$('#blockQuiz').onclick=()=>quiz(words);$('#allVocab').onclick=()=>proxy('vocab');panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function flash(words,i,reveal){
 const w=words[i%words.length];$('#blockGame').innerHTML=`<button class="word-card" id="fc" style="width:100%;margin-top:10px;min-height:130px"><div class="heb">${reveal?'✓':w.h}</div><strong>${reveal?w.p:'Toque para revelar'}</strong><small>${reveal?(w.analysis||''):`${i+1}/${words.length}`}</small></button><div style="margin-top:7px"><button class="btn ghost" id="fcNext">Próximo</button></div>`;
 $('#fc').onclick=()=>flash(words,i,!reveal);$('#fcNext').onclick=()=>flash(words,(i+1)%words.length,false);
}
function quiz(words){
 const w=words[Math.floor(Math.random()*words.length)];let distract=shuffle(VOCAB.filter(x=>x.n!==w.n)).slice(0,3).map(x=>x.p),opts=shuffle([w.p,...distract]);
 $('#blockGame').innerHTML=`<div class="quizbox"><div class="word-card"><div class="heb">${w.h}</div><strong>Qual é o significado?</strong></div><div class="quizopts">${opts.map(o=>`<button class="quizopt">${o}</button>`).join('')}</div><div id="quizFeedback"></div></div>`;
 document.querySelectorAll('.quizopt').forEach(b=>b.onclick=()=>{const ok=b.textContent===w.p;$('#quizFeedback').innerHTML=`<p><strong>${ok?'✓ Certo':'✕ Tente lembrar'}</strong> — ${w.p}</p><button class="btn ghost" id="another">Outra questão</button>`;$('#another').onclick=()=>quiz(words)});
}
load().catch(err=>{$('#semesterContent').innerHTML=`<section class="card"><h3>Não foi possível carregar a jornada.</h3><p>${err.message}</p></section>`});
})();