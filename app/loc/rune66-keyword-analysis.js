'use client';

import {applyKeywordClassification,dbAuthRelation} from './db-client.mjs';
import {selectAllRows} from './db-query.mjs';
import {selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';

const SCOPE_ID='lo3rwang';
const PERSONAL_KEYWORD_TABLE='silver.lo3rwang_keywords';
const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;

const analysisPromises=new Map();

function normalizeKeywordMinChars(value){
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>=0?parsed:DEFAULT_KEYWORD_MIN_CHARS;
}
function normalizeKeywordMinDocuments(value){
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>=0?parsed:DEFAULT_KEYWORD_MIN_DOCUMENTS;
}
export function analysisCharacterCount(value){
  return Array.from(String(value??'').replace(/\s/gu,'')).length;
}
function normalizedGroupLists(value){
  if(value===false)return false;
  if(value&&typeof value==='object'&&!Array.isArray(value))return value;
  if(typeof value==='string'){
    try{
      const parsed=JSON.parse(value);
      if(parsed===false)return false;
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;
    }catch{}
  }
  return {};
}
function isEligibleRow(row,minChars){
  return Boolean(
    String(row?.uid||'').trim()
    &&row?.searchable!==false
    &&row?.statistics_able!==false
    &&analysisCharacterCount(row?.content)>minChars
  );
}
function documentOf(row){
  return {
    key:'galaxy:'+row.uid,
    uid:String(row.uid||'').trim(),
    kind:'galaxy',
    title:String(row.title||'').trim(),
    content:String(row.content||''),
    date:String(row.createtime||'').slice(0,10)
  };
}
function buildClassMap(catalogRows=[]){
  const groups=new Map();
  for(const row of catalogRows){
    if(row?.class_enable===false)continue;
    const group=String(row?.class_group||'').trim();
    if(!group)continue;
    const order=Number.isFinite(Number(row?.order_no))?Number(row.order_no):Number(row?.item_no)||9999;
    groups.set(group,groups.has(group)?Math.min(groups.get(group),order):order);
  }
  const ordered=[...groups.entries()]
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))
    .map(([group,order],index)=>({group,order,class_id:index+1}));
  if(ordered.length!==8)throw new Error('目前文章 class_id 契約需要恰好 8 個啟用 Class；目前為 '+ordered.length+' 個。');
  return {
    ordered,
    groupToClassId:new Map(ordered.map(item=>[item.group,item.class_id])),
    classIdToGroup:new Map(ordered.map(item=>[item.class_id,item.group]))
  };
}
function groupListsOf(classification){
  const output={};
  for(const item of classification?.rune_counts||[]){
    const runeId=Number(item?.rune_id);
    const count=Number(item?.count)||0;
    if(!Number.isInteger(runeId)||runeId<1||count<=0)continue;
    output[String(runeId)]=count;
  }
  return output;
}
function metaOf(catalogRows,classMap,currentClassId){
  const className=String(catalogRows?.[0]?.class_name||'').trim();
  return {
    class_id:String(currentClassId||''),
    class_name:className,
    classes:Object.fromEntries(classMap.ordered.map(item=>[String(item.class_id),item.group])),
    items:Object.fromEntries(
      [...catalogRows]
        .filter(row=>Number.isInteger(Number(row?.item_no))&&String(row?.item_name||'').trim())
        .sort((a,b)=>Number(a.item_no)-Number(b.item_no))
        .map(row=>[String(Number(row.item_no)),String(row.item_name).trim()])
    )
  };
}
function resolveDynamicClassifications(documents,catalogRows){
  const engine=classifyRune66Documents(documents,catalogRows);
  const classMap=buildClassMap(catalogRows);
  const counts=new Map(classMap.ordered.map(item=>[item.group,0]));
  const byUid=new Map();
  let dynamicTieCount=0;
  let finalOrderTieCount=0;

  for(const row of engine.classifications||[]){
    const candidates=(row?.tied_groups||[]).filter(group=>classMap.groupToClassId.has(group));
    let group='';
    if(candidates.length>1){
      dynamicTieCount+=1;
      const minimum=Math.min(...candidates.map(candidate=>counts.get(candidate)||0));
      const minimumCandidates=candidates.filter(candidate=>(counts.get(candidate)||0)===minimum);
      if(minimumCandidates.length>1)finalOrderTieCount+=1;
      group=[...minimumCandidates].sort((a,b)=>
        (classMap.groupToClassId.get(a)||99)-(classMap.groupToClassId.get(b)||99)
      )[0]||'';
    }else if(candidates.length===1){
      group=candidates[0];
    }else{
      const resolved=String(row?.classification_group||'').trim();
      if(classMap.groupToClassId.has(resolved))group=resolved;
    }
    if(group)counts.set(group,(counts.get(group)||0)+1);
    byUid.set(String(row?.uid||'').trim(),{
      ...row,
      status:group?'classified':'unclassified',
      classification_group:group,
      class_id:group?(classMap.groupToClassId.get(group)||null):null,
      group_lists:groupListsOf(row)
    });
  }

  const classifiedCount=[...byUid.values()].filter(row=>row.class_id).length;
  const unclassifiedCount=Math.max(0,documents.length-classifiedCount);
  const groupTotals=classMap.ordered.map(item=>({
    group:item.group,
    order:item.order,
    class_id:item.class_id,
    document_count:counts.get(item.group)||0,
    hit_count:0
  }));
  return {
    ...engine,
    classMap,
    byUid,
    classifications:[...byUid.values()],
    classifiedCount,
    unclassifiedCount,
    tieCount:0,
    dynamicTieCount,
    finalOrderTieCount,
    groupTotals
  };
}
async function scopeAndConfig(){
  const scope=await selectManagedScope(SCOPE_ID);
  if(!scope)throw new Error('找不到 lo3rwang Scope');
  const result=await selectAllRows(scope.config,{
    columns:'id,keyword_min_chars,keyword_min_documents,current_keyword_class_id,keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime',
    filters:[{column:'id',operator:'eq',value:SCOPE_ID}]
  });
  const config=result.rows?.[0]||null;
  if(!config)throw new Error('找不到 lo3rwang 關鍵詞設定');
  return {scope,config};
}
async function loadCurrentCatalog(currentClassId){
  const id=String(currentClassId||'').trim();
  if(!id)throw new Error('尚未指定目前使用的關鍵詞 Class');
  const {data,error}=await dbAuthRelation(PERSONAL_KEYWORD_TABLE)
    .select('keyword_id,class_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no')
    .eq('class_id',id)
    .order('order_no',{ascending:true})
    .order('item_no',{ascending:true});
  if(error)throw new Error(error.message||'關鍵詞 Class 讀取失敗');
  if(!data?.length)throw new Error('目前使用的關鍵詞 Class 沒有內容');
  return data;
}

