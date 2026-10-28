'use strict';
const data=TON_DATA,engine=TON_ENGINE,$=id=>document.getElementById(id);
const colors={Classic:'#f25548',Alternate:'#e3e6ec',Midnight:'#b89be9',Unbound:'#ffac50',Punished:'#fff800',Randomizer:'#ffcc01','Classic.exe':'#3af4c2',Sabotage:'#3bf37d',Cracked:'#ff00d3'};
for(const r of ['Fog','Fog(Classic)','Fog(Alternate)'])colors[r]='#969a9c';for(const r of ['Ghost','Ghost(Classic)','Ghost(Alternate)'])colors[r]='#c3f7ff';
for(const r of ['Bloodbath','Double Trouble','EX'])colors[r]='#f25548';
let count=0,history=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
data.maps.forEach(m=>$('map').add(new Option(m.name+(m.weight===.5?' · ½':''),m.id)));
function syncTerrors(){
 const round=$('round').value,map=$('map').value===''?null:Number($('map').value);
 $('bloodbath-rules').hidden=!['Bloodbath','Double Trouble','EX'].includes(round);
 const old=[...document.querySelectorAll('.terror-select')].map(s=>s.value);
 $('terror-settings').replaceChildren();$('slot-hint').hidden=!!round;
 $('slot-hint').textContent='テラーを固定するにはラウンドを選択';
 if(['Midnight','Punished','Randomizer','Bloodbath','Double Trouble','EX'].includes(round)&&map===null&&old.slice(0,round==='Midnight'?2:['Bloodbath','Double Trouble','EX'].includes(round)?3:1).includes('97')){$('slot-hint').hidden=false;$('slot-hint').textContent='S.O.S固定中は、出現できるマップから抽選';}
 if(!round)return;
 engine.slots(round).forEach((scope,i)=>{
   const box=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
   label.htmlFor=select.id='terror-'+i;label.textContent=round==='Midnight'?scope+(scope==='Classic'?' '+(i+1):''):engine.slots(round).length>1?'テラー '+(i+1):'テラー';
   select.className='terror-select';select.add(new Option('ランダム',''));
   const other=round==='Midnight'&&scope==='Classic'?old[1-i]:null;
   if(scope==='Mixed'){
     for(const category of ['Classic','Alternate'])engine.pool(data,round,category,map).forEach(t=>select.add(new Option(category+' · '+t.name,category+':'+t.id)));
   }else engine.pool(data,round,scope,map).filter(t=>other==null||other===''||t.id!==Number(other)).forEach(t=>select.add(new Option(t.name,t.id)));
   if([...select.options].some(o=>o.value===old[i]))select.value=old[i];
   select.addEventListener('change',()=>{$('error').textContent='';syncTerrors();});
   box.append(label,select);$('terror-settings').append(box);
 });
 if(round==='Fog'||round==='Ghost'){$('slot-hint').hidden=false;$('slot-hint').textContent=old[0]?'固定テラーのカテゴリで抽選':'Classic 90% / Alternate 10%';}
 if(['Bloodbath','Double Trouble','EX'].includes(round)){
   const size=engine.pool(data,round,'Classic',map).length;
   $('slot-hint').hidden=false;
   $('slot-hint').textContent=size+'種 · 2体一致でDouble Trouble、3体一致でEX'+(round==='Bloodbath'?'。未固定時のDouble Trouble率 '+(engine.bloodbathRates(data).doubleShare*100).toFixed(3)+'%':'');
 }
}
function config(){return{round:$('round').value,mapId:$('map').value===''?null:Number($('map').value),terrors:[...document.querySelectorAll('.terror-select')].map(s=>s.value===''?null:s.value.includes(':')?s.value:Number(s.value))};}
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
   const frequencies=new Map(),outcomes=new Map();let result;
   for(let i=0;i<n;i++){result=engine.draw(data,c);count++;history.unshift({...result,no:count});if(history.length>100)history.pop();outcomes.set(result.round,(outcomes.get(result.round)||0)+1);const seen=new Set();for(const t of result.terrors){const key=t.scope+':'+t.id+':'+t.variant;if(seen.has(key))continue;seen.add(key);const item=frequencies.get(key)||{terror:t,count:0};item.count++;frequencies.set(key,item);}}
   renderResult(result);renderHistory();$('batch-summary').hidden=n===1;
   $('batch-size').textContent=n.toLocaleString()+'回';
   $('batch-outcomes').textContent=[...outcomes].map(([r,v])=>r+' '+v.toLocaleString()+'回').join(' / ');
   $('frequencies').innerHTML=[...frequencies.values()].sort((a,b)=>b.count-a.count).map(x=>`<div class="frequency"><img src="${x.terror.icon}" alt=""><span>${esc(x.terror.name)}</span><strong>${x.count.toLocaleString()}<small>回</small></strong></div>`).join('');
 }catch(e){$('error').textContent=e.message;}
}
$('round').addEventListener('change',()=>{$('terror-settings').replaceChildren();syncTerrors();$('error').textContent='';});$('map').addEventListener('change',()=>{syncTerrors();$('error').textContent='';});
$('draw').addEventListener('click',()=>draw(1));$('draw-ten').addEventListener('click',()=>draw(10));
$('draw-hundred').addEventListener('click',()=>draw(100));$('draw-n').addEventListener('click',()=>draw(Number($('draw-count').value)));
$('reset').addEventListener('click',()=>{$('round').value='Classic';$('map').value='';$('terror-settings').replaceChildren();syncTerrors();$('error').textContent='';});
$('clear').addEventListener('click',()=>{history=[];renderHistory();});syncTerrors();
$('server-odds').innerHTML=`<p class="hint">サーバー累計 ${data.stats.total.toLocaleString()}回 · ${esc(data.stats.retrievedAt.slice(0,16).replace('T',' '))} JST</p><table class="odds-table"><thead><tr><th>ラウンド</th><th>回数</th><th>割合</th></tr></thead><tbody>${data.stats.rounds.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.count.toLocaleString()}</td><td>${(100*r.count/data.stats.total).toFixed(3)}%</td></tr>`).join('')}</tbody></table>`;
$('ghost-odds').innerHTML=`<p class="hint">出禁・旧テラー除外後 ${data.stats.ghostAlternateSample.toLocaleString()}回を重みに使用</p><table class="odds-table"><thead><tr><th>テラー</th><th>回数</th><th>割合</th></tr></thead><tbody>${data.terrors['Ghost(Alternate)'].Alternate.filter(t=>data.stats.ghostAlternateWeights[t.id]>0).sort((a,b)=>data.stats.ghostAlternateWeights[b.id]-data.stats.ghostAlternateWeights[a.id]).map(t=>`<tr><td>${esc(t.name)}</td><td>${data.stats.ghostAlternateWeights[t.id]}</td><td>${(100*data.stats.ghostAlternateWeights[t.id]/data.stats.ghostAlternateSample).toFixed(2)}%</td></tr>`).join('')}</tbody></table>`;
