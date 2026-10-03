'use client';

import {selectAllNeonRows} from './neon-query';
import {selectManagedScope} from './scope-data';
import {createTextIndex,normalizeIndexedText,searchTextIndex} from './text-engine.mjs';
import {parseRuneKeywordRuleSentence} from './model/rune-keyword-rules.mjs';

const PERSONAL_STYLE_TABLE='silver.lo3rwang_style';
const RUNE_TABLE='silver.runes';
const RUNE66_GROUP='符文66';

let analysisPromise=null;

function compareRank(a,b){
  return Number(b.count||0)-Number(a.count||0)
    ||Number(a.order||0)-Number(b.order||0)
    ||String(a.label||'').localeCompare(String(b.label||''));
}

function mediaLinks(value){
  return [...new Set(String(value||'').split(',').map(item=>item.trim()).filter(Boolean))];
}

function textOf(row){
  return [row?.title,row?.content,row?.meta_tags,row?.media_metadata_text]
    .filter(Boolean).join(' ');
}

function buildDocuments(textRows=[],mediaRows=[]){
  const docs=[];
  const byUid=new Map();

  for(const row of textRows){
    const uid=String(row?.uid||'').trim();
    if(!uid)continue;
    const doc={
      key:'galaxy:'+uid,
      uid,
      kind:'galaxy',
      title:String(row?.title||'').trim(),
      content:String(row?.content||''),
      media_metadata_text:''
    };
    docs.push(doc);
    byUid.set(uid,doc);
  }

  for(const row of mediaRows){
    const metadata=[row?.title,row?.meta_tags,row?.media_type].filter(Boolean).join(' ');
    const links=mediaLinks(row?.galaxy_link);
    let attached=false;
    for(const uid of links){
      const doc=byUid.get(uid);
      if(!doc)continue;
      doc.media_metadata_text=[doc.media_metadata_text,metadata].filter(Boolean).join(' ');
      attached=true;
    }
    if(attached)continue;
    const mediaId=String(row?.media_id||'').trim();
    if(!mediaId||!metadata.trim())continue;
    docs.push({
      key:'media:'+mediaId,
      uid:'',
      kind:'media',
      title:String(row?.title||row?.media_type||'').trim(),
      content:'',
      media_metadata_text:metadata
    });
  }
  return docs;
}

