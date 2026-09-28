'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import Select from 'react-select';
import {
  Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeKeywordDiagnostics,selectScopeRankingAll,selectScopeRankingComparison,selectScopeRankingTypes} from '../../loc/neon-ranking-client';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import MediaMetaSettingsV2 from './MediaMetaSettingsV2';
import FeaturePageV2 from '../FeaturePageV2';
import IncrementalLoadV2 from '../IncrementalLoadV2';
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';
import {analyzeDistribution,analyzeDistributionChange,analyzeKeywordDiagnostics,analyzeKeywordGovernance} from '../../loc/model/automatic-analysis.mjs';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_ACCENT='var(--loc-accent)';
const CHART_TEXT='var(--loc-text)';
const CHART_GRID='var(--loc-line)';
const CHART_TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const CHART_TYPES=[['bar','長條圖'],['line','折線圖'],['pie','圓餅圖']];
const STAT_TABS=[['ranking','統計'],['media','多媒體設定']];
const STAT_TYPE_LABELS=Object.freeze({
  keyword:'關鍵詞',
  source:'作品來源',
  media_type:'多媒體類型',
  media_tag:'多媒體 Meta Tag'
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

function RankingList({rows,offset=0}){
  if(!rows?.length)return <p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <div className="scope-v2-ranking">
    {rows.map((row,index)=><div key={row.ranking_key||row.term||index}>
      <strong>{offset+index+1}. {displayTerm(row)}</strong>
      <span>{Number(row.item_count||0).toLocaleString()}</span>
    </div>)}
  </div>;
}

function useAllRanking(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-ranking-all',scopeId,type,navigation.period||'all'],
    enabled:Boolean(type),
    queryFn:()=>selectScopeRankingAll(scopeId,{rankingType:type,navigation}),
    staleTime:30000
  });
}

function useRankingComparison(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-ranking-comparison',scopeId,type,navigation.period||'all'],
    enabled:Boolean(type)&&scopeId!=='loc'&&type!=='keyword',
    queryFn:()=>selectScopeRankingComparison(scopeId,{rankingType:type,navigation}),
    staleTime:30000
  });
}

function useKeywordDiagnostics(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-keyword-diagnostics',scopeId,navigation.period||'all'],
    enabled:false,
    queryFn:()=>selectScopeKeywordDiagnostics(scopeId,{navigation}),
    staleTime:30000
  });
}

