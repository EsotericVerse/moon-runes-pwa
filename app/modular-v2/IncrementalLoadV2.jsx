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
function isElementBottom(element){
  if(!element)return false;
  return Math.ceil(element.scrollTop+element.clientHeight)>=element.scrollHeight;
}

export default function IncrementalLoadV2({
  hasMore=false,
  loading=false,
  error=null,
  onLoadMore,
  cooldownMs=LIST_LOAD_COOLDOWN_MS,
  label='還有更多資料',
  scrollRootRef=null
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

    const root=scrollRootRef?.current||null;
    const updateBottom=()=>{atBottomRef.current=root?isElementBottom(root):isDocumentBottom();};
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
    const scrollTarget=root||window;
    const inputTarget=root||document;
    scrollTarget.addEventListener('scroll',updateBottom,{passive:true});
    inputTarget.addEventListener('wheel',onWheel,{passive:true,capture:true});
    inputTarget.addEventListener('touchend',onTouchEnd,{passive:true,capture:true});
    inputTarget.addEventListener('keydown',onKeyDown,true);
    return ()=>{
      scrollTarget.removeEventListener('scroll',updateBottom);
      inputTarget.removeEventListener('wheel',onWheel,true);
      inputTarget.removeEventListener('touchend',onTouchEnd,true);
      inputTarget.removeEventListener('keydown',onKeyDown,true);
    };
  },[hasMore,error,onLoadMore,scrollRootRef]);

  if(!hasMore)return null;
  return <div className={'scope-v2-load-sentinel'+(loading?' is-loading':'')} aria-live="polite">
    <span>{loading?'載入下一批…':'↓ '+label}</span>
  </div>;
}
