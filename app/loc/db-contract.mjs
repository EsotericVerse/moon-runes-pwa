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
    const {data,error}=await authClient.schema('api').rpc('management_write',payload);
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

  async function writeKeywordLibraryItem(operation,item={}){
    const op=String(operation||'').trim().toLowerCase();
    if(!['insert','update','delete'].includes(op))throw new Error('Unsupported keyword library operation');
    const relation=dbAuthRelation('api.lo3rwang_keywords_manage');
    const values={
      group_name:String(item?.group_name||'').trim(),
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
    const {error}=await publicClient.schema('api').rpc('log_search_keyword',{
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
    const target=callbackURL||(typeof window!=='undefined'?window.location.href:'/');
    const {error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:target}});
    if(error)throw new Error(error.message||'Google sign-in failed');
  }

  async function signOutAccount(){
    const {error}=await auth.signOut();
    if(error)throw new Error(error.message||'Account sign-out failed');
  }

  return {publicClient,authClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,writeKeywordLibraryItem,syncManageScopeRow,logSearchKeyword,getAccountSession,signInWithGoogle,signOutAccount};
}
