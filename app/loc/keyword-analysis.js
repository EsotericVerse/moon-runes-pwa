'use client';

import {dbAuthRelation} from './db-client.mjs';
import {selectAllRows,selectCount,selectRows} from './db-query.mjs';
import {KEYWORD_CLASSIFICATION_BATCH_SIZE} from './db-contract.mjs';
import {defaultScopeData,selectManagedScope} from './scope-data';
import {reanalyzeKeywordClass} from './keyword-reanalysis.mjs';
import {keywordTreeCatalog} from './keyword-tree-report.mjs';

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
  const {rows:config}=await selectRows(scope.config,{
    columns:'current_keyword_class_uid',
    filters:[{column:'id',operator:'eq',value:scope.id}],limit:1
  });
  const uid=String(config?.[0]?.current_keyword_class_uid||'');
  if(!uid)return '';
  const {rows}=await selectRows(scope.keywords,{
    columns:'uid,type,name',
    filters:[{column:'uid',operator:'eq',value:uid},{column:'type',operator:'eq',value:'class'}],limit:1
  });
  return String(rows?.[0]?.name||'');
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
  const id=normalizeScopeId(scopeId),{scope,config}=await scopeAndConfig(id);
  const classUid=String(config.current_keyword_class_uid||'');
  if(!/^[0-9A-Za-z]{4}$/.test(classUid))throw new Error('尚未指定 Keywords Class');
  const {rows:treeRows}=await selectAllRows(scope.keywords,{
    columns:'uid,type,name,desc,lists,uid_lists',
    orders:[{column:'uid',ascending:true}]
  });
  const catalog=keywordTreeCatalog(treeRows,classUid);
  const minChars=normalizeKeywordMinChars(config.keyword_min_chars);
  const minDocuments=normalizeKeywordMinDocuments(config.keyword_min_documents);
  const fingerprint=await keywordFingerprint(scope);
  const {data:staled,error:staleError}=await dbAuthRelation(scope.config)
    .update({staticstime:null}).eq('id',id).eq('current_keyword_class_uid',classUid).select('id');
  if(staleError||staled?.length!==1)throw new Error(staleError?.message||'Class 已切換');
  clearKeywordAnalysisCache();
  const progress=event=>{
    const done=Number(event.completed)||0,total=Number(event.total)||0;
    const percent=event.phase==='reading'
      ?Math.min(60,3+Math.floor(57*done/Math.max(1,Number(fingerprint.count)||done)))
      :event.phase==='writing'?60+Math.floor(39*done/Math.max(1,total)):100;
    reportBatchProgress(onProgress,event.phase,done,total,percent,
      event.phase==='reading'?'已重新判斷 '+done+' 篇文章':
      event.phase==='writing'?'已更新 '+done+' / '+total+' 筆 Keywords':'分析已完成');
  };
  const result=await reanalyzeKeywordClass({
    classUid,treeRows,minChars,pageSize:KEYWORD_CLASSIFICATION_BATCH_SIZE,
    readPage:async ({offset,limit})=>{
      const {rows}=await selectRows(scope.galaxy,{
        columns:'uid,content,searchable',
        filters:[{column:'statistics_able',operator:'eq',value:true}],
        orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}],limit,offset
      });
      return rows;
    },
    writeNode:async ({uid,uid_lists})=>{
      const {data,error}=await dbAuthRelation(scope.keywords).update({uid_lists})
        .eq('uid',uid).select('uid');
      if(error||data?.length!==1)throw new Error('Keywords.uid_lists 儲存失敗：'+uid+' '+(error?.message||''));
    },
    finalize:async counts=>{
      const classes=Object.fromEntries(catalog.groups.map(group=>[group.uid,group.name]));
      const items=Object.fromEntries(catalog.groups.flatMap(group=>group.items.map(item=>[item.uid,item.name])));
      const meta={class_uid:classUid,class_name:catalog.name,classes,items,
        analyzedDocuments:counts.analyzedDocuments,matchedDocuments:counts.matchedDocuments,
        itemMatches:counts.itemMatches,occurrences:counts.occurrences,fingerprint};
      const now=new Date().toISOString();
      const {data,error}=await dbAuthRelation(scope.config)
        .update({keyword_meta:meta,staticstime:now,updated_at:now})
        .eq('id',id).eq('current_keyword_class_uid',classUid).select('id');
      if(error||data?.length!==1)throw new Error(error?.message||'Keywords 結果保存失敗');
    },onProgress:progress
  });
  clearKeywordAnalysisCache();
  return {...result,documentCount:result.analyzedDocuments,
    keywordDocumentCount:result.matchedDocuments,keywordMinChars:minChars,
    keywordMinDocuments:minDocuments,statisticsEnabled:result.matchedDocuments>minDocuments,
    skipped:false};
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
  const result={eligible:0,groupDays:[],items:new Map()};
  for(const row of rows||[]){
    if(row.kind==='eligible')result.eligible=Number(row.document_count)||0;
    if(row.kind==='class_day')result.groupDays.push({
      group_uid:String(row.group_uid||''),day:String(row.day||'').slice(0,10),
      count:Number(row.document_count)||0
    });
    if(row.kind==='item')result.items.set(String(row.item_key||''),row);
  }
  return result;
}
function storedSummary(agg,config,globalCount=agg.eligible){
  const meta=config?.keyword_meta||{};
  const classes=meta.classes||{},items=meta.items||{};
  const totals=new Map(),classifications=[];
  for(const item of agg.groupDays){
    if(!classes[item.group_uid]||!item.count)continue;
    totals.set(item.group_uid,(totals.get(item.group_uid)||0)+item.count);
    classifications.push({
      key:'group-day:'+item.group_uid+':'+item.day,uid:'',date:item.day,
      classification_group:String(classes[item.group_uid]),
      group_uid:item.group_uid,count:item.count,status:'classified'
    });
  }
  const groupTotals=Object.entries(classes).map(([uid,name],index)=>({
    group_uid:uid,group:name,order:index,document_count:totals.get(uid)||0
  }));
  const runeTotals=Object.entries(items).map(([uid,label],index)=>({
    uid,label,order:index,count:Number(agg.items.get(uid)?.hit_count)||0,
    document_count:Number(agg.items.get(uid)?.document_count)||0
  }));
  const classifiedCount=classifications.reduce((n,row)=>n+row.count,0);
  const base=emptyStored(config,{keywordDocumentCount:globalCount});
  return {...base,documentCount:agg.eligible,classifiedCount,
    unclassifiedCount:Math.max(0,agg.eligible-classifiedCount),
    classifications:base.statisticsEnabled?classifications:[],
    runeTotals:base.statisticsEnabled?runeTotals:[],
    runeRanking:base.statisticsEnabled?[...runeTotals].sort((a,b)=>b.count-a.count||b.document_count-a.document_count||a.order-b.order):[],
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
    const {readKeywordTreeSummary}=await import('./db-client.mjs');
    const rows=await readKeywordTreeSummary(id,{startDate,endDate,source});
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