function rangeLabel(range){
  if(!range?.start_date)return '';
  return String(range.start_date).slice(0,10)+' → '+String(range.end_date||range.start_date).slice(0,10);
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
  const [rankingVisible,setRankingVisible]=useState(DEFAULT_LIST_BATCH_SIZE);
  const query=useAllRanking(scopeId,rankingType,navigation);
  const comparisonQuery=useRankingComparison(scopeId,rankingType,navigation);
  const diagnosticsQuery=useKeywordDiagnostics(scopeId,rankingType,navigation);
  const automaticAnalysis=useMemo(()=>analyzeDistribution(query.data||[],{
    label:STAT_TYPE_LABELS[rankingType]||'統計項目'
  }),[query.data,rankingType]);
  const changeAnalysis=useMemo(()=>{
    const data=comparisonQuery.data;
    if(!data)return {changes:[],suggestions:[]};
    return rankingType==='keyword'
      ?analyzeKeywordGovernance(data.currentRows||[],data.previousRows||[],{
        candidateRows:data.candidateRows||[],
        catalogRows:data.catalogRows||[]
      })
      :analyzeDistributionChange(data.currentRows||[],data.previousRows||[],{label:STAT_TYPE_LABELS[rankingType]||'統計項目'});
  },[comparisonQuery.data,rankingType]);
  const keywordDiagnosticsEnabled=false;
  const keywordDiagnostics=useMemo(()=>{
    if(rankingType!=='keyword'||!diagnosticsQuery.data)return {totalRecords:0,suggestions:[]};
    return analyzeKeywordDiagnostics(diagnosticsQuery.data,{
      changeSuggestions:changeAnalysis.suggestions||[]
    });
  },[rankingType,diagnosticsQuery.data,changeAnalysis.suggestions]);
  const allRows=query.data||[];
  useEffect(()=>setRankingVisible(DEFAULT_LIST_BATCH_SIZE),[scopeId,rankingType,navigation.period]);
  const pageRows=allRows.slice(0,rankingVisible);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Statistics</p><h2>統計</h2></div></header>
    <div className="scope-v2-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      <label><span>圖形</span><select className="scope-v2-select" value={chartType} onChange={event=>setChartType(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error?<>
      <RankingList rows={pageRows} offset={0}/>
      <IncrementalLoadV2 hasMore={rankingVisible<allRows.length} loading={false} onLoadMore={()=>setRankingVisible(value=>Math.min(allRows.length,value+DEFAULT_LIST_BATCH_SIZE))} label="還有更多排名"/>
      <RankingChart type={chartType} rows={allRows} height={380}/>
    </>:null}
    {!query.isPending&&!query.error&&automaticAnalysis.suggestions.length?<section className="scope-v2-card">
      <p className="loc-eyebrow">Automatic Analysis</p>
      <h3>自動分布分析</h3>
      <div className="scope-v2-list">
        {automaticAnalysis.suggestions.map((item,index)=><article className="scope-v2-inline-card" key={item.type+'-'+index}>
          <strong>{item.type==='concentration'?'分布集中':item.type==='long_tail'?'低頻尾端':'重複候選'}</strong>
          <span>{item.text}</span>
        </article>)}
      </div>
    </section>:null}

    {rankingType!=='keyword'&&comparisonQuery.isPending?<p className="scope-v2-status">比較目前時期與前一正式時期…</p>:null}
    {rankingType!=='keyword'&&comparisonQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(comparisonQuery.error)}</p>:null}
    {rankingType!=='keyword'&&!comparisonQuery.isPending&&!comparisonQuery.error&&comparisonQuery.data?<section className="scope-v2-card">
      <p className="loc-eyebrow">Weak Signal Comparison</p>
      <h3>時間變化／弱訊號</h3>
      <p>{comparisonQuery.data.previousPeriodLabel||'前一時期'}：{rangeLabel(comparisonQuery.data.previousRange)}｜{comparisonQuery.data.periodLabel||'目前時期'}：{rangeLabel(comparisonQuery.data.currentRange)}</p>
      {!changeAnalysis.suggestions.length?<p className="scope-v2-status">目前沒有達到提醒門檻的明顯變化。</p>:<div className="scope-v2-list">
        {changeAnalysis.suggestions.map((item,index)=><article className="scope-v2-inline-card" key={item.type+'-'+item.term+'-'+index}>
          <strong>{item.action||(
            item.type==='emerging'?'新出現':
            item.type==='rising'?'增加':
            item.type==='disappeared'?'暫時消失':
            item.type==='falling'?'下降':'持續'
          )}｜{item.term}</strong>
          <span>{item.text}</span>
        </article>)}
      </div>}
    </section>:null}

    {keywordDiagnosticsEnabled&&rankingType==='keyword'&&diagnosticsQuery.isPending?<p className="scope-v2-status">計算關鍵詞辨識度與共現…</p>:null}
    {keywordDiagnosticsEnabled&&rankingType==='keyword'&&diagnosticsQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(diagnosticsQuery.error)}</p>:null}
    {keywordDiagnosticsEnabled&&rankingType==='keyword'&&!diagnosticsQuery.isPending&&!diagnosticsQuery.error&&diagnosticsQuery.data?<section className="scope-v2-card">
      <p className="loc-eyebrow">Keyword Diagnostics</p>
      <h3>關鍵詞辨識度／共現</h3>
      {!keywordDiagnostics.suggestions.length?<p className="scope-v2-status">目前沒有達到辨識度或共現提醒門檻的項目。</p>:<div className="scope-v2-list">
        {keywordDiagnostics.suggestions.map((item,index)=><article className="scope-v2-inline-card" key={item.type+'-'+item.term+'-'+index}>
          <strong>{item.type==='emerging_high_discrimination'?'新興高辨識候選':
            item.type==='low_discrimination'?'低辨識度候選':
            item.type==='source_concentration'?'來源集中':'共現'}｜{item.term}</strong>
          <span>{item.text}</span>
        </article>)}
      </div>}
    </section>:null}
  </section>;
}

function MediaPanel({scopeId}){
  const databaseScopeId=scopeId==='lunarunes'?'lrunes':'lo3rwang';
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
  const types=typesQuery.data||(scopeId==='loc'?['source']:['keyword','source']);
  return <section className="loc-card scope-v2-feature-card">
    <StatTabs scopeId={scopeId} navigation={navigation} active={active} tabs={visibleTabs}/>
    {typesQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
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
