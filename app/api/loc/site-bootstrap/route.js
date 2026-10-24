import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../_cors';
import {createPublicSupabaseClient,LOC_ISR_SECONDS,LOC_PUBLIC_CACHE_TAG} from '../_server';

export const revalidate=1209600;

const readSiteBootstrap=unstable_cache(async()=>{
  const client=createPublicSupabaseClient();
  const {data,error}=await client.rpc('read_app_bootstrap',{p_scope_id:'loc',p_page_name:'index'});
  if(error)throw error;
  return data||{};
},['loc-site-bootstrap-v3'],{revalidate:LOC_ISR_SECONDS,tags:[LOC_PUBLIC_CACHE_TAG]});

export async function GET(request){
  try{return withLocCors(Response.json(await readSiteBootstrap()),request);}
  catch{return withLocCors(Response.json({error:'Public site bootstrap unavailable'},{status:502}),request);}
}

export function OPTIONS(request){return locCorsPreflight(request);}
