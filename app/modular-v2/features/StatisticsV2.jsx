'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import Select from 'react-select';
import {
  Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeAnchorDates,selectScopeRankingRows,selectScopeRankingTypes,selectScopeSourceBucketDetails,selectScopeSourceTrendRows} from '../../loc/neon-ranking-client';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import MediaMetaSettingsV2 from './MediaMetaSettingsV2';
import FeaturePageV2 from '../FeaturePageV2';
import IncrementalListV2 from '../IncrementalListV2';
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_ACCENT='var(--loc-accent)';
const CHART_TEXT='var(--loc-text)';
const CHART_GRID='var(--loc-line)';
const CHART_TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const CHART_TYPES=[['line','折線圖'],['bar','長條圖'],['pie','圓餅圖']];
const STAT_TABS=[['ranking','統計'],['media','多媒體設定']];
const STAT_TYPE_LABELS=Object.freeze({
  total:'總來源',
  source:'作品來源'
});
const SOURCE_TREND_ORDER=Object.freeze(['Facebook','Threads','IG','Others']);
const TIME_STANDARDS=Object.freeze([
  {value:'10y',label:'10 年',months:120,bucket:'month'},
  {value:'5y',label:'5 年',months:60,bucket:'month'},
  {value:'3y',label:'3 年',months:36,bucket:'month'},
  {value:'1y',label:'1 年',months:12,bucket:'week'},
  {value:'6m',label:'半年',months:6,bucket:'week'},
  {value:'3m',label:'一季',months:3,bucket:'week'},
  {value:'1m',label:'一月',months:1,bucket:'day'},
  {value:'1w',label:'一週',days:6,bucket:'day'}
]);
function dateKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}
function subtractMonths(value,months){
  const key=dateKey(value);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth()-Math.max(0,Number(months)||0));
  return date.toISOString().slice(0,10);
}
function subtractDays(value,days){
  const key=dateKey(value);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()-Math.max(0,Number(days)||0));
  return date.toISOString().slice(0,10);
}
function trendBucket(value,unit){
  const key=dateKey(value);
  if(!key)return null;
  const date=new Date(key+'T00:00:00Z');
  const year=date.getUTCFullYear();
  const month=date.getUTCMonth();
  if(unit==='quarter'){
    const quarter=Math.floor(month/3)+1;
    const start=new Date(Date.UTC(year,(quarter-1)*3,1));
    const end=new Date(Date.UTC(year,quarter*3,0));
    return {key:year+'-Q'+quarter,label:year+' Q'+quarter,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
  }
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
function buildSourceTrend(rows=[],standard='10y'){
  const config=TIME_STANDARDS.find(item=>item.value===standard)||TIME_STANDARDS[0];
  const dates=rows.map(row=>dateKey(row.day)).filter(Boolean).sort();
  const endDate=dates.at(-1)||'';
  if(!endDate)return [];
  const startDate=Number.isFinite(config.days)
    ?subtractDays(endDate,config.days)
    :subtractMonths(endDate,config.months);
  const buckets=new Map();

  for(let cursor=new Date(startDate+'T00:00:00Z'),end=new Date(endDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const day=cursor.toISOString().slice(0,10);
    const bucket=trendBucket(day,config.bucket);
    if(!bucket||buckets.has(bucket.key))continue;
    buckets.set(bucket.key,{period:bucket.label,_sort:bucket.key,start_date:bucket.start,end_date:bucket.end,total:0});
  }

  for(const row of rows){
    const day=dateKey(row.day);
    if(!day||day<startDate||day>endDate)continue;
    const bucket=trendBucket(day,config.bucket);
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
const MONTHLY_VOLUME_CHANGE_RATIO=.10;
const FINE_VOLUME_CHANGE_RATIO=.25;
const MAJOR_VOLUME_MIN=10;

function rangeHasAnchor(anchorDates=[],from='',to=''){
  if(!from||!to)return false;
  return (anchorDates||[]).some(anchor=>{
    const date=dateKey(anchor?.date||anchor);
    return date&&date>=from&&date<=to;
  });
}
function rangesOverlap(a,b){
  return Boolean(a?.from&&a?.to&&b?.from&&b?.to&&a.from<=b.to&&b.from<=a.to);
}
function buildTrendSuggestions(rows=[],standard='10y',anchorDates=[]){
  const data=buildSourceTrend(rows,standard);
  if(data.length<2)return [];
  const config=TIME_STANDARDS.find(item=>item.value===standard)||TIME_STANDARDS[0];
  const volumeThreshold=config.bucket==='month'?MONTHLY_VOLUME_CHANGE_RATIO:FINE_VOLUME_CHANGE_RATIO;
  const minRunTransitions=config.bucket==='day'?3:2;
  const cliffRatio=.50;
  const candidates=[];

  const addCandidate=candidate=>{
    if(!candidate?.from||!candidate?.to)return;
    if(rangeHasAnchor(anchorDates,candidate.from,candidate.to))return;
    candidates.push(candidate);
  };

  let index=1;
  while(index<data.length){
    const previousTotal=Number(data[index-1].total)||0;
    const currentTotal=Number(data[index].total)||0;

    // Leading / internal zero runs are states, not repeated point suggestions.
    if(previousTotal===0){
      index+=1;
      continue;
    }

    // Collapse positive -> zero -> zero... into one structural break.
    if(currentTotal===0){
      let declineStart=index-1;
      while(declineStart>0){
        const before=Number(data[declineStart-1].total)||0;
        const at=Number(data[declineStart].total)||0;
        if(before<=0||at<=0||before<at)break;
        declineStart-=1;
      }
      let zeroEnd=index;
      while(zeroEnd+1<data.length&&(Number(data[zeroEnd+1].total)||0)===0)zeroEnd+=1;
      addCandidate({
        key:'zero|'+data[declineStart].start_date+'|'+data[index].end_date,
        kind:'zero',
        from:data[declineStart].start_date,
        to:data[index].end_date,
        previousTotal:Number(data[declineStart].total)||previousTotal,
        currentTotal:0,
        reason:declineStart<index-1?'總來源持續下降後歸零':'總來源降至 0',
        score:10000+(index-declineStart)*100+previousTotal
      });
      index=zeroEnd+1;
      continue;
    }

    // Build one monotonic trend run instead of suggesting every adjacent bucket.
    const initialDelta=currentTotal-previousTotal;
    if(initialDelta===0){
      index+=1;
      continue;
    }
    const direction=Math.sign(initialDelta);
    const runStart=index-1;
    let runEnd=index;
    while(runEnd+1<data.length){
      const at=Number(data[runEnd].total)||0;
      const next=Number(data[runEnd+1].total)||0;
      if(at<=0||next<=0)break;
      const delta=next-at;
      if(delta===0){
        runEnd+=1;
        continue;
      }
      if(Math.sign(delta)!==direction)break;
      runEnd+=1;
    }

    const startTotal=Number(data[runStart].total)||0;
    const endTotal=Number(data[runEnd].total)||0;
    const transitions=runEnd-runStart;
    const netRatio=startTotal>0?Math.abs(endTotal-startTotal)/startTotal:0;
    const largeEnough=netRatio>=volumeThreshold;
    const broadEnough=transitions>=minRunTransitions;
    const cliff=netRatio>=cliffRatio;

    if(startTotal>=MAJOR_VOLUME_MIN&&largeEnough&&(broadEnough||cliff)){
      addCandidate({
        key:'trend|'+data[runStart].start_date+'|'+data[runEnd].end_date,
        kind:'trend',
        from:data[runStart].start_date,
        to:data[runEnd].end_date,
        previousTotal:startTotal,
        currentTotal:endTotal,
        reason:'總來源'+(direction>0?'持續增加 ':'持續下降 ')+Math.round(netRatio*100)+'%',
        score:(cliff?7000:5000)+netRatio*1000+transitions*100
      });
    }
    index=runEnd+1;
  }

  // Nearby/overlapping signals describe the same structural change.
  // Keep only the strongest one, then return a small number of broad review ranges.
  const accepted=[];
  for(const candidate of candidates.sort((a,b)=>b.score-a.score||String(b.to).localeCompare(String(a.to)))){
    if(accepted.some(item=>rangesOverlap(item,candidate)))continue;
    accepted.push(candidate);
    if(accepted.length>=3)break;
  }
  return accepted.sort((a,b)=>String(a.from).localeCompare(String(b.from)));
}

function displayTerm(row){
  return String(row?.term||'');
}

function chartRows(rows){
  return (rows||[]).map(row=>({...row,term:displayTerm(row),value:Number(row.rank_value??row.item_count??0)||0}));
}

function RankingChart({type='bar',rows,height=380}){
  const data=chartRows(rows);
  if(!data.length)return <p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>;
  if(type==='line')return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:72,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="term" angle={-32} textAnchor="end" interval={0} height={100} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/><Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{color:CHART_TEXT}} itemStyle={{color:CHART_TEXT}}/>
      <Line type="monotone" dataKey="value" stroke={CHART_ACCENT} strokeWidth={3}/>
    </LineChart>
  </ResponsiveContainer>;
  if(type==='pie')return <ResponsiveContainer width="100%" height={height}>
    <PieChart><Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{color:CHART_TEXT}} itemStyle={{color:CHART_TEXT}}/><Pie data={data} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={Math.min(140,height/2-26)}>
      {data.map((row,index)=><Cell key={row.ranking_key||row.term||index} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
    </Pie></PieChart>
  </ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={Math.max(height,Math.min(1200,80+data.length*34))}>
    <BarChart data={data} layout="vertical" margin={{top:8,right:18,bottom:8,left:8}}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID}/>
      <XAxis type="number" tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/><YAxis type="category" dataKey="term" width={128} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/><Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{color:CHART_TEXT}} itemStyle={{color:CHART_TEXT}}/>
      <Bar dataKey="value" fill={CHART_ACCENT} radius={[0,4,4,0]}/>
    </BarChart>
  </ResponsiveContainer>;
}

function TotalTrendChart({rows=[],standard='10y',height=420}){
  const data=useMemo(()=>buildSourceTrend(rows,standard),[rows,standard]);
  if(!data.length)return <p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:48,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={{color:CHART_TEXT}} itemStyle={{color:CHART_TEXT}} formatter={value=>[Number(value).toLocaleString()+' 項','總來源']}/>
      <Line type="monotone" dataKey="total" name="總來源" stroke={CHART_ACCENT} strokeWidth={3} dot={false} connectNulls={false}/>
    </LineChart>
  </ResponsiveContainer>;
}

function SourceTrendChart({rows=[],standard='10y',height=420}){
  const data=useMemo(()=>buildSourceTrend(rows,standard),[rows,standard]);
  if(!data.length)return <p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:48,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis domain={[0,100]} tick={{fill:CHART_TEXT}} stroke={CHART_GRID} tickFormatter={value=>value+'%'}/>
      <Tooltip
        contentStyle={CHART_TOOLTIP}
        labelStyle={{color:CHART_TEXT}}
        itemStyle={{color:CHART_TEXT}}
        formatter={value=>[Number(value).toFixed(1)+'%']}
      />
      <Legend/>
      {SOURCE_TREND_ORDER.map((source,index)=><Line
        key={source}
        type="monotone"
        dataKey={source}
        stroke={PIE_COLORS[index%PIE_COLORS.length]}
        strokeWidth={2}
        dot={false}
        connectNulls
      />)}
    </LineChart>
  </ResponsiveContainer>;
}

function RankingList({rows=[],resetKey='',onVisibleRows=null,onSelect=null,selectedTerm=''}) {
  return <IncrementalListV2
    items={rows}
    batchSize={DEFAULT_LIST_BATCH_SIZE}
    resetKey={resetKey}
    className="scope-v2-ranking"
    empty={<p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>}
    onVisibleItemsChange={onVisibleRows}
    renderItem={(row,index)=>{
      const content=<><strong>{index+1}. {displayTerm(row)}</strong><span>{Number(row.item_count||0).toLocaleString()}</span></>;
      return onSelect
        ?<button type="button" key={row.ranking_key||row.term||index} aria-pressed={selectedTerm===row.term} onClick={()=>onSelect(row)}>{content}</button>
        :<div key={row.ranking_key||row.term||index}>{content}</div>;
    }}
  />;
}

function useRanking(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-ranking',scopeId,type,navigation.period||'all'],
    enabled:Boolean(type),
    queryFn:()=>selectScopeRankingRows(scopeId,{rankingType:type,navigation}),
    staleTime:30000
  });
}

function StatTabs({scopeId,navigation,active,tabs}){
  const router=useRouter();
  return <nav className="scope-v2-stat-tabs" aria-label="統計功能">
    {tabs.map(([value,label])=><button
      type="button"
      key={value}
      aria-current={active===value?'page':undefined}
      onClick={()=>router.push(featureNavigationHref(scopeId,'statics',{...navigation,statTab:value}))}
    >{label}</button>)}
  </nav>;
}

function StatisticTypeSelect({scopeId,navigation,types}){
  const router=useRouter();
  const requested=String(navigation.rankingType||'');
  const active=types.includes(requested)?requested:(types[0]||'');
  const options=types.map(value=>({value,label:STAT_TYPE_LABELS[value]||value}));
  const selected=options.find(option=>option.value===active)||options[0]||null;
  if(!types.length)return null;
  return <label className="scope-v2-react-select-field">
    <span>統計項目</span>
    <Select
      inputId="statistics-ranking-type"
      className="scope-v2-react-select"
      classNamePrefix="scope-v2-react-select"
      unstyled
      isSearchable
      options={options}
      value={selected}
      noOptionsMessage={()=>"沒有符合的統計項目"}
      onChange={option=>{
        if(!option?.value||option.value===active)return;
        router.push(featureNavigationHref(scopeId,'statics',{...navigation,rankingType:option.value}));
      }}
    />
  </label>;
}

function StatisticsPanel({scopeId,navigation,types}){
  const router=useRouter();
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const [chartType,setChartType]=useState('line');
  const [timeStandard,setTimeStandard]=useState('10y');
  const [detailBucket,setDetailBucket]=useState('');
  const query=useRanking(scopeId,rankingType,navigation);
  const trendQuery=useQuery({
    queryKey:['statistics-source-trend',scopeId],
    queryFn:()=>selectScopeSourceTrendRows(scopeId),
    enabled:rankingType==='total'||rankingType==='source',
    staleTime:5*60_000
  });
  const anchorQuery=useQuery({
    queryKey:['statistics-anchor-dates',scopeId],
    queryFn:()=>selectScopeAnchorDates(scopeId),
    enabled:rankingType==='total',
    staleTime:5*60_000
  });
  const allRows=query.data||[];
  const trendSuggestions=useMemo(
    ()=>rankingType==='total'?buildTrendSuggestions(trendQuery.data||[],timeStandard,anchorQuery.data||[]):[],
    [rankingType,trendQuery.data,timeStandard,anchorQuery.data]
  );
  const [visibleRows,setVisibleRows]=useState([]);
  const canDrillDown=scopeId!=='loc'&&rankingType==='source';
  const detailQuery=useQuery({
    queryKey:['statistics-source-detail',scopeId,detailBucket,navigation.period||'all'],
    queryFn:()=>selectScopeSourceBucketDetails(scopeId,{bucket:detailBucket,navigation}),
    enabled:canDrillDown&&Boolean(detailBucket),
    staleTime:30000
  });
  useEffect(()=>{setVisibleRows([]);setDetailBucket('');},[scopeId,rankingType,navigation.period]);
  const chartData=visibleRows.length?visibleRows:allRows.slice(0,DEFAULT_LIST_BATCH_SIZE);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Statistics</p><h2>統計</h2></div></header>
    <div className="scope-v2-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      <label><span>圖形</span><select className="scope-v2-select" value={chartType} onChange={event=>setChartType(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {chartType==='line'?<label><span>時間標準</span><select className="scope-v2-select" value={timeStandard} onChange={event=>setTimeStandard(event.target.value)}>{TIME_STANDARDS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>:null}
    </div>
        {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {chartType==='line'&&trendQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(trendQuery.error)}</p>:null}
    {!query.isPending&&!query.error?<>
      <RankingList
        rows={allRows}
        resetKey={scopeId+"|"+rankingType+"|"+String(navigation.period||"all")}
        onVisibleRows={setVisibleRows}
        onSelect={canDrillDown?row=>setDetailBucket(current=>current===row.term?'':row.term):null}
        selectedTerm={detailBucket}
      />
      {canDrillDown&&detailBucket?<section className="scope-v2-inline-card">
        <h3>{detailBucket}｜來源細分</h3>
        {detailQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(detailQuery.error)}</p>:null}
        {!detailQuery.isPending&&!detailQuery.error?<RankingList rows={detailQuery.data||[]} resetKey={scopeId+"|detail|"+detailBucket+"|"+String(navigation.period||"all")}/>:null}
      </section>:null}
      {chartType==='line'
        ?<>
          {rankingType==='total'
            ?<TotalTrendChart rows={trendQuery.data||[]} standard={timeStandard} height={420}/>
            :<SourceTrendChart rows={trendQuery.data||[]} standard={timeStandard} height={420}/>}
          {rankingType==='total'&&trendSuggestions.length?<section className="scope-v2-stat-suggestions" aria-label="趨勢建議">
            <header><p className="loc-eyebrow">Trend Suggestion</p><h3>建議回看區間</h3></header>
            <div>
              {trendSuggestions.map(item=><button
                type="button"
                key={item.key}
                onClick={()=>router.push(featureNavigationHref(scopeId,'culture',{from:item.from,to:item.to}))}
              >
                <strong>{item.from} ～ {item.to}</strong>
                <span>{item.reason}；總來源 {item.previousTotal.toLocaleString()} → {item.currentTotal.toLocaleString()}</span>
              </button>)}
            </div>
          </section>:null}
        </>
        :<RankingChart type={chartType} rows={chartData} height={380}/>} 
    </>:null}

  </section>;
}

