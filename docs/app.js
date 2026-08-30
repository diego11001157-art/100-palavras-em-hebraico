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
let lastBuildId='',lastIdentifyId='',lastNominalId='';
const localErrors=new Set(JSON.parse(localStorage.getItem('alef_vocab_errors')||'[]'));

const firebaseApp=firebase.initializeApp(window.ALEF_FIREBASE_CONFIG);
const auth=firebase.auth();
const db=firebase.firestore();
const rtdb=firebase.database();

let presenceCache={},presenceAllRef=null,presenceAllCb=null,myPresenceRef=null,connectedRef=null,connectedCb=null;
let myAvailability=localStorage.getItem('alef_duel_available')==='1';
let inviteListeners=new Map(),pendingInvites={};
let currentDuelId=null,currentDuelData=null,currentDuelRef=null,currentDuelCb=null,reactionRef=null,reactionCb=null;
let duelAnswerLocked=false,duelReactionKeys=new Set();

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
  if(id==='ranking')renderRanking();if(id==='profile')renderProfile();if(id==='kelley')renderKelley();if(id==='duels')renderSocial();
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
  unsubscribeRanking=db.collection('users').orderBy('points','desc').limit(50).onSnapshot(s=>{rankingCache=s.docs.map(d=>({id:d.id,...d.data()}));renderRanking();renderSocial();refreshInviteListeners()},()=>{rankingCache=[];renderRanking()});
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

function setupMorphTabs(){$$('[data-mtab]').forEach(b=>b.onclick=()=>{$$('[data-mtab]').forEach(x=>x.classList.toggle('active',x===b));$$('#morphology .subview').forEach(v=>v.classList.toggle('active',v.id===`morph-${b.dataset.mtab}`));if(b.dataset.mtab==='bank')renderFormBank()})}
function practiceSets(){return DATA.morph.practiceParadigms||{shmr:{key:'shmr',root:'שמר',meaning:'guardar',label:'שמר — guardar',perfect:DATA.morph.perfect,imperfect:DATA.morph.imperfect,imperative:DATA.morph.imperative}}}
function selectedPracticeSet(){const sets=practiceSets(),key=$('#buildRoot')?.value||Object.keys(sets)[0];return sets[key]||sets[Object.keys(sets)[0]]}
function practiceRows(type,rootKey){const sets=practiceSets(),set=rootKey?sets[rootKey]:selectedPracticeSet();return set?.[type]||DATA.morph[type]||[]}
function markerOptions(type,field){const vals=[...new Set(practiceRows(type).map(x=>x[field]))];return shuffle(vals)}
function normMarker(s){const x=(s||'').trim();return x===''||x==='Ø'||x==='0'?'∅':x}
function pickAvoid(arr,last,idFn=x=>x.id||x.form){if(arr.length<2)return arr[0];let p=pick(arr),tries=0;while(idFn(p)===last&&tries++<12)p=pick(arr);return p}
function catLabel(v){const map={perfect:'Perfeito',imperfect:'Imperfeito',imperative:'Imperativo',wayyiqtol:'Waw consecutivo',perfect_consecutive:'Perfeito consecutivo',inf_construct:'Infinitivo construto',inf_absolute:'Infinitivo absoluto',participle:'Particípio'};return map[v]||v}
function genderLabel(v){return v==='m'?'masculino':v==='f'?'feminino':v==='c'?'comum':'—'}
function numberLabel(v){return v==='s'?'singular':v==='p'?'plural':'—'}
function personLabel(v){return v==='1'?'1ª':v==='2'?'2ª':v==='3'?'3ª':'—'}
function sourceBadge(t){const cls=t==='Vocabulário'?'real':t==='Kelley'?'kelley':'';return`<span class="source-badge ${cls}">${esc(t||'Prática')}</span>`}

function morphStrip(item){return`<div class="analysis-strip"><span class="analysis-chip"><b>FORMA</b> ${esc(catLabel(item.category))}</span><span class="analysis-chip"><b>TRONCO</b> ${esc(item.stem||'Qal')}</span><span class="analysis-chip"><b>PGN</b> ${esc(item.pgn||'—')}</span><span class="analysis-chip"><b>RAIZ</b> <span class="hebrew">${esc(item.root||'—')}</span></span><span class="analysis-chip"><b>LÉXICO</b> ${esc(item.gloss||item.reading||'—')}</span></div>`}

