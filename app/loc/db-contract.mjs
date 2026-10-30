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

  async function readOwnedKeywordNodes(table){
    const rows=[],size=500;
    for(let offset=0;;offset+=size){
      const {data,error}=await dbAuthRelation(table)
        .select('uid,type,name,desc,lists')
        .order('uid',{ascending:true}).range(offset,offset+size-1);
      if(error)throw new Error(error.message||'Cannot read Keywords tree');
      rows.push(...(data||[]));
      if((data||[]).length<size)break;
    }
    return rows;
  }

  async function resetKeywordClassification(scopeId,{classUid:requestedClassUid='',onProgress}={}){
    const scope=normalizeScopeId(scopeId);
    const table='silver.'+scope+'_keywords';
    preflightWrite(table);
    const config=await selectAuthRow('silver.'+scope,{
      idColumn:'id',id:scope,
      columns:'current_keyword_class_uid,keyword_meta,staticstime'
    });
    const classUid=String(requestedClassUid||config?.current_keyword_class_uid||'');
    if(!/^[A-Za-z0-9]{4}$/.test(classUid))throw new Error('尚未選取 Keywords Class');
    const all=await readOwnedKeywordNodes(table);
    const {descendantsOfKeyword}=await import('./keyword-tree.mjs');
    const children=descendantsOfKeyword(all,classUid)
      .filter(node=>node.type==='group'||node.type==='item');
    const {invalidateKeywordClass}=await import('./keyword-class-state.mjs');
    const isCurrent=classUid===String(config?.current_keyword_class_uid||'');
    const {data:staled,error:staleError}=await dbAuthRelation('silver.'+scope)
      .update({keyword_meta:invalidateKeywordClass(config?.keyword_meta,classUid),
        ...(isCurrent?{staticstime:null}:{})})
      .eq('id',scope).select('id');
    if(staleError||staled?.length!==1)throw new Error(staleError?.message||'無法作廢舊分析');
    let completed=0;
    for(const row of children){
      const {data,error}=await dbAuthRelation(table)
        .update({uid_lists:[]}).eq('uid',row.uid).select('uid');
      if(error||data?.length!==1)throw new Error(error?.message||'清空 '+row.uid+' 失敗');
      completed++;
      onProgress?.({phase:'resetting',completed,total:children.length});
    }
    onProgress?.({phase:'completed',completed,total:children.length});
    return {count:completed};
  }

  async function verifiedKeywordOwner(){
    const current=await auth.getSession();
    if(current.error)throw new Error(current.error.message||'Keyword session unavailable');
    const session=current.data?.session;
    if(!session?.access_token||!session.user?.id)return false;
    const verified=await auth.getUser(session.access_token);
    return !verified.error&&String(verified.data?.user?.id||'')===String(session.user.id);
  }

  async function keywordRead(name,args,{isEmpty=data=>!data}={}){
    const publicResult=await publicClient.schema('silver').rpc(name,args);
    if(publicResult.error)throw new Error(publicResult.error.message||('Keyword RPC '+name+' failed'));
    if(!isEmpty(publicResult.data))return publicResult.data;
    if(!await verifiedKeywordOwner())return publicResult.data;
    const privateResult=await authClient.schema('silver').rpc(name,args);
    if(privateResult.error)throw new Error(privateResult.error.message||('Private Keyword RPC '+name+' failed'));
    return privateResult.data;
  }

  async function readKeywordClass(scopeId,classUid){
    const scope=normalizeScopeId(scopeId),uid=String(classUid||'');
    if(!/^[A-Za-z0-9]{4}$/.test(uid))return null;
    const data=await keywordRead('read_keyword_tree_catalog',{p_scope_id:scope,p_class_uid:uid},{
      isEmpty:result=>!result?.class_uid||!Array.isArray(result.rows)||result.rows.length===0
    });
    return data?.class_uid===uid?data:null;
  }

  async function readKeywordTreeSummary(scopeId,{classUid='',startDate='',endDate='',source=''}={}){
    const scope=normalizeScopeId(scopeId);
    const day=value=>/^\d{4}-\d{2}-\d{2}/.test(String(value||''))?String(value).slice(0,10):null;
    const data=await keywordRead('read_keyword_tree_summary',{
      p_scope_id:scope,p_class_uid:classUid||null,p_start:day(startDate),p_end:day(endDate),
      p_source:String(source||'').trim()||null
    },{isEmpty:value=>!Array.isArray(value)||value.length===0});
    return Array.isArray(data)?data:[];
  }

  async function readKeywordTreeCatalog(scopeId,{classUid=''}={}){
    const scope=normalizeScopeId(scopeId);
    const data=await keywordRead('read_keyword_tree_catalog',{
      p_scope_id:scope,p_class_uid:classUid||null
    },{
      isEmpty:value=>!value?.class_uid||!Array.isArray(value.rows)||value.rows.length===0
    });
    return data&&Array.isArray(data.rows)?data:{class_uid:'',rows:[]};
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
      sourceName:String(row?.site||''),
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

  async function writeKeywordLibraryItem(scopeId,operation,node={}){
    const scope=normalizeScopeId(scopeId);
    const table='silver.'+scope+'_keywords';
    preflightWrite(table);
    const op=String(operation||'').toLowerCase();
    if(!['insert','update','delete'].includes(op))throw new Error('Unsupported Keywords operation');
    const {normalizeKeywordTreeRow}=await import('./keyword-tree.mjs');
    const normalized=normalizeKeywordTreeRow(node);
    const relation=dbAuthRelation(table);
    let query;
    if(op==='insert')query=relation.insert(normalized).select('uid');
    else if(op==='update')query=relation.update({
      type:normalized.type,name:normalized.name,desc:normalized.desc,
      lists:normalized.lists
    }).eq('uid',normalized.uid).select('uid');
    else query=relation.delete().eq('uid',normalized.uid).select('uid');
    const {data,error}=await query;
    if(error||data?.length!==1)throw new Error(error?.message||'Keywords write affected no rows');
    return {uid:normalized.uid,count:1};
  }

  async function copyKeywordLibraryClass(scopeId,sourceClassUid,targetClassName){
    const scope=normalizeScopeId(scopeId),source=String(sourceClassUid||''),
      target=String(targetClassName||'').trim();
    if(!/^[0-9A-Za-z]{4}$/.test(source)||!target)throw new Error('Keywords Class 識別或名稱不正確');
    const table='silver.'+scope+'_keywords';
    preflightWrite(table);
    const data=await readOwnedKeywordNodes(table);
    const {indexKeywordTree,descendantsOfKeyword}=await import('./keyword-tree.mjs');
    const {generateKeywordClassUid}=await import('./keyword-uidlist.mjs');
    const tree=indexKeywordTree(data);
    const original=tree.index.get(source);
    if(!original||original.type!=='class')throw new Error('找不到來源 Class');
    const categoryUid=tree.parent.get(original.uid);
    if(!categoryUid)throw new Error('Class 缺少 Category');
    const category=tree.index.get(categoryUid),descendants=descendantsOfKeyword(data,original.uid);
    const occupied=[...tree.index.keys()],mapping=new Map();
    for(const node of descendants){
      const uid=generateKeywordClassUid(occupied);
      occupied.push(uid);mapping.set(node.uid,uid);
    }
    const saved=[];
    try{
      // Child nodes first so a published Class cannot reference missing nodes.
      for(const node of [...descendants].reverse()){
        const copy={...node,uid:mapping.get(node.uid),
          name:node.uid===original.uid?target:node.name,
          lists:node.type==='item'?[...node.lists]:node.lists.map(uid=>mapping.get(uid)),
          uid_lists:[]};
        await writeKeywordLibraryItem(scope,'insert',copy);
        saved.push(copy);
      }
      await writeKeywordLibraryItem(scope,'update',{
        ...category,lists:[...category.lists,mapping.get(original.uid)]});
    }catch(error){
      for(const node of saved.reverse())
        await writeKeywordLibraryItem(scope,'delete',node).catch(()=>{});
      throw error;
    }
    return {count:saved.length,class_uid:mapping.get(original.uid),uid:mapping.get(original.uid)};
  }

  async function isCurrentEmailBlocklisted(){
    const {data,error}=await authClient.schema('silver').rpc('is_current_email_blocklisted');
    if(error)throw new Error(error.message||'無法核對系統黑名單');
    return data===true;
  }

  async function copyRune66KeywordClassUnchecked(scopeId,sourceClassUid){
    const {generateKeywordClassUid}=await import('./keyword-uidlist.mjs');
    const uid=generateKeywordClassUid();
    return copyKeywordLibraryClass(scopeId,sourceClassUid,'符文66副本-'+uid);
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

  return {publicClient,authClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,resetKeywordClassification,readKeywordClass,readScopeStatistics,readScopeCategoryTotals,readScopeOverview,readScopeEarliest,readLocStatistics,findGalaxyDuplicates,readKeywordTreeSummary,readKeywordTreeCatalog,writeKeywordLibraryItem,copyKeywordLibraryClass,copyRune66KeywordClass,isCurrentEmailBlocklisted,deleteScope,moveScopeBlock,provisionScope,manageScopeRegistry,getAccountSession,signInWithGoogle,signOutAccount};
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
