'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeDensityRows,selectSourceTrendRows} from '../../loc/galaxy-query';
import {selectRune66Classification} from '../../loc/rune66-keyword-analysis';
import {selectManagedScopes} from '../../loc/scope-data';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state';
import {useScopeRuntime} from '../use-scope-runtime';
import {FeaturePage} from '../ui';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_ACCENT='var(--loc-accent)';
const CHART_TEXT='var(--loc-text)';
const CHART_GRID='var(--loc-line)';
const CHART_TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const CHART_TYPES=[['line',UI_COPY.statistics.line],['bar',UI_COPY.statistics.bar],['pie',UI_COPY.statistics.pie]];
const STAT_TYPES=['total','source'];
const STAT_TYPE_LABELS=Object.freeze({total:UI_COPY.statistics.totalSource,source:UI_COPY.statistics.workSource});
const STYLE_FILTERS=Object.freeze([{value:'none',label:'不套用'},{value:'rune66',label:'符文66'}]);
const SOURCE_TREND_ORDER=Object.freeze(['Facebook','Threads','IG','Others']);
const TIME_STANDARDS=Object.freeze([
  {value:'1y',label:UI_COPY.statistics.year,months:12,bucket:'month'},
  {value:'1m',label:UI_COPY.statistics.month,months:1,bucket:'day'},
  {value:'1w',label:UI_COPY.statistics.week,days:6,bucket:'day'},
  {value:'custom',label:UI_COPY.statistics.custom,bucket:'auto'}
]);

function dateKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}
function shiftDate(value,{months=0,days=0}={}){
  const key=dateKey(value);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  if(months)date.setUTCMonth(date.getUTCMonth()+months);
  if(days)date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
function taipeiDateKey(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'Asia/Taipei',
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).formatToParts(date);
    const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }catch{
    return date.toISOString().slice(0,10);
  }
}
function statisticsQueryRange(standard='1y',customRange={},endDate=taipeiDateKey()){
  if(standard==='custom'){
    const startDate=dateKey(customRange.from);
    const customEnd=dateKey(customRange.to);
    return startDate&&customEnd&&startDate<=customEnd
      ?{startDate,endDate:customEnd}
      :{startDate:'',endDate:''};
  }
  const config=TIME_STANDARDS.find(item=>item.value===standard)||TIME_STANDARDS[0];
  const startDate=Number.isFinite(config.days)
    ?shiftDate(endDate,{days:-config.days})
    :shiftDate(endDate,{months:-config.months});
  return {startDate,endDate};
}
function dayDistance(from,to){
  const a=new Date(from+'T00:00:00Z').getTime();
  const b=new Date(to+'T00:00:00Z').getTime();
  return Math.max(0,Math.round((b-a)/86400000));
}
function trendBucket(value,unit){
  const key=dateKey(value);
  if(!key)return null;
  const date=new Date(key+'T00:00:00Z');
  const year=date.getUTCFullYear();
  const month=date.getUTCMonth();
  if(unit==='month'){
    const monthText=String(month+1).padStart(2,'0');
    const end=new Date(Date.UTC(year,month+1,0)).toISOString().slice(0,10);
    return {key:year+'-'+monthText,label:year+'/'+monthText,start:year+'-'+monthText+'-01',end};
  }
  if(unit==='week'){
    const day=date.getUTCDay();
    date.setUTCDate(date.getUTCDate()+(day===0?-6:1-day));
    const start=date.toISOString().slice(0,10);
    const endDate=new Date(date);endDate.setUTCDate(endDate.getUTCDate()+6);
    return {key:start,label:start.slice(5).replace('-','/'),start,end:endDate.toISOString().slice(0,10)};
  }
  return {key,label:key.slice(5).replace('-','/'),start:key,end:key};
}
function statisticsWindow(rows=[],standard='1y',customRange={}){
  const dates=rows.map(row=>dateKey(row.day)).filter(Boolean).sort();
  const dataStart=dates[0]||'';
  const dataEnd=dates.at(-1)||'';
  if(!dataEnd)return {startDate:'',endDate:'',bucket:'day'};
  if(standard==='custom'){
    const from=dateKey(customRange.from);
    const to=dateKey(customRange.to);
    if(!from||!to||from>to)return {startDate:'',endDate:'',bucket:'day'};
    const startDate=dataStart&&from<dataStart?dataStart:from;
    const endDate=to>dataEnd?dataEnd:to;
    if(startDate>endDate)return {startDate:'',endDate:'',bucket:'day'};
    const days=dayDistance(startDate,endDate);
    return {startDate,endDate,bucket:days>730?'month':days>90?'week':'day'};
  }
  const config=TIME_STANDARDS.find(item=>item.value===standard)||TIME_STANDARDS[0];
  const requestedStart=Number.isFinite(config.days)
    ?shiftDate(dataEnd,{days:-config.days})
    :shiftDate(dataEnd,{months:-config.months});
  const startDate=dataStart&&requestedStart<dataStart?dataStart:requestedStart;
  return {startDate,endDate:dataEnd,bucket:config.bucket};
}
function rowsInWindow(rows=[],standard='1y',customRange={}){
  const window=statisticsWindow(rows,standard,customRange);
  if(!window.startDate||!window.endDate)return {rows:[],...window};
  return {
    ...window,
    rows:rows.filter(row=>{
      const day=dateKey(row.day);
      return day&&day>=window.startDate&&day<=window.endDate;
    })
  };
}
function buildSourceTrend(rows=[],standard='1y',customRange={}){
  const window=rowsInWindow(rows,standard,customRange);
  if(!window.startDate||!window.endDate)return [];
  const buckets=new Map();
  for(let cursor=new Date(window.startDate+'T00:00:00Z'),end=new Date(window.endDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const day=cursor.toISOString().slice(0,10);
    const bucket=trendBucket(day,window.bucket);
    if(!bucket||buckets.has(bucket.key))continue;
    buckets.set(bucket.key,{period:bucket.label,_sort:bucket.key,start_date:bucket.start,end_date:bucket.end,total:0});
  }
  for(const row of window.rows){
    const bucket=trendBucket(row.day,window.bucket);
    if(!bucket)continue;
    const item=buckets.get(bucket.key)||{period:bucket.label,_sort:bucket.key,start_date:bucket.start,end_date:bucket.end,total:0};
    const source=SOURCE_TREND_ORDER.includes(row.source)?row.source:'Others';
    const count=Number(row.item_count)||0;
    item[source]=(Number(item[source])||0)+count;
    item.total+=count;
    buckets.set(bucket.key,item);
  }
  return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort)).map(item=>{
    const output={period:item.period,start_date:item.start_date,end_date:item.end_date,total:item.total};
    for(const source of SOURCE_TREND_ORDER){
      output[source]=item.total>0?Number((((Number(item[source])||0)/item.total)*100).toFixed(2)):0;
    }
    return output;
  });
}
function buildSummary(rows=[],standard='1y',customRange={}){
  const window=rowsInWindow(rows,standard,customRange);
  const totals=new Map(SOURCE_TREND_ORDER.map(source=>[source,0]));
  let total=0;
  for(const row of window.rows){
    const source=SOURCE_TREND_ORDER.includes(row.source)?row.source:'Others';
    const count=Number(row.item_count)||0;
    totals.set(source,(totals.get(source)||0)+count);
    total+=count;
  }
  return {
    total,
    sources:SOURCE_TREND_ORDER.map(source=>({term:source,item_count:totals.get(source)||0})),
    startDate:window.startDate,
    endDate:window.endDate
  };
}

