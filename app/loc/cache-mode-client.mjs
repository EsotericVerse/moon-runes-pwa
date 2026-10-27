'use client';
import {STATIC_CACHE_POLICY} from './cache-mode-static.mjs';
export const CACHE_MODE_OPTIONS=Object.freeze([
  {value:'off',label:'不開快取'},
  {value:'cache',label:'打開快取'},
  {value:'isr',label:'打開 ISR'}
]);
export const CACHE_POLICY_EVENT='loc-cache-policy-changed';
const PUBLIC_ORIGIN=/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
export function normalizeCachePolicy(record){
  const mode=['off','cache','isr'].includes(record?.mode)?record.mode:'off';
  const origin=String(record?.origin||'').trim();
  return {mode:mode==='isr'&&(!origin||!PUBLIC_ORIGIN.test(origin))?'cache':mode,
    origin:PUBLIC_ORIGIN.test(origin)?origin:''};
}
export function currentCachePolicy(){return STATIC_CACHE_POLICY;}
export function applyCachePolicy(){return STATIC_CACHE_POLICY;}
export async function loadCachePolicy(){return STATIC_CACHE_POLICY;}
