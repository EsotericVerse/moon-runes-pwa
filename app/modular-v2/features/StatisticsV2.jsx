'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import Select from 'react-select';
import {
  Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingRows,selectScopeRankingTypes,selectScopeSourceBucketDetails} from '../../loc/neon-ranking-client';
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
const CHART_TYPES=[['bar','長條圖'],['line','折線圖'],['pie','圓餅圖']];
const STAT_TABS=[['ranking','統計'],['media','多媒體設定']];
const STAT_TYPE_LABELS=Object.freeze({
  source:'作品來源'
});
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
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const [chartType,setChartType]=useState('bar');
  const [detailBucket,setDetailBucket]=useState('');
  const query=useRanking(scopeId,rankingType,navigation);
  const allRows=query.data||[];
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
    </div>
        {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
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
      <RankingChart type={chartType} rows={chartData} height={380}/>
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
