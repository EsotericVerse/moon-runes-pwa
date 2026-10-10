'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import CultureTimeline from '../modules/culture-timeline/CultureTimeline';
import {
  LUNARUNES_CARD_PHASES,LUNARUNES_DIRECTIONS,LUNARUNES_PHASES,
  filterLunaRunesDaily,lunarunesDrawTimeline,lunarunesSkyTimeline,
  selectLunaRunesDailyAnalysis,summarizeLunaRunesDaily
} from '../../loc/lrunes-daily-analysis';

const PALETTE=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55'];
const TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:8};
const MONTH_MS=86400000;
const EMPTY_FOCUS=Object.freeze({});
const emptyLabel=()=> '';

function dayBefore(value,days){
  const date=new Date(String(value||'')+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return '';
  date.setTime(date.getTime()-days*MONTH_MS);
  return date.toISOString().slice(0,10);
}
function Metric({label,value,description}){
  return <div className="scope-card" style={{padding:'14px',minWidth:0,flex:'1 1 160px'}}>
    <span className="scope-status">{label}</span>
    <div style={{fontSize:'1.55rem',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{typeof value==='number'?value.toLocaleString():value}</div>
    {description?<small className="scope-status">{description}</small>:null}
  </div>;
}
function TimeFilters({range,setRange,from,setFrom,to,setTo,phase,setPhase,direction,setDirection,view}){
  return <div className="scope-stat-controls">
    <label><span>時間範圍</span>
      <select className="scope-select" value={range} onChange={event=>setRange(event.target.value)}>
        <option value="all">全部歷史</option>
        <option value="365">最近365天</option>
        <option value="90">最近90天</option>
        <option value="custom">自選日期</option>
      </select>
    </label>
    {range==='custom'?<>
      <label><span>開始</span><input className="scope-input" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
      <label><span>結束</span><input className="scope-input" type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
    </>:null}
    <label><span>真實月相（天時）</span>
      <select className="scope-select" value={phase} onChange={event=>setPhase(event.target.value)}>
        <option value="all">全部天時</option>
        {LUNARUNES_PHASES.map(value=><option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    {view==='statistics'?<label><span>符文方位</span>
      <select className="scope-select" value={direction} onChange={event=>setDirection(event.target.value)}>
        <option value="all">全部方位</option>
        {LUNARUNES_DIRECTIONS.map(value=><option key={value} value={value}>{value}</option>)}
      </select>
    </label>:null}
  </div>;
}

function LrunesStatistics({rows,summary}){
  const top=summary.combinations.slice(0,12).map(row=>({label:row.label,value:row.count}));
  const cross=new Map();
  for(const row of rows){
    const key=row.card_phase+'|'+row.real_phase;
    cross.set(key,(cross.get(key)||0)+1);
  }
  return <>
    <p className="scope-status">以「符文＋方位＋真實月相」作為一個基準狀態；卡片月相由符文固定決定，不重複計算。下列統計是實際發生次數，不是隨機組態估算。</p>
    <section className="scope-card">
      <h3>符文 × 方位 × 天時｜最常出現的組合</h3>
      {top.length?<ResponsiveContainer width="100%" height={Math.max(280,top.length*33)}>
        <BarChart data={top} layout="vertical" margin={{top:8,right:26,bottom:8,left:0}}>
          <CartesianGrid stroke="var(--loc-line)" strokeDasharray="3 3"/>
          <XAxis type="number" allowDecimals={false} stroke="var(--loc-line)" tick={{fill:'var(--loc-text)'}}/>
          <YAxis type="category" dataKey="label" width={158} stroke="var(--loc-line)" tick={{fill:'var(--loc-text)',fontSize:11}}/>
          <Tooltip contentStyle={TOOLTIP} formatter={value=>[value+' 次','實際抽符']}/>
          <Bar dataKey="value" fill="var(--loc-accent)" radius={[0,4,4,0]}/>
        </BarChart>
      </ResponsiveContainer>:<p className="scope-status">目前時段沒有抽符紀錄。</p>}
      {summary.combinations.length>12?<details>
        <summary>查看所有已出現的 {summary.combinations.length} 種組合</summary>
        <div className="scope-ranking">
          {summary.combinations.map(row=><div key={row.key}><strong>{row.label}</strong><span>{row.count} 次</span></div>)}
        </div>
      </details>:null}
    </section>
    <section className="scope-card">
      <h3>真實月相分布</h3>
      <div style={{width:'100%',minHeight:270}}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={summary.phases} margin={{top:12,right:12,bottom:8,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/>
            <XAxis dataKey="name" stroke="var(--loc-line)" tick={{fill:'var(--loc-text)'}}/>
            <YAxis allowDecimals={false} stroke="var(--loc-line)" tick={{fill:'var(--loc-text)'}}/>
            <Tooltip contentStyle={TOOLTIP}/>
            <Bar dataKey="value" name="抽符次數" fill="var(--loc-accent)" radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h4>固定卡片月相 × 真實月相</h4>
      <p className="scope-status">每格代表符合該兩種月相條件的實際抽符次數。卡片月相固定，天時隨日期改變。</p>
      <div style={{overflowX:'auto'}}>
        <table className="scope-table" style={{width:'100%',borderCollapse:'collapse',textAlign:'center'}}>
          <thead><tr><th scope="col">卡片／天時</th>{LUNARUNES_PHASES.map(phase=><th key={phase} scope="col">{phase}</th>)}</tr></thead>
          <tbody>{Object.values(LUNARUNES_CARD_PHASES).map(card=><tr key={card}>
            <th scope="row">{card}</th>
            {LUNARUNES_PHASES.map(real=><td key={real}>{cross.get(card+'|'+real)||0}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <section className="scope-card">
      <h3>月度抽符變化</h3>
      <p className="scope-status">沒有紀錄的月份標示為0，不代表能推定當月沒有抽符活動。</p>
      {summary.months.length?<ResponsiveContainer width="100%" height={310}>
        <LineChart data={summary.months} margin={{top:8,right:24,bottom:32,left:8}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/>
          <XAxis dataKey="month" tick={{fill:'var(--loc-text)',fontSize:11}} angle={-35} textAnchor="end" height={62} stroke="var(--loc-line)"/>
          <YAxis allowDecimals={false} tick={{fill:'var(--loc-text)'}} stroke="var(--loc-line)"/>
          <Tooltip contentStyle={TOOLTIP}/>
          <Line dataKey="count" name="抽符次數" type="monotone" stroke="var(--loc-accent)" strokeWidth={2} dot/>
        </LineChart>
      </ResponsiveContainer>:<p className="scope-status">尚無日期資料。</p>}
      <h4>方位分布</h4>
      <div className="scope-ranking">{summary.directions.map(row=><div key={row.name}><strong>{row.name}</strong><span>{row.value} 次</span></div>)}</div>
    </section>
  </>;
}

function LrunesCulture({rows,summary}){
  const [chosenDay,setChosenDay]=useState('');
  const availableDays=useMemo(()=>[...new Set(rows.map(row=>row.record_date))].sort().reverse(),[rows]);
  const day=availableDays.includes(chosenDay)?chosenDay:(availableDays[0]||'');
  const dayRows=rows.filter(row=>row.record_date===day);
  const sky=useMemo(()=>lunarunesSkyTimeline(summary.firstDate,summary.lastDate),[summary.firstDate,summary.lastDate]);
  const draws=useMemo(()=>lunarunesDrawTimeline(rows),[rows]);
  return <>
    <section className="scope-card">
      <h3>天時長河｜日期所對應的真實月相</h3>
      <p className="scope-status">先顯示日曆本身的天時變化，再對照有實際抽符紀錄的日期。月相不因某天沒有抽牌而消失。</p>
      <CultureTimeline items={sky} mode="source" focus={EMPTY_FOCUS}
        windowStart={summary.firstDate} windowEnd={summary.lastDate}/>
    </section>
    <section className="scope-card">
      <h3>每日抽符｜天時分布</h3>
      <p className="scope-status">按真實月相分成五條河道。點選抽符日期可查看符文、方位、卡片月相與天時的完整記錄。</p>
      <CultureTimeline items={draws} mode="source" focus={EMPTY_FOCUS} labelOf={emptyLabel}
        windowStart={summary.firstDate} windowEnd={summary.lastDate}
        onSelect={item=>{
          const selected=String(item?.raw?.start_date||'').slice(0,10);
          if(selected)setChosenDay(selected);
        }}/>
      <div className="scope-stat-controls">
        <label><span>查看抽符日期</span>
          <select className="scope-select" value={day} onChange={event=>setChosenDay(event.target.value)}>
            {availableDays.map(value=><option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {dayRows.length?<div className="scope-ranking">
        {dayRows.map((row,index)=><div key={row.record_id||index} style={{display:'block'}}>
          <strong>{row.rune_name}之符文，{row.direction}，卡片月相{row.card_phase}，真實月相{row.real_phase}</strong>
          <p className="scope-status">{row.draw_kind==='main'?'主抽':row.draw_kind==='supplement'?'補抽':'歷史抽符'} · {row.record_date}
            {row.recorded_phase&&row.recorded_phase!==row.real_phase?' · 原始史料月相：'+row.recorded_phase:''}
          </p>
        </div>)}
      </div>:<p className="scope-status">選定時段沒有抽符紀錄。</p>}
    </section>
  </>;
}

export default function LunaRunesDailyAnalysis({view='statistics'}){
  const [range,setRange]=useState('all');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [phase,setPhase]=useState('all');
  const [direction,setDirection]=useState('all');
  const query=useQuery({
    queryKey:['lrunes-daily-cultural-analysis'],
    queryFn:selectLunaRunesDailyAnalysis,
    staleTime:5*60_000
  });
  const rows=query.data||[];
  const latest=rows.at(-1)?.record_date||'';
  const start=range==='all'?'':range==='custom'?from:dayBefore(latest,Number(range)-1);
  const end=range==='custom'?to:'';
  const validRange=range!=='custom'||Boolean(from&&to&&from<=to);
  const filtered=useMemo(()=>validRange?filterLunaRunesDaily(rows,start,end).filter(row=>
    (phase==='all'||row.real_phase===phase)&&
    (view!=='statistics'||direction==='all'||row.direction===direction)
  ):[],[rows,start,end,phase,direction,view,validRange]);
  const summary=useMemo(()=>summarizeLunaRunesDaily(filtered),[filtered]);
  if(query.error)return <p className="scope-status scope-error">每日符文讀取失敗：{query.error.message}</p>;
  return <div className="scope-lrunes-daily-analysis">
    <p className="loc-eyebrow">LunaRunes · 因時制宜</p>
    <h2>{view==='culture'?'每日符文・天時與文化長河':'每日符文・天時與統計'}</h2>
    <p className="scope-status">真正的變數是符文、方位、抽符日期的天時。卡片月相是每個符文本身的固定屬性。</p>
    {query.isPending?<p className="scope-status">正在讀取每日符文紀錄…</p>:null}
    <TimeFilters range={range} setRange={setRange} from={from} setFrom={setFrom} to={to} setTo={setTo}
      phase={phase} setPhase={setPhase} direction={direction} setDirection={setDirection} view={view}/>
    {range==='custom'&&!validRange?<p className="scope-status">請指定有效的開始與結束日期。</p>:null}
    <div style={{display:'flex',flexWrap:'wrap',gap:12,margin:'18px 0'}}>
      <Metric label="實際抽符紀錄" value={summary.total} description="不是理論排列"/>
      <Metric label="有紀錄日期" value={summary.activeDays}/>
      <Metric label="已出現的基準狀態" value={summary.observedStates} description="符文 × 方位 × 天時"/>
      <Metric label="完整基準空間" value={summary.baseline} description="66 × 4 × 5"/>
    </div>
    {summary.total>0?<p className="scope-status">紀錄日期：{summary.firstDate} ～ {summary.lastDate} · 基準狀態覆蓋率 {(summary.observedStates/summary.baseline*100).toFixed(2)}%。覆蓋率只描述觀察範圍，不衡量占卜準確性。</p>:null}
    {!query.isPending&&validRange&&summary.total===0?<p className="scope-status">所選條件下沒有每日符文紀錄。</p>:null}
    {summary.total>0?(view==='culture'
      ?<LrunesCulture rows={filtered} summary={summary}/>
      :<LrunesStatistics rows={filtered} summary={summary}/>):null}
    <p className="scope-status">「真實月相」目前遵循符韻既有的農曆五段式月相分類；它不是精確天文朔望時刻。早期史料原有月相另行保留，不會覆寫。</p>
  </div>;
}
