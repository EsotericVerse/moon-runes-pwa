'use client';

import {parseRuneKeywordRuleSentence} from './rune-keyword-rules.mjs';

const RUNE66_GROUP='符文66';

function normalizeText(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').trim();
}

function compareRank(a,b){
  return Number(b.count||0)-Number(a.count||0)
    ||Number(a.order||0)-Number(b.order||0)
    ||String(a.label||'').localeCompare(String(b.label||''));
}

function textOf(row){
  return [row?.title,row?.content]
    .filter(Boolean).join(' ');
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
    structures.set(runeId,{runeId,name,group,order:runeId,classEnable:row?.class_enable!==false});
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
      keywords:[...new Set([label,...keywords].filter(Boolean))],
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

  const existingRune=state.runeCounts.get(rune.runeId);
  const runeCount=existingRune||{
    key:String(rune.runeId),
    rune_id:rune.runeId,
    label:rune.label||rune.name,
    group:rune.group,
    order:rune.order,
    count:0
  };
  runeCount.count+=1;
  state.runeCounts.set(rune.runeId,runeCount);

  if(rune.group&&rune.classEnable!==false){
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

function maskCalendarDateLiterals(source){
  return String(source||'')
    .replace(/(?:\d{2,4}年)?\d{1,2}月\d{1,2}日/gu,' ')
    .replace(/(?:[〇零一二三四五六七八九十百]{2,4}年)?[〇零一二三四五六七八九十]{1,3}月[〇零一二三四五六七八九十廿卅]{1,3}日/gu,' ');
}

function specialRuneKeywordTexts(normalizedTexts,runes,rune){
  const ruleEntries=runes.flatMap(item=>item.rules.map(rule=>({item,rule})));

  const nameSources=ruleEntries
    .filter(({rule})=>rule.operator==='NAME')
    .map(({rule})=>normalizeText(rule.source))
    .filter(Boolean);

  const dayMoonTargetSources=ruleEntries
    .filter(({rule})=>{
      const source=normalizeText(rule.source);
      if(!source||!(source.includes('日')||source.includes('月')))return false;
      return (rule.operator==='TO'||rule.operator==='AND')
        &&normalizeText(rule.target)===normalizeText(rune.label);
    })
    .map(({rule})=>normalizeText(rule.source))
    .filter(Boolean);

  const dayMoonSources=(rune.label==='日'||rune.label==='月')
    ?ruleEntries
      .filter(({rule})=>rule.operator==='AND'||rule.operator==='TO')
      .map(({rule})=>normalizeText(rule.source))
      .filter(source=>source&&source.includes(normalizeText(rune.label)))
    :[];

  const sources=[...new Set([...nameSources,...dayMoonTargetSources,...dayMoonSources])]
    .sort((a,b)=>b.length-a.length);

  return normalizedTexts.map(source=>{
    let text=source||'';
    if(rune.label==='日'||rune.label==='月')text=maskCalendarDateLiterals(text);
    for(const ruleSource of sources)text=replaceAllLiteral(text,ruleSource,' ');
    return text;
  });
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

  const normalizedTexts=source.map(row=>normalizeText(textOf(row)));

  const states=source.map(()=>createState());
  const runeById=new Map(runes.map(rune=>[rune.runeId,rune]));
  const unsupportedRules=[];

  for(const rune of runes){
    const keywordTexts=specialRuneKeywordTexts(normalizedTexts,runes,rune);
    const ruleTexts=normalizedTexts.slice();
    const orderedRules=[...rune.rules].sort((a,b)=>
      normalizeText(b.source).length-normalizeText(a.source).length
      ||String(a.token||'').localeCompare(String(b.token||''))
    );

    for(const keyword of rune.keywords){
      const normalizedKeyword=normalizeText(keyword);
      if(!normalizedKeyword)continue;
      const isDayMoonName=(rune.label==='日'||rune.label==='月')&&normalizedKeyword===normalizeText(rune.label);
      const ownSpecificSources=isDayMoonName
        ?rune.keywords
          .map(normalizeText)
          .filter(source=>source&&source!==normalizedKeyword&&source.includes(normalizedKeyword))
          .sort((a,b)=>b.length-a.length)
        :[];
      for(let index=0;index<normalizedTexts.length;index+=1){
        if(!states[index])continue;
        let text=keywordTexts[index]||'';
        if(isDayMoonName){
          for(const source of ownSpecificSources)text=replaceAllLiteral(text,source,' ');
        }
        if(!text.includes(normalizedKeyword))continue;
        increment(states[index],rune,'keyword:'+normalizedKeyword);
      }
    }

    for(const rule of orderedRules){
      if(rule.operator==='NOR'){
        unsupportedRules.push({rune_id:rune.runeId,rune:rune.label,rule:rule.token});
        continue;
      }
      const ruleSource=normalizeText(rule.source);
      if(!ruleSource)continue;
      const targetId=rule.operator==='NAME'?null:nameToRune.get(String(rule.target||'').trim());
      const target=targetId?runeById.get(Number(targetId)):null;
      if(rule.operator!=='NAME'&&!target){
        unsupportedRules.push({rune_id:rune.runeId,rune:rune.label,rule:rule.token});
        continue;
      }
      for(let index=0;index<normalizedTexts.length;index+=1){
        if(!states[index])continue;
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
    runeRanking:[...runeTotals.values()].sort((a,b)=>b.count-a.count||b.document_count-a.document_count||a.rune_id-b.rune_id),
    groupTotals:[...groupTotals.values()].sort((a,b)=>a.order-b.order||a.group.localeCompare(b.group)),
    unsupportedRules
  };
}