function newBuildQuestion(){
  const type=$('#buildConj').value,mode=$('#buildMode').value,set=selectedPracticeSet(),arr=set[type]||[];
  const item=pickAvoid(arr,lastBuildId);lastBuildId=item.id;currentBuild={type,mode,item,answered:false};
  const title=catLabel(type),pref=markerOptions(type,'prefix'),suf=markerOptions(type,'suffix');
  const head=`${title} Qal • <span class="hebrew">${esc(set.root)}</span> — ${esc(set.meaning)}`;
  if(mode==='ending'){
    const body=item.body??item.form;
    $('#buildGame').innerHTML=`<div class="quiz"><div class="qmeta">${head}</div><div class="prompt" style="font-size:30px">${esc(item.reading)}</div><div class="session-note"><span>Alvo morfológico: <strong>${esc(item.pgn)}</strong></span><span>Complete somente a terminação</span></div><div class="build-stage"><div class="compose-box"><div class="smallnote">Forma em construção</div><div class="compose-line"><span class="compose-base hebrew" id="composePreview">${esc(body)}</span></div><label style="text-align:left;margin-top:8px">Terminação / aformativo</label><input id="buildEnding" class="hebrew" readonly placeholder="toque numa terminação"><div class="marker-grid">${suf.map(x=>`<button type="button" class="marker-btn" data-ending="${esc(x)}">${esc(x)}</button>`).join('')}</div><button type="button" class="btn ghost" id="clearEnding" style="margin-top:8px">Limpar</button></div></div><button class="btn gold" id="checkBuild" style="margin-top:15px">Conferir</button><div class="feedback" id="buildFeedback"></div><div id="buildAnswer"></div></div>`;
    const inp=$('#buildEnding');const update=()=>{$('#composePreview').textContent=body+(normMarker(inp.value)==='∅'?'':inp.value)};$$('[data-ending]').forEach(b=>b.onclick=()=>{inp.value=b.dataset.ending;update()});$('#clearEnding').onclick=()=>{inp.value='';update()};update();
  }else{
    $('#buildGame').innerHTML=`<div class="quiz"><div class="qmeta">${head}</div><div class="prompt" style="font-size:30px">Alvo: <strong>${esc(item.pgn)}</strong></div><p class="smallnote">Reconheça as duas bordas da forma: preformativo e aformativo.</p><div class="form-row" style="text-align:left;margin-top:12px"><div><label>Prefixo / preformativo</label><input id="buildPrefix" class="hebrew" readonly placeholder="toque no marcador"><div class="marker-grid">${pref.map(x=>`<button type="button" class="marker-btn" data-fill="prefix" data-marker="${esc(x)}">${esc(x)}</button>`).join('')}</div></div><div><label>Terminação / aformativo</label><input id="buildSuffix" class="hebrew" readonly placeholder="toque na terminação"><div class="marker-grid">${suf.map(x=>`<button type="button" class="marker-btn" data-fill="suffix" data-marker="${esc(x)}">${esc(x)}</button>`).join('')}</div></div></div><button type="button" class="btn ghost" id="clearMarkers" style="margin-top:9px">Limpar marcadores</button><button class="btn gold" id="checkBuild" style="margin-top:15px">Conferir</button><div class="feedback" id="buildFeedback"></div><div id="buildAnswer"></div></div>`;
    $$('[data-fill]').forEach(b=>b.onclick=()=>{$(b.dataset.fill==='prefix'?'#buildPrefix':'#buildSuffix').value=b.dataset.marker});$('#clearMarkers').onclick=()=>{$('#buildPrefix').value='';$('#buildSuffix').value=''};
  }
  $('#checkBuild').onclick=checkBuild;
}
function checkBuild(){
  if(!currentBuild||currentBuild.answered)return;const{item,mode}=currentBuild;let ok=false;
  if(mode==='ending')ok=normMarker($('#buildEnding').value)===normMarker(item.suffix);
  else ok=normMarker($('#buildPrefix').value)===normMarker(item.prefix)&&normMarker($('#buildSuffix').value)===normMarker(item.suffix);
  currentBuild.answered=true;$('#buildFeedback').textContent=ok?'✓ Estrutura correta':'✗ Revise a marca morfológica';
  $('#buildAnswer').innerHTML=`<div class="answerbox"><div class="hebrew">${esc(item.form)}</div><strong>${esc(item.pgn)}</strong> • ${esc(item.reading)}<br><span class="smallnote">prefixo: ${esc(item.prefix)} • terminação: ${esc(item.suffix)}</span>${morphStrip(item)}<div class="answer-actions"><button class="btn gold" id="nextBuild">Próxima questão</button></div></div>`;
  $('#checkBuild').disabled=true;$('#nextBuild').onclick=newBuildQuestion;recordSingle(ok,'morfologia-montar');
}

