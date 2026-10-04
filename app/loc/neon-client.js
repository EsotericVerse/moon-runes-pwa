'use client';

import {createClient,SupabaseAuthAdapter} from '@neondatabase/neon-js';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const DEFAULT_NEON_AUTH_URL='https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

let publicToken='';
let publicTokenExpiresAt=0;
let publicTokenRequest=null;

function neonDataApiUrl(){
  const configured=String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||process.env.NEXT_PUBLIC_NEON_DATABASE_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
  return configured.endsWith('/rest/v1')?configured:`${configured}/rest/v1`;
}

function neonAuthUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_AUTH_URL||process.env.NEXT_PUBLIC_LOC_AUTH_URL||DEFAULT_NEON_AUTH_URL).trim().replace(/\/+$/,'');
}

function normalizeExpiry(value){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)return Date.now()+60_000;
  return n>1e12?n:n*1000;
}

async function getNeonPublicToken(){
  const now=Date.now();
  if(publicToken&&now<publicTokenExpiresAt-30_000)return publicToken;
  if(publicTokenRequest)return publicTokenRequest;

  publicTokenRequest=(async()=>{
    const response=await fetch(`${neonAuthUrl()}/token/anonymous`,{
      method:'GET',
      headers:{accept:'application/json'},
      cache:'no-store'
    });
    let payload=null;
    try{payload=await response.json()}catch{}
    if(!response.ok||!payload?.token){
      const message=String(payload?.message||payload?.error||`HTTP ${response.status}`);
      const error=new Error(`Neon anonymous token failed: ${message}`);
      error.status=response.status;
      throw error;
    }
    publicToken=String(payload.token);
    publicTokenExpiresAt=normalizeExpiry(payload.expires_at);
    return publicToken;
  })();

  try{return await publicTokenRequest}
  finally{publicTokenRequest=null}
}

// Public SELECTs use a short-lived anonymous JWT obtained directly from Neon Auth.
// The token is only a credential reference; no application data is cached here.
// Management writes use a separate authenticated client so public reads cannot be
// poisoned by an old signed-in or persisted Better Auth session.
export const neonPublicClient=createClient({
  dataApi:{
    url:neonDataApiUrl(),
    getToken:getNeonPublicToken,
    options:{db:{schema:'api'}}
  }
});

export const neonAuthClient=createClient({
  auth:{
    adapter:SupabaseAuthAdapter(),
    url:neonAuthUrl()
  },
  dataApi:{
    url:neonDataApiUrl(),
    options:{db:{schema:'api'}}
  }
});

export function neonAuthRelation(table){
  const [schema,name]=String(table).split('.');
  return neonAuthClient.schema(schema).from(name);
}

export async function selectNeonAuthRow(table,{idColumn,id,columns}={}){
  const {data,error}=await neonAuthRelation(table).select(columns).eq(idColumn,String(id)).limit(1);
  if(error)throw new Error(error.message||('Neon SELECT '+table+' failed'));
  return data?.[0]||null;
}

async function managementWrite(payload){
  const {data,error}=await neonAuthClient.schema('api').rpc('management_write',payload);
  if(error)throw new Error(error.message||'Management write failed');
  return data||{count:0};
}

export async function insertNeonRows(table,rows){
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
    if(affected!==batch.length)throw new Error(`Neon INSERT ${table} incomplete: expected ${batch.length}, affected ${affected}`);
    count+=affected;
  }
  return {count};
}

export async function updateNeonRows(table,values,{filters=[]}={}){
  const result=await managementWrite({
    p_table:table,
    p_operation:'update',
    p_rows:null,
    p_values:values||{},
    p_filters:filters
  });
  const affected=Number(result?.count||0);
  if(affected<1)throw new Error(`Neon UPDATE ${table} affected 0 rows; record may not exist or filter did not match`);
  return {...result,count:affected};
}

export async function deleteNeonRows(table,{filters=[]}={}){
  const result=await managementWrite({
    p_table:table,
    p_operation:'delete',
    p_rows:null,
    p_values:null,
    p_filters:filters
  });
  const affected=Number(result?.count||0);
  if(affected<1)throw new Error(`Neon DELETE ${table} affected 0 rows; record may not exist or filter did not match`);
  return {...result,count:affected};
}

export async function writeKeywordLibraryItem(operation,item={}){
  const op=String(operation||'').trim().toLowerCase();
  if(!['insert','update','delete'].includes(op))throw new Error('Unsupported keyword library operation');
  const {data,error}=await neonAuthClient.schema('api').rpc('keyword_library_write',{
    p_operation:op,
    p_keyword_id:item?.keyword_id==null?null:Number(item.keyword_id),
    p_group_name:item?.group_name==null?null:String(item.group_name),
    p_item_no:item?.item_no==null?null:Number(item.item_no),
    p_item_name:item?.item_name==null?null:String(item.item_name),
    p_principle:item?.principle==null?'':String(item.principle),
    p_keywords:Array.isArray(item?.keywords)?item.keywords:[],
    p_order_no:item?.order_no==null?0:Number(item.order_no)
  });
  if(error)throw new Error(error.message||'Keyword library write failed');
  const result=data||{count:0};
  const affected=Number(result?.count||0);
  if(affected<1)throw new Error('Keyword library write affected 0 rows');
  return {...result,count:affected};
}

export async function syncManageScopeRow(values,{scopeId,email}={}){
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

export async function getNeonSession(){
  const {data,error}=await neonAuthClient.auth.getSession();
  if(error)throw new Error(error.message||'Neon session failed');
  const session=data?.session||null;
  return session?.user?{session,user:session.user}:null;
}

export async function signInNeonWithGoogle(callbackURL){
  const target=callbackURL||(typeof window!=='undefined'?window.location.href:'/');
  const {error}=await neonAuthClient.auth.signInWithOAuth({provider:'google',options:{redirectTo:target}});
  if(error)throw new Error(error.message||'Neon Google sign-in failed');
}

export async function signOutNeon(){
  const {error}=await neonAuthClient.auth.signOut();
  if(error)throw new Error(error.message||'Neon sign-out failed');
}
