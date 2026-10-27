import {flashMessage} from './flash-message.js';
import {assertPlainGalaxyAttributes} from './content-policy.js';
import {DB_QUERY_BATCH_SIZE} from './query-batch-size.mjs';
import {parseVerifiedGoogleOAuthUser} from './oauth-identity.mjs';
import {assertAuthorizationForTable,clearAuthorization,readAuthorization} from './authorization-runtime.mjs';

// Shared by the keyword-classification read (paging the document scan) and
// write (chunking the UPDATE...FROM jsonb_to_recordset back). They don't
// have to match -- read and write are different queries with different
// costs -- but keeping one tuned number instead of two that drift apart
// under separate testing is less confusing to reason about and re-tune.
export const KEYWORD_CLASSIFICATION_BATCH_SIZE=5000;
// Read pages stay at 5k; DB writes are deliberately slower to limit pressure.
export const KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE=500;
export const KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE=25;
export const KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS=5000;
// Reset changes potentially tens of thousands of classified rows; keep each
// authorized database write comfortably below the 30s statement timeout.
const KEYWORD_RESET_BATCH_SIZE=750;

// The existing management-write boundary enforces Galaxy metadata rules
// consistently for publisher, search, culture and import paths.
// Galaxy Media and Blocks are different schemas and are not affected.
function validateGalaxyWrite(table,values){
  if(!/^silver\.[a-z][a-z0-9_]{0,40}_galaxy(?:_media)?$/.test(String(table||'')))return values;
  const {content:body,...attributes}=values||{};
  assertPlainGalaxyAttributes(attributes);
  return values;
}

