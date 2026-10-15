'use client';
import {useUiLocale} from '../i18n/ui-locale';
import {translateUiField} from '../i18n/ui-functional-copy.mjs';

import {useCallback,useEffect,useRef,useState} from 'react';

// Arrows are present only when the content cannot fit the available row.
// The rail remains touch-scrollable, keyboard accessible and never wraps.
export default function ScrollableScopeNav({children,resetKey='',label='導覽入口'}){
  const {locale}=useUiLocale();
  const text=x=>translateUiField(locale,x);
  const localizedLabel=label==='導覽入口'?text('導覽入口'):label;
  const viewport=useRef(null);
  const [position,setPosition]=useState({overflow:false,left:false,right:false});
  const measure=useCallback(()=>{
    const node=viewport.current;
    if(!node)return;
    const limit=node.scrollWidth-node.clientWidth;
    setPosition({
      overflow:limit>2,
      left:node.scrollLeft>2,
      right:limit-node.scrollLeft>2
    });
  },[]);
  useEffect(()=>{
    const node=viewport.current;
    if(!node)return;
    measure();
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
    observer?.observe(node);
    if(node.firstElementChild)observer?.observe(node.firstElementChild);
    window.addEventListener('resize',measure);
    return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
  },[measure,resetKey]);
  useEffect(()=>{viewport.current?.scrollTo({left:0});measure();},[resetKey,measure]);
  const move=direction=>{
    const node=viewport.current;
    if(!node)return;
    const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollBy({left:direction*Math.max(node.clientWidth*.75,120),behavior:reduce?'instant':'smooth'});
  };
  return <div className="scope-nav-rail">
    {position.overflow?<button type="button" className="scope-nav-arrow"
      aria-label={localizedLabel+' '+text('向左捲動')} disabled={!position.left} onClick={()=>move(-1)}>{'<<'}</button>:null}
    <div ref={viewport} className="scope-nav-viewport" role="group" aria-label={localizedLabel}
      onScroll={measure} tabIndex={position.overflow?0:undefined}>
      <div className="scope-nav-items">{children}</div>
    </div>
    {position.overflow?<button type="button" className="scope-nav-arrow"
      aria-label={localizedLabel+' '+text('向右捲動')} disabled={!position.right} onClick={()=>move(1)}>{'>>'}</button>:null}
  </div>;
}
