import {withLocCors,locCorsPreflight} from '../../../../_cors';
import {publicNumericSources,validScopeId} from '../../../../_server';
import {isAvailabilityFailure,tryPublicSources} from '../../../../_numeric-failover.mjs';

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
  // Normal request: Supabase only. If Supabase is unavailable, a configured
  // Neon Data API provides the same PostgreSQL RPC and mirrored ISR settings.
  // No admin cookies, API keys or service secrets enter this public path.
  const outcome=await tryPublicSources(publicNumericSources(),async db=>{
    const setting=await db.from('loc_runtime_config')
      .select('cache_mode,cache_provider,isr_domains').eq('id','loc').single();
    if(setting.error)return {retryable:isAvailabilityFailure(setting),error:'Public ISR settings unavailable'};
    const runtime=setting.data;
    const chosen=Array.isArray(runtime?.isr_domains)
      ?runtime.isr_domains.find(item=>item.origin===runtime.cache_provider||item.id===runtime.cache_provider):null;
    if(runtime?.cache_mode!=='isr'||String(chosen?.origin||'').trim()!==url.origin)
      return {disabled:true,error:'ISR not enabled for this domain'};
    const result=await db.rpc(name,args);
    if(result.error)return {retryable:isAvailabilityFailure(result),error:'Public summary unavailable'};
    return {data:result.data};
  });
  if(outcome.error)return reply(request,{error:outcome.error},503);
  const data=outcome.data;
  const sourceHeaders={...CACHE_HEADERS,'X-LOC-Data-Source':outcome.source};
  if(kind==='culture')return reply(request,Array.isArray(data)?data:[],200,sourceHeaders);
  if(kind==='earliest')return reply(request,typeof data==='string'?data:'',200,sourceHeaders);
  if(kind==='statistics')return reply(request,{
    earliest:String(data?.earliest||''),
    rows:Array.isArray(data?.rows)?data.rows:[],
    categories:Array.isArray(data?.categories)?data.categories:[],
    aliases:Array.isArray(data?.aliases)?data.aliases:[]
  },200,sourceHeaders);
  return reply(request,{
    earliest:String(data?.earliest||''),
    scopes:Array.isArray(data?.scopes)?data.scopes:[],
    rows:Array.isArray(data?.rows)?data.rows:[]
  },200,sourceHeaders);
}
export function OPTIONS(request){return locCorsPreflight(request);}
