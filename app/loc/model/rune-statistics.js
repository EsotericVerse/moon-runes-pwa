import {classifyRuneSemantics} from './rune-semantic-classifier.js';

export function classifyRuneCorpus(records,{authorScope=false,eraOf=record=>record?.era||record?.period||'未設定'}={}){
  return (records||[]).map((record,index)=>{const text=String(record?.text??record?.content??record?.description??'');return{...record,_index:index,era:eraOf(record),rune_semantics:classifyRuneSemantics(text,{authorScope})}});
}
export function summarizeRuneSemantics(records){
  const byEra=new Map();
  for(const record of records||[]){const era=record.era||'未設定';if(!byEra.has(era))byEra.set(era,{era,documents:0,runes:new Map(),groups:new Map()});const bucket=byEra.get(era);bucket.documents++;for(const rune of record.rune_semantics?.runes||[])bucket.runes.set(rune,(bucket.runes.get(rune)||0)+1);for(const group of record.rune_semantics?.groups||[])bucket.groups.set(group,(bucket.groups.get(group)||0)+1)}
  return [...byEra.values()].map(bucket=>({era:bucket.era,documents:bucket.documents,runes:[...bucket.runes].map(([rune,count])=>({rune,count})).sort((a,b)=>b.count-a.count||a.rune.localeCompare(b.rune,'zh-Hant')),groups:[...bucket.groups].map(([group,count])=>({group,count})).sort((a,b)=>b.count-a.count||a.group.localeCompare(b.group,'zh-Hant'))}));
}
export function compareRuneEras(oldSummary,recentSummary){const names=new Set([...(oldSummary?.runes||[]).map(x=>x.rune),...(recentSummary?.runes||[]).map(x=>x.rune)]);const oldMap=new Map((oldSummary?.runes||[]).map(x=>[x.rune,x.count]));const recentMap=new Map((recentSummary?.runes||[]).map(x=>[x.rune,x.count]));return [...names].map(rune=>({rune,old:oldMap.get(rune)||0,recent:recentMap.get(rune)||0,delta:(recentMap.get(rune)||0)-(oldMap.get(rune)||0)})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.rune.localeCompare(b.rune,'zh-Hant'))}
