import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../../../_cors';
import {createPublicSupabaseClient,LOC_ISR_SECONDS,LOC_CHART_CACHE_TAG,validScopeId} from '../../../_server';
import {StatisticsFacets} from '../../../../../loc/statistics-facets';

export const dynamic='force-dynamic';

function queryDay(value){
  const day=String(value||'');
  return !day?null:/^\d{4}-\d{2}-\d{2}$/.test(day)?day:undefined;
}

async function readChart(scopeId,metric,start,end,undated,dimension){
  const client=createPublicSupabaseClient();
  if(metric==='daily'){
    const {data,error}=await client.rpc('read_scope_statistics',{
      p_scope_id:scopeId,p_start:start,p_end:end,p_include_undated:undated
    });
    if(error)throw error;
    return Array.isArray(data)?data:[];
  }
  if(metric==='overview'){
    const {data,error}=await client.rpc('read_scope_overview',{
      p_scope_id:scopeId,p_start:start,p_end:end
    });
    if(error)throw error;
    return {earliest:data?.earliest||'',rows:data?.rows||[],
      categories:data?.categories||[],aliases:data?.aliases||[]};
  }
  if(metric==='loc'&&scopeId==='loc'){
    const {data,error}=await client.rpc('read_loc_statistics',{p_start:start,p_end:end});
    if(error)throw error;
    return {earliest:data?.earliest||'',scopes:data?.scopes||[],rows:data?.rows||[]};
  }
  if(metric==='facet'&&['media_type','media_platform','media_style'].includes(dimension)){
    // Return only chart numbers: never persist raw media rows in the ISR cache.
    const totals=new Map();
    let from=0;
    for(;;){
      let query=client.from(scopeId+'_galaxy_media')
        .select('media_id,media_type,url,source_place,meta_tags,createtime')
        .order('media_id',{ascending:true}).range(from,from+65534);
      if(start)query=query.gte('createtime',start+'T00:00:00+08:00');
      if(end)query=query.lte('createtime',end+'T23:59:59.999+08:00');
      const {data,error}=await query;
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      for(const row of StatisticsFacets.base.mediaFacetDaily(rows,dimension)){
        const key=row.day+'\u0000'+row.category.normalize('NFKC').toLocaleLowerCase();
        const previous=totals.get(key);
        if(previous)previous.item_count+=row.item_count;
        else totals.set(key,{...row});
      }
      from+=rows.length;
      if(rows.length<65535)break;
    }
    return [...totals.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
  }
  throw new Error('Unsupported chart metric');
}

export async function GET(request,{params}){
  const {scopeId,metric}=await params;
  const url=new URL(request.url);
  const start=queryDay(url.searchParams.get('start'));
  const end=queryDay(url.searchParams.get('end'));
  const undated=url.searchParams.get('undated')==='1';
  const dimension=url.searchParams.get('dimension')||'';
  if(!validScopeId(scopeId)||!['daily','overview','loc','facet'].includes(metric)||
      start===undefined||end===undefined||(start&&end&&start>end)||
      (metric==='loc'&&scopeId!=='loc')||
      (metric==='facet'&&!['media_type','media_platform','media_style'].includes(dimension))){
    return withLocCors(Response.json({error:'Invalid public chart request'},{status:400}),request);
  }
  const key=[scopeId,metric,start||'',end||'',undated?'1':'0',dimension];
  const read=unstable_cache(()=>readChart(scopeId,metric,start,end,undated,dimension),
    ['loc-chart-v1',...key],{revalidate:LOC_ISR_SECONDS,tags:[LOC_CHART_CACHE_TAG]});
  try{
    const response=Response.json(await read());
    response.headers.set('Cache-Control','no-store');
    return withLocCors(response,request);
  }catch{
    return withLocCors(Response.json({error:'Public chart numbers unavailable'},{status:502}),request);
  }
}

export function OPTIONS(request){return locCorsPreflight(request);}