function MediaPanel({scopeId}){
  const databaseScopeId=scopeId;
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Media Metadata</p><h2>多媒體設定</h2></div></header>
    <MediaMetaSettingsV2 databaseScopeId={databaseScopeId}/>
  </section>;
}

function StatisticsShell({scopeId,navigation}){
  const visibleTabs=scopeId==='loc'
    ?STAT_TABS.filter(([value])=>value==='ranking')
    :STAT_TABS;
  const requested=visibleTabs.some(([value])=>value===navigation.statTab)?navigation.statTab:'ranking';
  const active=requested;
  const typesQuery=useQuery({
    queryKey:['statistics-types',scopeId],
    queryFn:()=>selectScopeRankingTypes(scopeId),
    staleTime:5*60_000
  });
  const types=typesQuery.data||[];
  return <section className="loc-card scope-v2-feature-card">
    <StatTabs scopeId={scopeId} navigation={navigation} active={active} tabs={visibleTabs}/>
    {typesQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(typesQuery.error)}</p>:null}
    {!typesQuery.isPending&&active==='ranking'?<StatisticsPanel scopeId={scopeId} navigation={navigation} types={types}/>:null}
    {active==='media'?<MediaPanel scopeId={scopeId}/>:null}
  </section>;
}

export default function StatisticsV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  return <FeaturePageV2 featureId="statics">
    <StatisticsShell scopeId={scopeId} navigation={navigation}/>
  </FeaturePageV2>;
}
