'use client';


import {DB_QUERY_BATCH_SIZE,selectRows} from './db-query.mjs';
import {dbAuthClient,dbPublicClient} from './db-client.mjs';

// Public page copy (Title_TW/Desc_TW) now travels inside the shared
// app-bootstrap request (see app/loc/app-bootstrap.js); there is no
// standalone per-page RPC call for it any more.
// silver.manage 已停用：管理權限改由 silver.loc（main index table）的
// email/manage_role/galaxy_table/time_table/birthday 欄位提供，
// 公開查詢絕不包含 email；權限驗證由受保護的管理 RPC 提供。
// 以下只對非機密欄位使用 PostgREST alias，
// buildScopeData/scopeDataFromManageRows 完全不需要改動。
export const MANAGE_TABLE='silver.loc';
const MANAGE_COLUMNS='id,role:manage_role,galaxy:galaxy_table,time:time_table,birthday';
const MANAGE_ROLE_COLUMN='manage_role';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]{0,14}$/;
const TABLE_TOKEN_PATTERN=/^[a-z][a-z0-9_]*$/;

function requiredToken(value,label){
  const token=String(value||'').trim()||label;
  if(!TABLE_TOKEN_PATTERN.test(token))throw new Error('silver.loc '+label+' 設定無效');
  return token;
}

function buildScopeData(row,id){
  const galaxySuffix=requiredToken(row?.galaxy,'galaxy');
  const timeSuffix=requiredToken(row?.time,'time');
  const galaxy=`silver.${id}_${galaxySuffix}`;
  return {
    id,
    config:`silver.${id}`,
    role:String(row?.role||'').trim(),
    birthday:String(row?.birthday||'').slice(0,10)||null,
    galaxy,
    galaxyMedia:galaxy+'_media',
    time:`silver.${id}_${timeSuffix}`,
    keywords:`silver.${id}_keywords`,
    blocks:`silver.${id}_blocks`
  };
}

export function defaultScopeData(scopeId){
  const id=String(scopeId||'').trim();
  return SCOPE_ID_PATTERN.test(id)?buildScopeData({},id):null;
}

