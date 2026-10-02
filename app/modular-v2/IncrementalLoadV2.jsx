'use client';

import {useEffect,useRef} from 'react';
import {LIST_LOAD_COOLDOWN_MS} from '../loc/list-loading-contract.mjs';

export default function IncrementalLoadV2({
  hasMore=false,
  loading=false,
  error=null,
  onLoadMore,
  cooldownMs=LIST_LOAD_COOLDOWN_MS,
  label='…',
  scrollRootRef=null
}){
  const sentinelRef=useRef(null);
  const loadingRef=useRef(Boolean(loading));
  const readyAtRef=useRef(0);

  useEffect(()=>{loadingRef.current=Boolean(loading);},[loading]);

  useEffect(()=>{
    const sentinel=sentinelRef.current;
    if(!hasMore||!sentinel||typeof onLoadMore!=='function')return undefined;

    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      const now=Date.now();
      if(loadingRef.current||error||now<readyAtRef.current)return;
      readyAtRef.current=now+Math.max(0,Number(cooldownMs)||0);
      onLoadMore();
    },{
      root:scrollRootRef?.current||null,
      threshold:1
    });

    observer.observe(sentinel);
    return()=>observer.disconnect();
  },[hasMore,error,onLoadMore,cooldownMs,scrollRootRef]);

  if(!hasMore)return null;
  return <div
    ref={sentinelRef}
    className={'scope-v2-load-sentinel'+(loading?' is-loading':'')}
    aria-live="polite"
  >
    <span>{loading?'…':label}</span>
  </div>;
}
