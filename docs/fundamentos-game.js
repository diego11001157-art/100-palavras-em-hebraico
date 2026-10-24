(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const alphabet=[
 {l:'א',n:'Alef',tr:'ʾ',v:1},{l:'ב',n:'Bet',tr:'b/v',v:2},{l:'ג',n:'Gimel',tr:'g',v:3},{l:'ד',n:'Dalet',tr:'d',v:4},
 {l:'ה',n:'He',tr:'h',v:5},{l:'ו',n:'Vav',tr:'w/v',v:6},{l:'ז',n:'Zayin',tr:'z',v:7},{l:'ח',n:'Het',tr:'ḥ',v:8},
 {l:'ט',n:'Tet',tr:'ṭ',v:9},{l:'י',n:'Yod',tr:'y',v:10},{l:'כ',n:'Kaf',tr:'k/kh',v:20,final:'ך'},{l:'ל',n:'Lamed',tr:'l',v:30},
 {l:'מ',n:'Mem',tr:'m',v:40,final:'ם'},{l:'נ',n:'Nun',tr:'n',v:50,final:'ן'},{l:'ס',n:'Samekh',tr:'s',v:60},{l:'ע',n:'Ayin',tr:'ʿ',v:70},
 {l:'פ',n:'Pe',tr:'p/f',v:80,final:'ף'},{l:'צ',n:'Tsade',tr:'ṣ',v:90,final:'ץ'},{l:'ק',n:'Qof',tr:'q',v:100},{l:'ר',n:'Resh',tr:'r',v:200},
 {l:'ש',n:'Shin/Sin',tr:'š/ś',v:300},{l:'ת',n:'Tav',tr:'t',v:400}
];
const finals=alphabet.filter(x=>x.final);
const vowels=[
 {s:'ַ',n:'Patah',sound:'a',kind:'breve'},{s:'ָ',n:'Qamats',sound:'a / ā',kind:'longa ou padrão contextual'},
 {s:'ֶ',n:'Segol',sound:'e',kind:'breve'},{s:'ֵ',n:'Tsere',sound:'e / ē',kind:'longa'},
 {s:'ִ',n:'Hireq',sound:'i',kind:'breve/longa conforme escrita'},{s:'ֹ',n:'Holem',sound:'o',kind:'longa'},
 {s:'ֻ',n:'Qibbuts',sound:'u',kind:'breve'},{s:'ְ',n:'Sheva',sound:'audível ou mudo',kind:'sinal'}
];
const gutturals=['א','ה','ח','ע'];
const begadkephat=['ב','ג','ד','כ','פ','ת'];
const journey=[
 {icon:'🔤',title:'1. Alfabeto',sub:'22 consoantes em ordem',target:'#alphabet-order'},
 {icon:'🗂️',title:'2. Flashcards',sub:'nome, som e forma final',target:'#flashcards'},
 {icon:'⌨️',title:'3. Teclado',sub:'monte sílabas e sinais',target:'#keyboard'},
 {icon:'💧',title:'4. Vogais',sub:'reconhecer e combinar',mode:'vowels'},
 {icon:'◌ְ',title:'5. Sheva',sub:'audível ou mudo',mode:'sheva'},
 {icon:'ּ',title:'6. Daguesh',sub:'lene ou forte',mode:'dagesh'},
 {icon:'🗣️',title:'7. Guturais',sub:'reconhecer o grupo',mode:'gutturals'},
 {icon:'הַ',title:'8. Artigo',sub:'identificar na palavra',mode:'article'}
];
const modes=[
 {id:'letters',icon:'🔤',title:'Letras',desc:'Nome, transliteração e valor.'},
 {id:'finals',icon:'🏁',title:'Formas finais',desc:'כ/ך, מ/ם, נ/ן, פ/ף, צ/ץ.'},
 {id:'vowels',icon:'💧',title:'Vogais',desc:'Nome, posição e som aproximado.'},
 {id:'sheva',icon:'◌ְ',title:'Sheva',desc:'Classificação didática: audível ou mudo.'},
 {id:'dagesh',icon:'ּ',title:'Daguesh',desc:'Reconhecer e distinguir lene/forte.'},
 {id:'gutturals',icon:'🗣️',title:'Guturais',desc:'Selecione א ה ח ע.'},
 {id:'article',icon:'הַ',title:'Artigo',desc:'Descubra se a palavra tem artigo.'},
 {id:'mix',icon:'🎲',title:'Misturado',desc:'Todos os fundamentos juntos.'}
];

let session={xp:0,streak:0,hits:0,wrong:0,hearts:3,round:0,total:10,mode:'letters',locked:false};
const badgeKey='alef_foundation_badges_v22';
const badges=[
 {id:'first',icon:'🌱',title:'Primeiro passo',desc:'Acerte 1 questão.'},
 {id:'alphabet',icon:'🔤',title:'Alef ao Tav',desc:'Complete a ordem das 22 letras.'},
 {id:'streak5',icon:'🔥',title:'Sequência 5',desc:'Faça 5 acertos seguidos.'},
 {id:'xp100',icon:'⭐',title:'100 XP',desc:'Alcance 100 XP na sessão.'},
 {id:'perfect',icon:'🏆',title:'Rodada perfeita',desc:'10 questões sem erro.'},
 {id:'article',icon:'🔎',title:'Caçador do artigo',desc:'Acerte 5 questões de artigo.'}
];
function badgeState(){try{return JSON.parse(localStorage.getItem(badgeKey)||'{}')}catch(_){return{}}}
function saveBadges(x){localStorage.setItem(badgeKey,JSON.stringify(x))}
function unlock(id){const b=badgeState();b[id]=true;saveBadges(b);renderBadges()}
function renderBadges(){const b=badgeState();$('#badgeGrid').innerHTML=badges.map(x=>`<article class="achievement ${b[x.id]?'unlocked':''}"><span>${x.icon}</span><strong>${x.title}</strong><small>${x.desc}</small></article>`).join('')}
function updateScore(){
 $('#xp').textContent=session.xp;$('#streak').textContent=session.streak;$('#hits').textContent=session.hits;
 const total=session.hits+session.wrong;$('#accuracy').textContent=(total?Math.round(session.hits/total*100):0)+'%';
 if(session.hits>=1)unlock('first');if(session.streak>=5)unlock('streak5');if(session.xp>=100)unlock('xp100');
}
function renderJourney(){
 $('#journeyGrid').innerHTML=journey.map((x,i)=>`<a class="journey-step" href="${x.target||'#games'}" data-journey="${i}"><em>${x.icon}</em><b>${x.title}</b><span>${x.sub}</span></a>`).join('');
 $$('[data-journey]').forEach(a=>a.onclick=e=>{const x=journey[Number(a.dataset.journey)];if(x.mode){e.preventDefault();startMode(x.mode);setTimeout(()=>$('#arena').scrollIntoView({behavior:'smooth',block:'start'}),20)}});
}

/* ---------- Alphabet order board ---------- */
let orderSlots=Array(22).fill(null), bankOrder=shuffle(alphabet.map(x=>x.l)), selectedBank=null;
function renderOrder(){
 $('#alphabetBoard').innerHTML=orderSlots.map((l,i)=>`<button class="alpha-slot ${l?'filled':''}" data-slot="${i}" data-drop="${i}"><span class="num">${i+1}</span>${l||''}</button>`).join('');
 $('#letterBank').innerHTML=bankOrder.map((l,i)=>`<button class="bank-letter ${orderSlots.includes(l)?'used':''}" draggable="${!orderSlots.includes(l)}" data-bank="${l}" data-bank-i="${i}">${l}</button>`).join('');
 $$('[data-bank]').forEach(b=>{
   b.onclick=()=>placeLetter(b.dataset.bank);
   b.ondragstart=e=>{e.dataTransfer.setData('text/plain',b.dataset.bank)};
 });
 $$('[data-slot]').forEach(s=>{
   s.onclick=()=>{const i=Number(s.dataset.slot);if(orderSlots[i]){orderSlots[i]=null;renderOrder()}};
   s.ondragover=e=>e.preventDefault();
   s.ondrop=e=>{e.preventDefault();const l=e.dataTransfer.getData('text/plain');placeLetter(l,Number(s.dataset.slot))}
 });
}
function placeLetter(l,at=null){
 if(orderSlots.includes(l))return;
 const i=at===null?orderSlots.findIndex(x=>!x):at;if(i<0)return;
 if(orderSlots[i])return;orderSlots[i]=l;renderOrder();
}
function checkOrder(){
 const correct=alphabet.map(x=>x.l);let count=0;
 $$('.alpha-slot').forEach((s,i)=>{const ok=orderSlots[i]===correct[i];s.classList.add(ok?'good':'bad');if(ok)count++});
 const f=$('#alphabetFeedback');f.className='feedback-panel '+(count===22?'ok':'bad');
 f.innerHTML=`<strong>${count===22?'🏆 Perfeito!':'Você acertou '+count+' de 22 posições.'}</strong><br>${count===22?'Do Alef ao Tav completo.':'Mantenha as verdes e clique nas vermelhas para devolvê-las ao banco.'}`;
 if(count===22){session.xp+=50;unlock('alphabet');updateScore()}
}
$('#alphabetReset').onclick=()=>{orderSlots=Array(22).fill(null);bankOrder=shuffle(alphabet.map(x=>x.l));$('#alphabetFeedback').className='feedback-panel hidden';renderOrder()};
$('#alphabetShuffle').onclick=()=>{bankOrder=shuffle(bankOrder);renderOrder()};
$('#alphabetCheck').onclick=checkOrder;
$('#alphabetHint').onclick=()=>{const i=orderSlots.findIndex((x,j)=>x!==alphabet[j].l);if(i>=0&&!orderSlots.includes(alphabet[i].l)){orderSlots[i]=alphabet[i].l;renderOrder()}};

/* ---------- Hebrew keyboard ---------- */
let keyboardText='בַ';
const marks=[...vowels.map(v=>({k:v.s,label:v.n,type:'mark'})),{k:'ּ',label:'Daguesh',type:'mark'},{k:'ׁ',label:'Ponto de Shin',type:'mark'},{k:'ׂ',label:'Ponto de Sin',type:'mark'},{k:'־',label:'Maqaf',type:'mark'}];
function renderKeyboard(){
 $('#kbdConsonants').innerHTML=alphabet.map(x=>`<button class="heb-key" data-key="${x.l}" title="${x.n}">${x.l}</button>`).join('');
 $('#kbdFinals').innerHTML=finals.map(x=>`<button class="heb-key final" data-key="${x.final}" title="${x.n} final">${x.final}</button>`).join('');
 $('#kbdMarks').innerHTML=marks.map(x=>`<button class="heb-key mark" data-key="${x.k}" title="${x.label}">◌${x.k}</button>`).join('');
 $$('[data-key]').forEach(b=>b.onclick=()=>{keyboardText+=b.dataset.key;renderKeyboardOutput(b.title)});
}
function renderKeyboardOutput(note=''){const el=$('#keyboardOutput');el.textContent=keyboardText||' ';$('#keyboardExplain').textContent=note?`Adicionado: ${note}. Toque em outros sinais para experimentar.`:'Toque primeiro numa consoante e depois numa vogal.'}
$$('[data-key-action]').forEach(b=>b.onclick=()=>{const a=b.dataset.keyAction;if(a==='clear')keyboardText='';if(a==='space')keyboardText+=' ';if(a==='back')keyboardText=Array.from(keyboardText).slice(0,-1).join('');renderKeyboardOutput()});

/* ---------- Flashcards ---------- */
const flashSets={
 alphabet:alphabet.map(x=>({front:x.l,back:`${x.n} • transliteração ${x.tr} • valor ${x.v}${x.final?` • final ${x.final}`:''}`})),
 finals:finals.map(x=>({front:x.final,back:`Forma final de ${x.l} (${x.n})`})),
 vowels:vowels.map(x=>({front:`ב${x.s}`,back:`${x.n} • som aproximado ${x.sound} • ${x.kind}`})),
 sheva:[
  {front:'ְ',back:'Sheva • nesta fase, aprenda primeiro a reconhecê-lo visualmente.'},
  {front:'בְּרֵאשִׁית',back:'Exemplo didático de sheva audível no início da palavra.'},
  {front:'מַלְכָּה',back:'Exemplo didático de sheva mudo fechando a primeira sílaba.'}
 ],
 dagesh:[
  {front:'בּ',back:'Ponto dentro da consoante = daguesh. Em letra BeGaDKeFaT no início, pode ser lene.'},
  {front:'הַמֶּלֶךְ',back:'O daguesh em מ é forte no padrão didático do artigo + consoante não gutural.'},
  {front:'ב כ פ ת ד ג',back:'Grupo BeGaDKeFaT: letras que podem receber daguesh lene.'}
 ],
 gutturals:[
  {front:'א ה ח ע',back:'Quatro guturais principais trabalhadas no laboratório.'},
  {front:'ר',back:'Resh tem comportamentos especiais, mas não está no grupo principal א ה ח ע desta atividade.'}
 ],
 article:[
  {front:'הַמֶּלֶךְ',back:'Tem artigo: הַ + מֶלֶךְ. O artigo provoca daguesh forte na consoante seguinte quando possível.'},
  {front:'מֶלֶךְ',back:'Não tem artigo.'},
  {front:'הָאָרֶץ',back:'Tem artigo; diante de gutural o padrão vocálico pode mudar e não há duplicação da gutural.'}
 ]
};
let flashCategory='alphabet', flashIndex=0, flashRevealed=false, flashOrder=[];
function resetFlash(){flashCategory=$('#flashCategory').value;flashOrder=shuffle(flashSets[flashCategory].map((_,i)=>i));flashIndex=0;flashRevealed=false;renderFlash()}
function renderFlash(){
 const set=flashSets[flashCategory],i=flashOrder[flashIndex]??0,c=set[i];
 $('#flashcard').classList.toggle('revealed',flashRevealed);$('#flashLabel').textContent=flashRevealed?'RESPOSTA':'TOQUE PARA VIRAR';
 $('#flashMain').textContent=flashRevealed?'✓':c.front;$('#flashSub').textContent=flashRevealed?c.back:'Pense na resposta antes de virar.';
 $('#flashCounter').textContent=`${flashIndex+1}/${flashOrder.length}`;
}
$('#flashCategory').onchange=resetFlash;$('#flashShuffle').onclick=resetFlash;
$('#flashcard').onclick=()=>{flashRevealed=!flashRevealed;renderFlash()};
$('#flashNext').onclick=()=>{flashIndex=(flashIndex+1)%flashOrder.length;flashRevealed=false;renderFlash()};
$('#flashPrev').onclick=()=>{flashIndex=(flashIndex-1+flashOrder.length)%flashOrder.length;flashRevealed=false;renderFlash()};

/* ---------- Game engine ---------- */
function renderModes(){
 $('#modeGrid').innerHTML=modes.map(m=>`<button class="mode-card" data-mode="${m.id}"><span class="icon">${m.icon}</span><strong>${m.title}</strong><small>${m.desc}</small></button>`).join('');
 $$('[data-mode]').forEach(b=>b.onclick=()=>startMode(b.dataset.mode));
}
function resetSession(){session={xp:0,streak:0,hits:0,wrong:0,hearts:3,round:0,total:10,mode:session.mode||'letters',locked:false};updateScore();$('#arena').classList.add('hidden')}
function startMode(id){session.mode=id;session.hearts=3;session.round=0;session.locked=false;$('#arena').classList.remove('hidden');next();$('#arena').scrollIntoView({behavior:'smooth',block:'start'})}
function currentMode(){return modes.find(x=>x.id===session.mode)||modes[0]}
function hearts(){return'❤'.repeat(session.hearts)+'♡'.repeat(3-session.hearts)}
function setTip(text,label='Dica do laboratório'){$('#tipBox').innerHTML=`<strong>💡 ${label}</strong><br>${text}<div class="kelley-inline">📖 Kelley I–VI: dica específica será inserida quando essas páginas forem adicionadas ao projeto.</div>`}
function beginQuestion(){session.locked=false;$('#feedbackPanel').className='feedback-panel hidden';$('#nextQuestion').classList.add('hidden');$('#modeBadge').textContent=currentMode().title.toUpperCase();$('#roundText').textContent=`Questão ${session.round+1}/${session.total}`;$('#hearts').textContent=hearts()}
function earn(ok,why){
 session.locked=true;if(ok){session.hits++;session.streak++;session.xp+=10+Math.min(10,session.streak*2)}else{session.wrong++;session.streak=0;session.hearts=Math.max(0,session.hearts-1)}
 updateScore();const f=$('#feedbackPanel');f.className='feedback-panel '+(ok?'ok':'bad');f.innerHTML=`<strong>${ok?'✓ Acertou!':'✕ Ainda não.'}</strong><br>${why}`;$('#nextQuestion').classList.remove('hidden');$('#hearts').textContent=hearts();
}
function optionsQuestion(prompt,big,opts,correct,why,tip,hebrewOpts=false){
 beginQuestion();$('#questionArea').innerHTML=`<div class="question-prompt">${big?`<div class="big-hebrew">${big}</div>`:''}<h3>${prompt}</h3></div><div class="answer-grid">${opts.map((o,i)=>`<button class="answer ${hebrewOpts?'hebrew-answer':''}" data-answer="${i}">${o}</button>`).join('')}</div>`;
 setTip(tip);$$('[data-answer]').forEach(b=>b.onclick=()=>{if(session.locked)return;const i=Number(b.dataset.answer),ok=i===correct;b.classList.add(ok?'correct':'wrong');if(!ok)$$('[data-answer]')[correct].classList.add('correct');earn(ok,why)});
}
function letterQuestion(){
 const x=alphabet[Math.floor(Math.random()*alphabet.length)],type=Math.floor(Math.random()*3);
 if(type===0){const choices=shuffle([x,...shuffle(alphabet.filter(a=>a.n!==x.n)).slice(0,3)]),c=choices.indexOf(x);optionsQuestion('Qual é o nome desta letra?',x.l,choices.map(a=>a.n),c,`${x.l} é ${x.n}.`,'Associe primeiro a forma ao nome; depois acrescente som, transliteração e valor.')}
 else if(type===1){const choices=shuffle([x,...shuffle(alphabet.filter(a=>a.n!==x.n)).slice(0,3)]),c=choices.indexOf(x);optionsQuestion(`Clique na letra ${x.n}.`,'',choices.map(a=>a.l),c,`${x.n} corresponde a ${x.l}.`,'Treinar nos dois sentidos ajuda a memorizar de verdade.',true)}
 else{const nums=shuffle(alphabet.filter(a=>a.v!==x.v)).slice(0,3).map(a=>a.v),choices=shuffle([x.v,...nums]),c=choices.indexOf(x.v);optionsQuestion(`Qual é o valor numérico de ${x.n}?`,x.l,choices,c,`${x.n} (${x.l}) tem valor ${x.v}.`,'Os valores numéricos fazem parte do conteúdo programático de Hebraico I.')}
}
function finalQuestion(){
 const x=finals[Math.floor(Math.random()*finals.length)],toFinal=Math.random()<.5;
 if(toFinal){const choices=shuffle(finals.map(a=>a.final)),c=choices.indexOf(x.final);optionsQuestion(`Qual é a forma final de ${x.n}?`,x.l,choices,c,`${x.l} torna-se ${x.final} no fim da palavra.`,'Memorize os pares: כ/ך, מ/ם, נ/ן, פ/ף, צ/ץ.',true)}
 else{const choices=shuffle(finals.map(a=>a.l)),c=choices.indexOf(x.l);optionsQuestion('Qual é a forma comum desta letra final?',x.final,choices,c,`${x.final} é a forma final de ${x.l} (${x.n}).`,'A forma final aparece no fim da palavra.',true)}
}
function vowelQuestion(){
 const x=vowels.filter(v=>v.n!=='Sheva')[Math.floor(Math.random()*7)],type=Math.random()<.5;
 const pool=vowels.filter(v=>v.n!=='Sheva'),choices=shuffle([x,...shuffle(pool.filter(v=>v.n!==x.n)).slice(0,3)]),c=choices.indexOf(x);
 if(type)optionsQuestion('Qual é o nome deste sinal?',`ב${x.s}`,choices.map(v=>v.n),c,`O sinal é ${x.n}; som aproximado: ${x.sound}.`,'Observe onde o ponto ou traço aparece em relação à consoante.')
 else optionsQuestion(`Clique na combinação com ${x.n}.`,'',choices.map(v=>`ב${v.s}`),c,`${x.n} aparece aqui: ב${x.s}.`,'Leia a vogal aplicada à consoante, não apenas isolada.',true)
}
const shevaCases=[
 {form:'בְּרֵאשִׁית',answer:'Audível',why:'Nesta atividade inicial, o sheva está no início da palavra e é tratado como audível.'},
 {form:'מַלְכָּה',answer:'Mudo',why:'Nesta atividade inicial, o sheva fecha a primeira sílaba: mal-kah.'},
 {form:'שְׁמוֹ',answer:'Audível',why:'O sheva está no início da palavra nesta forma didática.'},
 {form:'יִכְתֹּב',answer:'Mudo',why:'Aqui o sheva participa do fechamento da sílaba inicial na leitura didática.'}
];
function shevaQuestion(){
 const x=shevaCases[Math.floor(Math.random()*shevaCases.length)],opts=['Audível','Mudo'],c=opts.indexOf(x.answer);
 optionsQuestion('O sheva destacado nesta forma é AUDÍVEL ou MUDO?',x.form,opts,c,x.why,'Regra inicial: sheva no começo da palavra costuma ser audível; sheva que fecha uma sílaba costuma ser mudo. Outras regras serão acrescentadas com os materiais de sala.')
}
const dageshCases=[
 {form:'בְּרֵאשִׁית',answer:'Lene',why:'O ponto está em ב, letra BeGaDKeFaT, no início da palavra: exemplo didático de daguesh lene.'},
 {form:'כָּתַב',answer:'Lene',why:'O ponto em כ no início da palavra funciona aqui como exemplo didático de daguesh lene.'},
 {form:'הַמֶּלֶךְ',answer:'Forte',why:'O artigo הַ provoca duplicação da consoante seguinte quando ela pode receber daguesh: aqui מּ.'},
 {form:'וַיֹּאמֶר',answer:'Forte',why:'O ponto em יּ representa duplicação no padrão desta forma; não é daguesh lene, porque י não pertence a BeGaDKeFaT.'}
];
function dageshQuestion(){
 const x=dageshCases[Math.floor(Math.random()*dageshCases.length)],opts=['Lene','Forte'],c=opts.indexOf(x.answer);
 optionsQuestion('Classifique o daguesh desta forma.',x.form,opts,c,x.why,'Primeira pergunta: a letra é BeGaDKeFaT? Se não for, o daguesh não pode ser lene. Depois observe o ambiente da palavra.')
}
function gutturalQuestion(){
 beginQuestion();let pool=shuffle(alphabet.map(x=>x.l)).slice(0,10);gutturals.forEach((g,i)=>{if(!pool.includes(g))pool[i]=g});pool=[...new Set(pool)];while(pool.length<10){const l=alphabet[Math.floor(Math.random()*alphabet.length)].l;if(!pool.includes(l))pool.push(l)};pool=shuffle(pool);
 const targets=pool.filter(x=>gutturals.includes(x));$('#questionArea').innerHTML=`<div class="question-prompt"><h3>Selecione TODAS as guturais.</h3><p>Depois confirme.</p></div><div class="symbol-grid">${pool.map(x=>`<button class="symbol-btn" data-symbol="${x}">${x}</button>`).join('')}</div><button class="btn gold" id="confirmMulti" style="width:100%;margin-top:10px">Confirmar seleção</button>`;
 setTip('Nesta etapa, memorize o grupo principal: א ה ח ע.');const selected=new Set();$$('[data-symbol]').forEach(b=>b.onclick=()=>{if(session.locked)return;const s=b.dataset.symbol;selected.has(s)?selected.delete(s):selected.add(s);b.classList.toggle('selected')});
 $('#confirmMulti').onclick=()=>{if(session.locked)return;const ok=targets.length===selected.size&&targets.every(x=>selected.has(x));$$('[data-symbol]').forEach(b=>{const is=gutturals.includes(b.dataset.symbol),sel=selected.has(b.dataset.symbol);if(is)b.classList.add('correct');else if(sel)b.classList.add('wrong')});earn(ok,`As guturais principais desta atividade são ${gutturals.join(' ')}.`)}
}
const articleCases=[
 {form:'הַמֶּלֶךְ',has:true,base:'מֶלֶךְ',why:'Há artigo הַ no início; a consoante seguinte recebe daguesh forte quando possível.'},
 {form:'מֶלֶךְ',has:false,base:'מֶלֶךְ',why:'A palavra começa diretamente pelo substantivo, sem o artigo.'},
 {form:'הָאָרֶץ',has:true,base:'אֶרֶץ',why:'Há artigo; diante de gutural o padrão muda e a gutural não recebe daguesh forte.'},
 {form:'הָעִיר',has:true,base:'עִיר',why:'Há artigo diante de gutural ע; observe a alteração vocálica.'},
 {form:'אִישׁ',has:false,base:'אִישׁ',why:'Não há artigo prefixado.'},
 {form:'הַזֶּה',has:true,base:'זֶה',why:'A forma apresenta o artigo prefixado e daguesh na consoante seguinte.'}
];
function articleQuestion(){
 const x=articleCases[Math.floor(Math.random()*articleCases.length)],opts=['Tem artigo','Não tem artigo'],c=x.has?0:1;
 optionsQuestion('Esta palavra tem artigo definido?',x.form,opts,c,`${x.why} Forma-base: ${x.base}.`,'Procure primeiro um ה prefixado e depois observe a vogal e o comportamento da consoante seguinte.')
}
function next(){
 if(session.round>=session.total||session.hearts<=0){
   beginQuestion();const perfect=session.wrong===0&&session.round>=session.total;if(perfect)unlock('perfect');
   $('#questionArea').innerHTML=`<div class="question-prompt"><div class="big-hebrew">א</div><h3>${session.hearts<=0?'Fim das vidas':'Rodada concluída!'}</h3><p>${session.hits} acertos • ${session.xp} XP</p><button class="btn gold" id="again">Jogar novamente</button></div>`;setTip('Errar também faz parte do aprendizado. Refaça o assunto até reconhecer o padrão sem precisar da dica.');$('#again').onclick=()=>startMode(session.mode);return;
 }
 let m=session.mode;if(m==='mix')m=shuffle(['letters','finals','vowels','sheva','dagesh','gutturals','article'])[0];
 ({letters:letterQuestion,finals:finalQuestion,vowels:vowelQuestion,sheva:shevaQuestion,dagesh:dageshQuestion,gutturals:gutturalQuestion,article:articleQuestion}[m]||letterQuestion)();
}
$('#nextQuestion').onclick=()=>{session.round++;next()};
$('#backModes').onclick=()=>{$('#arena').classList.add('hidden');$('#games').scrollIntoView({behavior:'smooth'})};
$('#resetSession').onclick=resetSession;

/* article badge */
const oldEarn=earn;
let articleHits=0;
earn=function(ok,why){oldEarn(ok,why);if(ok&&session.mode==='article'){articleHits++;if(articleHits>=5)unlock('article')}};

/* Query/hash deep links */
function deepLink(){
 const mode=new URLSearchParams(location.search).get('mode');
 if(mode&&modes.some(x=>x.id===mode))setTimeout(()=>startMode(mode),80);
 if(location.hash)setTimeout(()=>document.querySelector(location.hash)?.scrollIntoView({behavior:'smooth',block:'start'}),120);
}
renderJourney();renderOrder();renderKeyboard();renderKeyboardOutput();renderModes();renderBadges();resetFlash();updateScore();deepLink();
})();
