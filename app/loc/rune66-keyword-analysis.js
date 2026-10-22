'use client';

import {applyKeywordClassification,dbAuthRelation,readRune66Summary} from './db-client.mjs';
import {selectAllRows} from './db-query.mjs';
import {KEYWORD_CLASSIFICATION_BATCH_SIZE} from './db-contract.mjs';
import {selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';
import {parseGroupLists,formatGroupLists} from './group-lists.mjs';

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;

const analysisPromises=new Map();
let rune66SummaryInstalled=true;

function normalizeScopeId(value){
  const scope=String(value||'lo3rwang').trim().toLowerCase();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scope))throw new Error('Scope ID 格式無效');
  return scope;
}

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
  return parseGroupLists(value);
}
function isEligibleRow(row,minChars){
  // statistics_able is now filtered in the query itself (see
  // runRune66ClassificationBatch's selectAllRows call) -- every row reaching
  // here already satisfies it, so it's not re-checked.
  return Boolean(
    String(row?.uid||'').trim()
    &&row?.searchable!==false
    &&analysisCharacterCount(row?.content)>minChars
  );
}
function documentOf(row){
  // title is deliberately left out: keyword/rune matching only looks at
  // the article body (see textOf in model/rune66-keyword-engine.mjs),
  // unlike site search, which legitimately does match on title.
  return {
    key:'galaxy:'+row.uid,
    uid:String(row.uid||'').trim(),
    kind:'galaxy',
    content:String(row.content||'')
  };
}
function reportBatchProgress(onProgress,phase,completed,total,percent,label){
  if(typeof onProgress!=='function')return;
  onProgress({
    phase,
    completed,
    total,
    percent:Math.max(0,Math.min(100,Math.round(percent))),
    label
  });
}

