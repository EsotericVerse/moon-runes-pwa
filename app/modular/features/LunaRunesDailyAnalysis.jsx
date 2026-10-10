'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Line,LineChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import CultureTimeline from '../modules/culture-timeline/CultureTimeline';
import {analyzeRiverDensity} from '../modules/culture-timeline/river-density-analysis.mjs';
import {galaxyIdentityHref} from '../feature-navigation';
import {
  LUNARUNES_CARD_PHASES,LUNARUNES_DIRECTIONS,LUNARUNES_PHASES,
  filterLunaRunesDaily,lunarunesDrawTimeline,lunarunesSkyTimeline,
  lunarunesWorkTimeline,lunarunesAnchorTimeline,lunarunesDateContext,
  selectLunaRunesDailyAnalysis,selectLunaRunesCulturalWorks,
  selectLunaRunesCulturalAnchors,selectLunaRunesDayWorkTexts,
  summarizeLunaRunesDaily
} from '../../loc/lrunes-daily-analysis';

const TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:8};
const MONTH_MS=86400000;
const EMPTY_FOCUS=Object.freeze({});

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
  const [detail,setDetail]=useState('tianshi');
  const ranking=detail==='tianshi'?summary.combinations:summary.runeDirections;
  const top=ranking.slice(0,12).map(row=>({label:row.label,value:row.count}));
  const cross=new Map();
  for(const row of rows){
    const key=row.card_phase+'|'+row.real_phase;
    cross.set(key,(cross.get(key)||0)+1);
  }
  return <>
    <p className="scope-status">統計可切換264種「符文＋方位」和1,320種「符文＋方位＋真實月相」基準狀態。卡片月相由符文固定決定，不重複乘算；圖表顯示實際發生次數。</p>
    <div className="scope-stat-controls">
      <label><span>統計組合層級</span>
        <select className="scope-select" value={detail} onChange={event=>setDetail(event.target.value)}>
          <option value="tianshi">含天時｜66 × 4 × 5（1,320）</option>
          <option value="basic">基礎分布｜66 × 4（264）</option>
        </select>
      </label>
    </div>
    <section className="scope-card">
      <h3>{detail==='tianshi'?'符文 × 方位 × 真實月相':'符文 × 方位'}｜最常出現的組合</h3>
      {top.length?<ResponsiveContainer width="100%" height={Math.max(280,top.length*33)}>
        <BarChart data={top} layout="vertical" margin={{top:8,right:26,bottom:8,left:0}}>
          <CartesianGrid stroke="var(--loc-line)" strokeDasharray="3 3"/>
          <XAxis type="number" allowDecimals={false} stroke="var(--loc-line)" tick={{fill:'var(--loc-text)'}}/>
          <YAxis type="category" dataKey="label" width={158} stroke="var(--loc-line)" tick={{fill:'var(--loc-text)',fontSize:11}}/>
          <Tooltip contentStyle={TOOLTIP} formatter={value=>[value+' 次','實際抽符']}/>
          <Bar dataKey="value" fill="var(--loc-accent)" radius={[0,4,4,0]}/>
        </BarChart>
      </ResponsiveContainer>:<p className="scope-status">目前時段沒有抽符紀錄。</p>}
      {ranking.length>12?<details>
        <summary>查看所有已出現的 {ranking.length} 種組合</summary>
        <div className="scope-ranking">
          {ranking.map(row=><div key={row.key}><strong>{row.label}</strong><span>{row.count} 次</span></div>)}
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
          <tbody>{[...Object.values(LUNARUNES_CARD_PHASES),...(rows.some(row=>row.card_phase==='未指定')?['未指定']:[])].map(card=><tr key={card}>
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
  const [workSource,setWorkSource]=useState('lo3rwang');
  const [aroundDays,setAroundDays]=useState(3);
  const start=summary.firstDate,end=summary.lastDate;
  const workQuery=useQuery({
    queryKey:['lrunes-combined-culture-works',workSource,start,end],
    queryFn:()=>selectLunaRunesCulturalWorks({source:workSource,startDate:start,endDate:end}),
    enabled:Boolean(start&&end),
    staleTime:5*60_000
  });
  const anchorQuery=useQuery({
    queryKey:['lrunes-combined-culture-anchors'],
    queryFn:selectLunaRunesCulturalAnchors,
    staleTime:5*60_000
  });
  const works=workQuery.data||[];
  const workRiver=useMemo(()=>lunarunesWorkTimeline(works),[works]);
  const sky=useMemo(()=>lunarunesSkyTimeline(start,end),[start,end]);
  const draws=useMemo(()=>lunarunesDrawTimeline(rows),[rows]);
  const relevantAnchors=useMemo(()=>(anchorQuery.data||[]).filter(row=>
    String(row.time_date||'').slice(0,10)>=start&&String(row.time_date||'').slice(0,10)<=end
  ),[anchorQuery.data,start,end]);
  const riverAnalysis=useMemo(()=>
    analyzeRiverDensity(workRiver,relevantAnchors.map(row=>String(row.time_date).slice(0,10))),
    [workRiver,relevantAnchors]
  );
  const anchorRiver=useMemo(()=>
    lunarunesAnchorTimeline(relevantAnchors,riverAnalysis.suggestions),
    [relevantAnchors,riverAnalysis.suggestions]
  );
  const parallelItems=useMemo(()=>
    [...sky,...draws,...workRiver,...anchorRiver],
    [sky,draws,workRiver,anchorRiver]
  );
  const availableDays=useMemo(()=>[...new Set([
    ...rows.map(row=>row.record_date),
    ...works.map(row=>row.work_date),
    ...anchorRiver.map(row=>row.start_date)
  ].filter(Boolean))].sort().reverse(),[rows,works,anchorRiver]);
  const day=chosenDay>=start&&chosenDay<=end?chosenDay:(availableDays[0]||'');
  const context=useMemo(()=>lunarunesDateContext(day,rows,works,aroundDays),[day,rows,works,aroundDays]);
  const dayTextQuery=useQuery({
    queryKey:['lrunes-combined-culture-work-texts',workSource,day],
    queryFn:()=>selectLunaRunesDayWorkTexts({source:workSource,date:day,limit:12}),
    enabled:Boolean(day&&context.sameDayWorks.length),
    staleTime:5*60_000
  });
  const suggestion=riverAnalysis.suggestions.find(row=>row.date===day)||null;
  const officialAnchor=relevantAnchors.find(row=>String(row.time_date).slice(0,10)===day)||null;
  return <>
    <section className="scope-card">
      <h3>月之眼睛｜符文、作品、天時與定錨點</h3>
      <p className="scope-status">兩種個人紀錄在同一條日期軸上並行：每日符文與文字作品。天時作為日期參照，建議定錨點顯示作品密度變化的候選日期，不會自動建立正式定錨。</p>
      <div className="scope-stat-controls">
        <label><span>對照的文字來源</span>
          <select className="scope-select" value={workSource} onChange={event=>{setWorkSource(event.target.value);setChosenDay('');}}>
            <option value="lo3rwang">作者個人作品（公開資料）</option>
            <option value="lrunes">符韻作品（公開資料）</option>
          </select>
        </label>
      </div>
      {workQuery.isPending?<p className="scope-status">正在取得文字作品的日期與數量…</p>:null}
      {workQuery.error?<p className="scope-status scope-error">文字作品讀取失敗：{workQuery.error.message}</p>:null}
      {anchorQuery.error?<p className="scope-status scope-error">定錨點讀取失敗：{anchorQuery.error.message}</p>:null}
      <p className="scope-status">月相條件只篩選每日符文；天時背景與文字作品仍呈現完整日期區間，避免隱藏對照事實。</p>
      <p className="scope-status">此區間每日符文 {rows.length} 次／{new Set(rows.map(row=>row.record_date)).size} 日；對照來源作品 {works.length} 篇／{new Set(works.map(row=>row.work_date)).size} 日；作品密度建議定錨 {riverAnalysis.suggestions.length} 個（僅供觀察）。</p>
      <CultureTimeline items={parallelItems} mode="source" focus={EMPTY_FOCUS}
        windowStart={start} windowEnd={end} labelOf={item=>item.display_label||''}
        onSelect={item=>{
          const date=String(item?.raw?.start_date||'').slice(0,10);
          if(date)setChosenDay(date);
        }}/>
      <p className="scope-status">由上至下：天時月相、每日符文、文字作品、正式與建議定錨。上下河道共用時間刻度，點選任一日期即可一起查看。沒有抽符的日子不會被推定為零次使用，僅代表沒有紀錄。</p>
    </section>
    <section className="scope-card">
      <h3>日期交會檢視</h3>
      <div className="scope-stat-controls">
        <label><span>選擇日期</span>
          <input className="scope-input" type="date" value={day} min={start} max={end}
            onChange={event=>setChosenDay(event.target.value)}/>
        </label>
        <label><span>比較範圍</span>
          <select className="scope-select" value={aroundDays} onChange={event=>setAroundDays(Number(event.target.value))}>
            <option value={3}>前後3天</option>
            <option value={7}>前後7天</option>
            <option value={14}>前後14天</option>
          </select>
        </label>
      </div>
      {day?<p className="scope-status">
        {day}・天時：{context.phase}
        {officialAnchor?'・正式定錨：'+officialAnchor.label:''}
        {suggestion?'・建議定錨候選':''}
      </p>:null}
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <Metric label="當日抽符" value={context.sameDayDraws.length}/>
        <Metric label="當日文字作品" value={context.sameDayWorks.length}/>
        <Metric label={'之前'+aroundDays+'天・符文／作品'} value={context.beforeDraws+' ／ '+context.beforeWorks}/>
        <Metric label={'之後'+aroundDays+'天・符文／作品'} value={context.afterDraws+' ／ '+context.afterWorks}/>
      </div>
      {suggestion?<p className="scope-status">建議日期依作品密度轉折產生：{(suggestion.analysis||[]).join(' ')} 這是變化偵測，不代表因果或個人心情判斷。</p>:null}
      <h4>當日符文</h4>
      {context.sameDayDraws.length?<div className="scope-ranking">
        {context.sameDayDraws.map((row,index)=><div key={row.record_id||index} style={{display:'block'}}>
          <strong>{row.rune_name}之符文，{row.direction}，卡片月相{row.card_phase}，真實月相{row.real_phase}</strong>
          <p className="scope-status">{row.draw_kind==='main'?'主抽':row.draw_kind==='supplement'?'補抽':'歷史抽符'}
            {row.recorded_phase&&row.recorded_phase!==row.real_phase?'・當時史料記載月相：'+row.recorded_phase:''}
          </p>
        </div>)}
      </div>:<p className="scope-status">當日沒有已記錄的抽符。</p>}
      <h4>當日作品與原始文字</h4>
      {context.sameDayWorks.length>12?<p className="scope-status">當日共有 {context.sameDayWorks.length} 篇，以下只展開前12篇的文字摘錄。</p>:null}
      {dayTextQuery.isPending&&context.sameDayWorks.length?<p className="scope-status">正在讀取當日作品原文…</p>:null}
      {dayTextQuery.error?<p className="scope-status scope-error">原始文字讀取失敗：{dayTextQuery.error.message}</p>:null}
      {(dayTextQuery.data||[]).length?<div className="scope-ranking">
        {dayTextQuery.data.map(row=><div key={row.uid} style={{display:'block'}}>
          <strong>{row.title||'未命名作品'}</strong>
          <p className="scope-status">{row.source_name||'文字來源'}・{row.character_count.toLocaleString()} 字元・{new Date(row.createtime).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>
          <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.excerpt||'（無可顯示內容）'}</p>
          <a href={galaxyIdentityHref(row.scope_id,row.uid)}>查看作品與原始內容</a>
        </div>)}
      </div>:!dayTextQuery.isFetching&&!context.sameDayWorks.length?<p className="scope-status">當日沒有可對照的公開文字作品。</p>:null}
      <p className="scope-status">這裡的作品密度是「篇數」，文字摘錄與字元數只在選定日期讀取；尚未將作品數誤稱為總文字量，也不對文字情緒或抽符之間宣稱因果。</p>
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
