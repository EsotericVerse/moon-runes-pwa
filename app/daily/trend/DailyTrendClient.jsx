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

const DIRECTION_PATH_TEXT=Object.freeze({
  '正位→正位':'順利的狀態仍在延續。',
  '正位→半正位':'原本順利，現在稍微放緩，但仍偏向順利。',
  '正位→半逆位':'原本順利，現在開始出現一些阻力。',
  '正位→逆位':'原本順利，現在轉為明顯不順。',
  '半正位→正位':'原本正在轉順，現在已走向順利。',
  '半正位→半正位':'慢慢變順的狀態仍在延續。',
  '半正位→半逆位':'原本偏向順利，現在開始轉弱。',
  '半正位→逆位':'原本偏向順利，現在轉為不順。',
  '半逆位→正位':'原本有些不順，現在已明顯轉好。',
  '半逆位→半正位':'原本有些不順，現在正在慢慢變順。',
  '半逆位→半逆位':'目前的阻力仍在延續。',
  '半逆位→逆位':'原本已有阻力，現在變得更不順。',
  '逆位→正位':'原本不順利，現在已轉為順利。',
  '逆位→半正位':'本來的不順利會慢慢變成順利。',
  '逆位→半逆位':'原本不順利，現在阻力正在減輕。',
  '逆位→逆位':'不順利的狀態仍在延續。'
});

function directionTrend(from,to){
  return DIRECTION_PATH_TEXT[`${from}→${to}`]||'方向資料不足，先保留觀察。';
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
