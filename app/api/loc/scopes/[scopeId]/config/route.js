import {unstable_cache} from 'next/cache';
import {LOC_ISR_SECONDS,LOC_PUBLIC_CACHE_TAG,readPublicScopeConfig,validScopeId} from '../../../_server';

export const revalidate=1209600;

export async function GET(_request,{params}){
  const {scopeId}=await params;
  if(!validScopeId(scopeId))return Response.json({error:'Invalid Scope ID'},{status:400});
  const readConfig=unstable_cache(()=>readPublicScopeConfig(scopeId),['loc-scope-config-v3',scopeId],{
    revalidate:LOC_ISR_SECONDS,tags:[LOC_PUBLIC_CACHE_TAG]
  });
  try{return Response.json(await readConfig());}
  catch{return Response.json({error:'Scope config unavailable'},{status:502});}
}