function compileCatalog(styleRows=[],structureRows=[]){
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

  const styleNodes=new Map();
  for(const row of styleRows){
    if(row?.node_type!=='style')continue;
    if(String(row?.parent_group_name||'').trim()!==RUNE66_GROUP)continue;
    const runeId=Number(row?.style_no);
    const structure=structures.get(runeId);
    if(!structure)continue;
    const label=String(row?.representative_name||structure.name||'').trim();
    styleNodes.set(runeId,{
      ...structure,
      label,
      keywords:[],
      rules:[],
      notes:[]
    });
    if(label)nameToRune.set(label,runeId);
  }

  for(const row of styleRows){
    if(row?.node_type!=='keyword')continue;
    const runeId=Number(row?.style_no);
    const rune=styleNodes.get(runeId);
    if(!rune)continue;
    const value=String(row?.keyword||'').trim();
    if(!value)continue;
    if(String(row?.keyword_group||'').trim()==='rule'){
      const parsed=parseRuneKeywordRuleSentence(value);
      rune.rules.push(...parsed.rules);
      rune.notes.push(...parsed.notes);
    }else{
      rune.keywords.push(value);
    }
  }

  const runes=[...styleNodes.values()]
    .map(rune=>({
      ...rune,
      keywords:[...new Set(rune.keywords)],
      rules:rune.rules.filter((rule,index,all)=>all.findIndex(other=>
        other.operator===rule.operator&&other.source===rule.source&&other.target===rule.target
      )===index)
    }))
    .sort((a,b)=>a.order-b.order);

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

export function classifyRune66Documents(documents=[],styleRows=[],structureRows=[]){
  const source=Array.isArray(documents)?documents:[];
  const {runes,nameToRune,groupOrder}=compileCatalog(styleRows,structureRows);
  if(!source.length||!runes.length)return {
    documentCount:source.length,
    classifiedCount:0,
    unclassifiedCount:source.length,
    tieCount:0,
    runeTotals:[],
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

    for(const rule of rune.rules){
      if(rule.operator==='NOR'){
        unsupportedRules.push({rune_id:rune.runeId,rune:rune.label,rule:rule.token});
        continue;
      }
      const ruleSource=normalizeIndexedText(rule.source);
      const result=searchTextIndex(engine,rule.source,{limit:engine.size});
      if(rule.operator==='NAME')continue;
      const targetId=nameToRune.get(String(rule.target||'').trim());
      const target=targetId?runByIdSafe(runeById,targetId):null;
      if(!target){
        unsupportedRules.push({rune_id:rune.runeId,rune:rune.label,rule:rule.token});
        continue;
      }
      for(const rawId of result.ids){
        const index=Number(rawId);
        if(!Number.isInteger(index)||!states[index])continue;
        if(!ruleSource||!normalizedTexts[index]?.includes(ruleSource))continue;
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

  for(const state of states){
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

    const rankedGroups=[...state.groupCounts.values()].sort(compareRank);
    if(!rankedGroups.length){
      unclassifiedCount+=1;
      continue;
    }
    classifiedCount+=1;
    if(rankedGroups[1]&&rankedGroups[1].count===rankedGroups[0].count)tieCount+=1;
    const winner=groupTotals.get(rankedGroups[0].label);
    if(winner)winner.document_count+=1;
  }

  return {
    documentCount:source.length,
    classifiedCount,
    unclassifiedCount,
    tieCount,
    runeTotals:[...runeTotals.values()].sort((a,b)=>a.rune_id-b.rune_id),
    runeRanking:[...runeTotals.values()].sort((a,b)=>b.count-a.count||a.rune_id-b.rune_id),
    groupTotals:[...groupTotals.values()].sort((a,b)=>a.order-b.order||a.group.localeCompare(b.group)),
    unsupportedRules
  };
}

function runByIdSafe(map,id){
  return map.get(Number(id))||null;
}

async function loadRune66Catalog(){
  const [styleResult,structureResult]=await Promise.all([
    selectAllNeonRows(PERSONAL_STYLE_TABLE,{
      columns:'style_no,node_type,representative_name,parent_group_name,basic_principle,keyword_group,keyword,order_no',
      orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}]
    }),
    selectAllNeonRows(RUNE_TABLE,{
      columns:'rune_id,rune_name,group_name',
      filters:[
        {column:'rune_id',operator:'gte',value:1},
        {column:'rune_id',operator:'lte',value:66}
      ],
      orders:[{column:'rune_id',ascending:true}]
    })
  ]);
  return {styleRows:styleResult.rows||[],structureRows:structureResult.rows||[]};
}

async function loadAuthorDocuments(){
  const scope=await selectManagedScope('lo3rwang');
  if(!scope)throw new Error('找不到 lo3rwang Scope');
  const [textResult,mediaResult]=await Promise.all([
    selectAllNeonRows(scope.galaxy,{
      columns:'uid,title,content,searchable',
      filters:[{column:'searchable',operator:'eq',value:true}],
      orders:[{column:'uid',ascending:true}]
    }),
    selectAllNeonRows(scope.galaxyMedia,{
      columns:'media_id,galaxy_link,title,meta_tags,media_type',
      orders:[{column:'media_id',ascending:true}]
    })
  ]);
  return buildDocuments(textResult.rows||[],mediaResult.rows||[]);
}

export async function selectRune66Classification(){
  if(analysisPromise)return analysisPromise;
  analysisPromise=(async()=>{
    const [{styleRows,structureRows},documents]=await Promise.all([
      loadRune66Catalog(),
      loadAuthorDocuments()
    ]);
    return classifyRune66Documents(documents,styleRows,structureRows);
  })().catch(error=>{
    analysisPromise=null;
    throw error;
  });
  return analysisPromise;
}

export function clearRune66ClassificationCache(){
  analysisPromise=null;
}
