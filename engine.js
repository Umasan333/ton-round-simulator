(function(root){
 'use strict';
 const ROUNDS=['Classic','Alternate','Midnight','Unbound','Punished','Randomizer','Classic.exe','Sabotage','Cracked','Fog','Fog(Classic)','Fog(Alternate)','Ghost','Ghost(Classic)','Ghost(Alternate)','Bloodbath','Double Trouble','EX'];
 const BLOODBATH_ROUNDS=new Set(['Bloodbath','Double Trouble','EX']);
 const CLASSIC_RULES=new Set(['Classic','Classic.exe','Sabotage','Cracked','Fog(Classic)','Ghost(Classic)']);
 const PUNISHED_RULES=new Set(['Punished','Randomizer']);
 const SPECIAL_MAPS=new Set([49,65,72]);
 const MIDNIGHT_EXCLUDED=new Set([73,116,33,96]);
 const GHOST_DOUBLE=new Set([0,3,21,34,35,127,14]);
 function slots(round){if(BLOODBATH_ROUNDS.has(round))return ['Classic','Classic','Classic'];if(round==='Fog'||round==='Ghost')return ['Mixed'];return round==='Midnight'?['Classic','Classic','Alternate']:[round.endsWith('(Alternate)')?'Alternate':CLASSIC_RULES.has(round)||PUNISHED_RULES.has(round)?'Classic':round];}
 function pool(data,round,scope,mapId){if(round==='Fog'||round==='Ghost')round=round+'('+scope+')';return data.terrors[round][scope].filter(t=>{
   if(round==='Ghost(Classic)'&&[2,128].includes(t.id))return false;
   if(round==='Ghost(Alternate)')return t.id!==0&&(data.stats.ghostAlternateWeights[String(t.id)]||0)>0;
   if(PUNISHED_RULES.has(round))return ![110,96].includes(t.id)&&!(SPECIAL_MAPS.has(mapId)&&t.id===97);
   return !(round==='Midnight'||BLOODBATH_ROUNDS.has(round))||scope!=='Classic'||(!MIDNIGHT_EXCLUDED.has(t.id)&&!(SPECIAL_MAPS.has(mapId)&&t.id===97));
 });}
 function weighted(items,weight,rng){const total=items.reduce((n,x)=>n+weight(x),0);if(!total)throw Error('抽選候補がありません');let p=rng()*total;for(const item of items){p-=weight(item);if(p<0)return item;}return items[items.length-1];}
 function pick(items,rng){if(!items.length)throw Error('抽選候補がありません');return items[Math.floor(rng()*items.length)];}
 function bloodbathRates(data,n=130){
   const b=data.stats.rounds.find(r=>r.name==='Bloodbath')?.count||0,d=data.stats.rounds.find(r=>r.name==='Double Trouble')?.count||0;
   const doubleShare=b+d?d/(b+d):3*(n-1)/(n*n-1),ex=1/(n*n),naturalDouble=3*(n-1)/(n*n),distinct=(n-1)*(n-2)/(n*n);
   return {bloodbath:b,doubleTrouble:d,doubleShare,ex,naturalDouble,correction:Math.max(0,Math.min(1,((1-ex)*doubleShare-naturalDouble)/distinct))};
 }
 function drawBloodbath(data,config,rng){
   const source=config.round,fixed=config.terrors||[],fixedIds=fixed.slice(0,3).filter(x=>x!=null).map(Number);
   const maps=data.maps.filter(m=>!fixedIds.includes(97)||!SPECIAL_MAPS.has(m.id));
   const map=config.mapId!=null?data.maps.find(m=>m.id===Number(config.mapId)):weighted(maps,m=>m.weight,rng);if(!map)throw Error('マップが無効です');
   const candidates=pool(data,source,'Classic',map.id),allowed=new Set(candidates.map(t=>t.id));
   if(fixedIds.some(id=>!allowed.has(id)))throw Error('このマップ・ラウンドでは指定テラーが出現しません');
   let ids;
   if(source==='EX'){
     if(new Set(fixedIds).size>1)throw Error('EXでは3枠とも同じテラーを指定してください');
     ids=Array(3).fill(fixedIds[0]??pick(candidates,rng).id);
   }else if(source==='Double Trouble'){
     if(fixedIds.length===3&&new Set(fixedIds).size===1)ids=fixedIds;
     else{
       const patterns=[[0,1,2],[0,2,1],[1,2,0]].filter(([a,b,c])=>(fixed[a]==null||fixed[b]==null||Number(fixed[a])===Number(fixed[b]))&&(fixed[c]==null||(fixed[a]==null||Number(fixed[c])!==Number(fixed[a]))&&(fixed[b]==null||Number(fixed[c])!==Number(fixed[b]))));
       if(!patterns.length)throw Error('Double Troubleでは2枠を同じテラーにしてください');
       const [a,b,c]=pick(patterns,rng),pair=fixed[a]??fixed[b];
       const repeated=pair!=null?Number(pair):pick(candidates.filter(t=>fixed[c]==null||t.id!==Number(fixed[c])),rng).id;
       ids=[];ids[a]=ids[b]=repeated;ids[c]=fixed[c]!=null?Number(fixed[c]):pick(candidates.filter(t=>t.id!==repeated),rng).id;
     }
   }else{
     ids=[0,1,2].map(i=>fixed[i]!=null?Number(fixed[i]):pick(candidates,rng).id);
     // Preserve natural triple matches. Raise only the double-match rate to the observed ratio.
     if(!fixedIds.length&&new Set(ids).size===3&&rng()<bloodbathRates(data,candidates.length).correction){const [a,b]=pick([[0,1],[0,2],[1,2]],rng);ids[b]=ids[a];}
   }
   const count=new Set(ids).size,round=count===1?'EX':count===2?'Double Trouble':'Bloodbath',variants=new Map();
   const terrors=ids.map((id,i)=>{
     const base=data.terrors[round].Classic.find(t=>t.id===id),variant=data.variants?.[round+':Classic:'+id];
     if(!variants.has(id))variants.set(id,variant&&rng()<1/40?variant:null);
     const transformed=variants.get(id);return {...base,...(transformed||{}),variant:transformed?.key||'',scope:'Classic',sourceId:id,fixed:fixed[i]!=null,replaced:false};
   });
   return {round,map,terrors};
 }
 function draw(data,config={},rng=Math.random){
   let round=config.round;if(!ROUNDS.includes(round))throw Error('ラウンドを選択してください');
   if(BLOODBATH_ROUNDS.has(round))return drawBloodbath(data,config,rng);
   let fixed=config.terrors||[];
   if(round==='Fog'||round==='Ghost'){
     let scope;if(fixed[0]!=null){const match=/^(Classic|Alternate):(\d+)$/.exec(String(fixed[0]));if(!match)throw Error('固定テラーが無効です');scope=match[1];fixed=[Number(match[2])];}else scope=rng()<.9?'Classic':'Alternate';
     round=round+'('+scope+')';
   }
   const fixedSOS=(round==='Midnight'||PUNISHED_RULES.has(round))&&(config.terrors||[]).some((id,i)=>i<(round==='Midnight'?2:1)&&id!=null&&Number(id)===97);
   const availableMaps=data.maps.filter(m=>!fixedSOS||!SPECIAL_MAPS.has(m.id));
   const map=config.mapId!=null?data.maps.find(m=>m.id===Number(config.mapId)):weighted(availableMaps,m=>m.weight,rng);
   if(!map)throw Error('マップが無効です');
   const kinds=slots(round), chosen=[];
   // Reserve fixed Classic slots first so random slots cannot consume them.
   const reserved=new Set();
   kinds.forEach((scope,i)=>{if(fixed[i]==null)return;const id=Number(fixed[i]);if(!pool(data,round,scope,map.id).some(t=>t.id===id))throw Error('このマップ・ラウンドでは指定テラーが出現しません');if(round==='Midnight'&&scope==='Classic'){if(reserved.has(id))throw Error('Classic枠には異なるテラーを指定してください');reserved.add(id);}});
   const used=new Set();
   kinds.forEach((scope,i)=>{
     let candidates=pool(data,round,scope,map.id);
     if(round==='Midnight'&&scope==='Classic')candidates=candidates.filter(t=>!used.has(t.id)&&(fixed[i]!=null||!reserved.has(t.id)));
     const weight=t=>round==='Ghost(Classic)'?(GHOST_DOUBLE.has(t.id)?2:1):round==='Ghost(Alternate)'?(data.stats.ghostAlternateWeights[String(t.id)]||0):1;
     let terror=fixed[i]!=null?candidates.find(t=>t.id===Number(fixed[i])):weighted(candidates,weight,rng);
     if(!terror)throw Error('固定したテラーの組み合わせを確認してください');
     const sourceId=terror.id;
     if(CLASSIC_RULES.has(round)&&SPECIAL_MAPS.has(map.id)&&terror.id===97)terror=data.terrors[round].Classic.find(t=>t.id===96);
     if(scope==='Classic')used.add(terror.id);
     const variant=data.variants?.[round+':'+scope+':'+terror.id];
     const transformed=variant&&rng()<1/40?variant:null;
     chosen.push({...terror,...(transformed||{}),variant:transformed?.key||'',scope,sourceId,fixed:fixed[i]!=null,replaced:sourceId!==terror.id});
   });
   return {round,map,terrors:chosen};
 }
 const api={ROUNDS,SPECIAL_MAPS,MIDNIGHT_EXCLUDED,slots,pool,weighted,draw,bloodbathRates};root.TON_ENGINE=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
