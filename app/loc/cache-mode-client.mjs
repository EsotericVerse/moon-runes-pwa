'use client';

// Provider-neutral public cache policy; one tiny public DB row controls all web clients.
// No Cloudflare control-plane access, credentials, or deployment is needed to switch.
import {CACHE_POLICY} from './cache-policy.config.mjs';
import {applyRuntimeIoLimits} from './query-batch-size.mjs';

export const CACHE_MODE_OPTIONS=Object.freeze([
  {value:'off',label:'不開快取'},
  {value:'cache',label:'打開快取'},
  {value:'isr',label:'打開 ISR'}
]);
export const CACHE_POLICY_EVENT='loc-cache-policy-changed';
const CHOICE_KEY='loc-cache-choice-v1';
const DEFAULT_POLICY=Object.freeze({mode:'off',origin:''});
const PUBLIC_ORIGIN=/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
let policy=DEFAULT_POLICY;
let globalConfig=CACHE_POLICY;

export function normalizeCachePolicy(record){
  const mode=['off','cache','isr'].includes(record?.mode)?record.mode:'off';
  const origin=String(record?.origin||'').trim();
  return {mode:mode==='isr'&&(!origin||!PUBLIC_ORIGIN.test(origin))?'cache':mode,
    origin:PUBLIC_ORIGIN.test(origin)?origin:''};
}
export function browserCacheChoice(){
  const fallback={mode:globalConfig.mode,provider:globalConfig.provider};
  try{
    const choice=JSON.parse(window.localStorage.getItem(CHOICE_KEY)||'null');
    if(!CACHE_MODE_OPTIONS.some(item=>item.value===choice?.mode)
      ||!globalConfig.domains.some(item=>item.id===choice?.provider))return fallback;
    return {mode:choice.mode,provider:choice.provider};
  }catch{return fallback;}
}
function policyForChoice(choice){
  const domain=globalConfig.domains.find(item=>item.id===choice.provider);
  return normalizeCachePolicy({mode:choice.mode,origin:choice.mode==='isr'?domain?.origin:''});
}
export function setBrowserCacheChoice(choice){
  if(!CACHE_MODE_OPTIONS.some(item=>item.value===choice?.mode)
    ||!globalConfig.domains.some(item=>item.id===choice?.provider))
    throw Error('快取模式或 ISR 網域不正確');
  const effective=policyForChoice(choice);
  if(choice.mode==='isr'&&effective.mode!=='isr')
    throw Error('ISR 網域需為有效的 HTTPS 網址');
  window.localStorage.setItem(CHOICE_KEY,JSON.stringify({mode:choice.mode,provider:choice.provider}));
  return applyCachePolicy(effective);
}
export function resetBrowserCacheChoice(){
  window.localStorage.removeItem(CHOICE_KEY);
  return applyCachePolicy(policyForChoice({mode:globalConfig.mode,provider:globalConfig.provider}));
}
export function currentCachePolicy(){return policy;}
export function applyCachePolicy(next){
  policy=normalizeCachePolicy(next);
  if(typeof window!=='undefined')
    window.dispatchEvent(new CustomEvent(CACHE_POLICY_EVENT,{detail:policy}));
  return policy;
}
export function applyGlobalCacheConfig(record){
  const domains=Array.isArray(record?.isr_domains)?record.isr_domains:CACHE_POLICY.domains;
  const mode=record?.cache_mode||CACHE_POLICY.mode;
  const provider=record?.cache_provider||CACHE_POLICY.provider;
  globalConfig={...CACHE_POLICY,mode,provider,domains};
  if(record?.io_limits)applyRuntimeIoLimits(record.io_limits);
  return applyCachePolicy(policyForChoice({mode,provider}));
}
export async function loadCachePolicy(){
  try{
    const {readLocRuntimeConfig}=await import('./runtime-config.mjs');
    return applyGlobalCacheConfig(await readLocRuntimeConfig());
  }catch{
    return applyCachePolicy(policyForChoice({mode:globalConfig.mode,provider:globalConfig.provider}));
  }
}
