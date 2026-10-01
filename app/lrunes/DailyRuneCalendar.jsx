'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {selectDailyRuneMonth} from '../loc/neon-daily-runes';

const FIRST_MONTH=2026*12+7;
const WEEKDAYS=['日','一','二','三','四','五','六'];

function taipeiParts(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  }catch{
    return {
      year:String(date.getFullYear()),
      month:String(date.getMonth()+1).padStart(2,'0'),
      day:String(date.getDate()).padStart(2,'0')
    };
  }
}
function currentMonthValue(){
  const parts=taipeiParts();
  return Number(parts.year)*12+(Number(parts.month)-1);
}
function monthParts(value){return {year:Math.floor(value/12),month:value%12+1};}
function monthLabel(value){const {year,month}=monthParts(value);return year+' 年 '+month+' 月';}
function dateKey(year,month,day){return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}

export default function DailyRuneCalendar(){
  const [monthValue,setMonthValue]=useState(()=>Math.max(FIRST_MONTH,currentMonthValue()));
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const {year,month}=monthParts(monthValue);

  const loadMonth=useCallback(async()=>{
    setLoading(true);
    setError('');
    try{
      setRows(await selectDailyRuneMonth({year,month}));
    }catch(reason){
      setRows([]);
      setError(String(reason?.message||reason||'讀取每日符文行事曆失敗。'));
    }finally{
      setLoading(false);
    }
  },[year,month]);

  useEffect(()=>{loadMonth();},[loadMonth]);

  const byDate=useMemo(()=>{
    const grouped=new Map();
    for(const row of rows){
      const key=String(row.record_date||'').slice(0,10);
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

  return <section className="loc-card" aria-label="每日符文行事曆">
    <div className="scope-v2-daily-calendar-nav">
      <button className="loc-button" type="button" disabled={monthValue<=FIRST_MONTH||loading} onClick={()=>setMonthValue(value=>value-1)} aria-label="上個月">‹</button>
      <h2 aria-live="polite">每日符文行事曆 · {monthLabel(monthValue)}</h2>
      <button className="loc-button" type="button" disabled={loading} onClick={()=>setMonthValue(value=>value+1)} aria-label="下個月">›</button>
    </div>
    <div role="grid" aria-label={monthLabel(monthValue)} className="scope-v2-daily-calendar-grid">
      {WEEKDAYS.map((day,index)=><div role="columnheader" key={'weekday-'+index} className="scope-v2-daily-calendar-weekday">{day}</div>)}
      {cells.map((day,index)=>{
        if(!day)return <div role="gridcell" aria-hidden="true" key={'blank-'+index}/>;
        const key=dateKey(year,month,day);
        const entries=byDate.get(key)||[];
        const main=entries.find(row=>row.draw_kind==='main');
        const supplement=entries.find(row=>row.draw_kind==='supplement');
        return <div
          role="gridcell"
          key={key}
          aria-label={key+(main?'，主抽 '+main.rune_name+' '+main.direction:'')+(supplement?'，補抽 '+supplement.rune_name+' '+supplement.direction:'')}
          className={"scope-v2-daily-calendar-cell"+(entries.length?" has-entry":"")}
        >
          <span className="scope-v2-daily-calendar-day">{day}</span>
          <span className="scope-v2-daily-calendar-flags">
            {main?<span>{main.rune_name} · {main.direction}</span>:null}
            {supplement?<span>{supplement.rune_name} · {supplement.direction}</span>:null}
          </span>
        </div>;
      })}
    </div>
    {error?<p role="alert" className="loc-status">{error}<button className="loc-button" type="button" onClick={loadMonth}>重新讀取</button></p>:null}
    {loading?<p className="loc-status" aria-live="polite">讀取每日符文行事曆…</p>:null}
  </section>;
}