export async function runRune66ClassificationBatch(){
  const {scope,config}=await scopeAndConfig();
  const minChars=normalizeKeywordMinChars(config.keyword_min_chars);
  const minDocuments=normalizeKeywordMinDocuments(config.keyword_min_documents);
  const currentClassId=String(config.current_keyword_class_id||'').trim();
  const [catalogRows,textResult]=await Promise.all([
    loadCurrentCatalog(currentClassId),
    selectAllRows(scope.galaxy,{
      columns:'uid,title,content,createtime,searchable,statistics_able',
      orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}]
    })
  ]);
  const rawRows=textResult.rows||[];
  const eligibleRows=rawRows.filter(row=>isEligibleRow(row,minChars));
  const documents=eligibleRows.map(documentOf);
  const resolved=resolveDynamicClassifications(documents,catalogRows);
  const eligibleByUid=resolved.byUid;
  const payloadRows=eligibleRows.map(row=>{
    const uid=String(row?.uid||'').trim();
    const result=eligibleByUid.get(uid);
    return {
      uid,
      class_id:result?.class_id||null,
      group_lists:result?.group_lists||{}
    };
  });
  const keywordMeta=metaOf(catalogRows,resolved.classMap,currentClassId);
  const written=await applyKeywordClassification({rows:payloadRows,meta:keywordMeta});
  if(written.count!==payloadRows.length||written.documentCount!==payloadRows.length){
    throw new Error('關鍵詞批次寫回不完整：預期 '+payloadRows.length+'，實際 '+written.count);
  }
  clearRune66ClassificationCache();
  const refreshed=await selectAllRows(scope.config,{
    columns:'keyword_document_count,staticstime',
    filters:[{column:'id',operator:'eq',value:SCOPE_ID}]
  });
  return {
    ...resolved,
    documentCount:documents.length,
    keywordMinChars:minChars,
    keywordMinDocuments:minDocuments,
    keywordDocumentCount:Number(refreshed.rows?.[0]?.keyword_document_count)||documents.length,
    statisticsEnabled:documents.length>minDocuments,
    staticstime:refreshed.rows?.[0]?.staticstime||''
  };
}

