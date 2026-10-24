import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../../../_cors';
import {LOC_ISR_SECONDS,LOC_PUBLIC_CACHE_TAG,readPublicScopeConfig,validScopeId} from '../../../_server';

export const revalidate=1209600;

export async function GET(request,{params}){
  const {scopeId}=await params;
  if(!validScopeId(scopeId))return withLocCors(Response.json({error:'Invalid Scope ID'},{status:400}),request);
  const readConfig=unstable_cache(()=>readPublicScopeConfig(scopeId),['loc-scope-config-v3',scopeId],{
    revalidate:LOC_ISR_SECONDS,tags:[LOC_PUBLIC_CACHE_TAG]
  });
  try{return withLocCors(Response.json(await readConfig()),request);}
  catch{return withLocCors(Response.json({error:'Scope config unavailable'},{status:502}),request);}
}

export function OPTIONS(request){return locCorsPreflight(request);}