function SummaryList({rankingType,summary}){
  const rows=rankingType==='total'
    ?[{term:UI_COPY.statistics.totalSource,item_count:summary.total}]
    :summary.sources;
  return <div className="scope-ranking">
    {rows.map(row=><div key={row.term}><strong>{row.term}</strong><span>{Number(row.item_count||0).toLocaleString()}</span></div>)}
  </div>;
}
function SummaryChart({type='bar',rankingType,summary,height=380}){
  const data=rankingType==='total'
    ?[{term:UI_COPY.statistics.totalSource,value:summary.total}]
    :summary.sources.map(row=>({term:row.term,value:Number(row.item_count)||0}));
  if(!data.length)return <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>;
  if(type==='pie')return <ResponsiveContainer width="100%" height={height}>
    <PieChart><Tooltip contentStyle={CHART_TOOLTIP}/><Pie data={data} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={Math.min(140,height/2-26)}>
      {data.map((row,index)=><Cell key={row.term} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
    </Pie></PieChart>
  </ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{top:8,right:18,bottom:32,left:8}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="term" tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <Tooltip contentStyle={CHART_TOOLTIP}/>
      <Bar dataKey="value" fill={CHART_ACCENT} radius={[4,4,0,0]}/>
    </BarChart>
  </ResponsiveContainer>;
}
function TotalTrendChart({rows=[],standard='1y',customRange={},height=420}){
  const data=useMemo(()=>buildSourceTrend(rows,standard,customRange),[rows,standard,customRange]);
  if(!data.length)return <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:48,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <Tooltip contentStyle={CHART_TOOLTIP} formatter={value=>[Number(value).toLocaleString()+' 項',UI_COPY.statistics.totalSource]}/>
      <Line type="monotone" dataKey="total" name="總來源" stroke={CHART_ACCENT} strokeWidth={3} dot={false}/>
    </LineChart>
  </ResponsiveContainer>;
}
function SourceTrendChart({rows=[],standard='1y',customRange={},height=420}){
  const data=useMemo(()=>buildSourceTrend(rows,standard,customRange),[rows,standard,customRange]);
  if(!data.length)return <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:48,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis domain={[0,100]} tick={{fill:CHART_TEXT}} stroke={CHART_GRID} tickFormatter={value=>value+'%'}/>
      <Tooltip contentStyle={CHART_TOOLTIP} formatter={value=>[Number(value).toFixed(1)+'%']}/>
      <Legend/>
      {SOURCE_TREND_ORDER.map((source,index)=><Line key={source} type="monotone" dataKey={source} stroke={PIE_COLORS[index%PIE_COLORS.length]} strokeWidth={2} dot={false} connectNulls/>)}
    </LineChart>
  </ResponsiveContainer>;
}

function classLabel(value){
  const text=String(value||'').trim();
  return !text?'':text.endsWith('群組')?text:text+'群組';
}
function groupLabel(value){
  const text=String(value||'').trim();
  return !text?'':text.endsWith('符文')?text:text+'之符文';
}
function Rune66Summary({analysis}){
  const data=analysis||{};
  const classRows=[...(data.groupTotals||[])]
    .filter(row=>Number(row.document_count||0)>0)
    .sort((a,b)=>Number(b.document_count||0)-Number(a.document_count||0)||Number(a.order||0)-Number(b.order||0));
  const groupRows=[...(data.runeRanking||[])]
    .filter(row=>Number(row.document_count||0)>0)
    .sort((a,b)=>Number(b.document_count||0)-Number(a.document_count||0)||Number(a.rune_id||0)-Number(b.rune_id||0));
  const classifiedTotal=Math.max(0,Number(data.classifiedCount||0));
  const groupHitTotal=groupRows.reduce((sum,row)=>sum+Number(row.document_count||0),0);
  return <div className="scope-rune66-summary">
    <p className="scope-status">表現風格：符文66 · 分析作品 {Number(data.documentCount||0).toLocaleString()} 項 · 已分類 {classifiedTotal.toLocaleString()} · 未分類 {Number(data.unclassifiedCount||0).toLocaleString()}</p>
    <section className="scope-card">
      <h3>Class｜符文群組</h3>
      <p className="scope-status">每篇作品只保留一個唯一 Class；比例以已分類作品數計算。</p>
      <div className="scope-ranking">
        {classRows.map(row=>{
          const count=Number(row.document_count||0);
          const ratio=classifiedTotal>0?(count/classifiedTotal)*100:0;
          return <div key={row.group}><strong>{classLabel(row.group)}</strong><span>{count.toLocaleString()} 篇 · {ratio.toFixed(1)}%</span></div>;
        })}
      </div>
      {classRows.length?<ResponsiveContainer width="100%" height={360}>
        <BarChart data={classRows.map(row=>({label:classLabel(row.group),value:Number(row.document_count)||0}))} margin={{top:8,right:18,bottom:28,left:8}}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
          <XAxis dataKey="label" tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <Tooltip contentStyle={CHART_TOOLTIP}/>
          <Bar dataKey="value" name="Class 作品數" fill={CHART_ACCENT} radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer>:null}
    </section>
    <section className="scope-card">
      <h3>Group｜符文排行</h3>
      <p className="scope-status">同篇作品的同一符文只計 1 次。</p>
      <div className="scope-ranking">
        {groupRows.map(row=>{
          const count=Number(row.document_count||0);
          const ratio=groupHitTotal>0?(count/groupHitTotal)*100:0;
          return <div key={row.rune_id}><strong>{String(row.rune_id).padStart(2,'0')} · {groupLabel(row.label)}</strong><span>{count.toLocaleString()} 次 · {ratio.toFixed(1)}%</span></div>;
        })}
      </div>
    </section>
  </div>;
}

function StatisticTypeSelect({scopeId,navigation,types}){
  const router=useRouter();
  const requested=String(navigation.rankingType||'');
  const active=types.includes(requested)?requested:(types[0]||'');
  if(!types.length)return null;
  return <label>
    <span>{UI_COPY.statistics.item}</span>
    <select id="statistics-ranking-type" className="scope-select" value={active} onChange={event=>{
      const value=event.target.value;
      if(!value||value===active)return;
      router.push(featureNavigationHref(scopeId,'statics',{...navigation,rankingType:value}));
    }}>
      {types.map(value=><option key={value} value={value}>{STAT_TYPE_LABELS[value]||value}</option>)}
    </select>
  </label>;
}

function ScopeGroupStatistics(){
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectManagedScopes,
    staleTime:5*60_000
  });
  const scopes=scopesQuery.data||[];
  const endDate=useMemo(()=>taipeiDateKey(),[]);
  const startDate=useMemo(()=>shiftDate(endDate,{months:-12}),[endDate]);
  const densityQuery=useQuery({
    queryKey:['scope-density','loc',startDate,endDate],
    queryFn:()=>selectScopeDensityRows(scopes,{startDate,endDate}),
    enabled:Boolean(scopes.length),
    staleTime:5*60_000
  });
  const scopeIds=useMemo(()=>[...new Set((densityQuery.data||[]).map(row=>row.scope_id))].sort(),[densityQuery.data]);
  const totals=useMemo(()=>{
    const map=new Map(scopeIds.map(id=>[id,0]));
    for(const row of densityQuery.data||[])map.set(row.scope_id,(map.get(row.scope_id)||0)+(Number(row.item_count)||0));
    return scopeIds.map(id=>({scope_id:id,total:map.get(id)||0}));
  },[densityQuery.data,scopeIds]);
  const monthly=useMemo(()=>{
    const map=new Map();
    for(const row of densityQuery.data||[]){
      const month=String(row.day||'').slice(0,7);
      if(!month)continue;
      if(!map.has(month))map.set(month,{period:month});
      const item=map.get(month);
      item[row.scope_id]=(Number(item[row.scope_id])||0)+(Number(row.item_count)||0);
    }
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([,row])=>row);
  },[densityQuery.data]);

  return <section className="scope-stat-section">
    <div className="scope-ranking">
      {totals.map(row=><div key={row.scope_id}><strong>{row.scope_id}</strong><span>{row.total.toLocaleString()}</span></div>)}
    </div>
    {monthly.length?<ResponsiveContainer width="100%" height={420}>
      <LineChart data={monthly} margin={{top:8,right:18,bottom:48,left:4}}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
        <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
        <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
        <Tooltip contentStyle={CHART_TOOLTIP}/>
        <Legend/>
        {scopeIds.map((id,index)=><Line key={id} type="monotone" dataKey={id} name={id} stroke={PIE_COLORS[index%PIE_COLORS.length]} strokeWidth={2} dot={false} connectNulls/>)}
      </LineChart>
    </ResponsiveContainer>:null}
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error)}</p>:null}
    {densityQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(densityQuery.error)}</p>:null}
  </section>;
}

