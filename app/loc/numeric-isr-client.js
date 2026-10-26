'use client';

// Provider-independent optional remote numeric acceleration. Never a hard
// dependency: callers retain their existing direct DB/RPC fallback.
import {currentCachePolicy} from './cache-mode-client.mjs';

const ID=/^[a-z][a-z0-9]{0,14}$/;
const KINDS=new Set(['culture','statistics','earliest','loc-statistics','facet']);
export function usesNumericIsr(scopeId){
  const config=currentCachePolicy();
  return config.mode==='isr'&&Boolean(config.origin)&&ID.test(String(scopeId||''))&&scopeId!=='local';
}

export async function readNumericIsr(scopeId,kind,params={}){
  if(!usesNumericIsr(scopeId)||!KINDS.has(kind))throw new Error('ISR unavailable: use direct data provider');
  const config=currentCachePolicy();
  const url=new URL('/api/loc/scopes/'+scopeId+'/numeric/'+kind,config.origin);
  for(const key of ['startDate','endDate','dimension']){
    if(params[key])url.searchParams.set(key,String(params[key]));
  }
  if(params.includeUndated)url.searchParams.set('includeUndated','true');
  const response=await fetch(url.href,{credentials:'omit',headers:{Accept:'application/json'},
    signal:AbortSignal.timeout(2500)});
  if(!response.ok)throw new Error('ISR HTTP '+response.status);
  const data=await response.json();
  if(data===null||data===undefined||typeof data!=='object')
    throw new Error('Invalid ISR response');
  return data;
}
