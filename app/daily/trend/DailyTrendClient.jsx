'use client';

import {useEffect,useMemo,useState} from 'react';
import {selectDailyRuneRange,selectPreviousDailyRuneOccurrence,selectDailyRuneSituation} from '../../loc/daily-runes';

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

function joinMeaning(previous,current){
  const parts=[previous,current].map(value=>String(value||'').trim().replace(/[。；;，,\s]+$/g,'')).filter(Boolean);
  return parts.length?parts.join('；')+'。':'目前沒有可用的狀況形容。';
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
      const next=await Promise.all((todayRows||[]).map(async row=>{
        const previous=await selectPreviousDailyRuneOccurrence({
          runeNumber:row.rune_number,
          beforeDate:today
        });
        const currentSituation=await selectDailyRuneSituation({
          runeNumber:row.rune_number,
          direction:row.direction,
          recordDate:today
        });
        const previousSituation=previous?await selectDailyRuneSituation({
          runeNumber:previous.rune_number,
          direction:previous.direction,
          recordDate:previous.record_date
        }):null;
        return {current:row,previous,currentSituation,previousSituation};
      }));
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
      <p>比較今天抽到的符文與資料庫中上一筆相同符文，並依兩次各自的真實月相組合既有狀況形容。</p>
    </header>

    {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
    {loading?<p className="scope-status">讀取每日符文紀錄…</p>:null}

    {!loading&&!error&&!items.length?<section className="loc-card">
      <h2>今天尚無紀錄</h2>
      <p>今天還沒有每日符文主抽或補抽紀錄。</p>
    </section>:null}

    <div className="scope-list">
      {items.map(({current,previous,currentSituation,previousSituation})=><article className="loc-card" key={current.draw_kind+'-'+current.rune_number}>
        <p className="loc-eyebrow">{roleLabel(current.draw_kind)}</p>
        <h2>今天抽到「{current.rune_name}」</h2>
        <p>這次：<strong>{current.direction}</strong>｜真實月相：{currentSituation?.moonPhase||'未知'}</p>
        {previous?<>
          <p>上次抽到「{current.rune_name}」是 <strong>{formatDate(previous.record_date)}</strong>，方向為 <strong>{previous.direction}</strong>｜真實月相：{previousSituation?.moonPhase||'未知'}。</p>
          <p><strong>語意路徑：</strong>{joinMeaning(previousSituation?.text,currentSituation?.text)}</p>
        </>:<p>此前沒有抽到「{current.rune_name}」的紀錄。{currentSituation?.text?<>本次狀況形容：{currentSituation.text}</>:null}</p>}
      </article>)}
    </div>

    <div className="loc-actions">
      <button className="loc-button" type="button" disabled={loading} onClick={load}>重新整理</button>
    </div>
  </section>;
}