function normalizedParadigmForms(){const out=[];const sets=practiceSets();Object.values(sets).forEach(set=>['perfect','imperfect','imperative'].forEach(category=>(set[category]||[]).forEach(item=>out.push({...item,category,categoryLabel:catLabel(category),stem:item.stem||'Qal',root:item.root||set.root,gloss:item.gloss||set.meaning,finite:true,sourceType:item.sourceType||'Prática',source:item.source||'Paradigma didático de verbo forte'}))));return out}
function allVerbalForms(){const raw=[...normalizedParadigmForms(),...(DATA.morph.verbalForms||[])],seen=new Set();return raw.filter(x=>{const k=[x.form,x.stem,x.category,x.pgn||'',x.root||''].join('|');if(seen.has(k))return false;seen.add(k);return true})}
function categoryOptions(){const seen=new Map();allVerbalForms().forEach(x=>seen.set(x.category,catLabel(x.category)));return[...seen].map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('')}
function stemOptions(){return[...new Set(allVerbalForms().map(x=>x.stem).filter(Boolean))].map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
function newIdentify(){
  const arr=allVerbalForms(),item=pickAvoid(arr,lastIdentifyId);lastIdentifyId=item.id;currentIdentify={item,answered:false};
  $('#identifyGame').innerHTML=`<div class="quiz"><div class="qmeta">Analise a forma • ${sourceBadge(item.sourceType)}</div><div class="prompt hebrew">${esc(item.form)}</div><div class="identify-grid"><div><label>Forma</label><select id="idConj">${categoryOptions()}</select></div><div><label>Tronco</label><select id="idStem">${stemOptions()}</select></div><div><label>Pessoa</label><select id="idPerson"><option value="na">— não se aplica</option><option value="1">1ª</option><option value="2">2ª</option><option value="3">3ª</option></select></div><div><label>Gênero</label><select id="idGender"><option value="na">— não se aplica</option><option value="m">Masculino</option><option value="f">Feminino</option><option value="c">Comum</option></select></div><div><label>Número</label><select id="idNumber"><option value="na">— não se aplica</option><option value="s">Singular</option><option value="p">Plural</option></select></div></div><button class="btn gold" id="checkIdentify" style="margin-top:14px">Analisar</button><div class="feedback" id="identifyFeedback"></div><div id="identifyAnswer"></div></div>`;
  $('#checkIdentify').onclick=checkIdentify;
}
function checkIdentify(){
  if(!currentIdentify||currentIdentify.answered)return;const item=currentIdentify.item;const catOk=$('#idConj').value===item.category,stemOk=$('#idStem').value===item.stem;let morphOk=false;
  const person=$('#idPerson').value,gender=$('#idGender').value,number=$('#idNumber').value;
  if(item.finite){const code=person+gender+number;const accepted=item.accepted?.length?item.accepted:[item.pgn];morphOk=accepted.includes(code)}
  else if(item.category==='participle')morphOk=person==='na'&&gender===item.gender&&number===item.number;
  else morphOk=person==='na'&&gender==='na'&&number==='na';
  const ok=catOk&&stemOk&&morphOk;currentIdentify.answered=true;$('#identifyFeedback').textContent=ok?'✓ Análise aceita':'✗ Compare forma, tronco e marcas pessoais';
  const ambiguity=item.accepted?.length>1?`<div class="smallnote" style="margin-top:7px">Forma ambígua: ${item.accepted.join(' / ')}; o contexto decide.</div>`:'';
  $('#identifyAnswer').innerHTML=`<div class="answerbox"><div class="hebrew">${esc(item.form)}</div><strong>${esc(catLabel(item.category))} • ${esc(item.stem)}</strong><br><span>${item.finite?esc(item.pgn):item.category==='participle'?`${genderLabel(item.gender)} • ${numberLabel(item.number)}`:'forma não finita'} • ${esc(item.reading||item.gloss)}</span>${ambiguity}${item.note?`<div class="smallnote" style="margin-top:7px">${esc(item.note)}</div>`:''}${morphStrip(item)}<div class="source" style="margin-top:8px">Fonte de estudo: ${esc(item.source||'material didático')}</div><div class="answer-actions"><button class="btn gold" id="nextIdentify">Próxima forma</button></div></div>`;
  $('#checkIdentify').disabled=true;$('#nextIdentify').onclick=newIdentify;recordSingle(ok,'morfologia-identificar');
}

function setupFormBank(){
  const forms=allVerbalForms(),cat=$('#bankCategory'),stem=$('#bankStem'),root=$('#bankRoot');if(!cat||!stem||!root)return;
  const catMap=new Map();forms.forEach(x=>catMap.set(x.category,catLabel(x.category)));cat.innerHTML='<option value="all">Todas</option>'+[...catMap].map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('');
  stem.innerHTML='<option value="all">Todos</option>'+[...new Set(forms.map(x=>x.stem).filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  root.innerHTML='<option value="all">Todas</option>'+[...new Set(forms.map(x=>x.root).filter(Boolean))].map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  [cat,stem,root].forEach(x=>x.onchange=renderFormBank);renderFormBank();
}
function renderFormBank(){
  const holder=$('#formBank');if(!holder)return;let forms=allVerbalForms();const c=$('#bankCategory')?.value||'all',s=$('#bankStem')?.value||'all',r=$('#bankRoot')?.value||'all';
  if(c!=='all')forms=forms.filter(x=>x.category===c);if(s!=='all')forms=forms.filter(x=>x.stem===s);if(r!=='all')forms=forms.filter(x=>x.root===r);
  holder.innerHTML=forms.map(x=>`<article class="form-entry"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong>${esc(catLabel(x.category))}</strong>${sourceBadge(x.sourceType)}</div><div class="bigform">${esc(x.form)}</div><div class="meta"><span class="analysis-chip"><b>${esc(x.stem)}</b></span><span class="analysis-chip">raiz <span class="hebrew">${esc(x.root)}</span></span><span class="analysis-chip">${x.finite?esc(x.pgn):x.category==='participle'?`${genderLabel(x.gender)} • ${numberLabel(x.number)}`:'não finita'}</span></div><p style="margin-top:8px">${esc(x.reading||x.gloss)}</p>${x.note?`<div class="smallnote" style="margin-top:6px">${esc(x.note)}</div>`:''}<div class="source">${esc(x.source||'Material didático')}</div></article>`).join('')||'<div class="rulebox">Nenhuma forma neste filtro.</div>';
}

function newNominal(){
  const n=pickAvoid(DATA.morph.nominals,lastNominalId);lastNominalId=n.id;currentNominal={item:n,answered:false};
  $('#nominalGame').innerHTML=`<div class="quiz"><div class="qmeta">Morfologia nominal • ${esc(n.class||'forma nominal')}</div><div class="prompt hebrew">${esc(n.form)}</div><p>${esc(n.gloss)}</p><div class="noun-axis"><div class="axis"><strong>Gênero</strong><label><input type="radio" name="ng" value="m"> masculino</label><label><input type="radio" name="ng" value="f"> feminino</label></div><div class="axis"><strong>Número</strong><label><input type="radio" name="nn" value="s"> singular</label><label><input type="radio" name="nn" value="p"> plural</label></div><div class="axis"><strong>Estado</strong><label><input type="radio" name="ns" value="absolute"> absoluto</label><label><input type="radio" name="ns" value="construct"> construto</label></div></div><button class="btn gold" id="checkNominal" style="margin-top:14px">Conferir</button><div class="feedback" id="nominalFeedback"></div><div id="nominalAnswer"></div></div>`;$('#checkNominal').onclick=checkNominal;
}
function radioVal(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||''}
function checkNominal(){
  if(!currentNominal||currentNominal.answered)return;const n=currentNominal.item,ok=radioVal('ng')===n.gender&&radioVal('nn')===n.number&&radioVal('ns')===n.state;currentNominal.answered=true;
  $('#nominalFeedback').textContent=ok?'✓ Análise correta':'✗ Revise gênero, número e estado';$('#nominalAnswer').innerHTML=`<div class="answerbox"><div class="hebrew">${esc(n.form)}</div><strong>${genderLabel(n.gender)} • ${numberLabel(n.number)} • ${n.state==='construct'?'construto':'absoluto'}</strong><br><span class="smallnote">${esc(n.sourceNote)}</span><div class="answer-actions"><button class="btn gold" id="nextNominal">Próxima palavra</button></div></div>`;$('#checkNominal').disabled=true;$('#nextNominal').onclick=newNominal;recordSingle(ok,'morfologia-nominal');
}
function renderQuickRules(){$('#quickRules').innerHTML=DATA.morph.quickRules.map(r=>`<div class="card"><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join('')}

function numberQuestions(){const set=$('#numberSet').value==='card'?DATA.core.cardinais:DATA.core.ordinais,mode=$('#numberMode').value;const round=shuffle(set).slice(0,Math.min(10,set.length));return round.map(n=>{if(mode==='gender'&&n.f){const askM=Math.random()<.5,target=askM?n.m:n.f,other=askM?n.f:n.m;const distract=shuffle(set.filter(x=>x.id!==n.id).map(x=>askM?x.m:x.f).filter(Boolean)).slice(0,2);const opts=shuffle([target,other,...distract]).map((x,i)=>({text:x,hebrew:true,key:x}));return{prompt:`${n.pt} • ${askM?'masculino':'feminino'}`,options:opts,answer:opts.findIndex(o=>o.key===target),meta:'Gênero dos numerais'}}const heb=n.m||n.f,opts=shuffle([n,...shuffle(set.filter(x=>x.id!==n.id)).slice(0,3)]).map(x=>({text:x.pt,key:x.id}));return{prompt:heb,hebrew:true,options:opts,answer:opts.findIndex(o=>o.key===n.id),meta:'Numerais'}})}
function renderNumberTable(){const set=$('#numberSet').value==='card'?DATA.core.cardinais:DATA.core.ordinais;$('#numberTable').innerHTML=`<table><thead><tr><th>Número</th><th>Português</th><th>Masculino</th><th>Feminino</th></tr></thead><tbody>${set.map(n=>`<tr><td>${n.num}</td><td>${esc(n.pt)}</td><td class="hebrew">${esc(n.m)}</td><td class="hebrew">${esc(n.f||'—')}</td></tr>`).join('')}</tbody></table>`}

function renderKelley(){
  const K=DATA.kelley;$('#analysisAlgorithm').innerHTML=K.algorithm.map(x=>`<div>${esc(x)}</div>`).join('');$('#p1Info').textContent=K.examInfo.P1;$('#p2Info').textContent=K.examInfo.P2;$('#t1Info').textContent=K.examInfo.T1;if(K.analyticalLexicon){$('#lexiconBridgeText').textContent=K.analyticalLexicon.text;$('#lexiconBridgeNote').textContent=K.analyticalLexicon.note;}
  const arr=K.lessons.filter(l=>kelleyFilter==='all'||l.exam===kelleyFilter);$('#lessonGrid').innerHTML=arr.map(l=>`<article class="lesson"><span class="examtag">${l.exam}</span><h3>Lição ${esc(l.id)} • ${esc(l.title)}</h3><p>${esc(l.pages)} • ${esc(l.summary)}</p><ul>${l.keys.map(k=>`<li>${esc(k)}</li>`).join('')}</ul></article>`).join('')
}
function setupKelleyFilters(){$$('[data-kfilter]').forEach(b=>b.onclick=()=>{kelleyFilter=b.dataset.kfilter;$$('[data-kfilter]').forEach(x=>x.classList.toggle('active',x===b));renderKelley()})}

function displayNameForUid(uid){
  const p=presenceCache[uid]||{};
  const r=rankingCache.find(x=>x.id===uid)||{};
  return p.name||r.name||'Aluno';
}
function lastSeenText(ts){
  const n=Number(ts||0);if(!n)return'último acesso indisponível';
  const now=Date.now(),diff=Math.max(0,now-n),min=Math.floor(diff/60000),h=Math.floor(diff/3600000);
  const d=new Date(n),today=new Date();
  if(diff<60000)return'agora';
  if(min<60)return`há ${min} min`;
  if(h<24&&d.getDate()===today.getDate())return`hoje, ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  const y=new Date(today);y.setDate(today.getDate()-1);
  if(d.toDateString()===y.toDateString())return`ontem, ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function presenceLine(uid){
  const p=presenceCache[uid];
  if(!p)return{online:false,available:false,text:'ainda não acessou a v1.5'};
  return{online:!!p.online,available:!!p.availableForDuel,text:p.online?'online':lastSeenText(p.lastSeen)};
}
function renderRanking(){
  const h=$('#rankList');if(!h)return;
  if(!rankingCache.length){h.innerHTML='<div class="rulebox">Carregando classificação ou ainda não há jogadores.</div>';return}
  const onlineCount=Object.values(presenceCache).filter(p=>p&&p.online).length;
  if($('#rankingOnlineBadge'))$('#rankingOnlineBadge').textContent=`${onlineCount} ONLINE`;
  h.innerHTML=rankingCache.map((r,i)=>{
    const ps=presenceLine(r.id),mine=currentUser&&r.id===currentUser.uid;
    const challenge=(!mine&&ps.online&&ps.available)?`<div class="rank-challenge"><button class="btn gold small" data-challenge="${r.id}">⚔️ Desafiar</button></div>`:'';
    return`<div class="rank-item social-rank"><div class="rank-pos">${i+1}</div><div class="rank-name"><span class="status-dot ${ps.online?'online':'offline'}"></span>${esc(r.name||'Aluno')}<small>${Number(r.correct||0)} acertos • ${Number(r.games||0)} rodadas</small><div class="rank-presence">${ps.online?(ps.available?'⚔️ disponível para duelo':'🟢 online'):('🔴 '+esc(ps.text))}</div></div><strong>${Number(r.points||0)} XP</strong>${challenge}</div>`
  }).join('');
  $$('[data-challenge]').forEach(b=>b.onclick=()=>sendChallenge(b.dataset.challenge));
}
function renderProfile(){
  if(!currentUser||!$('#profileCard'))return;const total=meStats.correct+meStats.wrong,ps=presenceLine(currentUser.uid);
  $('#profileCard').innerHTML=`<h2>${esc(currentUser.displayName||currentUser.email?.split('@')[0]||'Aluno')}</h2><p>${esc(currentUser.email||'')}</p><div class="stats"><div class="stat"><b>${meStats.points}</b><span>XP</span></div><div class="stat"><b>${meStats.correct}</b><span>acertos</span></div><div class="stat"><b>${meStats.wrong}</b><span>erros</span></div><div class="stat"><b>${total?Math.round(meStats.correct/total*100):0}%</b><span>precisão</span></div></div><div class="rulebox"><span class="status-dot ${ps.online?'online':'offline'}"></span>${ps.online?'Online agora':'Offline • '+esc(ps.text)}${ps.available?'<br>⚔️ Disponível para duelo':''}<br><br>Conteúdo: ${DATA.vocab.length}/${DATA.version.targetWords} palavras • versão ${esc(DATA.version.appVersion)}.</div>`
}


function myName(){return currentUser?.displayName||currentUser?.email?.split('@')[0]||'Aluno'}
function setMyAvailability(value){
  myAvailability=!!value;localStorage.setItem('alef_duel_available',myAvailability?'1':'0');
  if(myPresenceRef)myPresenceRef.update({availableForDuel:myAvailability,lastSeen:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
  if($('#duelAvailability'))$('#duelAvailability').checked=myAvailability;
  renderSocial();renderRanking();
}
function startPresence(user){
  stopPresence(false);
  myPresenceRef=rtdb.ref(`presence/${user.uid}`);
  connectedRef=rtdb.ref('.info/connected');
  connectedCb=s=>{
    if(s.val()!==true)return;
    const offline={online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP,availableForDuel:false,name:myName()};
    myPresenceRef.onDisconnect().set(offline).catch(()=>{});
    myPresenceRef.set({online:true,lastSeen:firebase.database.ServerValue.TIMESTAMP,availableForDuel:myAvailability,name:myName()}).catch(()=>{});
  };
  connectedRef.on('value',connectedCb);

  presenceAllRef=rtdb.ref('presence');
  presenceAllCb=s=>{
    presenceCache=s.val()||{};
    renderSocial();renderRanking();renderProfile();refreshInviteListeners();
  };
  presenceAllRef.on('value',presenceAllCb);
}
function stopPresence(markOffline=true){
  if(markOffline&&myPresenceRef)myPresenceRef.set({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP,availableForDuel:false,name:myName()}).catch(()=>{});
  if(connectedRef&&connectedCb)connectedRef.off('value',connectedCb);
  if(presenceAllRef&&presenceAllCb)presenceAllRef.off('value',presenceAllCb);
  connectedRef=connectedCb=presenceAllRef=presenceAllCb=myPresenceRef=null;
  presenceCache={};
  clearInviteListeners();
  stopDuelWatch();
}
function clearInviteListeners(){
  inviteListeners.forEach(({ref,cb})=>ref.off('value',cb));inviteListeners.clear();pendingInvites={};
}
function refreshInviteListeners(){
  if(!currentUser)return;
  const ids=new Set([...Object.keys(presenceCache),...rankingCache.map(x=>x.id)]);
  ids.delete(currentUser.uid);
  ids.forEach(uid=>{
    if(inviteListeners.has(uid))return;
    const ref=rtdb.ref(`invites/${currentUser.uid}/${uid}`);
    const cb=s=>{
      const v=s.val();
      if(v&&v.status==='pending')pendingInvites[uid]=v;else delete pendingInvites[uid];
      renderSocial();
    };
    ref.on('value',cb,()=>{});
    inviteListeners.set(uid,{ref,cb});
  });
}
function buildDuelQuestions(){
  const pool=shuffle(DATA.vocab).slice(0,Math.min(10,DATA.vocab.length));
  const out={};
  pool.forEach((w,i)=>{
    const distract=shuffle(DATA.vocab.filter(x=>x.n!==w.n&&x.p!==w.p)).slice(0,3).map(x=>x.p);
    const options=shuffle([w.p,...distract]);
    out[i]={n:w.n,prompt:w.h,options,answer:options.indexOf(w.p)};
  });
  return out;
}
function questionArray(q){return Array.isArray(q)?q:Object.keys(q||{}).sort((a,b)=>Number(a)-Number(b)).map(k=>q[k])}
async function sendChallenge(toUid){
  if(!currentUser||toUid===currentUser.uid)return;
  const target=presenceCache[toUid]||{};
  if(!target.online||!target.availableForDuel){alert('Esse jogador não está disponível para duelo agora.');return}
  if(currentDuelId&&currentDuelData?.meta?.status==='active'){alert('Finalize o duelo atual antes de iniciar outro.');return}
  try{
    const duelId=rtdb.ref('duels').push().key,toName=displayNameForUid(toUid);
    await rtdb.ref(`duels/${duelId}/meta`).set({challenger:currentUser.uid,opponent:toUid,status:'invited',createdAt:firebase.database.ServerValue.TIMESTAMP,challengerName:myName(),opponentName:toName});
    await rtdb.ref(`duels/${duelId}/questions`).set(buildDuelQuestions());
    await rtdb.ref(`duels/${duelId}/players/${currentUser.uid}`).set({name:myName(),score:0,index:0,finished:false});
    await rtdb.ref(`invites/${toUid}/${currentUser.uid}`).set({fromUid:currentUser.uid,toUid,status:'pending',createdAt:firebase.database.ServerValue.TIMESTAMP,duelId,fromName:myName()});
    watchDuel(duelId);showView('duels');
  }catch(e){console.error(e);alert('Não foi possível enviar o desafio agora.')}
}
async function acceptInvite(fromUid){
  const inv=pendingInvites[fromUid];if(!inv||!currentUser)return;
  try{
    const duelId=inv.duelId;
    await rtdb.ref(`duels/${duelId}/players/${currentUser.uid}`).set({name:myName(),score:0,index:0,finished:false});
    await rtdb.ref(`duels/${duelId}/meta`).update({status:'active',startedAt:firebase.database.ServerValue.TIMESTAMP});
    await rtdb.ref(`invites/${currentUser.uid}/${fromUid}`).update({status:'accepted'});
    setMyAvailability(false);watchDuel(duelId);showView('duels');
  }catch(e){console.error(e);alert('Não foi possível aceitar o desafio.')}
}
async function rejectInvite(fromUid){
  const inv=pendingInvites[fromUid];if(!inv||!currentUser)return;
  try{
    if(inv.duelId)await rtdb.ref(`duels/${inv.duelId}/meta`).update({status:'rejected',endedAt:firebase.database.ServerValue.TIMESTAMP});
    await rtdb.ref(`invites/${currentUser.uid}/${fromUid}`).update({status:'rejected'});
  }catch(e){console.error(e)}
}
async function cancelCurrentInvite(){
  if(!currentUser||!currentDuelData?.meta)return;
  const m=currentDuelData.meta;if(m.challenger!==currentUser.uid||m.status!=='invited')return;
  try{
    await rtdb.ref(`duels/${currentDuelId}/meta`).update({status:'cancelled',endedAt:firebase.database.ServerValue.TIMESTAMP});
    await rtdb.ref(`invites/${m.opponent}/${currentUser.uid}`).remove();
  }catch(e){console.error(e)}
}
function stopDuelWatch(clearStored=true){
  if(currentDuelRef&&currentDuelCb)currentDuelRef.off('value',currentDuelCb);
  if(reactionRef&&reactionCb)reactionRef.off('child_added',reactionCb);
  currentDuelRef=currentDuelCb=reactionRef=reactionCb=null;currentDuelId=null;currentDuelData=null;duelAnswerLocked=false;duelReactionKeys.clear();
  if(clearStored)localStorage.removeItem('alef_current_duel');
}
function watchDuel(duelId){
  if(!duelId)return;
  if(currentDuelId===duelId&&currentDuelRef)return;
  stopDuelWatch(false);currentDuelId=duelId;localStorage.setItem('alef_current_duel',duelId);duelReactionKeys.clear();
  currentDuelRef=rtdb.ref(`duels/${duelId}`);
  currentDuelCb=s=>{
    currentDuelData=s.val()||null;
    const st=currentDuelData?.meta?.status;
    if(st==='active'){setMyAvailability(false);maybeFinishDuel()}
    renderSocial();
  };
  currentDuelRef.on('value',currentDuelCb,()=>{localStorage.removeItem('alef_current_duel');stopDuelWatch(true);renderSocial()});
  reactionRef=rtdb.ref(`duels/${duelId}/reactions`).limitToLast(8);
  const attachedAt=Date.now();
  reactionCb=s=>{
    if(duelReactionKeys.has(s.key))return;duelReactionKeys.add(s.key);
    const v=s.val()||{};
    if(v.fromUid!==currentUser?.uid&&Number(v.createdAt||0)>=attachedAt-1500)showReaction(v.emoji,displayNameForUid(v.fromUid));
  };
  reactionRef.on('child_added',reactionCb,()=>{});
}
function maybeFinishDuel(){
  if(!currentDuelData||currentDuelData.meta?.status!=='active')return;
  const q=questionArray(currentDuelData.questions),players=currentDuelData.players||{},m=currentDuelData.meta;
  const a=players[m.challenger],b=players[m.opponent];
  if(a?.finished&&b?.finished){
    const winner=a.score===b.score?'draw':(a.score>b.score?m.challenger:m.opponent);
    rtdb.ref(`duels/${currentDuelId}/meta`).update({status:'finished',winner,endedAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
  }
}
async function answerDuel(index){
  if(duelAnswerLocked||!currentUser||!currentDuelData)return;
  const m=currentDuelData.meta;if(m?.status!=='active')return;
  const qs=questionArray(currentDuelData.questions),me=currentDuelData.players?.[currentUser.uid]||{score:0,index:0};
  const q=qs[Number(me.index||0)];if(!q)return;
  duelAnswerLocked=true;const ok=Number(index)===Number(q.answer),next=Number(me.index||0)+1;
  try{
    await rtdb.ref(`duels/${currentDuelId}/players/${currentUser.uid}`).update({name:myName(),score:Number(me.score||0)+(ok?1:0),index:next,finished:next>=qs.length,lastAnswerCorrect:ok,updatedAt:firebase.database.ServerValue.TIMESTAMP,...(next>=qs.length?{finishedAt:firebase.database.ServerValue.TIMESTAMP}:{})});
  }catch(e){console.error(e)}
  setTimeout(()=>{duelAnswerLocked=false},250);
}
function sendReaction(emoji){
  if(!currentUser||!currentDuelId||currentDuelData?.meta?.status!=='active')return;
  rtdb.ref(`duels/${currentDuelId}/reactions`).push({fromUid:currentUser.uid,emoji,createdAt:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{});
}
function showReaction(emoji,name){
  let el=$('#reactionPop');
  if(!el){el=document.createElement('div');el.id='reactionPop';el.className='reaction-pop';document.body.appendChild(el)}
  el.textContent=`${emoji} ${name||''}`;el.classList.add('show');clearTimeout(showReaction.t);showReaction.t=setTimeout(()=>el.classList.remove('show'),1700);
}
function renderInvites(){
  const h=$('#inviteList');if(!h)return;const entries=Object.entries(pendingInvites);
  h.innerHTML=entries.length?entries.map(([uid,v])=>`<div class="invite-item"><div><strong>⚔️ ${esc(v.fromName||displayNameForUid(uid))}</strong><small>Desafio de vocabulário • 10 palavras</small></div><div class="social-actions"><button class="btn gold small" data-accept="${uid}">Aceitar</button><button class="btn bad small" data-reject="${uid}">Recusar</button></div></div>`).join(''):'<div class="smallnote">Nenhum convite pendente.</div>';
  $$('[data-accept]').forEach(b=>b.onclick=()=>acceptInvite(b.dataset.accept));$$('[data-reject]').forEach(b=>b.onclick=()=>rejectInvite(b.dataset.reject));
}
function renderSocialUsers(){
  const h=$('#socialUsers');if(!h||!currentUser)return;
  const ids=[...new Set([...Object.keys(presenceCache),...rankingCache.map(x=>x.id)])].filter(x=>x!==currentUser.uid);
  ids.sort((a,b)=>{const pa=presenceCache[a]||{},pb=presenceCache[b]||{};return Number(pb.online)-Number(pa.online)||Number(pb.availableForDuel)-Number(pa.availableForDuel)||displayNameForUid(a).localeCompare(displayNameForUid(b))});
  const online=ids.filter(uid=>presenceCache[uid]?.online).length;if($('#onlineCountBadge'))$('#onlineCountBadge').textContent=`${online} online`;
  h.innerHTML=ids.length?ids.map(uid=>{
    const ps=presenceLine(uid),can=ps.online&&ps.available;
    return`<div class="social-user"><div><strong><span class="status-dot ${ps.online?'online':'offline'}"></span>${esc(displayNameForUid(uid))}</strong><small>${ps.online?(ps.available?'⚔️ online e disponível':'🟢 online'):('🔴 '+esc(ps.text))}</small></div><div class="social-actions">${can?`<button class="btn gold small" data-social-challenge="${uid}">⚔️ Desafiar</button>`:''}</div></div>`
  }).join(''):'<div class="smallnote">Nenhum outro jogador apareceu ainda.</div>';
  $$('[data-social-challenge]').forEach(b=>b.onclick=()=>sendChallenge(b.dataset.socialChallenge));
}
function renderDuelArena(){
  const h=$('#duelArena');if(!h)return;
  if(!currentDuelId||!currentDuelData?.meta){h.innerHTML='<div class="card"><h3>Como funciona</h3><p>Ative “Disponível para duelo”. Outro jogador online poderá desafiar você. Os dois recebem as mesmas 10 palavras; vence quem acertar mais.</p></div>';return}
  const d=currentDuelData,m=d.meta,me=d.players?.[currentUser.uid]||{score:0,index:0},oppUid=m.challenger===currentUser.uid?m.opponent:m.challenger,opp=d.players?.[oppUid]||{score:0,index:0},oppName=m.challenger===currentUser.uid?(m.opponentName||displayNameForUid(oppUid)):(m.challengerName||displayNameForUid(oppUid)),qs=questionArray(d.questions);
  if(m.status==='invited'){
    h.innerHTML=`<div class="duel-card"><div class="duel-result"><div class="trophy">⚔️</div><h2>Desafio enviado</h2><p><span class="waiting-pulse"></span> Aguardando ${esc(oppName)} aceitar.</p>${m.challenger===currentUser.uid?'<button class="btn bad" id="cancelDuelInvite">Cancelar convite</button>':''}</div></div>`;if($('#cancelDuelInvite'))$('#cancelDuelInvite').onclick=cancelCurrentInvite;return
  }
  if(m.status==='rejected'||m.status==='cancelled'){
    h.innerHTML=`<div class="duel-card"><div class="duel-result"><div class="trophy">↩️</div><h2>${m.status==='rejected'?'Desafio recusado':'Convite cancelado'}</h2><p>Você pode desafiar outro jogador disponível.</p><button class="btn gold" id="closeDuel">Fechar</button></div></div>`;$('#closeDuel').onclick=()=>{stopDuelWatch();renderSocial()};return
  }
  if(m.status==='finished'){
    const mine=Number(me.score||0),theirs=Number(opp.score||0),won=m.winner===currentUser.uid,draw=m.winner==='draw';
    h.innerHTML=`<div class="duel-card"><div class="duel-result"><div class="trophy">${draw?'🤝':won?'🏆':'📚'}</div><h2>${draw?'Empate!':won?'Você venceu!':'Vitória de '+esc(oppName)}</h2><div class="duel-score"><div class="player me"><span>Você</span><b>${mine}</b></div><div class="duel-vs">×</div><div class="player"><span>${esc(oppName)}</span><b>${theirs}</b></div></div><p>${mine} × ${theirs} em 10 palavras.</p><div class="social-actions" style="justify-content:center;margin-top:12px"><button class="btn gold" id="rematchBtn">⚔️ Revanche</button><button class="btn ghost" id="finishDuelBtn">Fechar</button></div></div></div>`;
    $('#rematchBtn').onclick=()=>sendChallenge(oppUid);$('#finishDuelBtn').onclick=()=>{stopDuelWatch();renderSocial()};return
  }
  if(m.status!=='active'){h.innerHTML='<div class="card"><p>Preparando duelo…</p></div>';return}
  const idx=Number(me.index||0);
  if(me.finished){
    h.innerHTML=`<div class="duel-card"><div class="duel-score"><div class="player me"><span>Você</span><b>${Number(me.score||0)}</b></div><div class="duel-vs">×</div><div class="player"><span>${esc(oppName)}</span><b>${Number(opp.score||0)}</b></div></div><div class="duel-result"><div class="trophy">⏳</div><h2>Você terminou!</h2><p>Aguardando ${esc(oppName)} concluir ${Number(opp.index||0)}/10.</p>${emojiBar()}</div></div>`;bindEmojiButtons();return
  }
  const q=qs[idx];if(!q){h.innerHTML='<div class="card"><p>Sincronizando a próxima pergunta…</p></div>';return}
  h.innerHTML=`<div class="duel-card"><div class="duel-score"><div class="player me"><span>Você</span><b>${Number(me.score||0)}</b></div><div class="duel-vs">×</div><div class="player"><span>${esc(oppName)}</span><b>${Number(opp.score||0)}</b></div></div><div class="duel-progress"><span>Questão ${idx+1}/10</span><span>${esc(oppName)}: ${Math.min(10,Number(opp.index||0))}/10</span></div><div class="duel-question"><div class="smallnote">Qual o significado?</div><div class="hebrew">${esc(q.prompt)}</div><div class="duel-options">${(q.options||[]).map((o,i)=>`<button class="duel-option" data-duel-answer="${i}">${esc(o)}</button>`).join('')}</div></div>${emojiBar()}</div>`;
  $$('[data-duel-answer]').forEach(b=>b.onclick=()=>answerDuel(Number(b.dataset.duelAnswer)));bindEmojiButtons();
}
function emojiBar(){return`<div class="emoji-bar"><button class="emoji-btn" data-emoji="👏">👏</button><button class="emoji-btn" data-emoji="🔥">🔥</button><button class="emoji-btn" data-emoji="😎">😎</button><button class="emoji-btn" data-emoji="😅">😅</button><button class="emoji-btn" data-emoji="💪">💪</button><button class="emoji-btn" data-emoji="👀">👀</button></div>`}
function bindEmojiButtons(){$$('[data-emoji]').forEach(b=>b.onclick=()=>sendReaction(b.dataset.emoji))}
function renderSocial(){
  if(!currentUser)return;
  const p=presenceLine(currentUser.uid);
  if($('#myPresenceDot'))$('#myPresenceDot').className='status-dot '+(p.online?'online':'offline');
  if($('#myPresenceText'))$('#myPresenceText').textContent=p.online?'Você está online':'Reconectando…';
  if($('#duelAvailability'))$('#duelAvailability').checked=myAvailability;
  renderInvites();renderSocialUsers();renderDuelArena();
}

function setupEvents(){
  $('#tabLogin').onclick=()=>setAuthMode('login');$('#tabRegister').onclick=()=>setAuthMode('register');$('#authForm').addEventListener('submit',submitAuth);$('#logoutBtn').onclick=async()=>{stopPresence(true);await auth.signOut()};
  setupNavigation();if($('#duelAvailability'))$('#duelAvailability').onchange=e=>setMyAvailability(e.target.checked);$('#startVocab').onclick=startVocab;$('#startRoots').onclick=()=>runChoiceQuiz($('#rootGame'),rootQuestions(),'raizes');$('#startBinyanQuiz').onclick=()=>runChoiceQuiz($('#binyanGame'),binyanQuestions(),'binyanim');
  const buildRoot=$('#buildRoot');if(buildRoot){const sets=practiceSets();buildRoot.innerHTML=Object.entries(sets).map(([k,s])=>`<option value="${esc(k)}">${esc(s.label||`${s.root} — ${s.meaning}`)}</option>`).join('');buildRoot.onchange=newBuildQuestion}
$('#buildConj').onchange=newBuildQuestion;$('#buildMode').onchange=newBuildQuestion;
$('#newBuild').onclick=newBuildQuestion;$('#buildConj').onchange=newBuildQuestion;$('#buildMode').onchange=newBuildQuestion;$('#newIdentify').onclick=newIdentify;$('#newNominal').onclick=newNominal;setupFormBank();
  $('#startNumbers').onclick=()=>{renderNumberTable();runChoiceQuiz($('#numberGame'),numberQuestions(),'numerais')};$('#numberSet').onchange=renderNumberTable;
  setupVerbTabs();setupMorphTabs();setupKelleyFilters();
}
function renderStatic(){renderVocabGroups();renderRootTable();renderBinyanim();renderParadigm('perfect');renderQuickRules();renderNumberTable();renderKelley();newBuildQuestion();newIdentify();newNominal();handleVersion();renderHomeStats()}

async function start(){
  try{await loadData()}catch(e){showLoadError(e);return}
  setupEvents();renderStatic();registerSW();
  auth.onAuthStateChanged(async user=>{
    currentUser=user;
    if(user){await ensureUserDoc(user);$('#authView').classList.add('hidden');$('#appView').classList.remove('hidden');$('#userLabel').textContent=user.displayName||user.email?.split('@')[0]||'Aluno';subscribeUser(user);subscribeRanking();startPresence(user);const savedDuel=localStorage.getItem('alef_current_duel');if(savedDuel)watchDuel(savedDuel);showView('home')}
    else{$('#appView').classList.add('hidden');$('#authView').classList.remove('hidden');if(unsubscribeUser){unsubscribeUser();unsubscribeUser=null}if(unsubscribeRanking){unsubscribeRanking();unsubscribeRanking=null}stopPresence(false);meStats={points:0,correct:0,wrong:0,bestStreak:0,games:0};setAuthMode('login')}
  });
}
start();
})();