function ScopeStatisticsPanel({scopeId,navigation,types}){
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const [chartType,setChartType]=useState('line');
  const [timeStandard,setTimeStandard]=useState('1y');
  const [customFrom,setCustomFrom]=useState('');
  const [customTo,setCustomTo]=useState('');
  const [styleFilter,setStyleFilter]=useState(scopeId==='lo3rwang'?'rune66':'none');
  const customRange=useMemo(()=>({from:customFrom,to:customTo}),[customFrom,customTo]);
  const queryEndDate=useMemo(()=>taipeiDateKey(),[]);
  const effectiveTimeStandard=timeStandard;
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectManagedScopes,
    staleTime:5*60_000
  });
  const targetScopes=useMemo(()=>{
    const scopes=scopesQuery.data||[];
    return scopes.filter(scope=>scope.id===scopeId);
  },[scopeId,scopesQuery.data]);
  const customReady=effectiveTimeStandard!=='custom'||Boolean(dateKey(customFrom)&&dateKey(customTo)&&customFrom<=customTo);
  const queryRange=useMemo(
    ()=>statisticsQueryRange(effectiveTimeStandard,customRange,queryEndDate),
    [effectiveTimeStandard,customRange,queryEndDate]
  );
  const trendQuery=useQuery({
    queryKey:['statistics-source-trend',scopeId,effectiveTimeStandard,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectSourceTrendRows(targetScopes,queryRange),
    enabled:Boolean(rankingType)&&Boolean(targetScopes.length)&&customReady&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  const summary=useMemo(()=>buildSummary(trendQuery.data||[],effectiveTimeStandard,customRange),[trendQuery.data,effectiveTimeStandard,customRange]);
  const styleRange=useMemo(()=>({
    startDate:summary.startDate||'',
    endDate:summary.endDate||''
  }),[summary.startDate,summary.endDate]);
  const runeQuery=useQuery({
    queryKey:['statistics-style-filter','rune66',scopeId,styleRange.startDate,styleRange.endDate],
    queryFn:()=>selectRune66Classification(styleRange),
    enabled:scopeId==='lo3rwang'&&styleFilter==='rune66'&&Boolean(styleRange.startDate&&styleRange.endDate),
    staleTime:5*60_000
  });

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading"><div><h2>{UI_COPY.statistics.result}</h2></div></header>
    <div className="scope-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      <label><span>{UI_COPY.statistics.chart}</span><select className="scope-select" value={chartType} onChange={event=>setChartType(event.target.value)}>
        {CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select></label>
      <label><span>{UI_COPY.statistics.range}</span><select className="scope-select" value={timeStandard} onChange={event=>setTimeStandard(event.target.value)}>
        {TIME_STANDARDS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
      {timeStandard==='custom'?<>
        <label><span>{UI_COPY.statistics.start}</span><input className="scope-input" type="date" value={customFrom} onChange={event=>setCustomFrom(event.target.value)}/></label>
        <label><span>{UI_COPY.statistics.end}</span><input className="scope-input" type="date" value={customTo} onChange={event=>setCustomTo(event.target.value)}/></label>
      </>:null}
      {scopeId==='lo3rwang'?<label><span>表現風格</span><select className="scope-select" value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}>
        {STYLE_FILTERS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>:null}
    </div>
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error)}</p>:null}
    {trendQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(trendQuery.error)}</p>:null}
    {timeStandard==='custom'&&!customReady?<p className="scope-status">請設定有效的開始與結束日期。</p>:null}
    {!trendQuery.isPending&&!trendQuery.error&&customReady?<>
      <p className="scope-status">{summary.startDate&&summary.endDate?summary.startDate+' ～ '+summary.endDate:''}</p>
      <SummaryList rankingType={rankingType} summary={summary}/>
      {chartType==='line'
        ?rankingType==='total'
          ?<TotalTrendChart rows={trendQuery.data||[]} standard={effectiveTimeStandard} customRange={customRange} height={420}/>
          :<SourceTrendChart rows={trendQuery.data||[]} standard={effectiveTimeStandard} customRange={customRange} height={420}/>
        :<SummaryChart type={chartType} rankingType={rankingType} summary={summary} height={380}/>}
    </>:null}
    {styleFilter==='rune66'?<>
      {runeQuery.isPending?<p className="scope-status">正在套用符文66表現風格…</p>:null}
      {runeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error&&runeQuery.data?<Rune66Summary analysis={runeQuery.data}/>:null}
    </>:null}
  </section>;
}

function StatisticsPanel({scopeId,aggregateScopes=false,navigation,types}){
  return aggregateScopes
    ?<ScopeGroupStatistics/>
    :<ScopeStatisticsPanel scopeId={scopeId} navigation={navigation} types={types}/>;
}

export default function Statistics(){
  const {scopeId,scope}=useScopeRuntime();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <StatisticsPanel scopeId={scopeId} aggregateScopes={Boolean(scope?.aggregateChildren)} navigation={navigation} types={STAT_TYPES}/>
    </section>
  </FeaturePage>;
}
