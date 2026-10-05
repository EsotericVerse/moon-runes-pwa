'use client';

import {createTextIndex,normalizeIndexedText,searchTextIndex} from '../text-engine.mjs';
import {parseRuneKeywordRuleSentence} from './rune-keyword-rules.mjs';

const RUNE66_GROUP='符文66';

function compareRank(a,b){
  return Number(b.count||0)-Number(a.count||0)
    ||Number(a.order||0)-Number(b.order||0)
    ||String(a.label||'').localeCompare(String(b.label||''));
}

function textOf(row){
  return String(row?.content||'');
}

function keywordList(value){
  if(Array.isArray(value))return value.map(item=>String(item||'').trim()).filter(Boolean);
  if(typeof value==='string'){
    try{
      const parsed=JSON.parse(value);
      if(Array.isArray(parsed))return parsed.map(item=>String(item||'').trim()).filter(Boolean);
    }catch{}
  }
  return [];
}

function compileCatalog(catalogRows=[],structureRows=[]){
  const structures=new Map();
  const nameToRune=new Map();
  const groupOrder=new Map();

  for(const row of structureRows){
    const runeId=Number(row?.rune_id);
    if(!Number.isInteger(runeId)||runeId<1||runeId>66)continue;
    const name=String(row?.rune_name||'').trim();
    const group=String(row?.group_name||'').trim();
    structures.set(runeId,{runeId,name,group,order:runeId});
    if(name)nameToRune.set(name,runeId);
    if(group&&!groupOrder.has(group))groupOrder.set(group,runeId);
  }

  const runes=[];
  for(const row of catalogRows){
    if(String(row?.group_name||'').trim()!==RUNE66_GROUP)continue;
    const runeId=Number(row?.item_no);
    const structure=structures.get(runeId);
    if(!structure)continue;

    const label=String(row?.item_name||structure.name||'').trim();
    if(label)nameToRune.set(label,runeId);

    const keywords=[];
    const rules=[];
    const notes=[];
    for(const value of keywordList(row?.keywords)){
      const parsed=parseRuneKeywordRuleSentence(value);
      if(parsed.rules.length){
        rules.push(...parsed.rules);
        notes.push(...parsed.notes);
      }else{
        keywords.push(value);
      }
    }

    runes.push({
      ...structure,
      label,
      principle:String(row?.principle||'').trim(),
      keywords:[...new Set(keywords)],
      rules:rules.filter((rule,index,all)=>all.findIndex(other=>
        other.operator===rule.operator&&other.source===rule.source&&other.target===rule.target
      )===index),
      notes:[...new Set(notes)]
    });
  }

  runes.sort((a,b)=>a.order-b.order);
  return {runes,nameToRune,groupOrder};
}

function replaceAllLiteral(source,needle,replacement=' '){
  if(!needle)return source;
  return source.split(needle).join(replacement);
}

function createState(){
  return {
    hitCount:0,
    runeCounts:new Map(),
    groupCounts:new Map(),
    seen:new Set()
  };
}

function increment(state,rune,signal){
  if(!state||!rune)return;
  const key=String(rune.runeId)+'\u0000'+String(signal||'');
  if(state.seen.has(key))return;
  state.seen.add(key);
  state.hitCount+=1;

  const runeCount=state.runeCounts.get(rune.runeId)||{
    key:String(rune.runeId),
    rune_id:rune.runeId,
    label:rune.label||rune.name,
    group:rune.group,
    order:rune.order,
    count:0
  };
  runeCount.count+=1;
  state.runeCounts.set(rune.runeId,runeCount);

  if(rune.group){
    const groupCount=state.groupCounts.get(rune.group)||{
      key:rune.group,
      label:rune.group,
      order:rune.order,
      count:0
    };
    groupCount.count+=1;
    groupCount.order=Math.min(groupCount.order,rune.order);
    state.groupCounts.set(rune.group,groupCount);
  }
}

function buildMaskedTextGetter(normalizedTexts,rune){
  const sources=[...new Set(rune.rules
    .filter(rule=>rule.operator==='TO'||rule.operator==='NAME')
    .map(rule=>normalizeIndexedText(rule.source))
    .filter(Boolean))]
    .sort((a,b)=>b.length-a.length);
  if(!sources.length)return index=>normalizedTexts[index]||'';

  const cache=new Map();
  return index=>{
    if(cache.has(index))return cache.get(index);
    let text=normalizedTexts[index]||'';
    for(const source of sources)text=replaceAllLiteral(text,source,' ');
    cache.set(index,text);
    return text;
  };
}

