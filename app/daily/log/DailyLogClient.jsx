'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {selectDailyRuneMonth} from '../../loc/neon-daily-runes';
import {realMoonPhase} from '../../loc/model/moon-phase';

const FIRST_MONTH=2026*12+7;
const WEEKDAYS=['日','一','二','三','四','五','六'];

function monthParts(value){return {year:Math.floor(value/12),month:value%12+1};}
function monthLabel(value){const {year,month}=monthParts(value);return `${year} 年 ${month} 月`;}
function dateKey(year,month,day){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function formatDate(value){return String(value||'').slice(0,10).replaceAll('-','/');}

export default function DailyLogClient(){
  const [monthValue,setMonthValue]=useState(FIRST_MONTH);
  const [rows,setRows]=useState([]);
  const [selectedDate,setSelectedDate]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const {year,month}=monthParts(monthValue);

  const loadMonth=useCallback(async()=>{
    setLoading(true);
    setError('');
    try{
      const result=await selectDailyRuneMonth({year,month});
      setRows(result);
      setSelectedDate(current=>current.startsWith(`${year}-${String(month).padStart(2,'0')}-`)
        ?current
        :String(result[0]?.record_date||dateKey(year,month,1)).slice(0,10));
    }catch(reason){
      setRows([]);
      setSelectedDate('');
      setError(String(reason?.message||reason||'讀取每日符文紀錄失敗。'));
    }finally{setLoading(false);}
  },[year,month]);

  useEffect(()=>{loadMonth();},[loadMonth]);

  const byDate=useMemo(()=>{
    const grouped=new Map();
    for(const row of rows){
      const key=String(row.record_date).slice(0,10);
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(row);
    }
    return grouped;
  },[rows]);

  const cells=useMemo(()=>{
    const firstWeekday=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    const dayCount=new Date(Date.UTC(year,month,0)).getUTCDate();
    return [...Array(firstWeekday).fill(null),...Array.from({length:dayCount},(_,index)=>index+1)];
  },[year,month]);
  const selectedRows=byDate.get(selectedDate)||[];

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">每日抽籤紀錄</p>
      <h1>每日符文抽籤紀錄</h1>
      <p>每日抽籤紀錄。藉由此來查趨勢。</p>
    </header>

    <section className="loc-card" aria-label="每日符文行事曆">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:16}}>
        <button className="loc-button" type="button" disabled={monthValue<=FIRST_MONTH||loading} onClick={()=>setMonthValue(value=>value-1)} aria-label="上個月">‹</button>
        <h2 style={{margin:0}} aria-live="polite">{monthLabel(monthValue)}</h2>
        <button className="loc-button" type="button" disabled={loading} onClick={()=>setMonthValue(value=>value+1)} aria-label="下個月">›</button>
      </div>
      <div role="grid" aria-label={monthLabel(monthValue)} style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:4}}>
        {WEEKDAYS.map((day,index)=><div role="columnheader" key={`weekday-${index}`} style={{textAlign:'center',padding:'8px 2px',fontWeight:600}}>{day}</div>)}
        {cells.map((day,index)=>{
          if(!day)return <div role="gridcell" aria-hidden="true" key={`blank-${index}`}/>;
          const key=dateKey(year,month,day);
          const entries=byDate.get(key)||[];
          const main=entries.some(row=>row.draw_kind==='main');
          const supplement=entries.some(row=>row.draw_kind==='supplement');
          const moonPhase=realMoonPhase(new Date(Date.UTC(year,month-1,day,12)));
          const selected=selectedDate===key;
          return <button
            role="gridcell"
            key={key}
            type="button"
            aria-pressed={selected}
            aria-label={`${formatDate(key)}，真實月相：${moonPhase}${main?'，主抽':''}${supplement?'，補抽':''}`}
            title={`真實月相：${moonPhase}`}
            onClick={()=>setSelectedDate(key)}
            style={{minHeight:72,padding:'6px 3px',borderRadius:8,border:selected?'2px solid currentColor':'1px solid currentColor',background:selected?'var(--loc-focus,rgba(128,128,128,.16))':'transparent',color:'inherit',opacity:entries.length?1:.68,cursor:'pointer'}}
          >
            <span style={{display:'block',fontWeight:600}}>{day}</span>
            <span style={{display:'flex',justifyContent:'center',gap:3,flexWrap:'wrap',marginTop:4,fontSize:'0.68rem'}}>
              {main?<span>主抽</span>:null}{supplement?<span>補抽</span>:null}
            </span>
          </button>;
        })}
      </div>
    </section>

    {error?<p role="alert" className="loc-status">{error}<button className="loc-button" type="button" onClick={loadMonth}>重新讀取</button></p>:null}
    {loading?<p className="loc-status" aria-live="polite">讀取每日符文紀錄…</p>:null}
    {!loading&&!error&&!rows.length?<article className="loc-card">目前沒有每日符文紀錄。</article>:null}
    {selectedDate&&selectedRows.length?<section className="loc-context-list" aria-live="polite">
      <h2>{formatDate(selectedDate)}</h2>
      <p>真實月相：{realMoonPhase(new Date(`${selectedDate}T12:00:00Z`))}</p>
      {selectedRows.map(row=><article className="loc-card" key={`${row.record_date}-${row.draw_kind}`}>
        <div className="loc-result-meta"><span>{row.draw_kind==='supplement'?'補抽':'主抽'}</span><span>{formatDate(row.record_date)}</span></div>
        <h3>{row.rune_name}・{row.direction}</h3>
      </article>)}
    </section>:null}
    {selectedDate&&!selectedRows.length&&!loading&&!error?<section className="loc-card" aria-live="polite">
      <h2>{formatDate(selectedDate)}</h2>
      <p>真實月相：{realMoonPhase(new Date(`${selectedDate}T12:00:00Z`))}</p>
      <p>當日沒有每日符文紀錄。</p>
    </section>:null}
  </section>;
}
