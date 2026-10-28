(function(root){
 'use strict';
 const ROUNDS=['Classic','Alternate','Midnight','Unbound','Punished','Randomizer','Classic.exe','Sabotage','Cracked'];
 const CLASSIC_RULES=new Set(['Classic','Classic.exe','Sabotage','Cracked']);
 const PUNISHED_RULES=new Set(['Punished','Randomizer']);
 const SPECIAL_MAPS=new Set([49,65,72]);
 const MIDNIGHT_EXCLUDED=new Set([73,116,33,96]);
 function slots(round){return round==='Midnight'?['Classic','Classic','Alternate']:[CLASSIC_RULES.has(round)||PUNISHED_RULES.has(round)?'Classic':round];}
 function pool(data,round,scope,mapId){return data.terrors[round][scope].filter(t=>{
   if(PUNISHED_RULES.has(round))return ![110,96].includes(t.id)&&!(SPECIAL_MAPS.has(mapId)&&t.id===97);
   return round!=='Midnight'||scope!=='Classic'||(!MIDNIGHT_EXCLUDED.has(t.id)&&!(SPECIAL_MAPS.has(mapId)&&t.id===97));
 });}
 function weighted(items,weight,rng){const total=items.reduce((n,x)=>n+weight(x),0);if(!total)throw Error('抽選候補がありません');let p=rng()*total;for(const item of items){p-=weight(item);if(p<0)return item;}return items[items.length-1];}
 function pick(items,rng){if(!items.length)throw Error('抽選候補がありません');return items[Math.floor(rng()*items.length)];}
 function draw(data,config={},rng=Math.random){
   const round=config.round;if(!ROUNDS.includes(round))throw Error('ラウンドを選択してください');
   const fixedSOS=(round==='Midnight'||PUNISHED_RULES.has(round))&&(config.terrors||[]).some((id,i)=>i<(round==='Midnight'?2:1)&&id!=null&&Number(id)===97);
   const availableMaps=data.maps.filter(m=>!fixedSOS||!SPECIAL_MAPS.has(m.id));
   const map=config.mapId!=null?data.maps.find(m=>m.id===Number(config.mapId)):weighted(availableMaps,m=>m.weight,rng);
   if(!map)throw Error('マップが無効です');
   const kinds=slots(round), fixed=config.terrors||[], chosen=[];
   // Reserve fixed Classic slots first so random slots cannot consume them.
   const reserved=new Set();
   kinds.forEach((scope,i)=>{if(fixed[i]==null)return;const id=Number(fixed[i]);if(!pool(data,round,scope,map.id).some(t=>t.id===id))throw Error('このマップ・ラウンドでは指定テラーが出現しません');if(round==='Midnight'&&scope==='Classic'){if(reserved.has(id))throw Error('Classic枠には異なるテラーを指定してください');reserved.add(id);}});
   const used=new Set();
   kinds.forEach((scope,i)=>{
     let candidates=pool(data,round,scope,map.id);
     if(round==='Midnight'&&scope==='Classic')candidates=candidates.filter(t=>!used.has(t.id)&&(fixed[i]!=null||!reserved.has(t.id)));
     let terror=fixed[i]!=null?candidates.find(t=>t.id===Number(fixed[i])):pick(candidates,rng);
     if(!terror)throw Error('固定したテラーの組み合わせを確認してください');
     const sourceId=terror.id;
     if(CLASSIC_RULES.has(round)&&SPECIAL_MAPS.has(map.id)&&terror.id===97)terror=data.terrors[round].Classic.find(t=>t.id===96);
     if(scope==='Classic')used.add(terror.id);
     chosen.push({...terror,scope,sourceId,fixed:fixed[i]!=null,replaced:sourceId!==terror.id});
   });
   return {round,map,terrors:chosen};
 }
 const api={ROUNDS,SPECIAL_MAPS,MIDNIGHT_EXCLUDED,slots,pool,weighted,draw};root.TON_ENGINE=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
