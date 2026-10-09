export function createDatabaseClient({publicClient,authClient,auth}){
    if(!publicClient?.schema||!authClient?.schema||!auth?.getSession||!auth?.signInWithOAuth||!auth?.signOut){
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

  async function managementWrite(payload){
    const {data,error}=await authClient.schema('silver').rpc('management_write',payload);
    if(error)throw new Error(error.message||'Management write failed');
    return data||{count:0};
  }

  async function insertRows(table,rows){
    const list=Array.isArray(rows)?rows:[];
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

  async function updateRows(table,values,{filters=[]}={}){
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

  async function deleteRows(table,{filters=[]}={}){
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

  async function keywordClassificationWrite(scopeId,payload){
    const scope=normalizeScopeId(scopeId);
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
    await keywordClassificationWrite(scope,{mode:'begin'});
    onProgress?.({phase:'prepare',completed:0,total:rows.length});

    const batchSize=500;
    let count=0;
    for(let offset=0;offset<rows.length;offset+=batchSize){
      const batch=rows.slice(offset,offset+batchSize);
      const affected=await keywordClassificationWrite(scope,{mode:'chunk',rows:batch});
      if(affected!==batch.length){
        throw new Error(`Keyword classification chunk incomplete: expected ${batch.length}, affected ${affected}`);
      }
      count+=affected;
      onProgress?.({phase:'write',completed:count,total:rows.length});
    }

    onProgress?.({phase:'finalizing',completed:count,total:rows.length});
    const documentCount=await keywordClassificationWrite(scope,{mode:'finalize',meta});
    if(documentCount!==rows.length){
      throw new Error(`Keyword classification finalize mismatch: expected ${rows.length}, counted ${documentCount}`);
    }
    return {count,documentCount};
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

  async function writeKeywordLibraryItem(scopeId,operation,item={}){
    const scope=normalizeScopeId(scopeId);
    const op=String(operation||'').trim().toLowerCase();
    if(!['insert','update','delete'].includes(op))throw new Error('Unsupported keyword library operation');
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

  async function copyRune66KeywordClass(scopeId){
    const scope=normalizeScopeId(scopeId);
    if(!scope)throw new Error('Scope ID 格式不正確。');
    const {data,error}=await authClient.schema('silver').rpc('copy_rune66_keyword_class',{p_scope_id:scope});
    if(error)throw new Error(error.message||'符文66複製失敗。');
    return data||{};
  }

  async function deleteScope(scopeId){
    const scope=normalizeScopeId(scopeId);
    if(!scope)throw new Error('Scope ID 格式不正確。');
    const {data,error}=await authClient.schema('silver').rpc('delete_scope',{p_scope_id:scope});
    if(error)throw new Error(error.message||'Scope 刪除失敗。');
    return data||{};
  }

  async function provisionScope(values={}){
    const scopeId=normalizeScopeId(values.scope_id);
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
    return data||{};
  }

  async function manageScopeRegistry(operation,scopeId,values={}){
    const scope=normalizeScopeId(scopeId);
    const op=String(operation||'').trim().toLowerCase();
    if(!['create_group','update'].includes(op))throw new Error('Unsupported Scope Registry operation');
    const {data,error}=await authClient.schema('silver').rpc('manage_scope_registry',{
      p_operation:op,
      p_scope_id:scope,
      p_values:values&&typeof values==='object'?values:{}
    });
    if(error)throw new Error(error.message||'Scope Registry management failed');
    return data||{};
  }

  async function syncManageScopeRow(values,{scopeId,email}={}){
    const result=await managementWrite({
      p_table:'silver.manage',
      p_operation:'scope_sync',
      p_rows:null,
      p_values:values||{},
      p_filters:[
        {column:'id',operator:'eq',value:String(scopeId||'')},
        {column:'email',operator:'eq',value:String(email||'')}
      ]
    });
    const affected=Number(result?.count||0);
    if(affected<1)throw new Error('Scope mapping update affected 0 rows');
    return {...result,count:affected};
  }

  async function logSearchKeyword(scopeId,queryText){
    const scope=String(scopeId||'').trim().toLowerCase();
    const query=String(queryText||'').trim();
    if(!scope||!query)return;
    const {error}=await publicClient.schema('silver').rpc('log_search_keyword',{
      p_scope_id:scope,
      p_query_text:query
    });
    if(error)throw new Error(error.message||'Search keyword log failed');
  }

  async function getAccountSession(){
    const {data,error}=await auth.getSession();
    if(error)throw new Error(error.message||'Account session failed');
    const session=data?.session||null;
    return session?.user?{session,user:session.user}:null;
  }

  async function signInWithGoogle(callbackURL){
    const target=String(callbackURL||'').trim();
    if(!target)throw new Error('Google sign-in callback URL is required');
    const {error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:target}});
    if(error)throw new Error(error.message||'Google sign-in failed');
  }

  async function signOutAccount(){
    const {error}=await auth.signOut();
    if(error)throw new Error(error.message||'Account sign-out failed');
  }

  return {publicClient,authClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,applyKeywordClassification,readKeywordClass,writeKeywordLibraryItem,copyKeywordLibraryClass,copyRune66KeywordClass,isCurrentEmailBlocklisted,deleteScope,provisionScope,manageScopeRegistry,syncManageScopeRow,logSearchKeyword,getAccountSession,signInWithGoogle,signOutAccount};
}
