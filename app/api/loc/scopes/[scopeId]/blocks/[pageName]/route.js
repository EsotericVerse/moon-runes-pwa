import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../../../../_cors';
import {LOC_ISR_SECONDS,LOC_PUBLIC_CACHE_TAG,readPublicScopeBlocks,validPageName,validScopeId} from '../../../../_server';

export const revalidate=1209600;

export async function GET(request,{params}){
  const {scopeId,pageName}=await params;
  if(!validScopeId(scopeId)||!validPageName(pageName))return withLocCors(Response.json({error:'Invalid public content path'},{status:400}),request);
  const readBlocks=unstable_cache(()=>readPublicScopeBlocks(scopeId,pageName),['loc-scope-blocks-v1',scopeId,pageName],{
    revalidate:LOC_ISR_SECONDS,tags:[LOC_PUBLIC_CACHE_TAG]
  });
  try{return withLocCors(Response.json(await readBlocks()),request);}
  catch{return withLocCors(Response.json({error:'Scope blocks unavailable'},{status:502}),request);}
}

export function OPTIONS(request){return locCorsPreflight(request);}
