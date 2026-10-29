'use client';

import {dbAuthRelation} from './db-client.mjs';
import {selectAllRows,selectCount,selectRows} from './db-query.mjs';
import {KEYWORD_CLASSIFICATION_BATCH_SIZE} from './db-contract.mjs';
import {defaultScopeData,selectManagedScope} from './scope-data';
import {reanalyzeKeywordClass} from './keyword-reanalysis.mjs';

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;

const analysisPromises=new Map();

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
function reportBatchProgress(onProgress,phase,completed,total,percent,label,details={}){
  if(typeof onProgress!=='function')return;
  onProgress({
    phase,
    completed,
    total,
    percent:Math.max(0,Math.min(100,Math.round(percent))),
    label,
    ...details
  });
}

// Preserve the canonical per-document Rune engine while yielding after small batches.
// This keeps the UI responsive and counts real completed documents, not elapsed time.
// Group ordering comes from each Keywords Class's own catalog.
// Its configured default Item's Group comes last, regardless of item number.
function buildClassMap(catalogRows=[],defaultKeywordId=''){
  const groups=new Map();
  for(const [index,row] of catalogRows.entries()){
    if(row?.class_enable===false)continue;
    const group=String(row?.class_group||'').trim();
    if(!group)continue;
    const n=Number(row?.order_no);
    const order=row?.order_no==null||!Number.isFinite(n)?Number.MAX_SAFE_INTEGER:n;
    const prior=groups.get(group);
    if(!prior)groups.set(group,{group,order,firstSeen:index});
    else if(order<prior.order)prior.order=order;
  }
  const defaultEntry=(catalogRows||[]).find(row=>
    String(row?.keyword_id)===String(defaultKeywordId)&&row?.class_enable!==false
  );
  const defaultGroup=String(defaultEntry?.class_group||'').trim();
  const ordered=[...groups.values()]
    .sort((a,b)=>{
      const aDefault=Boolean(defaultGroup&&a.group===defaultGroup);
      const bDefault=Boolean(defaultGroup&&b.group===defaultGroup);
      if(aDefault!==bDefault)return aDefault?1:-1;
      return a.order-b.order||a.firstSeen-b.firstSeen||a.group.localeCompare(b.group);
    })
    .map((row,index)=>({group:row.group,order:index,class_id:index+1}));
  if(!ordered.length)throw new Error('目前 Keywords Class 沒有啟用的 Group');
  return {
    ordered,
    groupToClassId:new Map(ordered.map(item=>[item.group,item.class_id])),
    classIdToGroup:new Map(ordered.map(item=>[item.class_id,item.group]))
  };
}
async function keywordFingerprint(scope){
  const [count,latest]=await Promise.all([
    selectCount(scope.galaxy,{idColumn:'uid',filters:[{column:'statistics_able',operator:'eq',value:true}]}),
    selectRows(scope.galaxy,{
      columns:'createtime',
      filters:[{column:'statistics_able',operator:'eq',value:true}],
      orders:[{column:'createtime',ascending:false}],
      limit:1
    })
  ]);
  return {count,latest:String(latest.rows?.[0]?.createtime||'')};
}
// Nothing eligible has been added/removed/edited (count+latest-createtime
// unchanged) and no keyword item's own content changed (every keyword_sha
// unchanged) since the last successful run: the whole analyze+write pipeline
// can be skipped. This does NOT catch a silent edit to an existing article's
// content that doesn't also bump its createtime -- that still needs a manual
// 重新分析 click (or any keyword edit, which always changes a sha and forces
// a real run).
export async function selectActiveKeywordClassName(scopeId=''){
  const scope=defaultScopeData(scopeId);
  if(!scope)return '';
  let configRows;
  try{
    ({rows:configRows}=await selectRows(scope.config,{
      columns:'current_keyword_class_uid',
      filters:[{column:'id',operator:'eq',value:scope.id}],limit:1
    }));
  }catch(error){
    // Keyword classification is optional per Scope; some config tables
    // (e.g. silver.lrunes) intentionally have no active-Class column.
    if(['42703','PGRST204'].includes(String(error?.code||''))&&
      String(error?.message||'').includes('current_keyword_class_uid'))return '';
    throw error;
  }
  const currentId=String(configRows?.[0]?.current_keyword_class_uid||'').trim();
  if(!currentId)return '';
  const {rows:keywordRows}=await selectRows(scope.keywords,{
    columns:'class_name',
    filters:[{column:'class_uid',operator:'eq',value:currentId}],limit:1
  });
  return String(keywordRows?.[0]?.class_name||'').trim();
}

