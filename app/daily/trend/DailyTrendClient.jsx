'use client';

import {useEffect,useMemo,useState} from 'react';
import {selectRecentDailyRuneDraws} from '../../loc/neon-daily-runes';
import {summarizeDailyDraws,summarizeDailyWindows} from '../../loc/model/daily-trend-engine.mjs';

const DAYS=14;
function dayKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}
function formatDate(value){
  return String(value||'').slice(0,10).replaceAll('-','/');
}
function Card({label,value,detail}){
  return <article className="loc-card"><p className="loc-eyebrow">{label}</p><h2>{value}</h2>{detail?<p>{detail}</p>:null}</article>;
}

export default function DailyTrendClient(){
  const [draws,setDraws]=useState([]);
  const [total,setTotal]=useState(0);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function reload(){
    setLoading(true);
    setError('');
    try{
      const result=await selectRecentDailyRuneDraws({limit:DAYS*2});
      setDraws(result.rows);
      setTotal(result.count||0);
    }catch(reason){
      setError(String(reason?.message||reason||'讀取每日符文趨勢失敗。'));
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{reload();},[]);

  const analysis=useMemo(()=>{
    const semanticDays=summarizeDailyDraws(draws).slice(-DAYS);
    const latest=semanticDays.at(-1)||null;
    const windows=summarizeDailyWindows(draws,semanticDays);
    return {semanticDays,latest,windows};
  },[draws]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Daily Trend · LunaRunes</p>
      <h1>每日符文分析趨勢</h1>
      <p>每日 Main／Supplement 先形成當日結果，再以前一日結果對照今日結果。查找使用 FlexSearch；判讀只使用四向、中立與未知。</p>
    </header>

    <div className="loc-grid two">
      <Card label="每日歷史紀錄" value={total} detail="Neon 紀錄總數"/>
      <Card label="最近日期" value={analysis.latest?formatDate(analysis.latest.date):'—'} detail={analysis.latest?analysis.latest.guidance:'尚無可比較紀錄'}/>
      <Card label="前後變化" value={analysis.windows.adjacent.trend||'未知'} detail={analysis.windows.adjacent.previous_date?`${formatDate(analysis.windows.adjacent.previous_date)} → ${formatDate(analysis.windows.adjacent.current_date)}`:'尚無前一筆可比較'}/>
      <Card label="最新結果" value={analysis.windows.adjacent.result||'未知'} detail="今日 Main／Supplement 綜合結果"/>
    </div>

    {error?<p role="alert" className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入每日抽牌趨勢…</p>:null}

    <section className="loc-card">
      <h2>前後趨勢</h2>
      {!analysis.semanticDays.length?<p>目前還沒有每日抽牌資料可供判讀。</p>:<div className="scope-v2-list">
        {analysis.semanticDays.map(day=><article className="scope-v2-inline-card" key={day.date}>
          <strong>{formatDate(day.date)}</strong>
          <span>當日：主符 {day.main_state}{day.supplement_state?` → 副符 ${day.supplement_state}`:''}</span>
          {day.previous_date?<span>前日結果 {day.previous_result} → 今日結果 {day.daily_result}</span>:<span>首筆紀錄，尚無前日可比較。</span>}
          <span>{day.guidance}</span>
        </article>)}
      </div>}
    </section>

    <section className="loc-card">
      <h2>三天內變化</h2>
      <p>{analysis.windows.three_days.start_date?`${formatDate(analysis.windows.three_days.start_date)} → ${formatDate(analysis.windows.three_days.end_date)}｜結果 ${analysis.windows.three_days.from_result} → ${analysis.windows.three_days.to_result}｜趨勢 ${analysis.windows.three_days.trend}`:'目前沒有足夠資料。'}</p>
      {analysis.windows.three_days.repeats.length?<div className="scope-v2-list">
        <strong>重複出現</strong>
        {analysis.windows.three_days.repeats.map(item=><span key={item.name}>{item.name}：{item.count} 次</span>)}
      </div>:<p>三天內沒有重複符文。</p>}
      {analysis.windows.three_days.direction_changes.length?<div className="scope-v2-list">
        <strong>位向改變</strong>
        {analysis.windows.three_days.direction_changes.map(item=><span key={item.name}>{item.name}：{item.path.join(' → ')}</span>)}
      </div>:<p>三天內沒有同符文位向改變。</p>}
    </section>

    <section className="loc-card">
      <h2>一週內變化</h2>
      <p>{analysis.windows.seven_days.start_date?`${formatDate(analysis.windows.seven_days.start_date)} → ${formatDate(analysis.windows.seven_days.end_date)}｜結果 ${analysis.windows.seven_days.from_result} → ${analysis.windows.seven_days.to_result}｜趨勢 ${analysis.windows.seven_days.trend}`:'目前沒有足夠資料。'}</p>
      {analysis.windows.seven_days.repeats.length?<div className="scope-v2-list">
        <strong>重複出現</strong>
        {analysis.windows.seven_days.repeats.map(item=><span key={item.name}>{item.name}：{item.count} 次</span>)}
      </div>:<p>一週內沒有重複符文。</p>}
      {analysis.windows.seven_days.direction_changes.length?<div className="scope-v2-list">
        <strong>位向改變</strong>
        {analysis.windows.seven_days.direction_changes.map(item=><span key={item.name}>{item.name}：{item.path.join(' → ')}</span>)}
      </div>:<p>一週內沒有同符文位向改變。</p>}
    </section>

    <div className="loc-actions">
      <button className="loc-button" type="button" disabled={loading} onClick={reload}>重新整理</button>
      <a href="/daily/log/">查看每日符文紀錄</a>
    </div>
  </section>;
}
