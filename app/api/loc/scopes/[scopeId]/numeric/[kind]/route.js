import {withLocCors,locCorsPreflight} from '../../../../_cors';
import {createPublicSupabaseClient,validScopeId} from '../../../../_server';

// Provider-neutral HTTP cache contract. A CDN/Worker may honor s-maxage=3600.
// ISR is an optional separate origin; GitHub Pages never executes this route.
const CACHE_HEADERS={'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=3600',
  'Cloudflare-CDN-Cache-Control':'public, s-maxage=3600'};
const NO_CACHE={'Cache-Control':'no-store'};
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const day=value=>DAY.test(value||'')?value:null;
const kinds=new Set(['culture','statistics','earliest','loc-statistics']);
function reply(request,data,status=200,headers=status===200?CACHE_HEADERS:NO_CACHE){
  return withLocCors(Response.json(data,{status,headers}),request);
}
export async function GET(request,{params}){
  const {scopeId,kind}=await params;
  if(!validScopeId(scopeId)||!kinds.has(kind)||scopeId==='local')
    return reply(request,{error:'Unsupported public summary'},404);
  const url=new URL(request.url);
  if([...url.searchParams.keys()].some(key=>!['startDate','endDate','includeUndated'].includes(key)))
    return reply(request,{error:'Invalid parameters'},400);
  const start=url.searchParams.get('startDate')||'',end=url.searchParams.get('endDate')||'';
  if((start&&!day(start))||(end&&!day(end))||start&&end&&start>end)
    return reply(request,{error:'Invalid date range'},400);
  // The Admin setting is the single source of truth; do not rely on deployed JS.
  const db=createPublicSupabaseClient().schema('silver');
  const {data:runtime,error:settingError}=await db.from('loc_runtime_config')
    .select('cache_mode,cache_provider,isr_domains').eq('id','loc').single();
  const chosen=Array.isArray(runtime?.isr_domains)
    ?runtime.isr_domains.find(item=>item.origin===runtime.cache_provider||item.id===runtime.cache_provider):null;
  const configuredOrigin=String(chosen?.origin||'').trim();
  if(settingError||runtime?.cache_mode!=='isr'||configuredOrigin!==url.origin)
    return reply(request,{error:'ISR not enabled for this domain'},503);
  let name,args;
  if(kind==='culture'){
    name='read_scope_statistics';args={p_scope_id:scopeId,p_start:day(start),p_end:day(end),
      p_include_undated:url.searchParams.get('includeUndated')==='true'};
  }else if(kind==='statistics'){
    name='read_scope_overview';args={p_scope_id:scopeId,p_start:day(start),p_end:day(end)};
  }else if(kind==='earliest'){
    name='read_scope_earliest';args={p_scope_id:scopeId};
  }else{
    if(scopeId!=='loc')return reply(request,{error:'Unsupported LOC statistics scope'},404);
    name='read_loc_statistics';args={p_start:day(start),p_end:day(end)};
  }
  const {data,error}=await db.rpc(name,args);
  if(error)return reply(request,{error:'Public summary unavailable'},503);
  if(kind==='culture')return reply(request,Array.isArray(data)?data:[]);
  if(kind==='earliest')return reply(request,typeof data==='string'?data:'');
  if(kind==='statistics')return reply(request,{
    earliest:String(data?.earliest||''),
    rows:Array.isArray(data?.rows)?data.rows:[],
    categories:Array.isArray(data?.categories)?data.categories:[],
    aliases:Array.isArray(data?.aliases)?data.aliases:[]
  });
  return reply(request,{
    earliest:String(data?.earliest||''),
    scopes:Array.isArray(data?.scopes)?data.scopes:[],
    rows:Array.isArray(data?.rows)?data.rows:[]
  });
}
export function OPTIONS(request){return locCorsPreflight(request);}
