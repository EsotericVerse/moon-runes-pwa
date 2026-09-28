'use client';

import {useEffect,useRef} from 'react';
import {LIST_LOAD_COOLDOWN_MS} from './list-loading.v2';

const DOWN_KEYS=new Set(['ArrowDown','PageDown','End',' ']);

function isDocumentBottom(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  const doc=document.documentElement;
  const body=document.body;
  const height=Math.max(
    Number(doc?.scrollHeight)||0,
    Number(body?.scrollHeight)||0
  );
  return Math.ceil(window.scrollY+window.innerHeight)>=height;
}

export default function IncrementalLoadV2({
  hasMore=false,
  loading=false,
  error=null,
  onLoadMore,
  cooldownMs=LIST_LOAD_COOLDOWN_MS,
  label='還有更多資料'
}){
  const busyRef=useRef(Boolean(loading));
  const readyAtRef=useRef(Date.now()+cooldownMs);
  const atBottomRef=useRef(false);

  useEffect(()=>{
    busyRef.current=Boolean(loading);
    if(!loading)readyAtRef.current=Date.now()+Math.max(0,Number(cooldownMs)||0);
  },[loading,cooldownMs]);

  useEffect(()=>{
    if(!hasMore||typeof onLoadMore!=='function')return undefined;

    const updateBottom=()=>{atBottomRef.current=isDocumentBottom();};
    const maybeLoad=()=>{
      updateBottom();
      if(!atBottomRef.current||busyRef.current||error||Date.now()<readyAtRef.current)return;
      atBottomRef.current=false;
      onLoadMore();
    };
    const onWheel=event=>{
      if(Number(event.deltaY)<=0)return;
      maybeLoad();
    };
    const onTouchEnd=()=>maybeLoad();
    const onKeyDown=event=>{
      if(!DOWN_KEYS.has(event.key))return;
      maybeLoad();
    };

    updateBottom();
    window.addEventListener('scroll',updateBottom,{passive:true});
    document.addEventListener('wheel',onWheel,{passive:true,capture:true});
    document.addEventListener('touchend',onTouchEnd,{passive:true,capture:true});
    document.addEventListener('keydown',onKeyDown,true);
    return ()=>{
      window.removeEventListener('scroll',updateBottom);
      document.removeEventListener('wheel',onWheel,true);
      document.removeEventListener('touchend',onTouchEnd,true);
      document.removeEventListener('keydown',onKeyDown,true);
    };
  },[hasMore,error,onLoadMore]);

  if(!hasMore)return null;
  return <div className={'scope-v2-load-sentinel'+(loading?' is-loading':'')} aria-live="polite">
    <span>{loading?'載入下一批…':'↓ '+label}</span>
  </div>;
}
