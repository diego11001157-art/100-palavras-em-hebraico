(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

let DATA={vocab:[],core:null,morph:null,kelley:null,version:null};
let authMode='login',currentUser=null,meStats={points:0,correct:0,wrong:0,bestStreak:0,games:0};
let unsubscribeUser=null,unsubscribeRanking=null,rankingCache=[];
let selectedVocab='1-10',currentBuild=null,currentIdentify=null,currentNominal=null,kelleyFilter='all';
const localErrors=new Set(JSON.parse(localStorage.getItem('alef_vocab_errors')||'[]'));

const firebaseApp=firebase.initializeApp(window.ALEF_FIREBASE_CONFIG);
const auth=firebase.auth();
const db=firebase.firestore();

async function fetchJSON(path){
  const r=await fetch(path,{cache:'no-store'});
  if(!r.ok)throw new Error(`Falha ao carregar ${path}`);
  return r.json();
}
async function loadData(){
  const [vocab,core,morph,kelley,version]=await Promise.all([
    fetchJSON('content/vocabulario.json'),fetchJSON('content/core.json'),fetchJSON('content/morphology.json'),fetchJSON('content/kelley.json'),fetchJSON('content/version.json')
  ]);
  DATA={vocab,core,morph,kelley,version};
}
function registerSW(){if('serviceWorker'in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{})}}
function showLoadError(err){document.body.innerHTML=`<div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#173e39;color:white;font-family:system-ui"><div style="max-width:540px"><h1>Alef</h1><p>Não foi possível carregar o conteúdo didático agora.</p><p style="opacity:.8">${esc(err.message)}</p><button onclick="location.reload()" style="padding:12px 16px;border:0;border-radius:12px;font-weight:800">Tentar novamente</button></div></div>`}

