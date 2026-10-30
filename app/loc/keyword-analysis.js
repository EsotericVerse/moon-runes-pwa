'use client';

import {dbAuthRelation} from './db-client.mjs';
import {selectAllRows,selectCount,selectRows} from './db-query.mjs';
import {KEYWORD_CLASSIFICATION_BATCH_SIZE} from './db-contract.mjs';
import {defaultScopeData,selectManagedScope} from './scope-data';
import {reanalyzeKeywordClass} from './keyword-reanalysis.mjs';
import {keywordClassState,invalidateKeywordClass,completeKeywordClass} from './keyword-class-state.mjs';
import {keywordTreeCatalog} from './keyword-tree-report.mjs';

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;

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
// Only Classes that this caller can read are selectable. The existing
// active Class is the default when it appears in that authorized directory.
export async function selectAvailableKeywordClasses(scopeId='lo3rwang'){
  const id=normalizeScopeId(scopeId),scope=defaultScopeData(id);
  if(!scope)return {classes:[],currentClassUid:''};
  const [{readSharedKeywordClasses},{rows}]=await Promise.all([
    import('./db-client.mjs'),
    selectRows(scope.config,{
      columns:'current_keyword_class_uid',
      filters:[{column:'id',operator:'eq',value:id}],limit:1
    })
  ]);
  const classes=await readSharedKeywordClasses(id);
  return {classes,currentClassUid:String(rows?.[0]?.current_keyword_class_uid||'')};
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
export async function runKeywordAnalysisBatch(scopeId='lo3rwang',{classUid:requestedClassUid='',onProgress}={}){
  const id=normalizeScopeId(scopeId),{scope,config}=await scopeAndConfig(id);
  const classUid=String(requestedClassUid||config.current_keyword_class_uid||'');
  if(!/^[0-9A-Za-z]{4}$/.test(classUid))throw new Error('尚未指定 Keywords Class');
  // Keywords rules are private unless explicitly shared. Reanalysis always
  // reads with the authenticated Scope-owner client, never anonymous RLS.
  const treeRows=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await dbAuthRelation(scope.keywords)
      .select('uid,type,name,desc,lists')
      .order('uid',{ascending:true}).range(offset,offset+499);
    if(error)throw new Error(error.message||'Keywords 規則讀取失敗');
    treeRows.push(...(data||[]));
    if((data||[]).length<500)break;
  }
  const catalog=keywordTreeCatalog(treeRows,classUid);
  const minChars=normalizeKeywordMinChars(config.keyword_min_chars);
  const minDocuments=normalizeKeywordMinDocuments(config.keyword_min_documents);
  const fingerprint=await keywordFingerprint(scope);
  // Mark only this Class stale; other Classes keep their completed results.
  const staleMeta=invalidateKeywordClass(config.keyword_meta,classUid);
  const isCurrent=classUid===String(config.current_keyword_class_uid||'');
  const {data:staled,error:staleError}=await dbAuthRelation(scope.config)
    .update({keyword_meta:staleMeta,...(isCurrent?{staticstime:null}:{})})
    .eq('id',id).select('id');
  if(staleError||staled?.length!==1)
    throw new Error(staleError?.message||'無法標記 Class 重新分析狀態');
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
  let lastArticleUid='';
  const result=await reanalyzeKeywordClass({
    classUid,treeRows,minChars,pageSize:KEYWORD_CLASSIFICATION_BATCH_SIZE,
    readPage:async ({limit})=>{
      // Read each UID exactly once via its existing primary-key index.
      // Offset pagination over a repeatedly sorted Galaxy is too expensive.
      let query=dbAuthRelation(scope.galaxy)
        .select('uid,content,searchable')
        .eq('statistics_able',true)
        .order('uid',{ascending:true}).limit(limit);
      if(lastArticleUid)query=query.gt('uid',lastArticleUid);
      const {data,error}=await query;
      if(error)throw new Error(error.message||'Galaxy 分頁讀取失敗');
      const page=data||[];
      if(page.length)lastArticleUid=page[page.length-1].uid;
      return page;
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
      const {data:latest,error:readError}=await dbAuthRelation(scope.config)
        .select('keyword_meta,current_keyword_class_uid').eq('id',id).limit(1);
      if(readError||latest?.length!==1)
        throw new Error(readError?.message||'無法讀取最新 Class 狀態');
      const isActiveNow=String(latest[0].current_keyword_class_uid||'')===classUid;
      const saved=completeKeywordClass(latest[0].keyword_meta,classUid,meta,now);
      const {data,error}=await dbAuthRelation(scope.config)
        .update({
          keyword_meta:isActiveNow?{...saved,...meta}:saved,
          ...(isActiveNow?{staticstime:now}:{}),updated_at:now
        })
        .eq('id',id).select('id');
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
export async function selectKeywordAnalysisSummary({scopeId='lo3rwang',classUid='',startDate='',endDate='',
  sourceCategory='',sourceCategories=[],sourceAliases=[],sourceNames=null}={}){
  const id=normalizeScopeId(scopeId);
  const category=String(sourceCategory||'').trim().toLowerCase();
  const source=Array.isArray(sourceNames)&&sourceNames.length===1?String(sourceNames[0]):'';
  return (async()=>{
    const {config}=await scopeAndConfig(id,{publicRead:true});
    const selectedClass=String(classUid||config.current_keyword_class_uid||'');
    const state=keywordClassState(config,selectedClass);
    const scopedConfig={...config,staticstime:state?.completedAt||null,keyword_meta:state||{}};
    if(!state)return emptyStored(scopedConfig);
    if(category&&!source)
      throw new Error('關鍵詞來源分類需要指定原始來源名稱');
    const {readKeywordTreeSummary}=await import('./db-client.mjs');
    const rows=await readKeywordTreeSummary(id,{classUid:selectedClass,startDate,endDate,source});
    const agg=aggregateSummaryRpcRows(rows.filter(row=>row.kind!=='item_day'));
    const globalCount=Number(state.matchedDocuments)||0;
    return storedSummary(agg,scopedConfig,globalCount);
  })();
}

// Stateless: Keyword / Galaxy data is never retained in a module-level cache.
export function clearKeywordAnalysisCache(){}