async function scopeAndConfig(scopeId='lo3rwang',{publicRead=false}={}){
  const id=normalizeScopeId(scopeId);
  // Public statistics only read the stored summary/config and public Galaxy attrs.
  // The writer still resolves the managed Scope with authenticated access.
  const scope=publicRead?defaultScopeData(id):await selectManagedScope(id);
  if(!scope)throw new Error('找不到 '+id+' Scope');
  const result=await selectAllRows(scope.config,{
    columns:'id,keyword_min_chars,keyword_min_documents,current_keyword_class_uid,keyword_class_share_enabled,keyword_meta,staticstime',
    filters:[{column:'id',operator:'eq',value:id}]
  });
  const config=result.rows?.[0]||null;
  if(!config)throw new Error('找不到 '+id+' 關鍵詞設定');
  return {scope,config,scopeId:id};
}
// Portable full reanalysis: all Galaxy content is read, but only Keyword Item
// uidlist columns are written. No old classification state is consulted.
export async function runKeywordAnalysisBatch(scopeId='lo3rwang',{onProgress}={}){
  const id=normalizeScopeId(scopeId);
  const {scope,config}=await scopeAndConfig(id);
  const classUid=String(config.current_keyword_class_uid||'');
  if(!/^[0-9A-Za-z]{4}$/.test(classUid))throw new Error('尚未指定有效的 Keywords Class UID');
  const {rows:catalogRows}=await selectAllRows(scope.keywords,{
    columns:'keyword_id,class_uid,class_name,class_group,item_name,class_enable,keywords,order_no,principle',
    filters:[{column:'class_uid',operator:'eq',value:classUid}],
    orders:[{column:'order_no',ascending:true},{column:'keyword_id',ascending:true}]
  });
  if(!catalogRows.length)throw new Error('Keywords Class 沒有可分析的 Item');
  const {rows:classRows}=await selectRows(id==='local'?'local.local_keyword_classes':'silver.keyword_classes',{
    columns:'default_keyword_id',
    filters:[{column:'class_uid',operator:'eq',value:classUid}],limit:1
  });
  const defaultKeywordId=String(classRows?.[0]?.default_keyword_id??'');
  const minChars=normalizeKeywordMinChars(config.keyword_min_chars);
  const minDocuments=normalizeKeywordMinDocuments(config.keyword_min_documents);
  const groupMap=buildClassMap(catalogRows,defaultKeywordId);
  const fingerprint=await keywordFingerprint(scope);
  const now=()=>new Date().toISOString();
  const {data:staled,error:staleError}=await dbAuthRelation(scope.config)
    .update({staticstime:null}).eq('id',id)
    .eq('current_keyword_class_uid',classUid).select('id');
  if(staleError||staled?.length!==1)
    throw new Error('無法鎖定目前的 Keywords Class：'+String(staleError?.message||'Class changed'));
  clearKeywordAnalysisCache();
  const progress=event=>{
    const phase=event.phase;
    const completed=Number(event.completed)||0;
    const total=Number(event.total)||0;
    const percent=phase==='reading'?Math.min(60,3+Math.floor(completed/Math.max(1,Number(fingerprint.count)||completed)*57))
      :phase==='writing'?60+Math.floor(39*completed/Math.max(1,total)):100;
    const label=phase==='reading'?'已重新判斷 '+completed.toLocaleString()+' 篇文章'
      :phase==='writing'?'已更新 '+completed+' / '+total+' 個關鍵詞項目'
      :'分類已重新計算並儲存至 Keywords';
    reportBatchProgress(onProgress,phase,completed,total,percent,label);
  };
  const result=await reanalyzeKeywordClass({
    classUid,catalogRows,defaultKeywordId,minChars,pageSize:KEYWORD_CLASSIFICATION_BATCH_SIZE,
    readPage:async ({offset,limit})=>{
      const {rows}=await selectRows(scope.galaxy,{
        columns:'uid,content,searchable',
        filters:[{column:'statistics_able',operator:'eq',value:true}],
        orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}],
        limit,offset
      });
      return rows;
    },
    writeItem:async ({keywordId,uidlist})=>{
      const {data,error}=await dbAuthRelation(scope.keywords).update({uidlist})
        .eq('class_uid',classUid).eq('keyword_id',keywordId).select('keyword_id');
      if(error||data?.length!==1)
        throw new Error('Keywords.uidlist 寫入失敗：'+keywordId+' '+String(error?.message||''));
    },
    finalize:async counts=>{
      const meta={
        class_uid:classUid,
        class_name:String(catalogRows[0]?.class_name||''),
        classes:Object.fromEntries(groupMap.ordered.map(group=>[String(group.class_id),group.group])),
        items:Object.fromEntries(catalogRows.map(row=>[String(row.keyword_id),String(row.item_name||'')])),
        analyzedDocuments:counts.analyzedDocuments,
        matchedDocuments:counts.matchedDocuments,
        itemMatches:counts.itemMatches,
        occurrences:counts.occurrences,
        fingerprint
      };
      const {data,error}=await dbAuthRelation(scope.config)
        .update({keyword_meta:meta,staticstime:now(),updated_at:now()})
        .eq('id',id).eq('current_keyword_class_uid',classUid)
        .select('id,staticstime');
      if(error||data?.length!==1)
        throw new Error('Keywords 定錨失敗：'+String(error?.message||'Class changed'));
    },
    onProgress:progress
  });
  clearKeywordAnalysisCache();
  const {data:verified,error:verifyError}=await dbAuthRelation(scope.config)
    .select('staticstime,keyword_meta').eq('id',id).limit(1);
  if(verifyError||!verified?.[0]?.staticstime
    ||verified[0].keyword_meta?.class_uid!==classUid
    ||Number(verified[0].keyword_meta?.matchedDocuments)!==result.matchedDocuments)
    throw new Error('Keywords 更新後核對失敗');
  return {
    ...result,documentCount:result.analyzedDocuments,
    keywordDocumentCount:result.matchedDocuments,
    keywordMinChars:minChars,keywordMinDocuments:minDocuments,
    statisticsEnabled:result.matchedDocuments>minDocuments,
    dynamicTieCount:0,staticstime:verified[0].staticstime,skipped:false
  };
}

