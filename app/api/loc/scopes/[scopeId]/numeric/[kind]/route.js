import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../../../../_cors';
import {createPublicSupabaseClient,validScopeId} from '../../../../_server';

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
  if(!validScopeId(scopeId)||['local','lrunes','admin'].includes(scopeId)||!['culture','statistics'].includes(kind))
    return withLocCors(Response.json({error:'Invalid numeric summary path'},{status:400}),request);
  let start,end,undated;
  try{
    const search=new URL(request.url).searchParams;
    if([...search.keys()].some(key=>!['start','end','undated'].includes(key)))throw Error('Unknown parameter');
    if(kind==='statistics'&&search.has('undated'))throw Error('Unexpected undated');
    if(search.has('undated')&&!['0','1'].includes(search.get('undated')))throw Error('Invalid undated');
    start=date(search.get('start'));
    end=date(search.get('end'));
    if(start&&end&&start>end)throw Error('Reversed date range');
    undated=kind==='culture'&&search.get('undated')==='1';
  }catch{return withLocCors(Response.json({error:'Invalid date range'},{status:400}),request);}
  const read=unstable_cache(async()=>{
    const db=createPublicSupabaseClient();
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
  },['loc-numeric-v1',kind,scopeId,start||'',end||'',undated?'1':'0'],{
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
