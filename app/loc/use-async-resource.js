'use client';

import useSWR,{useSWRConfig,unstable_serialize} from 'swr';
import useSWRInfinite,{unstable_serialize as serializeInfinite} from 'swr/infinite';
import {useMemo} from 'react';

// LOC reads are client-triggered resources: SWR owns request deduplication and
// the browser-session cache; these hooks expose a small shared status contract.
const infiniteResourceKeys=new Map();
export function useAsyncResource(keyOrOptions,fetcherArg,optionsArg={}){
  const legacy=keyOrOptions&&typeof keyOrOptions==='object'&&!Array.isArray(keyOrOptions);
  const key=legacy?keyOrOptions.queryKey:keyOrOptions;
  const fetcher=legacy?keyOrOptions.queryFn:fetcherArg;
  const options=legacy?keyOrOptions:optionsArg;
  const {enabled=true,queryKey,queryFn,...swrOptions}=options;
  const resource=useSWR(enabled?key:null,fetcher,swrOptions);
  return {
    ...resource,
    isPending:resource.isLoading,
    isFetching:resource.isValidating,
    isSuccess:resource.data!==undefined&&!resource.error,
    isError:Boolean(resource.error),
    refetch:()=>resource.mutate()
  };
}

export function useAsyncInfiniteResource({queryKey,queryFn,enabled=true,initialPageParam=null,getNextPageParam}){
  const getPageKey=(pageIndex,previousPage)=>{
    if(!enabled)return null;
    const pageParam=pageIndex===0?initialPageParam:getNextPageParam?.(previousPage);
    if(pageIndex>0&&pageParam===undefined)return null;
    return [...queryKey,{__locPage:true,index:pageIndex,param:pageParam}];
  };
  const serializedKey=serializeInfinite(getPageKey);
  if(enabled)infiniteResourceKeys.set(serializedKey,queryKey);
  const resource=useSWRInfinite(getPageKey,key=>queryFn({pageParam:key.at(-1).param}),{
    persistSize:false,
    revalidateFirstPage:false,
    revalidateAll:false
  });
  const pages=resource.data||[];
  const lastPage=pages.at(-1);
  return {
    ...resource,
    data:resource.data?{pages}:undefined,
    error:resource.error,
    isPending:resource.isLoading,
    isFetching:resource.isValidating,
    isFetchingNextPage:resource.isValidating&&resource.size>pages.length,
    isSuccess:resource.data!==undefined&&!resource.error,
    isError:Boolean(resource.error),
    hasNextPage:Boolean(lastPage&&getNextPageParam?.(lastPage)!==undefined),
    fetchNextPage:()=>resource.setSize(size=>size+1),
    refetch:()=>resource.mutate()
  };
}

function keyStartsWith(key,prefix){
  if(!Array.isArray(key)||!Array.isArray(prefix))return unstable_serialize(key)===unstable_serialize(prefix);
  return prefix.every((part,index)=>unstable_serialize(key[index])===unstable_serialize(part));
}

// Explicit resource controls for successful writes. SWR remains the only cache;
// no timer or background refetch is introduced here.
export function useResourceCache(){
  const {mutate,cache}=useSWRConfig();
  const inFlight=useMemo(()=>new Map(),[]);
  return useMemo(()=>{
    const matchingInfiniteKeys=queryKey=>[...infiniteResourceKeys]
      .filter(([,resourceKey])=>keyStartsWith(resourceKey,queryKey))
      .map(([serializedKey])=>serializedKey);
    const clearMatchingPages=(queryKey,revalidate)=>{
      const pageKeys=[...cache.keys()].filter(key=>{
        if(key.startsWith('$inf$'))return false;
        return keyStartsWith(cache.get(key)?._k,queryKey);
      });
      return Promise.all(pageKeys.map(key=>{
        const pageKey=cache.get(key)?._k;
        return pageKey?mutate(pageKey,()=>undefined,{populateCache:true,revalidate,throwOnError:false}):undefined;
      }));
    };
    return {
      // Clear regular and paginated values so the next visit fetches fresh data;
      // mounted consumers revalidate now through SWR.
      invalidate:async({queryKey})=>{
        const regular=mutate(key=>keyStartsWith(key,queryKey),()=>undefined,{populateCache:true,revalidate:true,throwOnError:false});
        const pages=clearMatchingPages(queryKey,false);
        const infinite=matchingInfiniteKeys(queryKey).map(key=>mutate(key,undefined,{revalidate:true,throwOnError:false}));
        await Promise.all([regular,pages,...infinite]);
      },
      revalidate:({queryKey})=>mutate(key=>keyStartsWith(key,queryKey)),
      getOrLoad:({queryKey,queryFn})=>{
        const cached=cache.get(unstable_serialize(queryKey))?.data;
        if(cached!==undefined)return Promise.resolve(cached);
        const cacheKey=unstable_serialize(queryKey);
        if(inFlight.has(cacheKey))return inFlight.get(cacheKey);
        const request=Promise.resolve().then(queryFn).then(
          value=>mutate(queryKey,value,{revalidate:false}),
          error=>{throw error}
        ).finally(()=>inFlight.delete(cacheKey));
        inFlight.set(cacheKey,request);
        return request;
      },
      set:(key,value)=>mutate(key,typeof value==='function'?value:()=>value,{revalidate:false}),
      get:key=>cache.get(unstable_serialize(key))?.data,
      clear:async({queryKey})=>{
        const regular=mutate(key=>keyStartsWith(key,queryKey),()=>undefined,{populateCache:true,revalidate:false,throwOnError:false});
        const pages=clearMatchingPages(queryKey,false);
        const infinite=matchingInfiniteKeys(queryKey).map(key=>mutate(key,undefined,{revalidate:false,throwOnError:false}));
        await Promise.all([regular,pages,...infinite]);
      }
    };
  },[mutate,cache,inFlight]);
}
