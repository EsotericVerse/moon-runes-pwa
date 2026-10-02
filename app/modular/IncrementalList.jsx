'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {DEFAULT_LIST_BATCH_SIZE,LIST_LOAD_COOLDOWN_MS} from '../loc/list-loading-contract.mjs';

function IncrementalLoad({
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
    },{root:scrollRootRef?.current||null,threshold:1});
    observer.observe(sentinel);
    return()=>observer.disconnect();
  },[hasMore,error,onLoadMore,cooldownMs,scrollRootRef]);

  if(!hasMore)return null;
  return <div ref={sentinelRef} className={'scope-load-sentinel'+(loading?' is-loading':'')} aria-live="polite">
    <span>{loading?'…':label}</span>
  </div>;
}

export default function IncrementalList({
  items=[],
  renderItem,
  batchSize=DEFAULT_LIST_BATCH_SIZE,
  resetKey='',
  className='scope-list',
  empty=null,
  externalHasMore=false,
  loading=false,
  error=null,
  onLoadMore=null,
  scrollRootRef=null,
  onVisibleItemsChange=null
}){
  const size=Math.max(1,Math.floor(Number(batchSize)||DEFAULT_LIST_BATCH_SIZE));
  const source=Array.isArray(items)?items:[];
  const [visibleCount,setVisibleCount]=useState(()=>Math.min(size,source.length));
  const pendingExternalRef=useRef(false);

  useEffect(()=>{
    pendingExternalRef.current=false;
    setVisibleCount(Math.min(size,source.length));
  },[resetKey,size]);

  useEffect(()=>{
    if(source.length>0&&visibleCount===0&&!pendingExternalRef.current){
      setVisibleCount(Math.min(size,source.length));
      return;
    }
    if(visibleCount>source.length){
      setVisibleCount(Math.min(size,source.length));
      pendingExternalRef.current=false;
      return;
    }
    if(pendingExternalRef.current&&source.length>visibleCount){
      setVisibleCount(count=>Math.min(source.length,count+size));
      pendingExternalRef.current=false;
    }
  },[source.length,size,visibleCount]);

  const hasBuffered=visibleCount<source.length;
  const hasMore=hasBuffered||Boolean(externalHasMore);
  const visible=useMemo(()=>source.slice(0,visibleCount),[source,visibleCount]);

  useEffect(()=>{
    if(typeof onVisibleItemsChange==='function')onVisibleItemsChange(visible);
  },[visible,onVisibleItemsChange]);

  const loadMore=()=>{
    if(loading)return;
    if(hasBuffered){
      setVisibleCount(count=>Math.min(source.length,count+size));
      return;
    }
    if(externalHasMore&&typeof onLoadMore==='function'){
      pendingExternalRef.current=true;
      onLoadMore();
    }
  };

  if(!source.length&&!loading&&!externalHasMore)return empty;
  const loader=<IncrementalLoad
    hasMore={hasMore}
    loading={loading}
    error={error}
    onLoadMore={loadMore}
    label="…"
    scrollRootRef={scrollRootRef}
  />;
  return <>
    <div ref={scrollRootRef||undefined} className={className}>
      {visible.map((item,index)=>renderItem(item,index))}
      {scrollRootRef?loader:null}
    </div>
    {!scrollRootRef?loader:null}
  </>;
}
