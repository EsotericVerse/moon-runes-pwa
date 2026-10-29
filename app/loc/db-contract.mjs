import {flashMessage} from './flash-message.js';
import {assertPlainGalaxyAttributes} from './content-policy.js';
import {DB_QUERY_BATCH_SIZE,MAX_ROWS} from './query-batch-size.mjs';
import {parseVerifiedGoogleOAuthUser} from './oauth-identity.mjs';
import {assertAuthorizationForTable,clearAuthorization,readAuthorization} from './authorization-runtime.mjs';
import {assertEditorSession} from './edit-session-ttl.mjs';

// Keyword read, write and reset use the shared MaxRows.
export {MAX_ROWS as KEYWORD_CLASSIFICATION_BATCH_SIZE,MAX_ROWS as KEYWORD_CLASSIFICATION_WRITE_BATCH_SIZE,MAX_ROWS as KEYWORD_CLASSIFICATION_WRITE_PAUSE_INTERVAL};
export const KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS=1000;

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
    if(typeof window!=='undefined'){
      assertEditorSession(window.sessionStorage);
      assertAuthorizationForTable(table);
    }
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
    const batchSize=MAX_ROWS;
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

    // Sequential writes pause one second per MaxRows committed; timeout retries
    // back off for one second after shrinking the attempted chunk.
    let batchSize=MAX_ROWS;
    // `affected` now means "rows actually changed" (mode='chunk' writes are
    // diff-only, IS DISTINCT FROM -- see the migration), not "rows matched".
    // The SQL function itself validates every uid in the batch exists and
    // throws on a mismatch, so there is nothing left for JS to check here;
    // `count` tracks rows processed (for progress), `changedCount` tracks
    // rows actually written, purely for reporting.
    let count=0;
    let changedCount=0;
    let completedBatches=0;
    let nextPauseAt=MAX_ROWS;
    const estimateBatches=()=>completedBatches+
      Math.ceil(Math.max(0,rows.length-count)/batchSize);
    async function coolDown(retrying){
      const secondsTotal=Math.ceil(KEYWORD_CLASSIFICATION_WRITE_COOLDOWN_MS/1000);
      for(let seconds=secondsTotal;seconds>0;seconds--){
        onProgress?.({phase:'cooldown',completed:count,total:rows.length,
          seconds,retrying,batchSize,completedBatches,estimatedBatches:estimateBatches()});
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
    }
    for(let offset=0;offset<rows.length;){
      const batch=rows.slice(offset,offset+batchSize);
      let affected;
      try{
        // Await the RPC and transaction commit before starting another write.
        affected=await keywordClassificationWriteUnchecked(scope,{mode:'chunk',rows:batch});
      }catch(error){
        const timedOut=/canceling statement due to statement timeout/i
          .test(String(error?.message||error));
        if(!timedOut||batchSize<=1){
          flashMessage(WRITE_FAILED_NOTICE);
          throw error;
        }
        batchSize=Math.max(1,Math.floor(batchSize/2));
        await coolDown(true);
        continue; // The canceled statement committed no rows; retry this offset.
      }
      changedCount+=affected;
      count+=batch.length;
      offset+=batch.length;
      completedBatches++;
      onProgress?.({phase:'write',completed:count,total:rows.length,
        completedBatches,estimatedBatches:estimateBatches(),batchSize,
        lastBatchSize:batch.length});
      if(offset<rows.length&&count>=nextPauseAt){
        nextPauseAt+=MAX_ROWS;
        await coolDown(false);
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
    preflightWrite('silver.'+scope+'_keywords');
    onProgress?.({phase:'reading',completed:0,total:0});
    const config=await selectAuthRow('silver.'+scope,{idColumn:'id',id:scope,
      columns:'current_keyword_class_uid'});
    const classUid=String(config?.current_keyword_class_uid||'');
    if(!/^[0-9A-Za-z]{4}$/.test(classUid))throw new Error('目前沒有選定有效的 Keywords Class');
    onProgress?.({phase:'resetting',completed:0,total:1});
    const {data,error}=await dbAuthRelation('silver.'+scope+'_keywords')
      .update({uidlist:[]}).eq('class_uid',classUid).select('keyword_id');
    if(error)throw new Error(error.message||'清空 Keywords.uidlist 失敗');
    const {data:updated,error:configError}=await dbAuthRelation('silver.'+scope)
      .update({staticstime:null,keyword_meta:{},updated_at:new Date().toISOString()})
      .eq('id',scope).eq('current_keyword_class_uid',classUid).select('id');
    if(configError||updated?.length!==1)throw new Error(configError?.message||'清空設定更新失敗');
    onProgress?.({phase:'completed',completed:data?.length||0,total:data?.length||0});
    return {count:data?.length||0};
  }

  async function readKeywordClass(scopeId,classUid){
    const scope=normalizeScopeId(scopeId),uid=String(classUid||'');
    if(!/^[0-9A-Za-z]{4}$/.test(uid))return null;
    const {data,error}=await publicClient.schema('silver').rpc('read_keyword_class_by_uid',{
      p_scope_id:scope,p_class_uid:uid
    });
    if(error)throw new Error(error.message||'Keywords Class read failed');
    return data;
  }

  async function readKeywordUidlistSummary(scopeId,{startDate='',endDate='',source=''}={}){
    const scope=normalizeScopeId(scopeId);
    const date=value=>/^\\d{4}-\\d{2}-\\d{2}/.test(String(value||''))?String(value).slice(0,10):null;
    const {data,error}=await publicClient.schema('silver').rpc('read_keyword_uidlist_summary',{
      p_scope_id:scope,p_start:date(startDate),p_end:date(endDate),
      p_source:String(source||'').trim()||null
    });
    if(error){const exception=new Error(error.message||'UID-list summary failed');exception.code=error.code;throw exception;}
    return Array.isArray(data)?data:[];
  }

  async function readKeywordItemCatalog(scopeId){
    const scope=normalizeScopeId(scopeId);
    const {data,error}=await publicClient.schema('silver').rpc('read_keyword_item_catalog',{p_scope_id:scope});
    if(error)throw new Error(error.message||'Keyword Item catalog read failed');
    return Array.isArray(data)?data:[];
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
  // Totals-only companion (silver.read_scope_category_totals): one number per
  // source/media category, no per-day grouping. For a collapsed river lane
  // that only needs to size a flat water-level bar, this is far cheaper than
  // readScopeStatistics's day x category aggregate.
  async function readScopeCategoryTotals(scopeId,{startDate='',endDate=''}={}){
    const scope=normalizeScopeId(scopeId);
    const day=value=>/^\d{4}-\d{2}-\d{2}/.test(String(value||''))?String(value).slice(0,10):null;
    const {data,error}=await publicClient.schema('silver').rpc('read_scope_category_totals',{
      p_scope_id:scope,
      p_start:day(startDate),
      p_end:day(endDate)
    });
    if(error){
      const failure=new Error(error.message||'Scope category totals read failed');
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
    const scope=normalizeScopeId(scopeId),op=String(operation||'').trim().toLowerCase();
    if(!['insert','update','delete'].includes(op))throw new Error('Unsupported keyword operation');
    preflightWrite('silver.'+scope+'_keywords');
    const relation=dbAuthRelation('silver.'+scope+'_keywords');
    const classUid=String(item.class_uid||'');
    if(!/^[0-9A-Za-z]{4}$/.test(classUid))throw new Error('Keywords Class UID 必須為四字元');
    const id=String(item.keyword_id??'');
    if(op!=='insert'&&!/^[1-9][0-9]*$/.test(id))throw new Error('Keyword ID 無效');
    const values={
      class_uid:classUid,
      group_name:String(item.class_name||'').trim(),
      class_name:String(item.class_name||'').trim(),
      class_group:String(item.class_group||'').trim(),
      class_enable:item.class_enable!==false,
      item_name:String(item.item_name||'').trim(),
      principle:String(item.principle||''),
      keywords:Array.isArray(item.keywords)?item.keywords:[],
      order_no:Number(item.order_no)||0
    };
    let query;
    if(op==='insert')query=relation.insert(values).select('keyword_id');
    else if(op==='update')query=relation.update(values).eq('keyword_id',id).eq('class_uid',classUid).select('keyword_id');
    else query=relation.delete().eq('keyword_id',id).eq('class_uid',classUid).select('keyword_id');
    const {data,error}=await query;
    if(error||data?.length!==1)throw new Error(error?.message||'Keyword write affected no rows');
    return {count:1,keyword_id:data[0].keyword_id};
  }

  async function copyKeywordLibraryClass(scopeId,sourceClassName,targetClassName){
    const scope=normalizeScopeId(scopeId);
    const source=String(sourceClassName||'').trim(),target=String(targetClassName||'').trim();
    if(!source||!target||source===target)throw new Error('Keywords Class 名稱無效或重複');
    preflightWrite('silver.'+scope+'_keywords');
    const relation=dbAuthRelation('silver.'+scope+'_keywords');
    const {data:found,error:existsError}=await relation.select('keyword_id').eq('class_name',target).limit(1);
    if(existsError||found?.length)throw new Error(existsError?.message||'Class 已存在');
    const {data:sourceItems,error:readError}=await relation
      .select('keyword_id,class_group,class_enable,item_name,principle,keywords,order_no')
      .eq('class_name',source).order('order_no',{ascending:true});
    if(readError||!sourceItems?.length)throw new Error(readError?.message||'找不到來源 Class');
    const registry=dbAuthRelation(scope==='local'?'local.local_keyword_classes':'silver.keyword_classes');
    const {data:created,error:registryError}=await registry.insert({scope_id:scope}).select('class_uid');
    if(registryError||created?.length!==1)throw new Error(registryError?.message||'無法建立 Class UID');
    const classUid=created[0].class_uid;
    const copies=sourceItems.map(item=>({
      class_uid:classUid,group_name:target,class_name:target,
      class_group:String(item.class_group||''),class_enable:item.class_enable!==false,
      item_name:String(item.item_name||''),principle:String(item.principle||''),
      keywords:Array.isArray(item.keywords)?item.keywords:[],
      order_no:Number(item.order_no)||0,uidlist:[]
    }));
    const {data, error}=await relation.insert(copies).select('keyword_id');
    if(error||data?.length!==copies.length){
      await relation.delete().eq('class_uid',classUid);
      await registry.delete().eq('class_uid',classUid);
      throw new Error(error?.message||'Class 複製未完成');
    }
    return {count:data.length,class_uid:classUid};
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

  return {publicClient,authClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,applyKeywordClassification,resetKeywordClassification,readKeywordClass,readScopeStatistics,readScopeCategoryTotals,readScopeOverview,readScopeEarliest,readLocStatistics,findGalaxyDuplicates,readRune66Summary,readKeywordUidlistSummary,readKeywordItemCatalog,writeKeywordLibraryItem,copyKeywordLibraryClass,copyRune66KeywordClass,isCurrentEmailBlocklisted,deleteScope,moveScopeBlock,provisionScope,manageScopeRegistry,getAccountSession,signInWithGoogle,signOutAccount};
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
