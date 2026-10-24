import {unstable_cache} from 'next/cache';
import {LOC_ISR_SECONDS,LOC_PUBLIC_CACHE_TAG,readPublicScopeBlocks,validPageName,validScopeId} from '../../../../_server';

export const revalidate=1209600;

export async function GET(_request,{params}){
  const {scopeId,pageName}=await params;
  if(!validScopeId(scopeId)||!validPageName(pageName))return Response.json({error:'Invalid public content path'},{status:400});
  const readBlocks=unstable_cache(()=>readPublicScopeBlocks(scopeId,pageName),['loc-scope-blocks-v1',scopeId,pageName],{
    revalidate:LOC_ISR_SECONDS,tags:[LOC_PUBLIC_CACHE_TAG]
  });
  try{return Response.json(await readBlocks());}
  catch{return Response.json({error:'Scope blocks unavailable'},{status:502});}
}
