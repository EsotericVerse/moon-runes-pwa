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
          ?<>上次抽到「{current.rune_name}」是 <strong>{formatDate(previous.record_date)}</strong>。</>
          :<>此前沒有抽到「{current.rune_name}」的紀錄。</>
        }</p>
      </article>)}
    </div>

    <div className="loc-actions">
      <button className="loc-button" type="button" disabled={loading} onClick={load}>重新整理</button>
    </div>
  </section>;
}
