'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectDailyRuneRange} from '../../loc/daily-runes';
import {dailyPresetRange,summarizeDailyRange} from '../../loc/model/daily-trend-engine.mjs';

const WEEKDAYS=['日','一','二','三','四','五','六'];
const CHART_ACCENT='var(--loc-accent)';
const CHART_TEXT='var(--loc-text)';
const CHART_GRID='var(--loc-line)';
const CHART_TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};

function localToday(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function formatDate(value){return String(value||'').slice(0,10).replaceAll('-','/');}
function dateMs(value){return Date.parse(String(value||'').slice(0,10)+'T00:00:00Z');}
function dateKey(year,month,day){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
function monthKey(value){return String(value||'').slice(0,7);}
function addMonth(value,offset){
  const [year,month]=String(value||'').split('-').map(Number);
  if(!year||!month)return '';
  const date=new Date(Date.UTC(year,month-1+offset,1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
}
function monthsInRange(start,end){
  const first=monthKey(start),last=monthKey(end);
  if(!first||!last)return [];
  const months=[];
  let cursor=first;
  while(cursor<=last&&months.length<12){months.push(cursor);cursor=addMonth(cursor,1);}
  if(cursor<=last&&last!==months.at(-1))months.push(last);
  return months;
}
function roleLabel(role){return role==='supplement'?'補':'主';}
function Card({label,value,detail}){
  return <article className="loc-card"><p className="loc-eyebrow">{label}</p><h2>{value}</h2>{detail?<p>{detail}</p>:null}</article>;
}

function RangeCalendar({rows,startDate,endDate}){
  const byDate=useMemo(()=>{
    const map=new Map();
    for(const row of rows||[]){
      const key=String(row.record_date||'').slice(0,10);
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(row);
    }
    return map;
  },[rows]);
  const months=monthsInRange(startDate,endDate);
  const low=dateMs(startDate),high=dateMs(endDate);

  return <div className="scope-list">
    {months.map(monthValue=>{
      const [year,month]=monthValue.split('-').map(Number);
      const firstWeekday=new Date(Date.UTC(year,month-1,1)).getUTCDay();
      const dayCount=new Date(Date.UTC(year,month,0)).getUTCDate();
      const cells=[...Array(firstWeekday).fill(null),...Array.from({length:dayCount},(_,index)=>index+1)];
      return <section className="loc-card" key={monthValue} aria-label={year+' 年 '+month+' 月每日符文行事曆'}>
        <h3>{year} 年 {month} 月</h3>
        <div role="grid" className="scope-daily-calendar-grid">
          {WEEKDAYS.map((day,index)=><div role="columnheader" key={index} className="scope-daily-calendar-weekday">{day}</div>)}
          {cells.map((day,index)=>{
            if(!day)return <div role="gridcell" aria-hidden="true" key={'blank-'+index}/>;
            const key=dateKey(year,month,day);
            const entries=byDate.get(key)||[];
            const ms=dateMs(key);
            const selected=Number.isFinite(ms)&&ms>=low&&ms<=high;
            return <div role="gridcell" key={key} aria-label={formatDate(key)}
              className={"scope-daily-calendar-range-cell"+(selected?" is-selected":"")}>
              <strong>{day}</strong>
              <div className="scope-daily-calendar-entry-list">
                {entries.map(row=><span key={row.draw_kind+'-'+row.rune_number}>
                  {roleLabel(row.draw_kind)}｜{row.rune_name}・{row.direction}
                </span>)}
              </div>
            </div>;
          })}
        </div>
      </section>;
    })}
    {months.length>=13?<p className="scope-status">區間超過 12 個月；行事曆顯示前 12 個月與結束月份，分析仍使用完整區間。</p>:null}
  </div>;
}

function AnalysisCharts({analysis}){
  const runeRows=analysis.runes.map(item=>({name:item.name,count:item.count}));
  const directionRows=Object.entries(analysis.direction_counts).map(([direction,count])=>({direction,count}));
  return <div className="loc-grid two">
    <section className="loc-card">
      <h3>符文出現頻率</h3>
      {!runeRows.length?<p>此區間沒有符文紀錄。</p>:<ResponsiveContainer width="100%" height={Math.max(260,80+runeRows.length*28)}>
        <BarChart data={runeRows} layout="vertical" margin={{top:8,right:16,bottom:8,left:8}}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID}/>
          <XAxis type="number" allowDecimals={false} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <YAxis type="category" dataKey="name" width={48} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{color:CHART_TEXT}} itemStyle={{color:CHART_TEXT}}/>
          <Bar dataKey="count" fill={CHART_ACCENT}/>
        </BarChart>
      </ResponsiveContainer>}
    </section>
    <section className="loc-card">
      <h3>位向分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={directionRows} margin={{top:8,right:16,bottom:8,left:8}}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
          <XAxis dataKey="direction" tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <YAxis allowDecimals={false} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{color:CHART_TEXT}} itemStyle={{color:CHART_TEXT}}/>
          <Bar dataKey="count" fill={CHART_ACCENT}/>
        </BarChart>
      </ResponsiveContainer>
    </section>
  </div>;
}

export default function DailyTrendClient(){
  const today=useMemo(()=>localToday(),[]);
  const initial=useMemo(()=>dailyPresetRange(today,'seven-days'),[today]);
  const [mode,setMode]=useState('seven-days');
  const [startDate,setStartDate]=useState(initial.startDate);
  const [endDate,setEndDate]=useState(initial.endDate);
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  const load=useCallback(async(start=startDate,end=endDate)=>{
    setLoading(true);setError('');
    try{
      setRows(await selectDailyRuneRange({startDate:start,endDate:end}));
    }catch(reason){
      setRows([]);
      setError(String(reason?.message||reason||'讀取每日符文趨勢失敗。'));
    }finally{setLoading(false);}
  },[startDate,endDate]);

  useEffect(()=>{load(initial.startDate,initial.endDate);},[]);

  const choosePreset=preset=>{
    const next=dailyPresetRange(today,preset);
    setMode(preset);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    load(next.startDate,next.endDate);
  };

  const analyzeCustom=()=>{
    if(!startDate||!endDate){setError('請選擇完整的起訖日期。');return;}
    setMode('custom');
    load(startDate,endDate);
  };

  const analysis=useMemo(()=>summarizeDailyRange(rows,{
    startDate,endDate,
    label:mode==='today-tomorrow'?'今天＋明天':
      mode==='yesterday-today-tomorrow'?'昨天＋今天＋明天':
      mode==='seven-days'?'近七天':'自訂區間'
  }),[rows,startDate,endDate,mode]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">每日符文趨勢</p>
      <h1>每日趨勢</h1>
      <p>選擇一段時間後，統計每日主抽與補抽紀錄，觀察符文出現頻率、重複情況與方向變化，提供回看時的參考。</p>
    </header>

    <section className="loc-card">
      <h2>分析區間</h2>
      <div className="scope-tabs" role="group" aria-label="每日趨勢分析區間">
        <button type="button" aria-pressed={mode==='today-tomorrow'} onClick={()=>choosePreset('today-tomorrow')}>今天＋明天</button>
        <button type="button" aria-pressed={mode==='yesterday-today-tomorrow'} onClick={()=>choosePreset('yesterday-today-tomorrow')}>昨天＋今天＋明天</button>
        <button type="button" aria-pressed={mode==='seven-days'} onClick={()=>choosePreset('seven-days')}>近七天</button>
        <button type="button" aria-pressed={mode==='custom'} onClick={()=>setMode('custom')}>自訂區間解析</button>
      </div>
      {mode==='custom'?<div className="scope-stat-controls">
        <label><span>開始日期</span><input className="scope-select" type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label>
        <label><span>結束日期</span><input className="scope-select" type="date" value={endDate} onChange={event=>setEndDate(event.target.value)}/></label>
        <button className="loc-button" type="button" disabled={loading} onClick={analyzeCustom}>解析此區間</button>
      </div>:null}
      <p>{formatDate(analysis.start_date)} → {formatDate(analysis.end_date)}｜{analysis.total_days} 天</p>
    </section>

    {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
    {loading?<p className="scope-status">讀取並分析每日符文…</p>:null}

    <div className="loc-grid two">
      <Card label="抽取紀錄" value={analysis.total_draws} detail={'主抽 '+analysis.role_counts.main+'｜補抽 '+analysis.role_counts.supplement}/>
      <Card label="符文種類" value={analysis.unique_runes} detail="區間內出現的不同符文"/>
      <Card label="重複符文" value={analysis.repeats.length} detail="至少跨兩個日期重複出現"/>
      <Card label="位向變化" value={analysis.direction_changes.length} detail="同一符文在區間內出現不同位向"/>
    </div>

    <section className="loc-card">
      <p className="loc-eyebrow">自動分析</p>
      <h2>自動分析建議</h2>
      {!analysis.total_draws?<p>此區間目前沒有每日符文紀錄。</p>:<div className="scope-list">
        {analysis.suggestions.map((item,index)=><article className="scope-inline-card" key={item.type+'-'+item.rune+'-'+index}>
          <strong>{item.type==='frequency'?'出現密度':item.type==='direction'?'位向變化':'區間觀察'}</strong>
          <span>{item.text}</span>
        </article>)}
      </div>}
    </section>

    <RangeCalendar rows={rows} startDate={analysis.start_date} endDate={analysis.end_date}/>

    <AnalysisCharts analysis={analysis}/>

    {analysis.repeats.length?<section className="loc-card">
      <h2>重複符文明細</h2>
      <div className="scope-list">
        {analysis.repeats.map(item=><article className="scope-inline-card" key={item.name}>
          <strong>{item.name}｜{item.count} 次／{item.days_count} 天</strong>
          <span>{item.entries.map(entry=>`${formatDate(entry.date)} ${roleLabel(entry.role)}・${entry.direction}`).join(' ｜ ')}</span>
        </article>)}
      </div>
    </section>:null}

    <div className="loc-actions">
      <button className="loc-button" type="button" disabled={loading} onClick={()=>load()}>重新整理</button>
    </div>
  </section>;
}
