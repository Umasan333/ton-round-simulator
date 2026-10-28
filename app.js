'use strict';
const data=TON_DATA,engine=TON_ENGINE,$=id=>document.getElementById(id);
const colors={Classic:'#f25548',Alternate:'#e3e6ec',Midnight:'#b89be9',Unbound:'#ffac50'};
let count=0,history=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
data.maps.forEach(m=>$('map').add(new Option(m.name+(m.weight===.5?' · ½':''),m.id)));
function syncTerrors(){
 const round=$('round').value,map=$('map').value===''?null:Number($('map').value);
 const old=[...document.querySelectorAll('.terror-select')].map(s=>s.value);
 $('terror-settings').replaceChildren();$('slot-hint').hidden=!!round;
 $('slot-hint').textContent='テラーを固定するにはラウンドを選択';
 if(round==='Midnight'&&map===null&&old.slice(0,2).includes('97')){$('slot-hint').hidden=false;$('slot-hint').textContent='S.O.S固定中は、出現できるマップから抽選';}
 if(!round)return;
 engine.slots(round).forEach((scope,i)=>{
   const box=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
   label.htmlFor=select.id='terror-'+i;label.textContent=round==='Midnight'?scope+(scope==='Classic'?' '+(i+1):''):'テラー';
   select.className='terror-select';select.add(new Option('ランダム',''));
   const other=round==='Midnight'&&scope==='Classic'?old[1-i]:null;
   engine.pool(data,round,scope,map).filter(t=>other==null||other===''||t.id!==Number(other)).forEach(t=>select.add(new Option(t.name,t.id)));
   if([...select.options].some(o=>o.value===old[i]))select.value=old[i];
   select.addEventListener('change',()=>{$('error').textContent='';syncTerrors();});
   box.append(label,select);$('terror-settings').append(box);
 });
}
function config(){return{round:$('round').value,mapId:$('map').value===''?null:Number($('map').value),terrors:[...document.querySelectorAll('.terror-select')].map(s=>s.value===''?null:Number(s.value))};}
function renderResult(r){
 const el=$('result');el.className='result animate'+(r.terrors.length>1?' multiple':'');el.style.setProperty('--round-color',colors[r.round]);el.style.setProperty('--slots',r.terrors.length);
 el.innerHTML=`<div class="round-line"><h2 class="round-title">${r.round}</h2><span class="round-number">#${String(count).padStart(3,'0')}</span></div><p class="map-name"><span class="map-label">MAP</span>${esc(r.map.name)}</p><div class="terror-list">${r.terrors.map(t=>`<div class="terror"><img src="${t.icon}" alt="${esc(t.name)}"><div><div class="terror-name">${esc(t.name)}</div><div class="terror-scope">${t.scope.toUpperCase()}${t.fixed?'<span class="fixed-badge">固定</span>':''}</div></div></div>`).join('')}</div>${r.terrors.some(t=>t.replaced)?'<p class="replacement">このマップでは S.O.S → Those Olden Days</p>':''}`;
}
function renderHistory(){
 $('counter').textContent=count+' ROUNDS';$('history-count').textContent=history.length;
 $('history').innerHTML=history.length?history.map(r=>`<div class="history-row"><span class="history-no">${r.no}</span><div class="history-icons">${r.terrors.map(t=>`<img src="${t.icon}" alt="${esc(t.name)}">`).join('')}</div><div class="history-main"><strong>${esc(r.map.name)}</strong><small>${r.terrors.map(t=>esc(t.name)).join(' / ')}</small></div><span class="history-round" style="--color:${colors[r.round]}">${r.round}</span></div>`).join(''):'<p class="history-empty">抽選したラウンドがここに並びます</p>';
}
function draw(n){
 $('error').textContent='';
 try{
   if(!Number.isInteger(n)||n<1||n>100000)throw Error('回数は1〜100,000の整数で入力してください。');
   const c=config();
   const frequencies=new Map();let result;
   for(let i=0;i<n;i++){result=engine.draw(data,c);count++;history.unshift({...result,no:count});if(history.length>100)history.pop();for(const t of result.terrors){const key=t.scope+':'+t.id;const item=frequencies.get(key)||{terror:t,count:0};item.count++;frequencies.set(key,item);}}
   renderResult(result);renderHistory();$('batch-summary').hidden=n===1;
   $('batch-size').textContent=n.toLocaleString()+'回';
   $('frequencies').innerHTML=[...frequencies.values()].sort((a,b)=>b.count-a.count).map(x=>`<div class="frequency"><img src="${x.terror.icon}" alt=""><span>${esc(x.terror.name)}</span><strong>${x.count.toLocaleString()}<small>回</small></strong></div>`).join('');
 }catch(e){$('error').textContent=e.message;}
}
$('round').addEventListener('change',()=>{$('terror-settings').replaceChildren();syncTerrors();$('error').textContent='';});$('map').addEventListener('change',()=>{syncTerrors();$('error').textContent='';});
$('draw').addEventListener('click',()=>draw(1));$('draw-ten').addEventListener('click',()=>draw(10));
$('draw-hundred').addEventListener('click',()=>draw(100));$('draw-n').addEventListener('click',()=>draw(Number($('draw-count').value)));
$('reset').addEventListener('click',()=>{$('round').value='Classic';$('map').value='';$('terror-settings').replaceChildren();syncTerrors();$('error').textContent='';});
$('clear').addEventListener('click',()=>{history=[];renderHistory();});syncTerrors();
