'use client';

// Provider-neutral public cache policy; one tiny public DB row controls all web clients.
// No Cloudflare control-plane access, credentials, or deployment is needed to switch.
import {CACHE_POLICY} from './cache-policy.config.mjs';

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
// Policy is a static JS config (app/loc/cache-policy.config.mjs); no database read.
export async function loadCachePolicy(){
  return applyCachePolicy(CACHE_POLICY);
}
