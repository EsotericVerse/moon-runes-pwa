'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Line,LineChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectDailyRuneRange} from '../loc/daily-runes';
import {realMoonPhase} from '../loc/model/moon-phase';
import {buildReferencedMoonRiver} from './daily-moon-river.mjs';
import CultureTimeline from '../modular/modules/culture-timeline/CultureTimeline';
import {
  DAILY_RUNE_MODES,DAILY_DIRECTIONS,normalizeDailyDraws,rankDailyDraws,pageDailyRanking,
  summarizeDailyDraws,dailyCategoryTrend
} from './daily-analytics-model.mjs';

const PHASE_DATE_TIME='T12:00:00+08:00';
const FOCUS=Object.freeze({});
const COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const DRAW_LABELS=Object.freeze({main:'主抽',supplement:'補抽',history_1:'歷史紀錄一',history_2:'歷史紀錄二'});
const DRAW_ORDER=Object.freeze({main:0,supplement:1,history_1:2,history_2:3});
const TIME_OPTIONS=Object.freeze([
  {value:'1y',label:'最近一年'},
  {value:'1m',label:'最近一個月'},
  {value:'1w',label:'最近一週'},
  {value:'custom',label:'指定日期區間'}
]);

function todayInTaipei(){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date());
    const items=Object.fromEntries(parts.filter(item=>item.type!=='literal').map(item=>[item.type,item.value]));
    return items.year+'-'+items.month+'-'+items.day;
  }catch{return new Date().toISOString().slice(0,10);}
}
function offsetDate(day,{months=0,days=0}={}){
  const date=new Date(day+'T00:00:00Z');
  if(months)date.setUTCMonth(date.getUTCMonth()+months);
  if(days)date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
function resolveRange(mode,customFrom,customTo){
  const today=todayInTaipei();
  if(mode==='custom'){
    const from=String(customFrom||'').slice(0,10);
    const to=String(customTo||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)return null;
    return {startDate:from,endDate:to};
  }
  return {
    startDate:mode==='1m'?offsetDate(today,{months:-1}):mode==='1w'?offsetDate(today,{days:-6}):offsetDate(today,{months:-12}),
    endDate:today
  };
}
function useDailyRuneWindow(mode,customFrom,customTo){
  const range=useMemo(()=>resolveRange(mode,customFrom,customTo),[mode,customFrom,customTo]);
  const query=useQuery({
    queryKey:['lrunes-daily-analytics',range?.startDate,range?.endDate],
    queryFn:()=>selectDailyRuneRange(range),
    enabled:Boolean(range),
    staleTime:60_000
  });
  const draws=useMemo(()=>normalizeDailyDraws(query.data||[],date=>
    realMoonPhase(new Date(date+PHASE_DATE_TIME))
  ),[query.data]);
  return {range,query,draws};
}
function RangeControls({mode,setMode,from,setFrom,to,setTo}){
  return <div className="scope-stat-controls">
    <label><span>統計區間</span>
      <select className="scope-select" value={mode} onChange={event=>setMode(event.target.value)}>
        {TIME_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    {mode==='custom'?<>
      <label><span>開始日期</span><input className="scope-input" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label>
      <label><span>結束日期</span><input className="scope-input" type="date" value={to} onChange={event=>setTo(event.target.value)}/></label>
    </>:null}
  </div>;
}
function queryMessage(query,range){
  if(!range)return '請指定有效的開始與結束日期。';
  if(query.error)return '每日符文讀取失敗：'+String(query.error?.message||query.error);
  if(query.isPending)return '正在讀取每日符文…';
  return '';
}
function groupLabel(row){
  return DRAW_LABELS[row.draw_kind]||'其他歷史紀錄';
}
function nextDay(date){return offsetDate(date,{days:1});}
function riverLabel(row){return String(row?.display_label||'');}

export function LrunesDailyCulturePanel(){
  const [mode,setMode]=useState('1y');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [selected,setSelected]=useState(null);
  const {range,query,draws}=useDailyRuneWindow(mode,from,to);
  const summary=useMemo(()=>summarizeDailyDraws(draws),[draws]);
  const moonItems=useMemo(()=>range&&query.isSuccess?buildReferencedMoonRiver(
    range.startDate,range.endDate,[{scopeId:'lrunes',source:'daily:rune'}],
    date=>realMoonPhase(new Date(date+PHASE_DATE_TIME)),draws.length
  ):[],[range?.startDate,range?.endDate,query.isSuccess,draws.length]);
  const drawItems=useMemo(()=>draws.map((row,index)=>({
    id:'daily-rune:'+row.record_date+':'+row.draw_kind+':'+index,
    entry_id:'daily-rune:'+row.record_date+':'+row.draw_kind+':'+index,
    entry_type:'daily_rune',
    group_label:groupLabel(row),
    group_order:DRAW_ORDER[row.draw_kind]??4,
    start_date:row.record_date,
    end_date:nextDay(row.record_date),
    display_label:row.rune_name+' · '+row.direction+' · '+row.phase,
    title:row.record_date+' · '+groupLabel(row)+' · '+row.rune_name+' · '+row.direction+' · '+row.phase+(row.phase_inferred?'（依紀錄日期推算）':''),
    item_count:1,
    daily_record:row
  })),[draws]);
  const items=useMemo(()=>[...moonItems,...drawItems],[moonItems,drawItems]);
  const message=queryMessage(query,range);
  return <section className="scope-card scope-culture-classification-river">
    <h3>每日符文｜時間長河</h3>
    <p className="scope-status">當所選區間有每日符文紀錄，才在上方附帶一條天時月相河道；以月相變動日期作事件定錨，延續至下一次變動，中間無抽符的日期仍連續。若此區間完全沒有每日符文紀錄，就不顯示月相河道。下方保留符文名稱、四向方向與主抽／補抽／歷史紀錄。既有臺灣農曆五段式日期規則為日級推算，不代表精確天文時刻；不併入 Galaxy 作品數量。</p>
    <RangeControls mode={mode} setMode={setMode} from={from} setFrom={setFrom} to={to} setTo={setTo}/>
    {message?<p className="scope-status">{message}</p>:null}
    {!message?<p className="scope-status">{range.startDate} ～ {range.endDate} · {summary.dayCount} 個紀錄日 · {summary.recordCount} 筆抽取紀錄</p>:null}
    {range&&items.length?<CultureTimeline
      items={items}
      labelOf={riverLabel}
      focus={FOCUS}
      mode="source"
      windowStart={range.startDate}
      windowEnd={nextDay(range.endDate)}
      onSelect={item=>setSelected(item?.raw?.daily_record||null)}
    />:null}
    {!message&&!drawItems.length?<p className="scope-status">目前區間沒有每日符文紀錄，因此不顯示月相河道。</p>:null}
    {selected?<p className="scope-status">所選紀錄：{selected.record_date} · {groupLabel(selected)} · {selected.rune_name} · {selected.direction} · {selected.phase}{selected.phase_inferred?'（依日期推算）':''}</p>:null}
  </section>;
}

export function LrunesDailyStatisticsPanel(){
  const [mode,setMode]=useState('1y');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [analysisMode,setAnalysisMode]=useState('rune');
  const [page,setPage]=useState(1);
  const [chart,setChart]=useState('bar');
  const {range,query,draws}=useDailyRuneWindow(mode,from,to);
  const ranking=useMemo(()=>rankDailyDraws(draws,analysisMode),[draws,analysisMode]);
  const pagination=useMemo(()=>pageDailyRanking(ranking,page),[ranking,page]);
  const summary=useMemo(()=>summarizeDailyDraws(draws),[draws]);
  const featured=useMemo(()=>pagination.rows.slice(0,5),[pagination.rows]);
  const timeline=useMemo(()=>dailyCategoryTrend(draws,analysisMode,featured,mode==='1y'?'month':'day',range?.startDate,range?.endDate),[draws,analysisMode,featured,mode,range?.startDate,range?.endDate]);
  const bars=useMemo(()=>pagination.rows.map(row=>({label:row.label,value:row.count})),[pagination.rows]);
  const directionSummary=useMemo(()=>analysisMode==='direction'&&ranking.length
    ?DAILY_DIRECTIONS.map(direction=>{
      const item=ranking.find(row=>row.direction===direction);
      return direction+' '+Number(item?.count||0).toLocaleString()+' 次（'+Number(item?.ratio||0).toFixed(1)+'%）';
    }).join('、')
    :'',[analysisMode,ranking]);
  const message=queryMessage(query,range);
  return <>
    <div className="scope-stat-controls">
      <label><span>每日符文分析模式</span>
        <select className="scope-select" value={analysisMode} onChange={event=>{setAnalysisMode(event.target.value);setPage(1);}}>
          {DAILY_RUNE_MODES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label><span>圖表</span>
        <select className="scope-select" value={chart} onChange={event=>setChart(event.target.value)}>
          <option value="bar">排行長條圖</option>
          <option value="line">{analysisMode==='direction'?'四種位向時間趨勢':'本頁前五名時間趨勢'}</option>
        </select>
      </label>
    </div>
    <RangeControls mode={mode} setMode={value=>{setMode(value);setPage(1);}} from={from} setFrom={value=>{setFrom(value);setPage(1);}} to={to} setTo={value=>{setTo(value);setPage(1);}}/>
    <p className="scope-status">以每日符文實際抽取紀錄為基準，四種統計可獨立比較：符文本體、符文本體 × 位向、位向、符文本體 × 位向 × 真實月相。「符文本體」合併所有位向與月相；「位向」合併所有符文，固定顯示四向（含零次），可配合「最近一週／最近一個月」和時間趨勢觀察近期分布。各組合只統計實際出現者，每頁最多 20 名；月相優先沿用紀錄值，缺漏時依紀錄日期做日級推算，不代表精確天文時刻。</p>
    {message?<p className="scope-status">{message}</p>:null}
    {!message?<>
      <p className="scope-status">{range.startDate} ～ {range.endDate} · {summary.dayCount} 個紀錄日 · {summary.recordCount} 筆抽取 · {ranking.length} 種實際出現的組合</p>
      {directionSummary?<p className="scope-status">所選期間四向分布：{directionSummary}。正逆位向屬符文詮釋維度，可協助觀察阻滯與推進的近期變化，但不能單憑比例判定實際事件或未來走向。</p>:null}
      {!ranking.length?<p className="scope-status">目前區間沒有每日符文紀錄。</p>:null}
      {ranking.length?<><div className="scope-ranking">
        {pagination.rows.map((row,index)=><div key={row.key}>
          <strong>{(pagination.currentPage-1)*pagination.pageSize+index+1}. {row.label}</strong>
          <span>{row.count.toLocaleString()} 次 · {row.ratio.toFixed(1)}%</span>
        </div>)}
      </div>
      {pagination.totalPages>1?<nav className="scope-stat-controls" aria-label="每日符文排行榜分頁">
        <button type="button" className="loc-button" disabled={pagination.currentPage===1} onClick={()=>setPage(current=>Math.max(1,current-1))}>上一頁</button>
        <span className="scope-status">第 {pagination.currentPage} / {pagination.totalPages} 頁（每頁最多 20 筆）</span>
        <button type="button" className="loc-button" disabled={pagination.currentPage===pagination.totalPages} onClick={()=>setPage(current=>Math.min(pagination.totalPages,current+1))}>下一頁</button>
      </nav>:null}
      {chart==='bar'?<ResponsiveContainer width="100%" height={Math.max(220,bars.length*29+50)}>
        <BarChart data={bars} layout="vertical" margin={{top:8,right:16,bottom:8,left:4}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/>
          <XAxis type="number" allowDecimals={false} tick={{fill:'var(--loc-text)'}}/>
          <YAxis type="category" dataKey="label" width={analysisMode==='triple'?195:analysisMode==='rune_direction'?135:82} tick={{fill:'var(--loc-text)',fontSize:12}}/>
          <Tooltip contentStyle={{background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)'}}/>
          <Bar dataKey="value" name="抽取次數" fill="var(--loc-accent)" radius={[0,4,4,0]}/>
        </BarChart>
      </ResponsiveContainer>:<ResponsiveContainer width="100%" height={340}>
        <LineChart data={timeline} margin={{top:8,right:16,bottom:40,left:4}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--loc-line)"/>
          <XAxis dataKey="period" tick={{fill:'var(--loc-text)'}} angle={-20} textAnchor="end" height={65}/>
          <YAxis allowDecimals={false} tick={{fill:'var(--loc-text)'}}/>
          <Tooltip contentStyle={{background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)'}}/>
          {featured.map((row,index)=><Line key={row.key} type="monotone" dataKey={row.key} name={row.label} stroke={COLORS[index%COLORS.length]} strokeWidth={2} dot={false}/>)}
        </LineChart>
      </ResponsiveContainer>}</>:null}
    </>:null}
  </>;
}