function emptyStored(config,extra={}){
  const minDocuments=normalizeKeywordMinDocuments(config?.keyword_min_documents);
  const globalCount=Number(config?.keyword_document_count)||0;
  return {
    documentCount:0,
    classifiedCount:0,
    unclassifiedCount:0,
    tieCount:0,
    classifications:[],
    runeTotals:[],
    runeRanking:[],
    groupTotals:[],
    unsupportedRules:[],
    keywordMinChars:normalizeKeywordMinChars(config?.keyword_min_chars),
    keywordMinDocuments:minDocuments,
    keywordDocumentCount:globalCount,
    statisticsEnabled:Boolean(config?.staticstime)&&globalCount>minDocuments,
    staticstime:config?.staticstime||'',
    keywordMeta:config?.keyword_meta||{},
    ...extra
  };
}
function storedSummary(rows,config){
  const meta=config?.keyword_meta&&typeof config.keyword_meta==='object'?config.keyword_meta:{};
  const classes=meta.classes&&typeof meta.classes==='object'?meta.classes:{};
  const items=meta.items&&typeof meta.items==='object'?meta.items:{};
  const eligible=(rows||[]).filter(row=>normalizedGroupLists(row?.group_lists)!==false);
  const classCounts=new Map();
  const itemCounts=new Map();
  const itemDocuments=new Map();
  const classifications=[];

  for(const row of eligible){
    const classId=Number(row?.class_id);
    const className=Number.isInteger(classId)?String(classes[String(classId)]||'').trim():'';
    if(className){
      classCounts.set(classId,(classCounts.get(classId)||0)+1);
      classifications.push({
        key:'galaxy:'+String(row.uid||''),
        uid:String(row.uid||''),
        kind:'galaxy',
        title:'',
        date:String(row.createtime||'').slice(0,10),
        status:'classified',
        classification_group:className,
        class_id:classId,
        tied_groups:[],
        group_lists:normalizedGroupLists(row.group_lists)
      });
    }
    const lists=normalizedGroupLists(row?.group_lists);
    if(lists===false)continue;
    for(const [itemId,value] of Object.entries(lists)){
      const count=Number(value)||0;
      if(count<=0)continue;
      itemCounts.set(itemId,(itemCounts.get(itemId)||0)+count);
      itemDocuments.set(itemId,(itemDocuments.get(itemId)||0)+1);
    }
  }

  const groupTotals=Object.entries(classes)
    .map(([id,label])=>({
      class_id:Number(id),
      group:String(label||''),
      order:Number(id),
      hit_count:0,
      document_count:classCounts.get(Number(id))||0
    }))
    .sort((a,b)=>a.class_id-b.class_id);
  const runeTotals=Object.entries(items)
    .map(([id,label])=>({
      rune_id:Number(id),
      label:String(label||''),
      group:'',
      order:Number(id),
      count:itemCounts.get(id)||0,
      document_count:itemDocuments.get(id)||0
    }))
    .sort((a,b)=>a.rune_id-b.rune_id);
  const classifiedCount=classifications.length;
  const base=emptyStored(config);
  return {
    ...base,
    documentCount:eligible.length,
    classifiedCount,
    unclassifiedCount:Math.max(0,eligible.length-classifiedCount),
    classifications:base.statisticsEnabled?classifications:[],
    runeTotals:base.statisticsEnabled?runeTotals:[],
    runeRanking:base.statisticsEnabled?[...runeTotals].sort((a,b)=>b.count-a.count||b.document_count-a.document_count||a.rune_id-b.rune_id):[],
    groupTotals:base.statisticsEnabled?groupTotals:[]
  };
}

export async function selectRune66Classification({startDate='',endDate=''}={}){
  const key=[String(startDate||''),String(endDate||'')].join('|');
  if(analysisPromises.has(key))return analysisPromises.get(key);
  const promise=(async()=>{
    const {scope,config}=await scopeAndConfig();
    if(!config.staticstime)return emptyStored(config);
    const rows=await selectAllRows(scope.galaxy,{
      columns:'uid,createtime,class_id,group_lists',
      filters:[
        {column:'searchable',operator:'eq',value:true},
        {column:'statistics_able',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
      ],
      orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}]
    });
    return storedSummary(rows.rows||[],config);
  })().catch(error=>{
    analysisPromises.delete(key);
    throw error;
  });
  analysisPromises.set(key,promise);
  return promise;
}

export function clearRune66ClassificationCache(){
  analysisPromises.clear();
}
