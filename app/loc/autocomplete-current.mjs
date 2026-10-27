// A Scope's manually refreshed autocomplete snapshot. Never scan Galaxy on focus.
const loaded=new Map();
const validScope=id=>/^[a-z][a-z0-9]{0,14}$/.test(String(id||''))&&id!=='admin'&&id!=='local';
const list=(snapshot,kind)=>Array.isArray(snapshot?.[kind])?snapshot[kind]:[];
export function currentTop10(snapshot,kind){return list(snapshot,kind).slice(0,10);}
export function currentPopularOptions(options=[],snapshot,kind){
  const byUid=new Map((options||[]).map(option=>[String(option?.value||''),option]));
  return currentTop10(snapshot,kind).map(row=>byUid.get(String(row?.uid||''))).filter(Boolean);
}
export function currentPlaceCounts(snapshot){return list(snapshot,'space');}
export async function readAutocompleteCurrent(scopeId,{fresh=false}={}){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!validScope(id))return null;
  if(!fresh&&loaded.has(id))return loaded.get(id);
  const request=(async()=>{
    const [{selectRows},{defaultScopeData}]=await Promise.all([
      import('./db-query.mjs'),import('./scope-data')
    ]);
    const scope=defaultScopeData(id);
    if(!scope?.config)return null;
    const {rows}=await selectRows(scope.config,{
      columns:'autocomplete_current',filters:[{column:'id',operator:'eq',value:id}],limit:1
    });
    const value=rows?.[0]?.autocomplete_current;
    return value&&typeof value==='object'?value:null;
  })();
  loaded.set(id,request);
  try{return await request;}catch(e){loaded.delete(id);throw e;}
}
export async function refreshAutocompleteCurrent(scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!validScope(id))throw Error('Scope ID 格式無效');
  const {dbAuthClient}=await import('./db-client.mjs');
  const {data,error}=await dbAuthClient.schema('silver')
    .rpc('refresh_scope_autocomplete_current',{p_scope_id:id});
  if(error)throw Error(error.message||'熱門候選更新失敗');
  if(!data||!Array.isArray(data.space)||!Array.isArray(data.time)){
    throw Error('熱門候選快照格式錯誤，未更新');
  }
  loaded.set(id,Promise.resolve(data));
  return data;
}
export function invalidateAutocompleteCurrent(scopeId){
  loaded.delete(String(scopeId||'').trim().toLowerCase());
}