function emptyStored(config,extra={}){
  const minDocuments=normalizeKeywordMinDocuments(config?.keyword_min_documents);
  const globalCount=Math.max(0,Number(extra?.keywordDocumentCount)||0);
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
// when the database-side RPC (silver.read_rune66_summary) is not available.
// Exact UID-list results are summarized by PostgreSQL.
function aggregateSummaryRpcRows(rows){
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
function storedSummary(agg,config,globalCount=agg.eligible){
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
  const base=emptyStored(config,{keywordDocumentCount:globalCount});
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

export async function selectKeywordAnalysisSummary({scopeId='lo3rwang',startDate='',endDate='',
  sourceCategory='',sourceCategories=[],sourceAliases=[],sourceNames=null}={}){
  const id=normalizeScopeId(scopeId);
  const category=String(sourceCategory||'').trim().toLowerCase();
  const source=Array.isArray(sourceNames)&&sourceNames.length===1?String(sourceNames[0]):'';
  const cacheKey=[id,startDate,endDate,category,source].join('|');
  if(!category&&!source&&analysisPromises.has(cacheKey))return analysisPromises.get(cacheKey);
  const job=(async()=>{
    const {config}=await scopeAndConfig(id,{publicRead:true});
    if(!config.staticstime)return emptyStored(config);
    if(category&&!source)
      throw new Error('關鍵詞來源分類需要指定原始來源名稱');
    const {readKeywordUidlistSummary}=await import('./db-client.mjs');
    const rows=await readKeywordUidlistSummary(id,{startDate,endDate,source});
    const agg=aggregateSummaryRpcRows(rows.filter(row=>row.kind!=='item_day'));
    const globalCount=Number(config.keyword_meta?.matchedDocuments)||0;
    return storedSummary(agg,config,globalCount);
  })().catch(error=>{
    analysisPromises.delete(cacheKey);
    throw error;
  });
  if(!category&&!source)analysisPromises.set(cacheKey,job);
  return job;
}

export function clearKeywordAnalysisCache(){
  analysisPromises.clear();
}