function setAuthMode(m){authMode=m;$('#tabLogin').className='btn '+(m==='login'?'':'ghost');$('#tabRegister').className='btn '+(m==='register'?'':'ghost');$('#authSubmit').textContent=m==='login'?'Entrar':'Criar conta';$('#nameWrap').classList.toggle('hidden',m!=='register');$('#displayName').required=m==='register';$('#authMsg').textContent=''}
function authMessage(err){const c=(err&&err.code)||'';if(c.includes('email-already-in-use'))return'Este e-mail já possui uma conta.';if(c.includes('invalid-email'))return'Digite um e-mail válido.';if(c.includes('weak-password'))return'A senha precisa ter pelo menos 6 caracteres.';if(c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found'))return'E-mail ou senha incorretos.';return'Não foi possível autenticar agora. Tente novamente.'}
function normalizeName(s){return s.trim().replace(/\s+/g,' ').slice(0,24)}

async function submitAuth(e){
  e.preventDefault();$('#authMsg').textContent='';$('#authSubmit').disabled=true;
  try{
    const email=$('#email').value.trim(),pass=$('#pass').value;
    if(authMode==='register'){
      const name=normalizeName($('#displayName').value);if(!name)throw{code:'name-required'};
      const cred=await auth.createUserWithEmailAndPassword(email,pass);await cred.user.updateProfile({displayName:name});
      await db.collection('users').doc(cred.user.uid).set({name,email,points:0,correct:0,wrong:0,bestStreak:0,games:0,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }else await auth.signInWithEmailAndPassword(email,pass);
  }catch(err){$('#authMsg').textContent=err.code==='name-required'?'Digite um nome para o ranking.':authMessage(err)}finally{$('#authSubmit').disabled=false}
}

function showView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('.navb').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  if(id==='ranking')renderRanking();if(id==='profile')renderProfile();if(id==='kelley')renderKelley();
  window.scrollTo({top:0,behavior:'smooth'});
}
function setupNavigation(){$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));$('#profilePill').onclick=()=>showView('profile')}

function normalizeStats(d){return{points:Number(d.points||0),correct:Number(d.correct||0),wrong:Number(d.wrong||0),bestStreak:Number(d.bestStreak||0),games:Number(d.games||0)}}
function subscribeUser(user){
  if(unsubscribeUser)unsubscribeUser();
  unsubscribeUser=db.collection('users').doc(user.uid).onSnapshot(s=>{const d=s.exists?s.data():{};meStats=normalizeStats(d);renderHomeStats();renderProfile()});
}
function subscribeRanking(){
  if(unsubscribeRanking)unsubscribeRanking();
  unsubscribeRanking=db.collection('users').orderBy('points','desc').limit(50).onSnapshot(s=>{rankingCache=s.docs.map(d=>({id:d.id,...d.data()}));renderRanking()},()=>{rankingCache=[];renderRanking()});
}
async function ensureUserDoc(user){const ref=db.collection('users').doc(user.uid),snap=await ref.get();if(!snap.exists)await ref.set({name:user.displayName||user.email?.split('@')[0]||'Aluno',email:user.email||'',points:0,correct:0,wrong:0,bestStreak:0,games:0,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}
async function recordResult(module,correct,wrong,best=0,basePoints=10){
  if(!currentUser)return;const points=correct*basePoints+Math.max(0,best)*2;
  meStats.points+=points;meStats.correct+=correct;meStats.wrong+=wrong;meStats.games+=1;meStats.bestStreak=Math.max(meStats.bestStreak,best);renderHomeStats();
  const ref=db.collection('users').doc(currentUser.uid);
  try{await ref.set({points:firebase.firestore.FieldValue.increment(points),correct:firebase.firestore.FieldValue.increment(correct),wrong:firebase.firestore.FieldValue.increment(wrong),games:firebase.firestore.FieldValue.increment(1),bestStreak:meStats.bestStreak,lastModule:module,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}catch(_){ }
}
function recordSingle(ok,module){recordResult(module,ok?1:0,ok?0:1,ok?1:0,5)}

function renderHomeStats(){
  $('#homeWords').textContent=DATA.vocab.length;$('#homePoints').textContent=meStats.points;
  const total=meStats.correct+meStats.wrong;$('#homeAccuracy').textContent=total?Math.round(meStats.correct/total*100)+'%':'0%';
}
function handleVersion(){
  const v=DATA.version;$('#versionLabel').textContent=`Hebraico Bíblico II • v${v.appVersion} • ${v.wordsAvailable} palavras`;
  const seen=localStorage.getItem('alef_seen_content_version');if(seen!==v.contentVersion){$('#updateText').textContent=v.message;$('#updateBanner').classList.remove('hidden')}
  $('#dismissUpdate').onclick=()=>{localStorage.setItem('alef_seen_content_version',v.contentVersion);$('#updateBanner').classList.add('hidden')}
}

function groupDefinitions(){
  const g=[];for(let s=1;s<=70;s+=10)g.push({key:`${s}-${s+9}`,label:`${s}–${s+9}`,start:s,end:s+9});
  for(let s=71;s<=100;s+=5)g.push({key:`${s}-${s+4}`,label:`${s}–${s+4}`,start:s,end:s+4,future:true});
  g.push({key:'new',label:'✨ Novas',special:true},{key:'errors',label:'❌ Erros',special:true},{key:'all',label:'Todas',special:true});return g;
}
function renderVocabGroups(){
  const max=Math.max(0,...DATA.vocab.map(w=>w.n)),defs=groupDefinitions();
  $('#vocabGroups').innerHTML=defs.map(g=>{
    let locked=false,newtag='';if(g.future){locked=max<g.start;if(!locked&&max>=g.start)newtag='<span class="newtag">NOVO</span>'}
    if(g.key==='new')locked=max<=70;if(g.key==='errors')locked=localErrors.size===0;
    return`<button class="groupbtn ${selectedVocab===g.key?'active':''} ${locked?'locked':''}" data-vgroup="${g.key}" ${locked?'disabled':''}>${newtag}${g.label}</button>`
  }).join('');
  $$('[data-vgroup]').forEach(b=>b.onclick=()=>{selectedVocab=b.dataset.vgroup;renderVocabGroups()});
}
function vocabPool(){
  if(selectedVocab==='all')return DATA.vocab;if(selectedVocab==='new'){const max=Math.max(...DATA.vocab.map(w=>w.n));return DATA.vocab.filter(w=>w.n>Math.max(70,max-5))}
  if(selectedVocab==='errors')return DATA.vocab.filter(w=>localErrors.has(w.n));const [a,b]=selectedVocab.split('-').map(Number);return DATA.vocab.filter(w=>w.n>=a&&w.n<=b)
}
function saveErrorSet(){localStorage.setItem('alef_vocab_errors',JSON.stringify([...localErrors]));renderVocabGroups()}

function runChoiceQuiz(container,questions,module,onAnswer){
  if(!questions.length){container.innerHTML='<div class="rulebox">Não há itens suficientes neste conjunto.</div>';return}
  let i=0,c=0,w=0,streak=0,best=0,locked=false;
  function draw(){
    if(i>=questions.length){container.innerHTML=`<div class="quiz"><div class="qmeta">Rodada concluída</div><div class="prompt">${c}/${questions.length}</div><div class="stats"><div class="stat"><b>${c}</b><span>acertos</span></div><div class="stat"><b>${w}</b><span>erros</span></div><div class="stat"><b>${best}</b><span>melhor sequência</span></div><div class="stat"><b>${Math.round(c/questions.length*100)}%</b><span>precisão</span></div></div><button class="btn gold" id="againQuiz">Treinar novamente</button></div>`;recordResult(module,c,w,best);$('#againQuiz').onclick=()=>runChoiceQuiz(container,shuffle(questions),module,onAnswer);return}
    locked=false;const q=questions[i];container.innerHTML=`<div class="quiz"><div class="qmeta">${esc(q.meta||'Questão')} • ${i+1}/${questions.length}</div><div class="prompt ${q.hebrew?'hebrew':''}">${esc(q.prompt)}</div><div class="options">${q.options.map((o,k)=>`<button class="opt ${o.hebrew?'hebrew':''}" data-opt="${k}">${esc(o.text)}</button>`).join('')}</div><div class="feedback" id="qFeedback"></div><div class="progress"><div style="width:${Math.round(i/questions.length*100)}%"></div></div></div>`;
    $$('[data-opt]').forEach(b=>b.onclick=()=>{if(locked)return;locked=true;const idx=Number(b.dataset.opt),ok=idx===q.answer;if(ok){c++;streak++;best=Math.max(best,streak);b.classList.add('correct')}else{w++;streak=0;b.classList.add('wrong');$(`[data-opt="${q.answer}"]`).classList.add('correct')}$('#qFeedback').textContent=ok?'✓ Correto':'✗ Revise esta forma';if(onAnswer)onAnswer(q,ok);setTimeout(()=>{i++;draw()},850)})
  }draw();
}
function vocabQuestions(pool,mode){
  const round=shuffle(pool).slice(0,Math.min(10,pool.length));return round.map(w=>{const dir=mode==='mixed'?(Math.random()<.5?'h2p':'p2h'):mode;let opts;if(dir==='h2p'){opts=shuffle([w,...shuffle(DATA.vocab.filter(x=>x.n!==w.n)).slice(0,3)]).map(x=>({text:x.p,hebrew:false,n:x.n}));return{prompt:w.h,hebrew:true,options:opts,answer:opts.findIndex(o=>o.n===w.n),wordId:w.n,meta:`Palavra ${w.n}`}}opts=shuffle([w,...shuffle(DATA.vocab.filter(x=>x.n!==w.n)).slice(0,3)]).map(x=>({text:x.h,hebrew:true,n:x.n}));return{prompt:w.p,hebrew:false,options:opts,answer:opts.findIndex(o=>o.n===w.n),wordId:w.n,meta:`Palavra ${w.n}`}})
}
function startVocab(){const pool=vocabPool();if(!pool.length){$('#vocabGame').innerHTML='<div class="rulebox">Este bloco ainda não possui palavras.</div>';return}const act=$('#vocabActivity').value,mode=$('#vocabMode').value;if(act==='quiz'){runChoiceQuiz($('#vocabGame'),vocabQuestions(pool,mode),'vocab',(q,ok)=>{if(ok)localErrors.delete(q.wordId);else localErrors.add(q.wordId);saveErrorSet()})}else if(act==='flash')startFlash(pool,mode);else startMatch(pool)}
function startFlash(pool,mode){const cards=shuffle(pool);let i=0,revealed=false;function draw(){if(i>=cards.length){$('#vocabGame').innerHTML='<div class="rulebox">Flashcards concluídos.</div>';return}const w=cards[i],dir=mode==='mixed'?(Math.random()<.5?'h2p':'p2h'):mode;const front=dir==='h2p'?w.h:w.p,back=dir==='h2p'?w.p:w.h,heb=dir==='h2p';$('#vocabGame').innerHTML=`<div class="flashcard"><div><div class="qmeta">${i+1}/${cards.length} • Palavra ${w.n}</div><div class="flashbig ${heb?'hebrew':''}">${esc(front)}</div><div class="flashans ${!revealed?'hidden':''} ${!heb?'hebrew':''}">${esc(back)}</div><div style="margin-top:18px"><button class="btn ${revealed?'ghost':'gold'}" id="flashAction">${revealed?'Próxima':'Mostrar resposta'}</button></div></div></div>`;$('#flashAction').onclick=()=>{if(!revealed){revealed=true;draw()}else{i++;revealed=false;draw()}}}draw()}
function startMatch(pool){const items=shuffle(pool).slice(0,Math.min(6,pool.length));let leftSel=null,rightSel=null,solved=new Set();function draw(){const left=shuffle(items),right=shuffle(items);$('#vocabGame').innerHTML=`<div class="quiz"><div class="qmeta">Associe hebraico e português</div><div class="match-grid" id="matchGrid"><div class="match-col">${left.map(w=>`<button class="match hebrew" data-side="l" data-id="${w.n}">${esc(w.h)}</button>`).join('')}</div><div class="match-col">${right.map(w=>`<button class="match" data-side="r" data-id="${w.n}">${esc(w.p)}</button>`).join('')}</div></div><div class="feedback" id="matchFeedback"></div></div>`;$$('.match').forEach(b=>{if(solved.has(Number(b.dataset.id)))b.classList.add('solved');b.onclick=()=>{if(b.classList.contains('solved'))return;const side=b.dataset.side;$$(`.match[data-side="${side}"]`).forEach(x=>x.classList.remove('selected'));b.classList.add('selected');if(side==='l')leftSel=Number(b.dataset.id);else rightSel=Number(b.dataset.id);if(leftSel&&rightSel){if(leftSel===rightSel){solved.add(leftSel);$('#matchFeedback').textContent='✓ Par correto';if(solved.size===items.length){recordResult('vocab-match',items.length,0,items.length);setTimeout(()=>$('#vocabGame').innerHTML='<div class="rulebox">Associação concluída ✓</div>',650)}else setTimeout(()=>{leftSel=rightSel=null;draw()},500)}else{$('#matchFeedback').textContent='✗ Tente novamente';setTimeout(()=>{leftSel=rightSel=null;draw()},600)}}}})}draw()}

function setupVerbTabs(){$$('[data-vtab]').forEach(b=>b.onclick=()=>{$$('[data-vtab]').forEach(x=>x.classList.toggle('active',x===b));$$('#verbs .subview').forEach(v=>v.classList.toggle('active',v.id===`verb-${b.dataset.vtab}`))});$$('[data-paradigm]').forEach(b=>b.onclick=()=>{$$('[data-paradigm]').forEach(x=>x.classList.toggle('active',x===b));renderParadigm(b.dataset.paradigm)})}
function renderRootTable(){$('#rootTable').innerHTML=DATA.core.raizes.map(r=>`<tr><td class="hebrew">${esc(r.h)}</td><td>${esc(r.p)}</td></tr>`).join('')}
function rootQuestions(){const roots=DATA.core.raizes,rounds=Number($('#rootRounds').value),dirSel=$('#rootDirection').value;return shuffle(roots).slice(0,rounds).map(r=>{const dir=dirSel==='mixed'?(Math.random()<.5?'h2p':'p2h'):dirSel;if(dir==='h2p'){const opts=shuffle([r,...shuffle(roots.filter(x=>x.id!==r.id)).slice(0,3)]).map(x=>({text:x.p,id:x.id}));return{prompt:r.h,hebrew:true,options:opts,answer:opts.findIndex(o=>o.id===r.id),meta:'Raiz verbal'}}const opts=shuffle([r,...shuffle(roots.filter(x=>x.id!==r.id)).slice(0,3)]).map(x=>({text:x.h,hebrew:true,id:x.id}));return{prompt:r.p,options:opts,answer:opts.findIndex(o=>o.id===r.id),meta:'Raiz verbal'}})}
function renderBinyanim(){$('#verbTable').innerHTML=DATA.core.binyanim.map(v=>`<tr><td><strong>${esc(v.nome)}</strong></td><td class="hebrew">${esc(v.heb)}</td><td>${esc(v.modo)}</td><td>${esc(v.voz)}</td><td>${esc(v.sentido)}</td></tr>`).join('')}
function binyanQuestions(){const a=DATA.core.binyanim;return shuffle(a).map(v=>{const opts=shuffle([v,...shuffle(a.filter(x=>x.id!==v.id)).slice(0,3)]).map(x=>({text:x.nome,id:x.id}));return{prompt:v.heb,hebrew:true,options:opts,answer:opts.findIndex(o=>o.id===v.id),meta:'Reconheça o tronco'}})}
function renderParadigm(type='perfect'){const rows=DATA.morph[type];const labels={perfect:'Perfeito Qal',imperfect:'Imperfeito Qal',imperative:'Imperativo Qal'};$('#paradigmTable').innerHTML=`<table><thead><tr><th colspan="6">${labels[type]}</th></tr><tr><th>PGN</th><th>Forma</th><th>Prefixo</th><th>Terminação</th><th>Leitura</th><th>Pista</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.pgn)}</td><td class="hebrew">${esc(r.form)}</td><td class="marker">${esc(r.prefix)}</td><td class="marker">${esc(r.suffix)}</td><td>${esc(r.reading)}</td><td>${type==='perfect'?'aformativo':type==='imperfect'?'preformativo + aformativo':'2ª pessoa'}</td></tr>`).join('')}</tbody></table>`}

function setupMorphTabs(){$$('[data-mtab]').forEach(b=>b.onclick=()=>{$$('[data-mtab]').forEach(x=>x.classList.toggle('active',x===b));$$('#morphology .subview').forEach(v=>v.classList.toggle('active',v.id===`morph-${b.dataset.mtab}`))})}
function markerOptions(type,field){const arr=DATA.morph[type],vals=[...new Set(arr.map(x=>x[field]))];return shuffle(vals)}
function normMarker(s){const x=(s||'').trim();return x===''||x==='Ø'||x==='0'?'∅':x}
function newBuildQuestion(){const type=$('#buildConj').value,arr=DATA.morph[type],item=pick(arr);currentBuild={type,item};const pref=markerOptions(type,'prefix'),suf=markerOptions(type,'suffix');$('#buildGame').innerHTML=`<div class="quiz"><div class="qmeta">${type==='perfect'?'Perfeito':type==='imperfect'?'Imperfeito':'Imperativo'} • paradigma שמר</div><div class="prompt" style="font-size:28px">Alvo: <strong>${esc(item.pgn)}</strong></div><p class="smallnote">Informe as marcas que ajudam a reconhecer esta forma.</p><div class="form-row" style="text-align:left;margin-top:12px"><div><label>Prefixo / preformativo</label><input id="buildPrefix" class="hebrew" placeholder="∅ ou marcador"><div class="marker-grid">${pref.map(x=>`<button type="button" class="marker-btn" data-fill="prefix" data-marker="${esc(x)}">${esc(x)}</button>`).join('')}</div></div><div><label>Terminação / aformativo</label><input id="buildSuffix" class="hebrew" placeholder="∅ ou terminação"><div class="marker-grid">${suf.map(x=>`<button type="button" class="marker-btn" data-fill="suffix" data-marker="${esc(x)}">${esc(x)}</button>`).join('')}</div></div></div><button class="btn gold" id="checkBuild" style="margin-top:15px">Conferir</button><div class="feedback" id="buildFeedback"></div><div id="buildAnswer"></div></div>`;$$('[data-fill]').forEach(b=>b.onclick=()=>{$(b.dataset.fill==='prefix'?'#buildPrefix':'#buildSuffix').value=b.dataset.marker});$('#checkBuild').onclick=checkBuild}
function checkBuild(){if(!currentBuild)return;const{item}=currentBuild,p=normMarker($('#buildPrefix').value),s=normMarker($('#buildSuffix').value),ok=p===normMarker(item.prefix)&&s===normMarker(item.suffix);$('#buildFeedback').textContent=ok?'✓ Estrutura correta':'✗ Confira prefixo e terminação';$('#buildAnswer').innerHTML=`<div class="answerbox"><div class="hebrew">${esc(item.form)}</div><strong>${esc(item.pgn)}</strong> • ${esc(item.reading)}<br><span class="smallnote">prefixo: ${esc(item.prefix)} • terminação: ${esc(item.suffix)}</span></div>`;recordSingle(ok,'morfologia-montar')}
function pgnParts(code){const m=code.match(/^([123])([mfc])([sp])$/);return m?{person:m[1],gender:m[2],number:m[3]}:null}
function allVerbalForms(){const out=[];['perfect','imperfect','imperative'].forEach(conj=>DATA.morph[conj].forEach(item=>out.push({conj,item})));return out}
function newIdentify(){currentIdentify=pick(allVerbalForms());const{conj,item}=currentIdentify;$('#identifyGame').innerHTML=`<div class="quiz"><div class="qmeta">Analise a forma</div><div class="prompt hebrew">${esc(item.form)}</div><div class="morph-form"><div><label>Conjugação</label><select id="idConj"><option value="perfect">Perfeito</option><option value="imperfect">Imperfeito</option><option value="imperative">Imperativo</option></select></div><div><label>Pessoa</label><select id="idPerson"><option value="1">1ª</option><option value="2">2ª</option><option value="3">3ª</option></select></div><div><label>Gênero</label><select id="idGender"><option value="m">Masculino</option><option value="f">Feminino</option><option value="c">Comum</option></select></div><div><label>Número</label><select id="idNumber"><option value="s">Singular</option><option value="p">Plural</option></select></div></div><button class="btn gold" id="checkIdentify" style="margin-top:14px">Analisar</button><div class="feedback" id="identifyFeedback"></div><div id="identifyAnswer"></div></div>`;$('#checkIdentify').onclick=checkIdentify}
function checkIdentify(){const{conj,item}=currentIdentify,code=$('#idPerson').value+$('#idGender').value+$('#idNumber').value,accepted=item.accepted||[item.pgn],ok=$('#idConj').value===conj&&accepted.includes(code);$('#identifyFeedback').textContent=ok?'✓ Análise aceita':'✗ Revise a forma e as marcas pessoais';$('#identifyAnswer').innerHTML=`<div class="answerbox"><strong>${conj==='perfect'?'Perfeito':conj==='imperfect'?'Imperfeito':'Imperativo'} Qal</strong><br><div class="hebrew">${esc(item.form)}</div><span>${esc(item.pgn)} • ${esc(item.reading)}</span>${accepted.length>1?'<br><span class="smallnote">Forma morfologicamente ambígua: o contexto decide entre '+accepted.join(' / ')+'</span>':''}</div>`;recordSingle(ok,'morfologia-identificar')}
function newNominal(){currentNominal=pick(DATA.morph.nominals);const n=currentNominal;$('#nominalGame').innerHTML=`<div class="quiz"><div class="qmeta">Morfologia nominal</div><div class="prompt hebrew">${esc(n.form)}</div><p>${esc(n.gloss)}</p><div class="noun-axis"><div class="axis"><strong>Gênero</strong><label><input type="radio" name="ng" value="m"> masculino</label><label><input type="radio" name="ng" value="f"> feminino</label></div><div class="axis"><strong>Número</strong><label><input type="radio" name="nn" value="s"> singular</label><label><input type="radio" name="nn" value="p"> plural</label></div><div class="axis"><strong>Estado</strong><label><input type="radio" name="ns" value="absolute"> absoluto</label><label><input type="radio" name="ns" value="construct"> construto</label></div></div><button class="btn gold" id="checkNominal" style="margin-top:14px">Conferir</button><div class="feedback" id="nominalFeedback"></div><div id="nominalAnswer"></div></div>`;$('#checkNominal').onclick=checkNominal}
function radioVal(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||''}
function checkNominal(){const n=currentNominal,ok=radioVal('ng')===n.gender&&radioVal('nn')===n.number&&radioVal('ns')===n.state;$('#nominalFeedback').textContent=ok?'✓ Análise correta':'✗ Revise os três eixos';$('#nominalAnswer').innerHTML=`<div class="answerbox"><div class="hebrew">${esc(n.form)}</div><strong>${n.gender==='m'?'masculino':'feminino'} • ${n.number==='s'?'singular':'plural'} • ${n.state==='construct'?'construto':'absoluto'}</strong><br><span class="smallnote">${esc(n.sourceNote)}</span></div>`;recordSingle(ok,'morfologia-nominal')}
function renderQuickRules(){$('#quickRules').innerHTML=DATA.morph.quickRules.map(r=>`<div class="card"><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join('')}

function numberQuestions(){const set=$('#numberSet').value==='card'?DATA.core.cardinais:DATA.core.ordinais,mode=$('#numberMode').value;const round=shuffle(set).slice(0,Math.min(10,set.length));return round.map(n=>{if(mode==='gender'&&n.f){const askM=Math.random()<.5,target=askM?n.m:n.f,other=askM?n.f:n.m;const distract=shuffle(set.filter(x=>x.id!==n.id).map(x=>askM?x.m:x.f).filter(Boolean)).slice(0,2);const opts=shuffle([target,other,...distract]).map((x,i)=>({text:x,hebrew:true,key:x}));return{prompt:`${n.pt} • ${askM?'masculino':'feminino'}`,options:opts,answer:opts.findIndex(o=>o.key===target),meta:'Gênero dos numerais'}}const heb=n.m||n.f,opts=shuffle([n,...shuffle(set.filter(x=>x.id!==n.id)).slice(0,3)]).map(x=>({text:x.pt,key:x.id}));return{prompt:heb,hebrew:true,options:opts,answer:opts.findIndex(o=>o.key===n.id),meta:'Numerais'}})}
function renderNumberTable(){const set=$('#numberSet').value==='card'?DATA.core.cardinais:DATA.core.ordinais;$('#numberTable').innerHTML=`<table><thead><tr><th>Número</th><th>Português</th><th>Masculino</th><th>Feminino</th></tr></thead><tbody>${set.map(n=>`<tr><td>${n.num}</td><td>${esc(n.pt)}</td><td class="hebrew">${esc(n.m)}</td><td class="hebrew">${esc(n.f||'—')}</td></tr>`).join('')}</tbody></table>`}

function renderKelley(){
  const K=DATA.kelley;$('#analysisAlgorithm').innerHTML=K.algorithm.map(x=>`<div>${esc(x)}</div>`).join('');$('#p1Info').textContent=K.examInfo.P1;$('#p2Info').textContent=K.examInfo.P2;$('#t1Info').textContent=K.examInfo.T1;
  const arr=K.lessons.filter(l=>kelleyFilter==='all'||l.exam===kelleyFilter);$('#lessonGrid').innerHTML=arr.map(l=>`<article class="lesson"><span class="examtag">${l.exam}</span><h3>Lição ${esc(l.id)} • ${esc(l.title)}</h3><p>${esc(l.pages)} • ${esc(l.summary)}</p><ul>${l.keys.map(k=>`<li>${esc(k)}</li>`).join('')}</ul></article>`).join('')
}
function setupKelleyFilters(){$$('[data-kfilter]').forEach(b=>b.onclick=()=>{kelleyFilter=b.dataset.kfilter;$$('[data-kfilter]').forEach(x=>x.classList.toggle('active',x===b));renderKelley()})}

function renderRanking(){const h=$('#rankList');if(!h)return;if(!rankingCache.length){h.innerHTML='<div class="rulebox">Carregando classificação ou ainda não há jogadores.</div>';return}h.innerHTML=rankingCache.map((r,i)=>`<div class="rank-item"><div class="rank-pos">${i+1}</div><div class="rank-name">${esc(r.name||'Aluno')}<small>${Number(r.correct||0)} acertos • ${Number(r.games||0)} rodadas</small></div><strong>${Number(r.points||0)} XP</strong></div>`).join('')}
function renderProfile(){if(!currentUser||!$('#profileCard'))return;const total=meStats.correct+meStats.wrong;$('#profileCard').innerHTML=`<h2>${esc(currentUser.displayName||currentUser.email?.split('@')[0]||'Aluno')}</h2><p>${esc(currentUser.email||'')}</p><div class="stats"><div class="stat"><b>${meStats.points}</b><span>XP</span></div><div class="stat"><b>${meStats.correct}</b><span>acertos</span></div><div class="stat"><b>${meStats.wrong}</b><span>erros</span></div><div class="stat"><b>${total?Math.round(meStats.correct/total*100):0}%</b><span>precisão</span></div></div><div class="rulebox">Conteúdo: ${DATA.vocab.length}/${DATA.version.targetWords} palavras • versão ${esc(DATA.version.appVersion)}.</div>`}

function setupEvents(){
  $('#tabLogin').onclick=()=>setAuthMode('login');$('#tabRegister').onclick=()=>setAuthMode('register');$('#authForm').addEventListener('submit',submitAuth);$('#logoutBtn').onclick=()=>auth.signOut();
  setupNavigation();$('#startVocab').onclick=startVocab;$('#startRoots').onclick=()=>runChoiceQuiz($('#rootGame'),rootQuestions(),'raizes');$('#startBinyanQuiz').onclick=()=>runChoiceQuiz($('#binyanGame'),binyanQuestions(),'binyanim');
  $('#newBuild').onclick=newBuildQuestion;$('#buildConj').onchange=newBuildQuestion;$('#newIdentify').onclick=newIdentify;$('#newNominal').onclick=newNominal;
  $('#startNumbers').onclick=()=>{renderNumberTable();runChoiceQuiz($('#numberGame'),numberQuestions(),'numerais')};$('#numberSet').onchange=renderNumberTable;
  setupVerbTabs();setupMorphTabs();setupKelleyFilters();
}
function renderStatic(){renderVocabGroups();renderRootTable();renderBinyanim();renderParadigm('perfect');renderQuickRules();renderNumberTable();renderKelley();newBuildQuestion();newIdentify();newNominal();handleVersion();renderHomeStats()}

async function start(){
  try{await loadData()}catch(e){showLoadError(e);return}
  setupEvents();renderStatic();registerSW();
  auth.onAuthStateChanged(async user=>{
    currentUser=user;
    if(user){await ensureUserDoc(user);$('#authView').classList.add('hidden');$('#appView').classList.remove('hidden');$('#userLabel').textContent=user.displayName||user.email?.split('@')[0]||'Aluno';subscribeUser(user);subscribeRanking();showView('home')}
    else{$('#appView').classList.add('hidden');$('#authView').classList.remove('hidden');if(unsubscribeUser){unsubscribeUser();unsubscribeUser=null}if(unsubscribeRanking){unsubscribeRanking();unsubscribeRanking=null}meStats={points:0,correct:0,wrong:0,bestStreak:0,games:0};setAuthMode('login')}
  });
}
start();
})();
