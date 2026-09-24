'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {DAILY_RUNE_PAGE_SIZE,selectDailyRuneDraws} from '../../loc/neon-daily-runes';

function formatDate(value){
  const date=String(value||'').slice(0,10);
  return date.replaceAll('-','/');
}

export default function DailyLogClient(){
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [hasMore,setHasMore]=useState(true);
  const offsetRef=useRef(0);
  const loadingRef=useRef(false);
  const sentinelRef=useRef(null);

  const loadNext=useCallback(async()=>{
    if(loadingRef.current||!hasMore)return;
    loadingRef.current=true;
    setLoading(true);
    setError('');
    try{
      const next=await selectDailyRuneDraws({offset:offsetRef.current,limit:DAILY_RUNE_PAGE_SIZE});
      offsetRef.current+=next.length;
      setRows(current=>[...current,...next]);
      setHasMore(next.length===DAILY_RUNE_PAGE_SIZE);
    }catch(reason){
      setError(String(reason?.message||reason||'讀取每日符文紀錄失敗。'));
    }finally{
      loadingRef.current=false;
      setLoading(false);
    }
  },[hasMore]);

  useEffect(()=>{loadNext();},[loadNext]);

  useEffect(()=>{
    const sentinel=sentinelRef.current;
    if(!sentinel||!hasMore||error)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))loadNext();
    },{rootMargin:'240px 0px'});
    observer.observe(sentinel);
    return ()=>observer.disconnect();
  },[error,hasMore,loadNext]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">每日抽籤紀錄</p>
      <h1>每日符文抽籤紀錄</h1>
      <p>每日抽籤紀錄。藉由此來查趨勢。</p>
    </header>
    <div className="loc-context-list">
      {rows.map((row,index)=><article className="loc-card" key={`${row.record_date}-${row.draw_kind}-${index}`}>
        <div className="loc-result-meta"><span>{row.draw_kind==='supplement'?'補抽':'每日主抽'}</span><span>{formatDate(row.record_date)}</span></div>
        <h2>{row.rune_name}・{row.direction}</h2>
      </article>)}
      {!loading&&!error&&!rows.length?<article className="loc-card">目前沒有每日符文紀錄。</article>:null}
    </div>
    {error?<p role="alert" className="loc-status">{error}<button className="loc-button" type="button" onClick={loadNext}>重新讀取</button></p>:null}
    {loading?<p className="loc-status" aria-live="polite">讀取每日符文紀錄…</p>:null}
    {hasMore?<div ref={sentinelRef} aria-hidden="true" style={{height:1}}/>:null}
  </section>;
}
