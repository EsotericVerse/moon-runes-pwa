'use client';

import {useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingPage,selectScopeRankingTypes} from '../../loc/neon-ranking-client';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import KeywordSettingsV2 from './KeywordSettingsV2';
import SourceSettingsV2 from './SourceSettingsV2';
import ContextStyleManager from './ContextStyleManager';
import FeaturePageV2 from '../FeaturePageV2';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_TYPES=[['bar','長條圖'],['line','折線圖'],['pie','圓餅圖']];
const STAT_TABS=[['ranking','排行榜'],['keywords','關鍵詞設定'],['sources','作品來源設定'],['styles','風格設定'],['charts','統計圖']];
const STAT_TYPE_LABELS=Object.freeze({keyword:'關鍵詞',source:'作品來源'});
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
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="term" angle={-32} textAnchor="end" interval={0} height={100}/>
      <YAxis/><Tooltip/>
      <Line type="monotone" dataKey="value" stroke="#7562cf" strokeWidth={2}/>
    </LineChart>
  </ResponsiveContainer>;
  if(type==='pie')return <ResponsiveContainer width="100%" height={height}>
    <PieChart><Tooltip/><Pie data={data} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={Math.min(140,height/2-26)}>
      {data.map((row,index)=><Cell key={row.ranking_key||row.term||index} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
    </Pie></PieChart>
  </ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={Math.max(height,Math.min(1200,80+data.length*34))}>
    <BarChart data={data} layout="vertical" margin={{top:8,right:18,bottom:8,left:8}}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
      <XAxis type="number"/><YAxis type="category" dataKey="term" width={128}/><Tooltip/>
      <Bar dataKey="value" fill="#7562cf" radius={[0,4,4,0]}/>
    </BarChart>
  </ResponsiveContainer>;
}

function RankingList({rows,limit=10}){
  if(!rows?.length)return <p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <div className="scope-v2-ranking">
    {rows.slice(0,limit).map((row,index)=><div key={row.ranking_key||row.term||index}>
      <strong>{index+1}. {displayTerm(row)}</strong>
      <span>{Number(row.item_count||0).toLocaleString()}</span>
    </div>)}
  </div>;
}

function useRanking(scopeId,type,navigation,limit=10){
  return useQuery({
    queryKey:['statistics-ranking',scopeId,type,navigation.period||'all',limit],
    queryFn:async()=>(await selectScopeRankingPage(scopeId,{rankingType:type,limit,navigation})).rows,
    enabled:Boolean(type),
    staleTime:30000
  });
}

function useAllRanking(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-ranking-all',scopeId,type,navigation.period||'all'],
    enabled:Boolean(type),
    queryFn:async()=>{
      const rows=[];let offset=0;
      for(let page=0;page<100;page++){
        const result=await selectScopeRankingPage(scopeId,{rankingType:type,offset,limit:100,navigation});
        rows.push(...result.rows);
        if(!result.hasMore)break;
        offset+=result.limit;
      }
      return rows;
    },
    staleTime:30000
  });
}

function StatTabs({scopeId,navigation,active}){
  const router=useRouter();
  return <nav className="scope-v2-stat-tabs" aria-label="統計功能">
    {STAT_TABS.map(([value,label])=><button
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
  if(!types.length)return null;
  return <label>
    <span>統計項目</span>
    <select className="scope-v2-select" value={active} onChange={event=>router.push(featureNavigationHref(scopeId,'statics',{...navigation,rankingType:event.target.value}))}>
      {types.map(value=><option key={value} value={value}>{STAT_TYPE_LABELS[value]||value}</option>)}
    </select>
  </label>;
}

function RankingPanel({scopeId,navigation,types}){
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const query=useRanking(scopeId,rankingType,navigation,10);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Top 10</p><h2>排行榜</h2><p>排行榜顯示所選統計項目的前 10 名。</p></div></header>
    <div className="scope-v2-stat-controls"><StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/></div>
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    <RankingList rows={query.data||[]} limit={10}/>
  </section>;
}

function ChartsPanel({scopeId,navigation,types}){
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const [chartType,setChartType]=useState('bar');
  const query=useAllRanking(scopeId,rankingType,navigation);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Distribution</p><h2>統計圖</h2><p>統計圖顯示所選統計項目的完整分布。</p></div></header>
    <div className="scope-v2-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      <label><span>圖形</span><select className="scope-v2-select" value={chartType} onChange={event=>setChartType(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    <RankingChart type={chartType} rows={query.data||[]} height={380}/>
  </section>;
}

function KeywordPanel({scopeId}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Keywords</p><h2>關鍵詞設定</h2><p>關鍵詞設定是資料設定；關鍵詞統計則由排行榜與統計圖呈現。</p></div></header>
    <KeywordSettingsV2 scopeId={scopeId}/>
  </section>;
}

function SourcePanel({scopeId}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Sources</p><h2>作品來源設定</h2><p>來源名稱是匯入時自訂的唯一字串；需要合併時直接批次改名，統計與 Time River 會自然依相同名稱分組。</p></div></header>
    <SourceSettingsV2 scopeId={scopeId}/>
  </section>;
}

function StylePanel({scopeId}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Styles</p><h2>風格設定</h2><p>風格採兩層群組：小群組名稱就是風格標籤，多個風格標籤歸入同一個大群組。關鍵詞規則沿用同一分類結構，規則本身另外設定。</p></div></header>
    {scopeId==='lo3rwang'?<ContextStyleManager scopeId="lo3rwang"/>:<p className="scope-v2-status">此 Scope 使用既有符文／群組風格結構。</p>}
  </section>;
}

function StatisticsShell({scopeId,navigation}){
  const active=STAT_TABS.some(([value])=>value===navigation.statTab)?navigation.statTab:'ranking';
  const typesQuery=useQuery({
    queryKey:['statistics-types',scopeId],
    queryFn:()=>selectScopeRankingTypes(scopeId),
    staleTime:5*60_000
  });
  const types=typesQuery.data||['keyword','source'];
  return <section className="loc-card scope-v2-feature-card">
    <StatTabs scopeId={scopeId} navigation={navigation} active={active}/>
    {typesQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(typesQuery.error)}</p>:null}
    {active==='ranking'?<RankingPanel scopeId={scopeId} navigation={navigation} types={types}/>:null}
    {active==='keywords'?<KeywordPanel scopeId={scopeId}/>:null}
    {active==='sources'?<SourcePanel scopeId={scopeId}/>:null}
    {active==='styles'?<StylePanel scopeId={scopeId}/>:null}
    {active==='charts'?<ChartsPanel scopeId={scopeId} navigation={navigation} types={types}/>:null}
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
