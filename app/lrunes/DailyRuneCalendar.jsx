'use client';

import {useMemo} from 'react';

const WEEKDAYS=['日','一','二','三','四','五','六'];

function dateKey(year,month,day){
  return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}

export default function DailyRuneCalendar({
  year,
  month,
  rows=[],
  selectedDate='',
  loading=false,
  canPrevious=true,
  onPrevious,
  onNext,
  onSelectDate
}){
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

  const monthLabel=year+' 年 '+month+' 月';

  return <section className="loc-card daily-log-calendar" aria-label="每日符文行事曆">
    <div className="scope-daily-calendar-nav">
      <button className="loc-button" type="button" disabled={!canPrevious||loading} onClick={onPrevious} aria-label="上個月">‹</button>
      <h2 aria-live="polite">{monthLabel}</h2>
      <button className="loc-button" type="button" disabled={loading} onClick={onNext} aria-label="下個月">›</button>
    </div>
    <div role="grid" aria-label={monthLabel} className="scope-daily-calendar-grid">
      {WEEKDAYS.map((day,index)=><div role="columnheader" key={'weekday-'+index} className="scope-daily-calendar-weekday">{day}</div>)}
      {cells.map((day,index)=>{
        if(!day)return <div role="gridcell" aria-hidden="true" key={'blank-'+index}/>;
        const key=dateKey(year,month,day);
        const entries=byDate.get(key)||[];
        const main=entries.some(row=>row.draw_kind==='main');
        const supplement=entries.some(row=>row.draw_kind==='supplement');
        const selected=selectedDate===key;
        return <button
          role="gridcell"
          key={key}
          type="button"
          aria-pressed={selected}
          aria-label={key.replaceAll('-','/')+(main?'，主抽':'')+(supplement?'，補抽':'')}
          onClick={()=>onSelectDate?.(key)}
          className={"scope-daily-calendar-cell"+(entries.length?" has-entry":"")}
        >
          <span className="scope-daily-calendar-day">{day}</span>
          <span className="scope-daily-calendar-flags">
            {main?<span>主抽</span>:null}{supplement?<span>補抽</span>:null}
          </span>
        </button>;
      })}
    </div>
  </section>;
}