export function createDatabaseClient({publicClient,authClient,auth}){
    if(!publicClient?.schema||!authClient?.schema||!auth?.getSession||!auth?.getUser||!auth?.signInWithOAuth||!auth?.signOut){
      throw new Error('Database adapter must implement public/authenticated clients and the account boundary');
    }
  function dbAuthRelation(table){
    const [schema,name]=String(table).split('.');
    return authClient.schema(schema).from(name);
  }

  async function selectAuthRow(table,{idColumn,id,columns}={}){
    const {data,error}=await dbAuthRelation(table).select(columns).eq(idColumn,String(id)).limit(1);
    if(error)throw new Error(error.message||('DB SELECT '+table+' failed'));
    return data?.[0]||null;
  }

  function preflightWrite(table){
    // JS-only first gate; local SQLite is an independent device-private scope.
    // The database RPC/RLS is always the second, authoritative gate.
    if(typeof window!=='undefined')assertAuthorizationForTable(table);
  }
  function invalidateRelevantAuthorization(scopeid,newEmail=''){
    const saved=readAuthorization();
    if(!saved)return;
    const changed=String(scopeid||'').trim().toLowerCase();
    const targetEmail=String(newEmail||'').trim().toLowerCase();
    if((changed&&saved.entries.some(row=>row.scopeid===changed))||
      (targetEmail&&targetEmail===saved.email))clearAuthorization();
  }
  // A failed write must never look saved: show a visible notice, then rethrow so the caller also sees the error.
  const WRITE_FAILED_NOTICE='儲存失敗，資料尚未寫入資料庫，請稍後再試。';
  function withWriteNotice(run){
    return async(...args)=>{
      try{return await run(...args);}
      catch(error){flashMessage(WRITE_FAILED_NOTICE);throw error;}
    };
  }
  const managementWrite=withWriteNotice(managementWriteUnchecked);
  const insertRows=withWriteNotice(insertRowsUnchecked);
  const updateRows=withWriteNotice(updateRowsUnchecked);
  const deleteRows=withWriteNotice(deleteRowsUnchecked);
  const keywordClassificationWrite=withWriteNotice(keywordClassificationWriteUnchecked);
  const copyRune66KeywordClass=withWriteNotice(copyRune66KeywordClassUnchecked);
  const moveScopeBlock=withWriteNotice(moveScopeBlockUnchecked);
  const deleteScope=withWriteNotice(deleteScopeUnchecked);
  const provisionScope=withWriteNotice(provisionScopeUnchecked);
  const manageScopeRegistry=withWriteNotice(manageScopeRegistryUnchecked);

  async function managementWriteUnchecked(payload){
    preflightWrite(payload?.p_table);
    const {data,error}=await authClient.schema('silver').rpc('management_write',payload);
    if(error)throw new Error(error.message||'Management write failed');
    if(payload?.p_table==='silver.manage'){
      const values=payload.p_values||{};
      const isAuthorityChange=payload.p_operation!=='update'||
        ['id','email','manage_role'].some(key=>Object.hasOwn(values,key));
      if(isAuthorityChange){
        const scopeFilter=(payload.p_filters||[]).find(filter=>filter?.column==='id');
        invalidateRelevantAuthorization(scopeFilter?.value,values.email);
      }
    }
    return data||{count:0};
  }

  async function insertRowsUnchecked(table,rows){
    const list=Array.isArray(rows)?rows:[];
    // Check every row before starting batch writes; fail without partial import.
    for(const row of list)validateGalaxyWrite(table,row);
    const batchSize=200;
    let count=0;
    for(let offset=0;offset<list.length;offset+=batchSize){
      const batch=list.slice(offset,offset+batchSize);
      const result=await managementWrite({
        p_table:table,
        p_operation:'insert',
        p_rows:batch,
        p_values:null,
        p_filters:[]
      });
      const affected=Number(result?.count||0);
      if(affected!==batch.length)throw new Error(`DB INSERT ${table} incomplete: expected ${batch.length}, affected ${affected}`);
      count+=affected;
    }
    return {count};
  }

  async function updateRowsUnchecked(table,values,{filters=[]}={}){
    validateGalaxyWrite(table,values);
    const result=await managementWrite({
      p_table:table,
      p_operation:'update',
      p_rows:null,
      p_values:values||{},
      p_filters:filters
    });
    const affected=Number(result?.count||0);
    if(affected<1)throw new Error(`DB UPDATE ${table} affected 0 rows; record may not exist or filter did not match`);
    return {...result,count:affected};
  }

  async function deleteRowsUnchecked(table,{filters=[]}={}){
    const result=await managementWrite({
      p_table:table,
      p_operation:'delete',
      p_rows:null,
      p_values:null,
      p_filters:filters
    });
    const affected=Number(result?.count||0);
    if(affected<1)throw new Error(`DB DELETE ${table} affected 0 rows; record may not exist or filter did not match`);
    return {...result,count:affected};
  }

  function normalizeScopeId(value){
    const scope=String(value||'').trim().toLowerCase();
    if(!/^[a-z][a-z0-9]{0,14}$/.test(scope))throw new Error('Scope ID 格式無效');
    return scope;
  }

  async function keywordClassificationWriteUnchecked(scopeId,payload){
    const scope=normalizeScopeId(scopeId);
    preflightWrite('silver.'+scope+'_keywords');
    const {data,error}=await authClient.schema('silver').rpc('apply_keyword_classification',{
      p_scope_id:scope,
      p_rows:payload
    });
    if(error)throw new Error(error.message||'Keyword classification write failed');
    return Number(data||0);
  }

  async function applyKeywordClassification(scopeId,payload={}, {onProgress}={}){
    const scope=normalizeScopeId(scopeId);
    const rows=Array.isArray(payload?.rows)?payload.rows:[];
    const meta=payload?.meta&&typeof payload.meta==='object'?payload.meta:{};
    const eligibleDocumentCount=Number.isInteger(payload?.eligibleDocumentCount)
      ?Math.max(0,payload.eligibleDocumentCount)
      :Array.isArray(payload?.eligibleUids)?payload.eligibleUids.length:rows.length;
    await keywordClassificationWrite(scope,{mode:'begin'});
    onProgress?.({phase:'prepare',completed:0,total:rows.length});

    // Each chunk RPC resolves before another is sent. Then wait 5 seconds
    // to limit continuous DB pressure; a timed-out transaction is retried
    // at a smaller size after the same delay, without replaying successes.
    let batchSize=KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE;
    // `affected` now means "rows actually changed" (mode='chunk' writes are
    // diff-only, IS DISTINCT FROM -- see the migration), not "rows matched".
    // The SQL function itself validates every uid in the batch exists and
    // throws on a mismatch, so there is nothing left for JS to check here;
    // `count` tracks rows processed (for progress), `changedCount` tracks
    // rows actually written, purely for reporting.
    let count=0;
    let changedCount=0;
    for(let offset=0;offset<rows.length;){
      const batch=rows.slice(offset,offset+batchSize);
      let affected;
      try{
        affected=await keywordClassificationWriteUnchecked(scope,{mode:'chunk',rows:batch});
      }catch(error){
        const timedOut=/canceling statement due to statement timeout/i
          .test(String(error?.message||error));
        if(!timedOut||batchSize<=KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE){
          flashMessage(WRITE_FAILED_NOTICE);
          throw error;
        }
        batchSize=Math.max(KEYWORD_CLASSIFICATION_MIN_WRITE_BATCH_SIZE,Math.floor(batchSize/2));
        onProgress?.({phase:'cooldown',completed:count,total:rows.length,
          seconds:KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS/1000,retrying:true});
        await new Promise(resolve=>setTimeout(resolve,KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS));
        continue; // The canceled statement committed no rows; retry this offset.
      }
      changedCount+=affected;
      count+=batch.length;
      offset+=batch.length;
      onProgress?.({phase:'write',completed:count,total:rows.length});
      if(offset<rows.length){
        onProgress?.({phase:'cooldown',completed:count,total:rows.length,
          seconds:KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS/1000,retrying:false});
        await new Promise(resolve=>setTimeout(resolve,KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS));
      }
    }

    // DB-side sync uses the same statistics_able predicate as the UID
    // universe. Never serialize 144k UIDs into one JSON parameter, and never
    // compare only this run's narrowed candidate UIDs (would wipe others).
    onProgress?.({phase:'sync',completed:count,total:rows.length});
    const orphansCleared=await keywordClassificationWrite(scope,{mode:'sync',scopeBased:true});

    onProgress?.({phase:'finalizing',completed:count,total:rows.length});
    const documentCount=await keywordClassificationWrite(scope,{mode:'finalize',meta});
    // documentCount (DB's count(*) where group_lists<>'false') is NOT the
    // same population as eligibleDocumentCount: eligibleUids is every row
    // with statistics_able=true, but a row only gets a non-'false'
    // group_lists if it ALSO passes isEligibleRow's minChars/searchable
    // gate upstream. Those two counts were never meant to be equal --
    // comparing them for strict equality was the bug. Sanity-bound instead.
    if(documentCount<0||documentCount>eligibleDocumentCount){
      throw new Error(`Keyword classification finalize out of range: counted ${documentCount}, eligible universe ${eligibleDocumentCount}`);
    }
    return {count,changedCount,orphansCleared,documentCount};
  }

  // Manually-triggered full wipe (the galaxy table's class_id/group_lists
  // only -- keyword library rows are untouched). Use when the keyword
  // library changed enough that a clean slate is wanted; an ordinary
  // runKeywordAnalysisBatch no longer wipes anything on its own.
  async function resetKeywordClassification(scopeId,{onProgress}={}){
    const scope=normalizeScopeId(scopeId);
    // The original reset mode remains the final authority for clearing the
    // stored summary. The bulk of the work uses existing authorized chunks
    // rather than one full-table UPDATE which can exceed statement_timeout.
    await keywordClassificationWrite(scope,{mode:'begin'});
    onProgress?.({phase:'reading',completed:0,total:0});
    const {data:scopeRows,error:scopeError}=await authClient.schema('silver').from('manage')
      .select('galaxy_table').eq('id',scope).limit(1);
    if(scopeError)throw new Error(scopeError.message||'Scope mapping read failed');
    if(!scopeRows?.length)throw new Error('Scope mapping not found');
    const suffix=String(scopeRows[0].galaxy_table||'galaxy').trim();
    if(!/^[a-z][a-z0-9_]{0,40}$/.test(suffix))throw new Error('Invalid Galaxy table mapping');
    const galaxy=authClient.schema('silver').from(scope+'_'+suffix);
    const {count:total,error:countError}=await galaxy.select('uid',{count:'exact',head:true});
    if(countError)throw new Error(countError.message||'Galaxy row count failed');
    const totalRows=Math.max(0,Number(total)||0);

    // Manual reset is deliberately destructive. Before any chunk writes,
    // mark the previous classification stale and discard the narrowing SHA
    // baseline: an interrupted reset must be recoverable by a FULL analysis.
    const stale=await managementWrite({
      p_table:'silver.'+scope,p_operation:'update',p_rows:null,
      p_values:{staticstime:null,keyword_meta:{}},
      p_filters:[{column:'id',operator:'eq',value:scope}]
    });
    if(Number(stale?.count||0)!==1)throw new Error('Scope classification reset could not mark results stale');

    let completed=0;
    let changed=0;
    let cursor='';
    try{
      for(;;){
        let query=galaxy.select('uid,class_id,group_lists')
          .order('uid',{ascending:true});
        if(cursor)query=query.gt('uid',cursor);
        const {data,error}=await query.limit(KEYWORD_RESET_BATCH_SIZE);
        if(error)throw new Error(error.message||'Galaxy classification page read failed');
        const page=data||[];
        if(!page.length)break;
        const updates=page
          .filter(row=>row.class_id!=null||row.group_lists!=='false')
          .map(row=>({uid:row.uid,class_id:null,group_lists:'false'}));
        if(updates.length)changed+=await keywordClassificationWrite(scope,{mode:'chunk',rows:updates});
        completed+=page.length;
        cursor=String(page[page.length-1].uid||'');
        if(!cursor)throw new Error('Galaxy classification paging returned an empty uid');
        onProgress?.({phase:'clearing',completed,total:totalRows});
        if(page.length<KEYWORD_RESET_BATCH_SIZE)break;
      }
      onProgress?.({phase:'finalizing',completed,total:totalRows});
      // This last reset is now a near-no-op Galaxy UPDATE. It still clears
      // stored counts/meta and catches rows newly classified during paging.
      const remainder=await keywordClassificationWrite(scope,{mode:'reset'});
      onProgress?.({phase:'completed',completed:totalRows,total:totalRows});
      return changed+remainder;
    }catch(error){
      if(completed>0)throw new Error(
        '清空尚未完成（已檢查 '+completed.toLocaleString()+' 篇）。' +
        '部分分類可能已清空，請重新執行清空或完整重新分析。'+String(error?.message||error)
      );
      throw error;
    }
  }

  async function readKeywordClass(scopeId,classId){
    const scope=String(scopeId||'').trim().toLowerCase();
    const id=String(classId||'').trim();
    if(!scope||!id)return null;
    const {data,error}=await publicClient.schema('silver').rpc('read_keyword_class',{
      p_scope_id:scope,
      p_class_id:id
    });
    if(error)throw new Error(error.message||'Keyword Class read failed');
    return data;
  }

  // Rune66 stored classification: exact counts per class/day and per rune item,
  // computed by the database (silver.read_rune66_summary).
  async function readRune66Summary(scopeId,{startDate='',endDate=''}={}){
    const scope=normalizeScopeId(scopeId);
    const day=value=>/^\d{4}-\d{2}-\d{2}/.test(String(value||''))?String(value).slice(0,10):null;
    const {data,error}=await publicClient.schema('silver').rpc('read_rune66_summary',{
      p_scope_id:scope,p_start:day(startDate),p_end:day(endDate)
    });
    if(error){const failure=new Error(error.message||'Rune66 summary read failed');failure.code=error.code;throw failure;}
    return Array.isArray(data)?data:[];
  }
  // Database-side statistics: the database counts, the browser receives the exact
  // totals ({day,kind,category,item_count}) instead of every Galaxy/Media row.
  async function readScopeStatistics(scopeId,{startDate='',endDate='',includeUndated=false}={}){
    const scope=normalizeScopeId(scopeId);
    const day=value=>/^\d{4}-\d{2}-\d{2}/.test(String(value||''))?String(value).slice(0,10):null;
    const {data,error}=await publicClient.schema('silver').rpc('read_scope_statistics',{
      p_scope_id:scope,
      p_start:day(startDate),
      p_end:day(endDate),
      p_include_undated:Boolean(includeUndated)
    });
    if(error){
      const failure=new Error(error.message||'Scope statistics read failed');
      failure.code=error.code;
      throw failure;
    }
    return Array.isArray(data)?data:[];
  }

  // One request per chart: the database returns the earliest date, the exact
  // daily counts and the (tiny) source taxonomy together. RPC errors keep their code
  // so callers can fall back while the function is not installed.
  async function rpcJson(name,args,label){
    const {data,error}=await publicClient.schema('silver').rpc(name,args);
    if(error){
      const failure=new Error(error.message||label+' read failed');
      failure.code=error.code;
      throw failure;
    }
    return data;
  }
  const dayOrNull=value=>/^\d{4}-\d{2}-\d{2}/.test(String(value||''))?String(value).slice(0,10):null;
  async function readScopeOverview(scopeId,{startDate='',endDate=''}={}){
    const data=await rpcJson('read_scope_overview',{
      p_scope_id:normalizeScopeId(scopeId),p_start:dayOrNull(startDate),p_end:dayOrNull(endDate)
    },'Scope overview');
    return {
      earliest:dayOrNull(data?.earliest)||'',
      rows:Array.isArray(data?.rows)?data.rows:[],
      categories:Array.isArray(data?.categories)?data.categories:[],
      aliases:Array.isArray(data?.aliases)?data.aliases:[]
    };
  }
  async function readScopeEarliest(scopeId){
    return dayOrNull(await rpcJson('read_scope_earliest',{p_scope_id:normalizeScopeId(scopeId)},'Scope earliest'))||'';
  }
  async function readLocStatistics({startDate='',endDate=''}={}){
    const data=await rpcJson('read_loc_statistics',{p_start:dayOrNull(startDate),p_end:dayOrNull(endDate)},'LOC statistics');
    return {
      earliest:dayOrNull(data?.earliest)||'',
      scopes:Array.isArray(data?.scopes)?data.scopes:[],
      rows:Array.isArray(data?.rows)?data.rows:[]
    };
  }

  // "資料重整": run on demand (typically right after an import), never
  // automatically. The database does the grouping -- exact createtime match
  // first, then exact canonicalized content match within that group -- so
  // nothing is paged through the client; see silver.find_galaxy_duplicates.
  // Groups that don't match on both stay apart (false negatives preferred
  // over ever auto-merging two different posts). No row is ever deleted
  // here -- the caller reviews each group and deletes explicitly.
  async function findGalaxyDuplicates(scopeId){
    const scope=normalizeScopeId(scopeId);
    const data=await rpcJson('find_galaxy_duplicates',{p_scope_id:scope},'Duplicate scan');
    const groups=(Array.isArray(data)?data:[]).map(row=>({
      sourceName:String(row?.source_name||''),
      createtime:String(row?.createtime||''),
      uids:(Array.isArray(row?.uids)?row.uids:[]).map(String),
      titles:(Array.isArray(row?.titles)?row.titles:[]).map(String),
      updateTimes:(Array.isArray(row?.update_times)?row.update_times:[]).map(value=>String(value||''))
    }));
    // Rows whose body still holds line breaks are the re-imported copies of a post
    // that is normally stored on one line.
    const allUids=groups.flatMap(group=>group.uids);
    const withBreaks=allUids.length
      ?new Set((await rpcJson('galaxy_uids_with_newline',{p_scope_id:scope,p_uids:allUids},'Duplicate scan')||[]).map(String))
      :new Set();
    return groups.map(group=>({...group,hasNewline:group.uids.map(uid=>withBreaks.has(uid))}));
  }

  async function writeKeywordLibraryItem(scopeId,operation,item={}){
    const scope=normalizeScopeId(scopeId);
    const op=String(operation||'').trim().toLowerCase();
    if(!['insert','update','delete'].includes(op))throw new Error('Unsupported keyword library operation');
    preflightWrite('silver.'+scope+'_keywords');
    const relation=dbAuthRelation(`silver.${scope}_keywords`);
    const className=String(item?.class_name||'').trim();
    const classId=String(item?.class_id||'').trim();
    if(!classId)throw new Error('Class UUID 不可為空');
    const values={
      class_id:classId,
      group_name:className,
      class_name:className,
      class_group:String(item?.class_group||'').trim(),
      class_enable:item?.class_enable!==false,
      item_no:Number(item?.item_no),
      item_name:String(item?.item_name||'').trim(),
      principle:String(item?.principle||''),
      keywords:Array.isArray(item?.keywords)?item.keywords:[],
      order_no:Number(item?.order_no)||0
    };
    let query;
    if(op==='insert'){
      query=relation.insert(values).select('keyword_id');
    }else if(op==='update'){
      query=relation.update(values).eq('keyword_id',Number(item?.keyword_id)).select('keyword_id');
    }else{
      query=relation.delete().eq('keyword_id',Number(item?.keyword_id)).select('keyword_id');
    }
    const {data,error}=await query;
    if(error)throw new Error(error.message||'Keyword library write failed');
    const affected=Array.isArray(data)?data.length:0;
    if(affected<1)throw new Error('Keyword library write affected 0 rows');
    return {count:affected,keyword_id:data?.[0]?.keyword_id||item?.keyword_id||null};
  }

  async function copyKeywordLibraryClass(scopeId,sourceClassName,targetClassName){
    const scope=normalizeScopeId(scopeId);
    const source=String(sourceClassName||'').trim();
    const target=String(targetClassName||'').trim();
    if(!source||!target)throw new Error('Class 名稱不可為空');
    if(source===target)throw new Error('新 Class 名稱必須不同');
    preflightWrite('silver.'+scope+'_keywords');
    const relation=dbAuthRelation(`silver.${scope}_keywords`);
    const {data:existing,error:existingError}=await relation.select('keyword_id').eq('class_name',target).limit(1);
    if(existingError)throw new Error(existingError.message||'Keyword class check failed');
    if(existing?.length)throw new Error('這個 Class 已經存在');
    const {data:rows,error:readError}=await relation
      .select('class_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no')
      .eq('class_name',source)
      .order('order_no',{ascending:true})
      .order('item_no',{ascending:true});
    if(readError)throw new Error(readError.message||'Keyword class read failed');
    if(!rows?.length)throw new Error('找不到要複製的 Class');
    const newClassId=globalThis.crypto?.randomUUID?.();
    if(!newClassId)throw new Error('無法產生 Class UUID');
    const registry=dbAuthRelation('silver.keyword_classes');
    const {error:registryError}=await registry.insert({class_id:newClassId,scope_id:scope});
    if(registryError)throw new Error(registryError.message||'Keyword Class registry create failed');
    const copies=rows.map(row=>({
      class_id:newClassId,
      group_name:target,
      class_name:target,
      class_group:String(row.class_group||'').trim(),
      class_enable:row.class_enable!==false,
      item_no:Number(row.item_no),
      item_name:String(row.item_name||'').trim(),
      principle:String(row.principle||''),
      keywords:Array.isArray(row.keywords)?row.keywords:[],
      order_no:Number(row.order_no)||0
    }));
    const {data,error}=await relation.insert(copies).select('keyword_id');
    if(error){
      await registry.delete().eq('class_id',newClassId);
      throw new Error(error.message||'Keyword class copy failed');
    }
    if((data?.length||0)!==copies.length){
      await relation.delete().eq('class_id',newClassId);
      await registry.delete().eq('class_id',newClassId);
      throw new Error('Keyword class copy incomplete');
    }
    return {count:data.length,class_id:newClassId};
  }

  async function isCurrentEmailBlocklisted(){
    const {data,error}=await authClient.schema('silver').rpc('is_current_email_blocklisted');
    if(error)throw new Error(error.message||'無法核對系統黑名單');
    return data===true;
  }

  async function copyRune66KeywordClassUnchecked(scopeId){
    const scope=normalizeScopeId(scopeId);
    if(!scope)throw new Error('Scope ID 格式不正確。');
    preflightWrite('silver.'+scope+'_keywords');
    const {data,error}=await authClient.schema('silver').rpc('copy_rune66_keyword_class',{p_scope_id:scope});
    if(error)throw new Error(error.message||'符文66複製失敗。');
    return data||{};
  }

  async function moveScopeBlockUnchecked(scopeId,pageName,uid,direction){
    const scope=normalizeScopeId(scopeId);
    const page=String(pageName||'').trim().toLowerCase();
    const blockUid=String(uid||'').trim();
    if(!scope||!page||!(/^[A-Za-z0-9]{8}$/.test(blockUid))||![1,-1].includes(direction))throw new Error('無效的區塊移動參數。');
    preflightWrite('silver.'+scope+'_blocks');
    const {data,error}=await authClient.schema('silver').rpc('move_scope_block',{
      p_scope_id:scope,p_page_name:page,p_uid:blockUid,p_direction:direction
    });
    if(error)throw new Error(error.message||'區塊移動失敗');
    return data||{};
  }

  async function deleteScopeUnchecked(scopeId){
    const scope=normalizeScopeId(scopeId);
    if(!scope)throw new Error('Scope ID 格式不正確。');
    preflightWrite('silver.manage');
    const {data,error}=await authClient.schema('silver').rpc('delete_scope',{p_scope_id:scope});
    if(error)throw new Error(error.message||'Scope 刪除失敗。');
    invalidateRelevantAuthorization(scope);
    return data||{};
  }

  async function provisionScopeUnchecked(values={}){
    const scopeId=normalizeScopeId(values.scope_id);
    preflightWrite('silver.manage');
    const payload={
      p_scope_id:scopeId,
      p_display_name:String(values.display_name||'').trim(),
      p_email:String(values.email||'').trim().toLowerCase(),
      p_birthday:values.birthday||null,
      p_domain:String(values.domain||'').trim()||null,
      p_directory:String(values.directory||'').trim()||null,
      p_parent_scope_id:String(values.parent_scope_id||'loc').trim()||'loc',
      p_theme:String(values.theme||'system-default').trim()||'system-default',
      p_copy_keywords:values.copy_keywords!==false
    };
    const {data,error}=await authClient.schema('silver').rpc('provision_scope',payload);
    if(error)throw new Error(error.message||'Scope provisioning failed');
    invalidateRelevantAuthorization(scopeId,values.email);
    return data||{};
  }

  async function manageScopeRegistryUnchecked(operation,scopeId,values={}){
    const scope=normalizeScopeId(scopeId);
    const op=String(operation||'').trim().toLowerCase();
    if(!['create_group','update'].includes(op))throw new Error('Unsupported Scope Registry operation');
    preflightWrite('silver.manage');
    const {data,error}=await authClient.schema('silver').rpc('manage_scope_registry',{
      p_operation:op,
      p_scope_id:scope,
      p_values:values&&typeof values==='object'?values:{}
    });
    if(error)throw new Error(error.message||'Scope Registry management failed');
    if(['email','manage_role','role','scopeid','id'].some(key=>Object.hasOwn(values||{},key)))
      invalidateRelevantAuthorization(scope,values.email);
    return data||{};
  }

  async function getAccountSession(){
    const {data,error}=await auth.getSession();
    if(error)throw new Error(error.message||'Account session failed');
    const session=data?.session||null;
    if(!session?.user)return null;
    // A persisted session's user/email are local data, not verified OAuth claims.
    // Ask Supabase Auth to validate the access token and return current identities.
    const {data:verified,error:verifyError}=await auth.getUser(session.access_token);
    if(verifyError)throw new Error(verifyError.message||'Google OAuth verification failed');
    const user=verified?.user;
    if(!user?.id||String(user.id)!==String(session.user.id))
      throw new Error('OAuth 使用者與目前 Session 不一致，已拒絕授權。');
    const oauth=parseVerifiedGoogleOAuthUser(user);
    return {session,user:{...user,email:oauth.email},oauth};
  }

  async function signInWithGoogle(callbackURL){
    const target=String(callbackURL||'').trim();
    if(!target)throw new Error('Google sign-in callback URL is required');
    const {error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:target,queryParams:{prompt:'select_account'}}});
    if(error)throw new Error(error.message||'Google sign-in failed');
  }

  async function signOutAccount(){
    const {error}=await auth.signOut({scope:'local'});
    if(error)throw new Error(error.message||'Account sign-out failed');
  }

  return {publicClient,authClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,applyKeywordClassification,resetKeywordClassification,readKeywordClass,readScopeStatistics,readScopeOverview,readScopeEarliest,readLocStatistics,findGalaxyDuplicates,readRune66Summary,writeKeywordLibraryItem,copyKeywordLibraryClass,copyRune66KeywordClass,isCurrentEmailBlocklisted,deleteScope,moveScopeBlock,provisionScope,manageScopeRegistry,getAccountSession,signInWithGoogle,signOutAccount};
}

// One universal hard ceiling for all database read adapters and selected columns.
// A ceiling does not require fetching that many rows: callers still paginate.
export {DB_QUERY_BATCH_SIZE};
export function queryBatchSize(){
  return DB_QUERY_BATCH_SIZE;
}

// List UI loading knobs (merged from the former list-loading-contract.mjs).
export const DEFAULT_LIST_BATCH_SIZE=10;
export const LIST_LOAD_COOLDOWN_MS=1500;
