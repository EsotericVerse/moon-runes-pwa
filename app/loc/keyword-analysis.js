'use client';

import {applyKeywordClassification,dbAuthRelation,readRune66Summary} from './db-client.mjs';
import {selectAllRows,selectCount,selectRows} from './db-query.mjs';
import {KEYWORD_CLASSIFICATION_BATCH_SIZE,KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE} from './db-contract.mjs';
import {defaultScopeData,selectManagedScope} from './scope-data';
import {classifyKeywordDocuments} from './model/keyword-engine.mjs';
import {reanalyzeKeywordClass} from './keyword-reanalysis.mjs';
import {parseGroupLists,formatGroupLists} from './group-lists.mjs';
import {assignedSource} from './member-intersection-model.mjs';

const DEFAULT_KEYWORD_MIN_CHARS=32;
const DEFAULT_KEYWORD_MIN_DOCUMENTS=100;

const analysisPromises=new Map();
let keywordSummaryRpcInstalled=true;

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
  // runKeywordAnalysisBatch's selectAllRows call) -- every row reaching
  // here already satisfies it, so it's not re-checked.
  return Boolean(
    String(row?.uid||'').trim()
    &&row?.searchable!==false
    &&analysisCharacterCount(row?.content)>minChars
  );
}
function documentOf(row){
  // title is deliberately left out: keyword/rune matching only looks at
  // the article body (see textOf in model/keyword-engine.mjs),
  // unlike site search, which legitimately does match on title.
  return {
    key:'galaxy:'+row.uid,
    uid:String(row.uid||'').trim(),
    kind:'galaxy',
    content:String(row.content||'')
  };
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
async function classifyDocumentsIncrementally(documents,catalogRows,onProgress){
  const batchSize=KEYWORD_CLASSIFICATION_BATCH_SIZE;
  const parts=[];
  const runeTotals=new Map();
  const groupTotals=new Map();
  const unsupportedRules=new Map();
  let classifiedCount=0;
  let unclassifiedCount=0;
  let tieCount=0;
  for(let offset=0;offset<documents.length;offset+=batchSize){
    const chunk=classifyKeywordDocuments(documents.slice(offset,offset+batchSize),catalogRows);
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
// Per-item keyword content hash (silver.{scope}_keywords.keyword_sha, a
// generated column over each item's own `keywords` jsonb). catalogRows is
// already ordered by order_no,item_no (see loadCurrentCatalog), so this
// array -- one sha per enabled item, in that fixed order -- is itself the
// combined identity of the whole keywords multi-class: this scope's current
// Class as a unit, not any single item. It's what gets stored into this
// scope's own config row (silver.{scope}.keyword_meta.shas), and compared
// elementwise (same order, same values) to decide whether a re-run can be
// skipped (checkSkippable).
function enabledCatalogRows(catalogRows){
  return (catalogRows||[]).filter(row=>row?.class_enable!==false&&Number.isInteger(Number(row?.item_no)));
}
// Per item: class_group+keyword_sha, not keyword_sha alone. class_group is a
// plain editable text field (see KeywordLibraryPanel's Group input) that is
// NOT part of keyword_sha (keyword_sha only hashes `keywords`), but it DOES
// change which rune group an item's hits count toward -- so a class_group-only
// edit (no keywords change) must still register as "this item changed" here,
// the same way a keywords edit does. item_name/class_name/principle are pure
// display text with no effect on classification output, so they're correctly
// left out.
function currentShasOf(catalogRows){
  return enabledCatalogRows(catalogRows).map(row=>
    String(row?.class_group||'').trim()+'|'+String(row?.keyword_sha||'')
  );
}
function shasEqual(a,b){
  const listA=Array.isArray(a)?a:[];
  const listB=Array.isArray(b)?b:[];
  if(listA.length!==listB.length)return false;
  return listA.every((sha,index)=>String(sha)===String(listB[index]));
}
// Which item_no's keyword_sha differs from last run's stored shas, by array
// position (same position = same item, since catalogRows' order_no/item_no
// ordering is stable between runs unless an item was enabled/disabled/added
// -- in which case the lengths differ and this returns null: "can't tell
// which changed", so the caller treats everything as changed instead of
// narrowing anything. This is what lets a real (non-skipped) run only
// re-score the articles that a changed item could actually affect --
// group_lists is a flat "rune_id:count,..." string (see group-lists.mjs),
// so an article whose group_lists has no hit for any changed item_no cannot
// have a different result this run (every item it WAS scored against is
// unchanged), and is left alone untouched.
function changedItemNosOf(catalogRows,storedShas){
  const rows=enabledCatalogRows(catalogRows);
  const currentShas=currentShasOf(catalogRows);
  if(!Array.isArray(storedShas)||storedShas.length!==currentShas.length)return null;
  const changed=[];
  for(let index=0;index<currentShas.length;index+=1){
    if(currentShas[index]!==String(storedShas[index]))changed.push(Number(rows[index].item_no));
  }
  return changed;
}
// class_id.is.null always included: an article never classified before
// (newly eligible, or never written since becoming eligible) has no prior
// group_lists to have been "unaffected" by -- it always needs a first pass.
function candidateOrFilter(changedItemNos){
  const parts=['class_id.is.null'];
  for(const itemNo of changedItemNos||[]){
    parts.push('group_lists.ilike.%'+itemNo+':%');
  }
  return parts.join(',');
}
// Cheap substitute for re-reading every article's content: a count + the
// latest createtime among this scope's statistics-eligible rows. Computed
// with two small aggregate queries (never the big `content` column), both at
// the start of a run (to decide whether to skip) and stored into keyword_meta
// on a real run (so the next run's start has something to compare against).
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
function checkSkippable(config,catalogRows,fingerprint){
  if(!config.staticstime)return null;
  const meta=config.keyword_meta&&typeof config.keyword_meta==='object'?config.keyword_meta:{};
  const storedShas=Array.isArray(meta.shas)?meta.shas:null;
  const storedFingerprint=meta.fingerprint&&typeof meta.fingerprint==='object'?meta.fingerprint:null;
  if(!storedShas||!storedFingerprint)return null;
  if(!shasEqual(currentShasOf(catalogRows),storedShas))return null;
  if(Number(fingerprint.count)!==Number(storedFingerprint.count))return null;
  if(String(fingerprint.latest)!==String(storedFingerprint.latest))return null;
  return true;
}
function metaOf(catalogRows,classMap,currentClassId,fingerprint){
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
    ),
    shas:currentShasOf(catalogRows),
    fingerprint
  };
}
// Stateful version of resolveDynamicClassifications: the running class counts are
// order-dependent, so they persist across pages in the same ascending order.
function createDynamicResolver(catalogRows){
  const classMap=buildClassMap(catalogRows);
  const defaultGroup=defaultGroupOf(catalogRows);
  const counts=new Map(classMap.ordered.map(item=>[item.group,0]));
  return {
    classMap,
    async resolvePage(documents,onProgress){
      const engine=await classifyDocumentsIncrementally(documents,catalogRows,onProgress);
      const out=[];
      for(const row of engine.classifications||[]){
        const candidates=(row?.tied_groups||[]).filter(group=>classMap.groupToClassId.has(group));
        let group='';
        if(candidates.length>1){
          const minimum=Math.min(...candidates.map(candidate=>counts.get(candidate)||0));
          const minimumCandidates=candidates.filter(candidate=>(counts.get(candidate)||0)===minimum);
          group=[...minimumCandidates].sort((a,b)=>
            (classMap.groupToClassId.get(a)||99)-(classMap.groupToClassId.get(b)||99)
          )[0]||'';
        }else if(candidates.length===1){
          group=candidates[0];
        }else{
          const resolvedGroup=String(row?.classification_group||'').trim();
          if(classMap.groupToClassId.has(resolvedGroup))group=resolvedGroup;
          else if(defaultGroup&&classMap.groupToClassId.has(defaultGroup))group=defaultGroup;
        }
        if(group)counts.set(group,(counts.get(group)||0)+1);
        out.push({
          uid:String(row?.uid||'').trim(),
          class_id:group?(classMap.groupToClassId.get(group)||null):null,
          group_lists:groupListsOf(row)
        });
      }
      return out;
    }
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
// Read the *selected* keyword set's name from this Scope's existing catalog.
// This is a UI-only read: no class/group IDs, classifications or DB state change.
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
async function loadCurrentCatalog(scopeId,currentClassId){
  const scope=normalizeScopeId(scopeId);
  const id=String(currentClassId||'').trim();
  if(!id)throw new Error('尚未指定目前使用的關鍵詞 Class');
  // default_group_item_no lives on this same table (silver.{scope}_keywords,
  // the group layer), not on silver.keyword_classes (demo/registry
  // plumbing) or the scope config table -- same value repeated on every row
  // of this class_id, so any row (e.g. [0]) carries the current setting.
  const {data,error}=await dbAuthRelation(`silver.${scope}_keywords`)
    .select('keyword_id,class_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no,default_group_item_no,keyword_sha')
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
    classUid,catalogRows,minChars,pageSize:KEYWORD_CLASSIFICATION_BATCH_SIZE,
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
