import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../../../../_cors';
import {createPublicSupabaseClient,validScopeId} from '../../../../_server';
import {StatisticsFacets} from '../../../../../../loc/statistics-facets';

// Only public numeric summaries are cached; not Blocks, search or row contents.
export const revalidate=3600;
export const LOC_NUMERIC_CACHE_TAG='loc-numeric-summaries-v1';
const DAY=/^\d{4}-\d{2}-\d{2}$/;
function date(value){
  if(!value)return null;
  if(!DAY.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z')))
    throw new Error('Invalid date');
  return value;
}

export async function GET(request,{params}){
  const {scopeId,kind}=await params;
  if(!validScopeId(scopeId)||['local','admin'].includes(scopeId)||!['culture','statistics','facet'].includes(kind))
    return withLocCors(Response.json({error:'Invalid numeric summary path'},{status:400}),request);
  let start,end,undated,dimension='';
  try{
    const search=new URL(request.url).searchParams;
    if([...search.keys()].some(key=>!['start','end','undated','dimension'].includes(key)))throw Error('Unknown parameter');
    dimension=search.get('dimension')||'';
    if(kind==='facet'?!['media_type','media_platform'].includes(dimension):Boolean(dimension))throw Error('Invalid facet dimension');
    if(kind==='facet'&&search.has('undated'))throw Error('Unexpected undated');
    if(kind==='statistics'&&search.has('undated'))throw Error('Unexpected undated');
    if(search.has('undated')&&!['0','1'].includes(search.get('undated')))throw Error('Invalid undated');
    start=date(search.get('start'));
    end=date(search.get('end'));
    if(start&&end&&start>end)throw Error('Reversed date range');
    undated=kind==='culture'&&search.get('undated')==='1';
  }catch{return withLocCors(Response.json({error:'Invalid date range'},{status:400}),request);}
  const read=unstable_cache(async()=>{
    const db=createPublicSupabaseClient();
    if(kind==='facet'){
      // The worker caches only per-day counts; public Media rows never leave this server route.
      const totals=new Map();
      let from=0;
      for(;;){
        let q=db.from(scopeId+'_galaxy_media')
          .select('media_id,media_type,url,source_place,meta_tags,createtime')
          .order('media_id',{ascending:true}).range(from,from+65534);
        if(start)q=q.gte('createtime',start+'T00:00:00+08:00');
        if(end)q=q.lte('createtime',end+'T23:59:59.999+08:00');
        const {data,error}=await q;
        if(error)throw error;
        const rows=Array.isArray(data)?data:[];
        for(const row of StatisticsFacets.base.mediaFacetDaily(rows,dimension)){
          const key=row.day+'\u0000'+row.category.normalize('NFKC').toLocaleLowerCase();
          const stored=totals.get(key);
          if(stored)stored.item_count+=row.item_count;
          else totals.set(key,{...row});
        }
        from+=rows.length;
        if(rows.length<65535)break;
      }
      return [...totals.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
    }
    const name=kind==='culture'?'read_scope_statistics':'read_scope_overview';
    const args=kind==='culture'
      ?{p_scope_id:scopeId,p_start:start,p_end:end,p_include_undated:undated}
      :{p_scope_id:scopeId,p_start:start,p_end:end};
    const {data,error}=await db.rpc(name,args);
    if(error)throw error;
    if(kind==='culture'){
      if(!Array.isArray(data))throw Error('Invalid culture numeric result');
      return data;
    }
    if(!data||!Array.isArray(data.rows))throw Error('Invalid statistics numeric result');
    return {
      earliest:String(data.earliest||'').slice(0,10),
      rows:data.rows,
      categories:Array.isArray(data.categories)?data.categories:[],
      aliases:Array.isArray(data.aliases)?data.aliases:[]
    };
  },['loc-numeric-v2',kind,scopeId,start||'',end||'',undated?'1':'0',dimension],{
    revalidate,tags:[LOC_NUMERIC_CACHE_TAG]
  });
  try{
    return withLocCors(Response.json(await read(),{headers:{
      'Cache-Control':'no-store',
      'X-LOC-Numeric-ISR':'server-cache'
    }}),request);
  }catch{
    return withLocCors(Response.json({error:'Numeric summary unavailable'},{
      status:502,headers:{'Cache-Control':'no-store'}
    }),request);
  }
}
export function OPTIONS(request){return locCorsPreflight(request);}
