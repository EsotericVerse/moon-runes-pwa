import {unstable_cache} from 'next/cache';
import {createPublicSupabaseClient,LOC_ISR_SECONDS,LOC_PUBLIC_CACHE_TAG} from '../_server';

export const revalidate=1209600;

const readSiteBootstrap=unstable_cache(async()=>{
  const client=createPublicSupabaseClient();
  const {data,error}=await client.rpc('read_app_bootstrap',{p_scope_id:'loc',p_page_name:'index'});
  if(error)throw error;
  return data||{};
},['loc-site-bootstrap-v1'],{revalidate:LOC_ISR_SECONDS,tags:[LOC_PUBLIC_CACHE_TAG]});

export async function GET(){
  try{return Response.json(await readSiteBootstrap());}
  catch{return Response.json({error:'Public site bootstrap unavailable'},{status:502});}
}
