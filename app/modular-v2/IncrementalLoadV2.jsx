'use client';

import {useEffect,useRef} from 'react';
import {LIST_LOAD_COOLDOWN_MS} from './list-loading.v2';

const DOWN_KEYS=new Set(['ArrowDown','PageDown','End',' ']);

export default function IncrementalLoadV2({
  hasMore=false,
  loading=false,
  error=null,
  onLoadMore,
  cooldownMs=LIST_LOAD_COOLDOWN_MS,
  label='還有更多資料'
}){
  const sentinelRef=useRef(null);
  const visibleRef=useRef(false);
  const busyRef=useRef(Boolean(loading));
  const readyAtRef=useRef(Date.now()+cooldownMs);
  const armedRef=useRef(false);

  useEffect(()=>{
    busyRef.current=Boolean(loading);
    if(!loading){
      readyAtRef.current=Date.now()+Math.max(0,Number(cooldownMs)||0);
      armedRef.current=false;
    }
  },[loading,cooldownMs]);

  useEffect(()=>{
    if(!hasMore||!sentinelRef.current)return undefined;
    const observer=new IntersectionObserver(entries=>{
      visibleRef.current=entries.some(entry=>entry.isIntersecting);
    },{root:null,rootMargin:'0px 0px 120px 0px',threshold:0.01});
    observer.observe(sentinelRef.current);
    return ()=>observer.disconnect();
  },[hasMore]);

  useEffect(()=>{
    if(!hasMore||typeof onLoadMore!=='function')return undefined;
    const maybeLoad=()=>{
      if(!visibleRef.current||busyRef.current||error||Date.now()<readyAtRef.current||!armedRef.current)return;
      armedRef.current=false;
      onLoadMore();
    };
    const markIntent=event=>{
      if(event?.type==='wheel'&&Number(event.deltaY)<=0)return;
      if(event?.type==='keydown'&&!DOWN_KEYS.has(event.key))return;
      armedRef.current=true;
      maybeLoad();
    };
    document.addEventListener('wheel',markIntent,{passive:true,capture:true});
    document.addEventListener('touchmove',markIntent,{passive:true,capture:true});
    document.addEventListener('scroll',markIntent,true);
    document.addEventListener('keydown',markIntent,true);
    return ()=>{
      document.removeEventListener('wheel',markIntent,true);
      document.removeEventListener('touchmove',markIntent,true);
      document.removeEventListener('scroll',markIntent,true);
      document.removeEventListener('keydown',markIntent,true);
    };
  },[hasMore,error,onLoadMore]);

  if(!hasMore)return null;
  return <div ref={sentinelRef} className={'scope-v2-load-sentinel'+(loading?' is-loading':'')} aria-live="polite">
    <span>{loading?'載入下一批…':'↓ '+label}</span>
  </div>;
}
