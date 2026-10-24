import {unstable_cache,revalidateTag} from 'next/cache';

// Provider-neutral Next.js ISR policy. Cloudflare supplies persistent cache via
// OpenNext/R2; Vercel supplies Next.js' platform-native incremental cache.
export const LOC_ISR_SECONDS=14*24*60*60;
export const LOC_PUBLIC_CACHE_TAG='loc-public-metadata';

// Only cache public metadata. Article bodies and authenticated reads continue
// through their existing uncached paths and authorization boundaries.
export function cacheLocPublicMetadata(read,keyParts){
  return unstable_cache(read,keyParts,{
    revalidate:LOC_ISR_SECONDS,
    tags:[LOC_PUBLIC_CACHE_TAG]
  });
}

// Called only after /api/loc/revalidate has authenticated an editor and
// verified management permissions. No provider-specific cache API or DNS call.
export function invalidateLocPublicMetadata(){
  revalidateTag(LOC_PUBLIC_CACHE_TAG,{expire:0});
}
