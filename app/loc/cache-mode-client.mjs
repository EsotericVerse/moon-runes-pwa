'use client';

// Provider-neutral public cache policy; one tiny public DB row controls all web clients.
// No Cloudflare control-plane access, credentials, or deployment is needed to switch.
import {dbPublicClient} from './db-client.mjs';

export const CACHE_MODE_OPTIONS=Object.freeze([
  {value:'off',label:'不開快取'},
  {value:'cache',label:'打開快取'},
  {value:'isr',label:'打開 ISR'}
]);
export const CACHE_POLICY_EVENT='loc-cache-policy-changed';
const POLICY_REFRESH_MS=30_000;
const DEFAULT_POLICY=Object.freeze({mode:'off',origin:''});
const PUBLIC_ORIGIN=/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
let policy=DEFAULT_POLICY;
let lastFetch=0;
let inFlight=null;

export function normalizeCachePolicy(record){
  const mode=['off','cache','isr'].includes(record?.mode)?record.mode:'off';
  const origin=String(record?.origin||'').trim();
  return {mode:mode==='isr'&&(!origin||!PUBLIC_ORIGIN.test(origin))?'cache':mode,
    origin:PUBLIC_ORIGIN.test(origin)?origin:''};
}
export function currentCachePolicy(){return policy;}
export function applyCachePolicy(next){
  policy=normalizeCachePolicy(next);
  lastFetch=Date.now();
  if(typeof window!=='undefined')
    window.dispatchEvent(new CustomEvent(CACHE_POLICY_EVENT,{detail:policy}));
  return policy;
}
export async function loadCachePolicy({force=false}={}){
  if(!force&&lastFetch&&Date.now()-lastFetch<POLICY_REFRESH_MS)return policy;
  if(inFlight)return inFlight;
  inFlight=(async()=>{
    try{
      const {data,error}=await dbPublicClient.schema('silver').from('loc_cache_runtime')
        .select('mode,origin').eq('id',1).maybeSingle();
      if(error||!data)throw new Error(error?.message||'Cache policy row not available');
      return applyCachePolicy(data);
    }catch{
      // Missing configuration/primary connectivity must never activate ISR.
      // Safe default: no optional cache, normal direct database queries.
      return applyCachePolicy(DEFAULT_POLICY);
    }finally{inFlight=null;}
  })();
  return inFlight;
}