export function classifyRune66Documents(documents=[],catalogRows=[],structureRows=[]){
  const source=Array.isArray(documents)?documents:[];
  const {runes,nameToRune,groupOrder}=compileCatalog(catalogRows,structureRows);
  if(!source.length||!runes.length)return {
    documentCount:source.length,
    classifiedCount:0,
    unclassifiedCount:source.length,
    tieCount:0,
    classifications:[],
    runeTotals:[],
    runeRanking:[],
    groupTotals:[],
    unsupportedRules:[]
  };

  const engine=createTextIndex();
  const normalizedTexts=source.map(row=>normalizeIndexedText(textOf(row)));
  normalizedTexts.forEach((text,index)=>engine.add(String(index),text));

  const states=source.map(()=>createState());
  const runeById=new Map(runes.map(rune=>[rune.runeId,rune]));
  const unsupportedRules=[];

  for(const rune of runes){
    const maskedText=buildMaskedTextGetter(normalizedTexts,rune);
    const ruleTexts=normalizedTexts.slice();
    const orderedRules=[...rune.rules].sort((a,b)=>
      normalizeIndexedText(b.source).length-normalizeIndexedText(a.source).length
      ||String(a.token||'').localeCompare(String(b.token||''))
    );

    for(const keyword of rune.keywords){
      const normalizedKeyword=normalizeIndexedText(keyword);
      if(!normalizedKeyword)continue;
      const result=searchTextIndex(engine,keyword,{limit:engine.size});
      for(const rawId of result.ids){
        const index=Number(rawId);
        if(!Number.isInteger(index)||!states[index])continue;
        if(!maskedText(index).includes(normalizedKeyword))continue;
        increment(states[index],rune,'keyword:'+normalizedKeyword);
      }
    }

    for(const rule of orderedRules){
      if(rule.operator==='NOR'){
        unsupportedRules.push({rune_id:rune.runeId,rune:rune.label,rule:rule.token});
        continue;
      }
      const ruleSource=normalizeIndexedText(rule.source);
      if(!ruleSource)continue;
      const result=searchTextIndex(engine,rule.source,{limit:engine.size});
      const targetId=rule.operator==='NAME'?null:nameToRune.get(String(rule.target||'').trim());
      const target=targetId?runeById.get(Number(targetId)):null;
      if(rule.operator!=='NAME'&&!target){
        unsupportedRules.push({rune_id:rune.runeId,rune:rune.label,rule:rule.token});
        continue;
      }
      for(const rawId of result.ids){
        const index=Number(rawId);
        if(!Number.isInteger(index)||!states[index])continue;
        const remaining=ruleTexts[index]||'';
        if(!remaining.includes(ruleSource))continue;

        ruleTexts[index]=replaceAllLiteral(remaining,ruleSource,' ');

        if(rule.operator==='NAME')continue;
        if(rule.operator==='AND'){
          increment(states[index],rune,'rule:'+rule.token+':source');
          increment(states[index],target,'rule:'+rule.token+':target');
        }else if(rule.operator==='TO'){
          increment(states[index],target,'rule:'+rule.token+':target');
        }
      }
    }
  }

  const runeTotals=new Map(runes.map(rune=>[rune.runeId,{
    rune_id:rune.runeId,
    label:rune.label||rune.name,
    group:rune.group,
    order:rune.order,
    count:0,
    document_count:0
  }]));
  const groupTotals=new Map([...groupOrder.entries()].map(([group,order])=>[group,{
    group,
    order,
    hit_count:0,
    document_count:0
  }]));

  let classifiedCount=0;
  let unclassifiedCount=0;
  let tieCount=0;
  const classifications=[];

  states.forEach((state,index)=>{
    for(const item of state.runeCounts.values()){
      const total=runeTotals.get(item.rune_id);
      if(!total)continue;
      total.count+=item.count;
      total.document_count+=1;
    }
    for(const item of state.groupCounts.values()){
      const total=groupTotals.get(item.label)||{group:item.label,order:item.order,hit_count:0,document_count:0};
      total.hit_count+=item.count;
      groupTotals.set(item.label,total);
    }

    const rankedRunes=[...state.runeCounts.values()].sort(compareRank);
    const rankedGroups=[...state.groupCounts.values()].sort(compareRank);
    const topCount=Number(rankedGroups[0]?.count)||0;
    const topGroups=topCount?rankedGroups.filter(item=>Number(item.count)===topCount):[];
    let status='unclassified';
    let classificationGroup='';

    if(!rankedGroups.length){
      unclassifiedCount+=1;
    }else{
      // Big Class is always a single value. Equal hit counts keep a diagnostic tie list,
      // but deterministic group order resolves the displayed Class instead of leaving it unset.
      status='classified';
      classifiedCount+=1;
      classificationGroup=rankedGroups[0].label;
      if(topGroups.length>1)tieCount+=1;
      const winner=groupTotals.get(classificationGroup);
      if(winner)winner.document_count+=1;
    }

    const row=source[index]||{};
    classifications.push({
      key:String(row.key||row.uid||index),
      uid:String(row.uid||''),
      kind:String(row.kind||''),
      title:String(row.title||'').trim(),
      date:String(row.date||row.createtime||row.created_at||'').slice(0,10),
      status,
      classification_group:classificationGroup,
      tied_groups:topGroups.length>1?topGroups.map(item=>item.label):[],
      hit_count:state.hitCount,
      top_rune:rankedRunes[0]?.label||'',
      top_rune_count:Number(rankedRunes[0]?.count)||0,
      rune_counts:rankedRunes,
      group_counts:rankedGroups
    });
  });

  return {
    documentCount:source.length,
    classifiedCount,
    unclassifiedCount,
    tieCount,
    classifications,
    runeTotals:[...runeTotals.values()].sort((a,b)=>a.rune_id-b.rune_id),
    runeRanking:[...runeTotals.values()].sort((a,b)=>b.count-a.count||a.rune_id-b.rune_id),
    groupTotals:[...groupTotals.values()].sort((a,b)=>a.order-b.order||a.group.localeCompare(b.group)),
    unsupportedRules
  };
}
