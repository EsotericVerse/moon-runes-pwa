'use client';

import {useEffect,useMemo,useState} from 'react';
import {selectDailyRuneRange,selectPreviousDailyRuneOccurrence} from '../../loc/daily-runes';

function localToday(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function formatDate(value){
  const date=String(value||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return '—';
  const [,month,day]=date.split('-');
  return `${Number(month)} 月 ${Number(day)} 日`;
}

function roleLabel(role){
  return role==='supplement'?'補抽':'主抽';
}

const DIRECTION_SCORE=Object.freeze({
  '正位':1,
  '半正位':0.5,
  '半逆位':-0.5,
  '逆位':-1
});

function directionTrend(from,to){
  const previous=DIRECTION_SCORE[from];
  const current=DIRECTION_SCORE[to];
  if(!Number.isFinite(previous)||!Number.isFinite(current))return '方向資料不足，先保留觀察。';
  if(previous===current)return '前後方向相同，這個狀態仍在延續。';
  if(previous<0&&current>0)return '本來的不順利會慢慢變成順利。';
  if(previous>0&&current<0)return '原本較順利的狀態正在轉為不順。';
  if(current>previous)return '方向正在轉好，狀態比上一次更順。';
  return '方向正在轉弱，狀態比上一次更不順。';
}

export default function DailyTrendClient(){
  const today=useMemo(()=>localToday(),[]);
  const [items,setItems]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    setError('');
    try{
      const todayRows=await selectDailyRuneRange({startDate:today,endDate:today});
      const next=await Promise.all((todayRows||[]).map(async row=>({
        current:row,
        previous:await selectPreviousDailyRuneOccurrence({
          runeNumber:row.rune_number,
          beforeDate:today
        })
      })));
      setItems(next);
    }catch(reason){
      setItems([]);
      setError(String(reason?.message||reason||'讀取每日符文趨勢失敗。'));
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{load();},[today]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">每日符文趨勢</p>
      <h1>今日與上次</h1>
      <p>只比較今天抽到的符文，並找出資料庫中上一次抽到同一符文的日期。</p>
    </header>

    {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
    {loading?<p className="scope-status">讀取每日符文紀錄…</p>:null}

    {!loading&&!error&&!items.length?<section className="loc-card">
      <h2>今天尚無紀錄</h2>
      <p>今天還沒有每日符文主抽或補抽紀錄。</p>
    </section>:null}

    <div className="scope-list">
      {items.map(({current,previous})=><article className="loc-card" key={current.draw_kind+'-'+current.rune_number}>
        <p className="loc-eyebrow">{roleLabel(current.draw_kind)}</p>
        <h2>今天抽到「{current.rune_name}」</h2>
        <p>{previous
          ?<>上次抽到「{current.rune_name}」是 <strong>{formatDate(previous.record_date)}</strong>，方向為 <strong>{previous.direction}</strong>；這次是 <strong>{current.direction}</strong>。</>
          :<>此前沒有抽到「{current.rune_name}」的紀錄。</>
        }</p>
        {previous?<p><strong>{previous.direction} → {current.direction}</strong>｜{directionTrend(previous.direction,current.direction)}</p>:null}
      </article>)}
    </div>

    <div className="loc-actions">
      <button className="loc-button" type="button" disabled={loading} onClick={load}>重新整理</button>
    </div>
  </section>;
}
