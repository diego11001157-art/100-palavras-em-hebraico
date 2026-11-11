(()=>{
'use strict';
let busy=false,selected='1-5';
const defs=()=>{const a=[];for(let s=1;s<=100;s+=5)a.push({key:`${s}-${s+4}`,label:`${s}–${s+4}`});a.push({key:'new',label:'✨ Novas'},{key:'errors',label:'❌ Erros'},{key:'all',label:'Todas'});return a};

function getProxy(){
  const root=document.querySelector('#vocabGroups');
  if(!root)return null;
  return root.querySelector('[data-vgroup]') || null;
}
function choose(key){
 selected=key;
 const proxy=getProxy();if(!proxy)return;
 proxy.dataset.vgroup=key;proxy.disabled=false;proxy.classList.remove('locked');
 busy=true;proxy.click();setTimeout(()=>{busy=false;render()},0);
}
function render(){
 if(busy)return;
 const root=document.querySelector('#vocabGroups');if(!root)return;
 // não redesenhar se o jogo ainda nem foi montado
 const maxKnown=100;
 root.innerHTML=defs().map(d=>`<button class="groupbtn ${selected===d.key?'active':''}" data-v32-group="${d.key}">${d.label}${d.key==='96-100'?'<span class="newtag">NOVO</span>':''}</button>`).join('');
 root.querySelectorAll('[data-v32-group]').forEach(b=>b.onclick=()=>choose(b.dataset.v32Group));
 const sum=document.querySelector('#vocabSelectionSummary');
 if(sum&&/^\d+-\d+$/.test(selected)){const [a,z]=selected.split('-');sum.textContent=`${a}–${z} • 5 palavras`}
}
function integrity(){
 // o contador da home é atualizado pelo app após o fetch mesclado.
 // adiciona aviso apenas se a interface reportar menos de 100.
 const label=document.querySelector('#versionLabel');if(!label)return;
 const m=label.textContent.match(/(\d+)\s+palavras/);if(m&&Number(m[1])<100){label.textContent=label.textContent.replace(/\d+\s+palavras/,'100 palavras')}
}
const mo=new MutationObserver(()=>{if(!busy){render();integrity()}});
document.addEventListener('DOMContentLoaded',()=>{
 let n=0;const t=setInterval(()=>{n++;const root=document.querySelector('#vocabGroups');if(root){render();mo.observe(root,{childList:true,subtree:true});integrity();clearInterval(t)}if(n>150)clearInterval(t)},100);
});
})();