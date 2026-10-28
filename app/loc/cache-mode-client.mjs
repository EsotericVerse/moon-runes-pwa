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
const CHOICE_KEY='loc-cache-choice-v1';
const DEFAULT_POLICY=Object.freeze({mode:'off',origin:''});
const PUBLIC_ORIGIN=/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
let policy=DEFAULT_POLICY;

export function normalizeCachePolicy(record){
  const mode=['off','cache','isr'].includes(record?.mode)?record.mode:'off';
  const origin=String(record?.origin||'').trim();
  return {mode:mode==='isr'&&(!origin||!PUBLIC_ORIGIN.test(origin))?'cache':mode,
    origin:PUBLIC_ORIGIN.test(origin)?origin:''};
}
export function browserCacheChoice(){
  const fallback={mode:CACHE_POLICY.mode,provider:CACHE_POLICY.provider};
  try{
    const choice=JSON.parse(window.localStorage.getItem(CHOICE_KEY)||'null');
    if(!CACHE_MODE_OPTIONS.some(item=>item.value===choice?.mode)
      ||!CACHE_POLICY.domains.some(item=>item.id===choice?.provider))return fallback;
    return {mode:choice.mode,provider:choice.provider};
  }catch{return fallback;}
}
function policyForChoice(choice){
  const domain=CACHE_POLICY.domains.find(item=>item.id===choice.provider);
  return normalizeCachePolicy({mode:choice.mode,origin:choice.mode==='isr'?domain?.origin:''});
}
export function setBrowserCacheChoice(choice){
  if(!CACHE_MODE_OPTIONS.some(item=>item.value===choice?.mode)
    ||!CACHE_POLICY.domains.some(item=>item.id===choice?.provider))
    throw Error('快取模式或 ISR 網域不正確');
  const effective=policyForChoice(choice);
  if(choice.mode==='isr'&&effective.mode!=='isr')throw Error('ISR 網域需為有效的 HTTPS 網址');
  window.localStorage.setItem(CHOICE_KEY,JSON.stringify({mode:choice.mode,provider:choice.provider}));
  return applyCachePolicy(effective);
}
export function resetBrowserCacheChoice(){
  window.localStorage.removeItem(CHOICE_KEY);
  return applyCachePolicy(policyForChoice(browserCacheChoice()));
}
export function currentCachePolicy(){return policy;}
export function applyCachePolicy(next){
  policy=normalizeCachePolicy(next);
  if(typeof window!=='undefined')
    window.dispatchEvent(new CustomEvent(CACHE_POLICY_EVENT,{detail:policy}));
  return policy;
}
// The JS config remains the cross-device default; browser choices are local only.
export async function loadCachePolicy(){
  return applyCachePolicy(policyForChoice(browserCacheChoice()));
}
