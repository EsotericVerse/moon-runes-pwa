'use client';

import {applyKeywordClassification,dbAuthRelation,readRune66Summary} from './db-client.mjs';
import {selectAllRows,selectCount,selectRows} from './db-query.mjs';
import {KEYWORD_CLASSIFICATION_BATCH_SIZE} from './db-contract.mjs';
import {defaultScopeData,selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';
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

// Canonical, eternal class_group order per https://lrunes.lo3rwang.cc/trace/
// (靈魂1-8, 連結9-16, 生命17-24, 自然25-32, 礦物33-40, 元素41-48, 秩序49-56,
// 無序57-64, 特殊0/65/66). item_no/order_no are fixed data and must never be
// edited to "fix" class_id -- class_id is derived purely from this list, not
// from any per-item order_no (特殊's item_no=0 has order_no=0, which used to
// sort it to class_id=1 under the old min-order_no logic; it must land on 9).
const CANONICAL_CLASS_GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
function buildClassMap(catalogRows=[]){
  const groups=new Set();
  for(const row of catalogRows){
    if(row?.class_enable===false)continue;
    const group=String(row?.class_group||'').trim();
    if(group)groups.add(group);
  }
  const canonicalIndex=new Map(CANONICAL_CLASS_GROUP_ORDER.map((group,index)=>[group,index]));
  const ordered=[...groups]
    .sort((a,b)=>{
      const orderA=canonicalIndex.has(a)?canonicalIndex.get(a):CANONICAL_CLASS_GROUP_ORDER.length;
      const orderB=canonicalIndex.has(b)?canonicalIndex.get(b):CANONICAL_CLASS_GROUP_ORDER.length;
      return orderA-orderB||a.localeCompare(b);
    })
    .map((group,index)=>({group,order:canonicalIndex.has(group)?canonicalIndex.get(group):9999,class_id:index+1}));
  // 9 is a ceiling (8 canonical groups + 1 default/special), not a fixed
  // count every Class must hit exactly -- silver.lo3rwang_galaxy.class_id's
  // own CHECK constraint is already "class_id BETWEEN 1 AND 9", i.e. a max,
  // not an exact count, and a Class with fewer enabled groups than 9 is
  // valid (confirmed live data: 政德文化 has 6, Hip-Hop 5, Rock/Vocal 3).
  if(ordered.length<1||ordered.length>9)throw new Error('目前文章 class_id 契約最多允許 9 個啟用 Class（至少 1 個）；目前為 '+ordered.length+' 個。');
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
      columns:'current_keyword_class_id',
      filters:[{column:'id',operator:'eq',value:scope.id}],limit:1
    }));
  }catch(error){
    // Keyword classification is optional per Scope; some config tables
    // (e.g. silver.lrunes) intentionally have no active-Class column.
    if(['42703','PGRST204'].includes(String(error?.code||''))&&
      String(error?.message||'').includes('current_keyword_class_id'))return '';
    throw error;
  }
  const currentId=String(configRows?.[0]?.current_keyword_class_id||'').trim();
  if(!currentId)return '';
  const {rows:keywordRows}=await selectRows(scope.keywords,{
    columns:'class_name',
    filters:[{column:'class_id',operator:'eq',value:currentId}],limit:1
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
    columns:'id,keyword_min_chars,keyword_min_documents,current_keyword_class_id,keyword_class_share_enabled,keyword_meta,staticstime',
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

export async function runKeywordAnalysisBatch(scopeId='lo3rwang',{onProgress}={}){
  const normalizedScopeId=normalizeScopeId(scopeId);
  reportBatchProgress(onProgress,'reading',0,0,0,'確認 Scope 與分析設定');
  const {scope,config}=await scopeAndConfig(normalizedScopeId);
  const minChars=normalizeKeywordMinChars(config.keyword_min_chars);
  const minDocuments=normalizeKeywordMinDocuments(config.keyword_min_documents);
  const currentClassId=String(config.current_keyword_class_id||'').trim();

  reportBatchProgress(onProgress,'reading',0,0,1,'檢查關鍵詞庫與文章是否有變動');
  const [catalogRows,fingerprint]=await Promise.all([
    loadCurrentCatalog(normalizedScopeId,currentClassId),
    keywordFingerprint(scope)
  ]);
  if(checkSkippable(config,catalogRows,fingerprint)){
    const documentCount=await selectCount(scope.galaxy,{
      idColumn:'uid',filters:[{column:'group_lists',operator:'neq',value:'false'}]
    });
    reportBatchProgress(onProgress,'completed',
      documentCount,documentCount,100,
      '關鍵詞庫與文章皆無變動，已略過重新分析');
    return emptyStored(config,{skipped:true,documentCount,keywordDocumentCount:documentCount});
  }

  // Which items changed since the last successful run (null = can't tell,
  // e.g. first run or the enabled-item set itself changed -- narrow nothing).
  const storedShas=Array.isArray(config.keyword_meta?.shas)?config.keyword_meta.shas:null;
  const changedItemNos=changedItemNosOf(catalogRows,storedShas);
  const narrowedFilter=Array.isArray(changedItemNos)?candidateOrFilter(changedItemNos):'';

  // Full eligible-uid universe, independent of how narrow the content read
  // below ends up being. Needed for the 'sync' orphan-clear step -- using
  // just this run's (possibly narrowed) candidate uids there would wrongly
  // clear every untouched-but-still-eligible article.
  reportBatchProgress(onProgress,'reading',0,0,2,'讀取符合資格的文章 uid 清單');
  const eligibleUidResult=await selectAllRows(scope.galaxy,{
    columns:'uid',
    filters:[{column:'statistics_able',operator:'eq',value:true}],
    pageSize:KEYWORD_CLASSIFICATION_BATCH_SIZE
  });
  const eligibleUids=(eligibleUidResult.rows||[]).map(row=>String(row?.uid||'').trim()).filter(Boolean);

  // Count-first: when the keyword-sha diff lets us narrow at all, find out
  // exactly how many articles the narrowed filter actually matches BEFORE
  // reading any article content. If it's zero, every changed item has no
  // hits anywhere and there's nothing never-classified either -- skip the
  // content read and the write entirely, and jump straight to refreshing
  // keyword_meta (so the NEXT run still has a matching baseline to diff
  // against; otherwise this scope would never narrow again).
  let candidateCount=null;
  if(narrowedFilter){
    reportBatchProgress(onProgress,'reading',0,0,3,'計算需要重新分類的文章數');
    candidateCount=await selectCount(scope.galaxy,{
      idColumn:'uid',
      filters:[{column:'statistics_able',operator:'eq',value:true}],
      orFilter:narrowedFilter
    });
  }

  let documents=[];
  let resolved;
  let payloadRows=[];
  if(candidateCount===0){
    reportBatchProgress(onProgress,'reading',0,0,20,'關鍵詞異動未影響任何文章，僅更新比對基準');
    resolved={
      classMap:buildClassMap(catalogRows),
      byUid:new Map(),classifications:[],classifiedCount:0,unclassifiedCount:0,
      tieCount:0,dynamicTieCount:0,finalOrderTieCount:0,groupTotals:[]
    };
  }else{
    reportBatchProgress(onProgress,'reading',0,0,3,'讀取文章與目前的關鍵詞庫');
    const textResult=await selectAllRows(scope.galaxy,{
      // title and createtime are not selected: matching only reads content
      // (see documentOf/textOf), and nothing downstream reads the `date`
      // field that createtime used to feed. createtime is still the order
      // column below -- PostgREST can order by a column that isn't selected.
      columns:'uid,content,searchable',
      // statistics_able is the eligibility gate itself -- filter it in the
      // query (fewer rows read, fewer rows paged through) instead of
      // selecting it and discarding non-qualifying rows in isEligibleRow.
      // orFilter narrows further to the uids a changed item could actually
      // affect (see changedItemNosOf/candidateOrFilter); empty when nothing
      // can be narrowed (changedItemNos===null), same as before this change.
      filters:[{column:'statistics_able',operator:'eq',value:true}],
      orFilter:narrowedFilter,
      orders:[{column:'createtime',ascending:true}],
      // Size the page to what's actually needed: candidateCount is the exact
      // narrowed total when known, so a run that only touches a handful of
      // articles asks for a handful, not a blanket max-size page every time.
      pageSize:candidateCount?Math.min(KEYWORD_CLASSIFICATION_BATCH_SIZE,candidateCount):KEYWORD_CLASSIFICATION_BATCH_SIZE,
      onProgress:({completed,total})=>reportBatchProgress(onProgress,'reading',completed,total,
        3+17*(total?completed/total:1),
        '讀取文章 '+completed.toLocaleString()+' / '+total.toLocaleString()+' 篇')
    });
    const rawRows=textResult.rows||[];
    const eligibleRows=rawRows.filter(row=>isEligibleRow(row,minChars));
    documents=eligibleRows.map(documentOf);
    reportBatchProgress(onProgress,'reading',rawRows.length,rawRows.length,20,
      '讀取完成；符合分析資格 '+documents.length.toLocaleString()+' 篇');
    resolved=await resolveDynamicClassifications(documents,catalogRows,onProgress);
    const eligibleByUid=resolved.byUid;
    payloadRows=eligibleRows.map(row=>{
      const uid=String(row?.uid||'').trim();
      const result=eligibleByUid.get(uid);
      return {
        uid,
        class_id:result?.class_id||null,
        group_lists:result?.group_lists??''
      };
    });
  }
  const keywordMeta=metaOf(catalogRows,resolved.classMap,currentClassId,fingerprint);
  const written=await applyKeywordClassification(normalizedScopeId,{rows:payloadRows,meta:keywordMeta,eligibleUids},{
    // Mirrors applyKeywordClassification's own phase sequence (db-contract.mjs):
    // prepare -> write (ramping) -> sync (clears orphaned rows) -> finalizing.
    // Each phase needs its own percent/label; letting an unlisted phase fall
    // through to write's formula re-displays a stale "已寫入 N/N 篇" at the
    // same percent write just finished at, which looks like a stall/glitch.
    onProgress:({phase,completed,total})=>{
      const percent=phase==='prepare'?61
        :phase==='write'?61+30*(total?completed/total:1)
        :phase==='sync'?95
        :phase==='finalizing'?99
        :61+38*(total?completed/total:1);
      const batchTotal=Math.max(1,Math.ceil(total/KEYWORD_CLASSIFICATION_BATCH_SIZE));
      const batchNo=Math.max(1,Math.min(batchTotal,Math.ceil(completed/KEYWORD_CLASSIFICATION_BATCH_SIZE)));
      const label=phase==='prepare'?'準備寫入文章 Attr'
        :phase==='write'?'已寫入 '+completed.toLocaleString()+' / '+total.toLocaleString()+' 篇（第 '+batchNo+' / '+batchTotal+' 批，每 '+KEYWORD_CLASSIFICATION_BATCH_SIZE.toLocaleString()+' 篇回報一次）'
        :phase==='sync'?'正在清除不再符合資格的文章'
        :phase==='finalizing'?'正在定錨並核對寫入數量'
        :'處理中';
      reportBatchProgress(onProgress,phase,completed,total,percent,label);
    }
  });
  // written.count must match what THIS run actually chunked/wrote (a
  // narrowed subset when only some items changed, or 0 on the count-first
  // skip above). written.documentCount (DB's count(*) where group_lists<>
  // 'false') is NOT the same population as eligibleUids.length any more
  // than it ever was: only statistics_able rows that also pass
  // isEligibleRow (minChars/searchable) ever get a non-'false' group_lists,
  // so documentCount is legitimately smaller than eligibleUids.length --
  // comparing them for equality was the bug (it compared two different
  // populations). Sanity-bound it instead.
  if(written.count!==payloadRows.length){
    throw new Error('關鍵詞批次寫回不完整：預期處理 '+payloadRows.length+' 篇，實際處理 '+written.count);
  }
  if(written.documentCount<0||written.documentCount>eligibleUids.length){
    throw new Error('關鍵詞批次寫回異常：總計分類文章數 '+written.documentCount+' 超出符合資格文章數 '+eligibleUids.length);
  }
  clearKeywordAnalysisCache();
  const [{data:verifiedRows,error:verificationError},verifiedCount]=await Promise.all([
    dbAuthRelation(scope.config).select('staticstime')
      .eq('id',normalizedScopeId).limit(1),
    selectCount(scope.galaxy,{
      idColumn:'uid',filters:[{column:'group_lists',operator:'neq',value:'false'}]
    })
  ]);
  if(verificationError)throw new Error('關鍵詞定錨驗證失敗：'+verificationError.message);
  const verified=verifiedRows?.[0];
  // The finalized count comes directly from group_lists, never from a
  // duplicate Scope config counter. Preserve the final anchor validation.
  if(!verified?.staticstime||verifiedCount!==written.documentCount){
    throw new Error('關鍵詞定錨驗證失敗：文章數或完成時間不符，統計尚不可公開');
  }
  reportBatchProgress(onProgress,'completed',payloadRows.length,payloadRows.length,100,
    '已完成 '+payloadRows.length.toLocaleString()+' 篇文章 Attr 寫入與定錨驗證');
  return {
    ...resolved,
    documentCount:documents.length,
    keywordMinChars:minChars,
    keywordMinDocuments:minDocuments,
    keywordDocumentCount:verifiedCount,
    statisticsEnabled:eligibleUids.length>minDocuments,
    staticstime:verified.staticstime,
    skipped:false
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

export async function selectKeywordAnalysisSummary({scopeId='lo3rwang',startDate='',endDate='',sourceCategory='',sourceCategories=[],sourceAliases=[],sourceNames=null}={}){
  const normalizedScopeId=normalizeScopeId(scopeId);
  const category=String(sourceCategory||'').trim().toLowerCase();
  if(category&&category!=='others'&&!sourceCategories.some(row=>row.category_code===category&&row.enabled!==false)){
    throw new Error('指定的來源分類不存在或已停用');
  }
  // Only unfiltered summaries use the existing RPC and promise cache.
  // A selected category needs the original source_name on each saved Attr.
  const key=[normalizedScopeId,String(startDate||''),String(endDate||'')].join('|');
  if(!category&&!Array.isArray(sourceNames)&&analysisPromises.has(key))return analysisPromises.get(key);
  const promise=(async()=>{
    const {scope,config}=await scopeAndConfig(normalizedScopeId,{publicRead:true});
    if(!config.staticstime)return emptyStored(config);
    // A filtered date/source view must still use the unfiltered live
    // classification total for the minimum-document eligibility gate.
    const globalCount=(category||startDate||endDate)
      ?await selectCount(scope.galaxy,{
        idColumn:'uid',filters:[{column:'group_lists',operator:'neq',value:'false'}]
      })
      :null;
    if(!category&&!Array.isArray(sourceNames)&&keywordSummaryRpcInstalled){
      try{
        const counted=await readRune66Summary(normalizedScopeId,{startDate,endDate});
        return storedSummary(aggregateSummaryRpcRows(counted),config,globalCount??undefined);
      }catch(error){
        if(!['PGRST202','42883'].includes(String(error?.code||'')))throw error;
        keywordSummaryRpcInstalled=false;
      }
    }
    const rows=await selectAllRows(scope.galaxy,{
      columns:category||Array.isArray(sourceNames)?'uid,createtime,class_id,group_lists,source_name':'uid,createtime,class_id,group_lists',
      filters:[
        {column:'searchable',operator:'eq',value:true},
        {column:'statistics_able',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
      ],
      orders:[{column:'createtime',ascending:true}]
    });
    const allowed=Array.isArray(sourceNames)?new Set(sourceNames.map(name=>String(name||'').trim().toLowerCase())):null;
    const classified=category||allowed?(rows.rows||[]).filter(row=>
      (!category||assignedSource(row.source_name,sourceAliases,sourceCategories)===category)
      &&(!allowed||allowed.has(String(row.source_name||'').trim().toLowerCase()))
    ):rows.rows||[];
    return storedSummary(aggregateStoredRows(classified),config,globalCount??undefined);
  })().catch(error=>{
    if(!category&&!Array.isArray(sourceNames))analysisPromises.delete(key);
    throw error;
  });
  if(!category&&!Array.isArray(sourceNames))analysisPromises.set(key,promise);
  return promise;
}

export function clearKeywordAnalysisCache(){
  analysisPromises.clear();
}