export function scopeDataFromManageRows(rows=[]){
  const scopes=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const id=String(row?.id||'').trim();
    if(!SCOPE_ID_PATTERN.test(id))continue;
    const next=buildScopeData(row,id);
    const current=scopes.get(id);
    if(current&&(current.galaxy!==next.galaxy||current.time!==next.time)){
      throw new Error('silver.loc Scope '+id+' 的 galaxy/time 設定不一致');
    }
    scopes.set(id,current
      ?{...current,role:current.role==='admin'||next.role==='admin'?'admin':next.role,birthday:current.birthday||next.birthday}
      :next);
  }
  return [...scopes.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

// Public Scope-to-table metadata is stable during ordinary browsing. Share the
// same completed request across Culture/Confluence readers and across route
// changes. This is NOT an authorization cache; writes still enforce RLS.
let managedScopesRequest=null;
export function selectManagedScopes(){
  if(managedScopesRequest)return managedScopesRequest;
  managedScopesRequest=selectRows(MANAGE_TABLE,{
    columns:MANAGE_COLUMNS,
    filters:[{column:MANAGE_ROLE_COLUMN,operator:'in',value:['admin','scope']}],
    orders:[{column:'id',ascending:true}],
    limit:DB_QUERY_BATCH_SIZE,
    offset:0
  }).then(({rows})=>scopeDataFromManageRows(rows)).catch(error=>{
    managedScopesRequest=null;
    throw error;
  });
  return managedScopesRequest;
}

function normalizeRegistryRow(row){
  const id=String(row.scope_id||'').trim();
  return {
    scope_id:id,
    display_name:String(row.display_name||'').trim(),
    // Admin is an operations node, never an article Scope. The bootstrap RPC
    // currently reports it as a Scope even though silver.loc marks it system.
    scope_kind:id==='admin'?'system':String(row.scope_kind||'').trim(),
    domain:String(row.domain||'').trim()||null,
    directory:String(row.directory||'').trim()||null,
    parent_scope_id:String(row.parent_scope_id||'').trim()||null,
    active:row.active!==false,
    sort_order:Number(row.sort_order)||0
  };
}

// silver.scope_registry 已停用：registry 列表改由 read_app_bootstrap RPC
// 動態組出（來源是 silver.loc 的指向欄位 + 各節點自己的 display_name），
// 回傳格式跟舊版 scope_registry 查詢完全相同，呼叫端不需要改動。
// One public site snapshot per client runtime (including concurrent mounts).
// Registry, theme catalogue and page-copy are shared by all Scope pages.
let publicSiteBootstrapRequest=null;
// Theme writes invalidate only the site snapshot, not Scope metadata or
// runtime Registry caches. Ordinary Guest navigation is unaffected.
export function invalidatePublicThemeSnapshot(){
  publicSiteBootstrapRequest=null;
  void revalidateServerMetadata();
}
// Only explicit admin metadata refreshes invalidate the public client snapshot.
// Guest navigation shares the same promise and never preflights authorization.
export function invalidatePublicScopeMetadata(){
  managedScopesRequest=null;
  publicSiteBootstrapRequest=null;
  void revalidateServerMetadata();
  if(typeof window!=='undefined'){
    window.dispatchEvent(new Event('loc-public-scope-metadata-changed'));
  }
}
export async function revalidateServerMetadata(){
  try{
    const {data,error}=await dbAuthClient.auth.getSession();
    const token=data?.session?.access_token;
    if(error||!token)return false;
    const response=await fetch('/api/loc/revalidate',{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    return response.ok;
  }catch{return false;}
}
export function selectPublicSiteBootstrap(){
  if(publicSiteBootstrapRequest)return publicSiteBootstrapRequest;
  publicSiteBootstrapRequest=fetch('/api/loc/site-bootstrap')
    .then(async response=>{
      if(!response.ok)throw new Error('LOC site bootstrap failed: '+response.status);
      return response.json();
    }).catch(async error=>{
      // Static/native builds have no Next server. Preserve their existing
      // direct public read while deployed web traffic uses the ISR endpoint.
      const {data,error:rpcError}=await dbPublicClient.schema('silver')
        .rpc('read_app_bootstrap',{p_scope_id:'loc',p_page_name:'index'});
      if(rpcError)throw error;
      return data||{};
    }).catch(error=>{
      publicSiteBootstrapRequest=null;
      throw error;
    });
  return publicSiteBootstrapRequest;
}

async function fetchRegistryRows(){
  const data=await selectPublicSiteBootstrap();
  return Array.isArray(data.registry)?data.registry:[];
}

export async function selectScopeRegistry({parentScopeId=null,scopeKind=null}={}){
  const rows=await fetchRegistryRows();
  return rows
    .filter(row=>row?.active!==false)
    .map(normalizeRegistryRow)
    .filter(row=>!parentScopeId||row.parent_scope_id===String(parentScopeId).trim())
    .filter(row=>!scopeKind||row.scope_kind===String(scopeKind).trim())
    .sort((a,b)=>a.sort_order-b.sort_order||a.scope_id.localeCompare(b.scope_id));
}

// LOC's public search registry: registry membership and each tree's search_able
// are independent of an article's searchable flag.
export async function selectLocSearchScopes(){
  const registry=await selectScopeRegistry({scopeKind:'scope'});
  const scopes=await Promise.all(registry
    .filter(row=>row.active&&row.scope_id!=='admin')
    .map(async row=>{
      const config=await selectScopeConfig(row.scope_id);
      if(config?.search_able!==true)return null;
      const scope=defaultScopeData(row.scope_id);
      return scope?{...scope,display_name:String(config.display_name||row.display_name||row.scope_id).trim()}:null;
    }));
  return scopes.filter(Boolean);
}

export async function selectScopeRegistryEntry(scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!SCOPE_ID_PATTERN.test(id))return null;
  const rows=await fetchRegistryRows();
  const row=rows.find(item=>String(item?.scope_id||'').trim()===id&&item?.active!==false);
  return row?normalizeRegistryRow(row):null;
}

export async function selectScopeGroupChildren(scopeId='loc'){
  const rows=await selectScopeRegistry({parentScopeId:scopeId});
  return Promise.all(rows.map(async row=>{
    if(row.scope_kind!=='scope')return row;
    try{
      const config=await selectScopeConfig(row.scope_id);
      return {
        ...row,
        display_name:String(config?.display_name||row.display_name||row.scope_id).trim(),
        search_intro:String(config?.search_intro||'').trim(),
        search_aliases:Array.isArray(config?.search_aliases)?config.search_aliases:[]
      };
    }catch{
      return row;
    }
  }));
}

export async function selectManagedScope(scopeId){
  const id=String(scopeId||'').trim();
  if(!SCOPE_ID_PATTERN.test(id))throw new Error('Scope ID 無效');
  // Reuse the identical public metadata snapshot instead of SELECT silver.loc
  // once more for every individual Scope. Never use this as a permission check.
  const scopes=await selectManagedScopes();
  return scopes.find(scope=>scope.id===id)||null;
}


// Deduplicate simultaneous readers (AppShell, Scope runtime, feature gate).
// The browser keeps only the in-flight request; Vercel ISR owns the shared
// 14-day cache for public Config and page blocks.
const scopeConfigInFlight=new Map();
export function selectScopeConfig(scopeId){
  const scope=defaultScopeData(scopeId);
  if(!scope)return Promise.resolve(null);
  const existing=scopeConfigInFlight.get(scope.id);
  if(existing)return existing;
  const request=fetch('/api/loc/scopes/'+encodeURIComponent(scope.id)+'/config')
    .then(async response=>{
      if(!response.ok)throw new Error('Scope config failed: '+response.status);
      return response.json();
    }).catch(async()=>{
      const {rows}=await selectRows(scope.config,{
        columns:'id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able',
        filters:[{column:'id',operator:'eq',value:scope.id}],limit:1,offset:0
      });
      return rows[0]||null;
    }).finally(()=>scopeConfigInFlight.delete(scope.id));
  scopeConfigInFlight.set(scope.id,request);
  return request;
}


export async function selectScopeBlocks(scopeId,page='index'){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!SCOPE_ID_PATTERN.test(id))return [];
  const requested=String(page||'index').trim().toLowerCase();
  const pageName=requested==='home'?'index':requested;
  if(!/^[a-z0-9_-]+$/.test(pageName))throw new Error('Page name 無效');
  let response=null;
  try{response=await fetch('/api/loc/scopes/'+encodeURIComponent(id)+'/blocks/'+encodeURIComponent(pageName));}
  catch{/* Static/native builds use the direct public Supabase fallback below. */}
  if(response?.ok){
    try{return await response.json();}catch{/* Fall through to the direct read. */}
  }
  const {rows}=await selectRows(`silver.${id}_blocks`,{
    columns:'uid,page_name,block_eyebrow,block_title,block_subtitle,block_text,block_order,block_entity,block_image',
    filters:[{column:'page_name',operator:'eq',value:pageName}],
    orders:[{column:'block_order',ascending:true}],limit:DB_QUERY_BATCH_SIZE,offset:0
  });
  return rows||[];
}