// Preserve the canonical per-document Rune engine while yielding after small batches.
// This keeps the UI responsive and counts real completed documents, not elapsed time.
async function classifyDocumentsIncrementally(documents,catalogRows,onProgress){
  const batchSize=120;
  const parts=[];
  const runeTotals=new Map();
  const groupTotals=new Map();
  const unsupportedRules=new Map();
  let classifiedCount=0;
  let unclassifiedCount=0;
  let tieCount=0;
  for(let offset=0;offset<documents.length;offset+=batchSize){
    const chunk=classifyRune66Documents(documents.slice(offset,offset+batchSize),catalogRows);
    parts.push(...chunk.classifications);
    classifiedCount+=chunk.classifiedCount;
    unclassifiedCount+=chunk.unclassifiedCount;
    tieCount+=chunk.tieCount;
    for(const row of chunk.runeTotals){
      const existing=runeTotals.get(row.rune_id);
      if(existing){
        existing.count+=row.count;
        existing.document_count+=row.document_count;
      }else runeTotals.set(row.rune_id,{...row});
    }
    for(const row of chunk.groupTotals){
      const existing=groupTotals.get(row.group);
      if(existing){
        existing.hit_count+=row.hit_count;
        existing.document_count+=row.document_count;
      }else groupTotals.set(row.group,{...row});
    }
    for(const rule of chunk.unsupportedRules){
      unsupportedRules.set(JSON.stringify(rule),rule);
    }
    const completed=Math.min(documents.length,offset+batchSize);
    reportBatchProgress(onProgress,'analysis',completed,documents.length,20+40*completed/documents.length,
      '分析分類 '+completed.toLocaleString()+' / '+documents.length.toLocaleString()+' 篇');
    // Permit React to paint the percent and allow user interaction between batches.
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(!documents.length){
    reportBatchProgress(onProgress,'analysis',0,0,60,'沒有符合條件的文章');
  }
  const totals=[...runeTotals.values()];
  return {
    documentCount:documents.length,
    classifiedCount,
    unclassifiedCount,
    tieCount,
    classifications:parts,
    runeTotals:totals.sort((a,b)=>a.rune_id-b.rune_id),
    runeRanking:[...totals].sort((a,b)=>b.count-a.count||b.document_count-a.document_count||a.rune_id-b.rune_id),
    groupTotals:[...groupTotals.values()].sort((a,b)=>a.order-b.order||a.group.localeCompare(b.group)),
    unsupportedRules:[...unsupportedRules.values()]
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
  if(ordered.length!==9)throw new Error('目前文章 class_id 契約需要恰好 9 個啟用 Class；目前為 '+ordered.length+' 個。');
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
    if(!Number.isInteger(runeId)||runeId<0||count<=0)continue;
    output[String(runeId)]=count;
  }
  return formatGroupLists(output);
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
async function resolveDynamicClassifications(documents,catalogRows,onProgress){
  const classMap=buildClassMap(catalogRows);
  const defaultGroup=defaultGroupOf(catalogRows);
  const engine=await classifyDocumentsIncrementally(documents,catalogRows,onProgress);
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
      // Zero keyword hits at all: fall back to this class's configured
      // default/exception item (silver.{scope}_keywords.default_group_item_no,
      // an item_no -- resolved by defaultGroupOf() to that item's class_group)
      // instead of leaving the document permanently unclassified.
      else if(defaultGroup&&classMap.groupToClassId.has(defaultGroup))group=defaultGroup;
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
async function scopeAndConfig(scopeId='lo3rwang'){
  const id=normalizeScopeId(scopeId);
  const scope=await selectManagedScope(id);
  if(!scope)throw new Error('找不到 '+id+' Scope');
  const result=await selectAllRows(scope.config,{
    columns:'id,keyword_min_chars,keyword_min_documents,current_keyword_class_id,keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime',
    filters:[{column:'id',operator:'eq',value:id}]
  });
  const config=result.rows?.[0]||null;
  if(!config)throw new Error('找不到 '+id+' 關鍵詞設定');
  return {scope,config,scopeId:id};
}
async function loadCurrentCatalog(scopeId,currentClassId){
  const scope=normalizeScopeId(scopeId);
  const id=String(currentClassId||'').trim();
  if(!id)throw new Error('尚未指定目前使用的關鍵詞 Class');
  // default_group_item_no lives on this same table (silver.{scope}_keywords,
  // the group layer), not on silver.keyword_classes (demo/registry
  // plumbing) or the scope config table -- same value repeated on every row
  // of this class_id, so any row (e.g. [0]) carries the current setting.
  const {data,error}=await dbAuthRelation(`silver.${scope}_keywords`)
    .select('keyword_id,class_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no,default_group_item_no')
    .eq('class_id',id)
    .order('order_no',{ascending:true})
    .order('item_no',{ascending:true});
  if(error)throw new Error(error.message||'關鍵詞 Class 讀取失敗');
  if(!data?.length)throw new Error('目前使用的關鍵詞 Class 沒有內容');
  return data;
}
// Resolves the configured default-group item_no to the class_group string
// that resolveDynamicClassifications' candidate/group machinery works in.
// Falls back to no default (empty string) if the item is missing or has
// been disabled since it was configured as the default.
function defaultGroupOf(catalogRows){
  const defaultGroupItemNo=Number(catalogRows?.[0]?.default_group_item_no);
  if(!Number.isInteger(defaultGroupItemNo))return '';
  const row=(catalogRows||[]).find(item=>
    Number(item?.item_no)===defaultGroupItemNo&&item?.class_enable!==false
  );
  return row?String(row.class_group||'').trim():'';
}

export async function runRune66ClassificationBatch(scopeId='lo3rwang',{onProgress}={}){
  const normalizedScopeId=normalizeScopeId(scopeId);
  reportBatchProgress(onProgress,'reading',0,0,0,'確認 Scope 與分析設定');
  const {scope,config}=await scopeAndConfig(normalizedScopeId);
  reportBatchProgress(onProgress,'reading',0,0,3,'讀取文章與目前的關鍵詞庫');
  const minChars=normalizeKeywordMinChars(config.keyword_min_chars);
  const minDocuments=normalizeKeywordMinDocuments(config.keyword_min_documents);
  const currentClassId=String(config.current_keyword_class_id||'').trim();
  const [catalogRows,textResult]=await Promise.all([
    loadCurrentCatalog(normalizedScopeId,currentClassId),
    selectAllRows(scope.galaxy,{
      // title and createtime are not selected: matching only reads content
      // (see documentOf/textOf), and nothing downstream reads the `date`
      // field that createtime used to feed. createtime is still the order
      // column below -- PostgREST can order by a column that isn't selected.
      columns:'uid,content,searchable',
      // statistics_able is the eligibility gate itself -- filter it in the
      // query (fewer rows read, fewer rows paged through) instead of
      // selecting it and discarding non-qualifying rows in isEligibleRow.
      filters:[{column:'statistics_able',operator:'eq',value:true}],
      orders:[{column:'createtime',ascending:true}],
      // This selects `content`, the one large column in this table (avg ~160
      // chars but up to 22K+ per row). DB_QUERY_BATCH_SIZE's default page
      // size (65535) is sized for narrow rows; with content included, a
      // scope under that row count fetches its entire table in one request.
      // Page this read explicitly instead of relying on the shared ceiling.
      pageSize:KEYWORD_CLASSIFICATION_BATCH_SIZE,
      onProgress:({completed,total})=>reportBatchProgress(onProgress,'reading',completed,total,
        3+17*(total?completed/total:1),
        '讀取文章 '+completed.toLocaleString()+' / '+total.toLocaleString()+' 篇')
    })
  ]);
  const rawRows=textResult.rows||[];
  const eligibleRows=rawRows.filter(row=>isEligibleRow(row,minChars));
  const documents=eligibleRows.map(documentOf);
  reportBatchProgress(onProgress,'reading',rawRows.length,rawRows.length,20,
    '讀取完成；符合分析資格 '+documents.length.toLocaleString()+' 篇');
  const resolved=await resolveDynamicClassifications(documents,catalogRows,onProgress);
  const eligibleByUid=resolved.byUid;
  const payloadRows=eligibleRows.map(row=>{
    const uid=String(row?.uid||'').trim();
    const result=eligibleByUid.get(uid);
    return {
      uid,
      class_id:result?.class_id||null,
      group_lists:result?.group_lists??''
    };
  });
  const keywordMeta=metaOf(catalogRows,resolved.classMap,currentClassId);
  const written=await applyKeywordClassification(normalizedScopeId,{rows:payloadRows,meta:keywordMeta},{
    onProgress:({phase,completed,total})=>{
      const percent=phase==='prepare'?61:phase==='finalizing'?99:61+38*(total?completed/total:1);
      const label=phase==='prepare'?'準備寫入文章 Attr':phase==='finalizing'?'正在定錨並核對寫入數量':
        '資料庫已寫入 '+completed.toLocaleString()+' / '+total.toLocaleString()+' 篇';
      reportBatchProgress(onProgress,phase,completed,total,percent,label);
    }
  });
  if(written.count!==payloadRows.length||written.documentCount!==payloadRows.length){
    throw new Error('關鍵詞批次寫回不完整：預期 '+payloadRows.length+'，實際 '+written.count);
  }
  clearRune66ClassificationCache();
  const {data:verifiedRows,error:verificationError}=await dbAuthRelation(scope.config)
    .select('keyword_document_count,staticstime')
    .eq('id',normalizedScopeId).limit(1);
  if(verificationError)throw new Error('關鍵詞定錨驗證失敗：'+verificationError.message);
  const verified=verifiedRows?.[0];
  if(!verified?.staticstime||Number(verified.keyword_document_count)!==payloadRows.length){
    throw new Error('關鍵詞定錨驗證失敗：文章數或完成時間不符，統計尚不可公開');
  }
  reportBatchProgress(onProgress,'completed',payloadRows.length,payloadRows.length,100,
    '已完成 '+payloadRows.length.toLocaleString()+' 篇文章 Attr 寫入與定錨驗證');
  return {
    ...resolved,
    documentCount:documents.length,
    keywordMinChars:minChars,
    keywordMinDocuments:minDocuments,
    keywordDocumentCount:Number(verified.keyword_document_count),
    statisticsEnabled:documents.length>minDocuments,
    staticstime:verified.staticstime
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
// Exact counts for the stored classification, reduced from row-level data. Used only
// when the database-side function (silver.read_rune66_summary) is not available.
function aggregateStoredRows(rows){
  const agg={eligible:0,classDays:new Map(),itemCounts:new Map(),itemDocuments:new Map()};
  for(const row of rows||[]){
    const lists=normalizedGroupLists(row?.group_lists);
    if(lists===false)continue;
    agg.eligible+=1;
    const classId=Number(row?.class_id);
    if(Number.isInteger(classId)){
      const key=classId+'|'+String(row.createtime||'').slice(0,10);
      agg.classDays.set(key,(agg.classDays.get(key)||0)+1);
    }
    for(const [itemId,value] of Object.entries(lists)){
      const count=Number(value)||0;
      if(count<=0)continue;
      agg.itemCounts.set(itemId,(agg.itemCounts.get(itemId)||0)+count);
      agg.itemDocuments.set(itemId,(agg.itemDocuments.get(itemId)||0)+1);
    }
  }
  return {
    eligible:agg.eligible,
    classDays:[...agg.classDays].map(([key,count])=>{const split=key.indexOf('|');return {class_id:Number(key.slice(0,split)),day:key.slice(split+1),count};}),
    itemCounts:agg.itemCounts,
    itemDocuments:agg.itemDocuments
  };
}
// Same shape, taken straight from the database's exact counts.
function aggregateRune66Rows(rows){
  const agg={eligible:0,classDays:[],itemCounts:new Map(),itemDocuments:new Map()};
  for(const row of rows||[]){
    if(row.kind==='eligible')agg.eligible=Number(row.hit_count)||0;
    else if(row.kind==='class_day')agg.classDays.push({class_id:Number(row.class_id),day:String(row.day||'').slice(0,10),count:Number(row.hit_count)||0});
    else if(row.kind==='item'){
      agg.itemCounts.set(String(row.item_key),Number(row.hit_count)||0);
      agg.itemDocuments.set(String(row.item_key),Number(row.document_count)||0);
    }
  }
  return agg;
}
function storedSummary(agg,config){
  const meta=config?.keyword_meta&&typeof config.keyword_meta==='object'?config.keyword_meta:{};
  const classes=meta.classes&&typeof meta.classes==='object'?meta.classes:{};
  const items=meta.items&&typeof meta.items==='object'?meta.items:{};
  const classCounts=new Map();
  const itemCounts=agg.itemCounts;
  const itemDocuments=agg.itemDocuments;
  const classifications=[];

  for(const entry of agg.classDays){
    const className=Number.isInteger(entry.class_id)?String(classes[String(entry.class_id)]||'').trim():'';
    if(!className||entry.count<=0)continue;
    classCounts.set(entry.class_id,(classCounts.get(entry.class_id)||0)+entry.count);
    classifications.push({
      key:'class-day:'+entry.class_id+':'+entry.day,
      uid:'',
      kind:'galaxy',
      title:'',
      date:entry.day,
      status:'classified',
      classification_group:className,
      class_id:entry.class_id,
      count:entry.count,
      tied_groups:[],
      group_lists:{}
    });
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
  const classifiedCount=classifications.reduce((sum,row)=>sum+row.count,0);
  const base=emptyStored(config);
  return {
    ...base,
    documentCount:agg.eligible,
    classifiedCount,
    unclassifiedCount:Math.max(0,agg.eligible-classifiedCount),
    classifications:base.statisticsEnabled?classifications:[],
    runeTotals:base.statisticsEnabled?runeTotals:[],
    runeRanking:base.statisticsEnabled?[...runeTotals].sort((a,b)=>b.count-a.count||b.document_count-a.document_count||a.rune_id-b.rune_id):[],
    groupTotals:base.statisticsEnabled?groupTotals:[]
  };
}

export async function selectRune66Classification({scopeId='lo3rwang',startDate='',endDate=''}={}){
  const normalizedScopeId=normalizeScopeId(scopeId);
  const key=[normalizedScopeId,String(startDate||''),String(endDate||'')].join('|');
  if(analysisPromises.has(key))return analysisPromises.get(key);
  const promise=(async()=>{
    const {scope,config}=await scopeAndConfig(normalizedScopeId);
    if(!config.staticstime)return emptyStored(config);
    if(rune66SummaryInstalled){
      try{
        const counted=await readRune66Summary(normalizedScopeId,{startDate,endDate});
        return storedSummary(aggregateRune66Rows(counted),config);
      }catch(error){
        if(!['PGRST202','42883'].includes(String(error?.code||'')))throw error;
        rune66SummaryInstalled=false;
      }
    }
    const rows=await selectAllRows(scope.galaxy,{
      columns:'uid,createtime,class_id,group_lists',
      filters:[
        {column:'searchable',operator:'eq',value:true},
        {column:'statistics_able',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
      ],
      orders:[{column:'createtime',ascending:true}]
    });
    return storedSummary(aggregateStoredRows(rows.rows||[]),config);
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
