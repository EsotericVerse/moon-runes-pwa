'use client';

import {useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingAll,selectScopeRankingComparison,selectScopeRankingPage,selectScopeRankingTypes} from '../../loc/neon-ranking-client';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {useNeonAccount} from '../../loc/use-neon-account';
import KeywordSettingsV2 from './KeywordSettingsV2';
import ContextStyleManager from './ContextStyleManager';
import MediaMetaSettingsV2 from './MediaMetaSettingsV2';
import FeaturePageV2 from '../FeaturePageV2';
import {analyzeDistribution,analyzeDistributionChange,analyzeKeywordGovernance} from '../../loc/model/automatic-analysis.mjs';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_TYPES=[['bar','長條圖'],['line','折線圖'],['pie','圓餅圖']];
const STAT_TABS=[['ranking','排行榜'],['keywords','關鍵詞設定'],['styles','風格設定'],['media','多媒體設定'],['charts','統計圖']];
const STAT_TYPE_LABELS=Object.freeze({
  keyword:'關鍵詞',
  source:'作品來源',
  style:'風格標籤',
  style_group:'風格大群組',
  media_type:'多媒體類型',
  media_place:'多媒體地點',
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
    queryFn:()=>selectScopeRankingAll(scopeId,{rankingType:type,navigation}),
    staleTime:30000
  });
}

function useRankingComparison(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-ranking-comparison',scopeId,type,navigation.period||'all'],
    enabled:Boolean(type)&&scopeId!=='loc',
    queryFn:()=>selectScopeRankingComparison(scopeId,{rankingType:type,navigation}),
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
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error?<RankingList rows={query.data||[]} limit={10}/>:null}
  </section>;
}

function ChartsPanel({scopeId,navigation,types}){
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const [chartType,setChartType]=useState('bar');
  const query=useAllRanking(scopeId,rankingType,navigation);
  const comparisonQuery=useRankingComparison(scopeId,rankingType,navigation);
  const automaticAnalysis=useMemo(()=>analyzeDistribution(query.data||[],{
    label:STAT_TYPE_LABELS[rankingType]||'統計項目'
  }),[query.data,rankingType]);
  const changeAnalysis=useMemo(()=>{
    const data=comparisonQuery.data;
    if(!data)return {changes:[],suggestions:[]};
    return rankingType==='keyword'
      ?analyzeKeywordGovernance(data.currentRows||[],data.previousRows||[],{candidateRows:data.candidateRows||[]})
      :analyzeDistributionChange(data.currentRows||[],data.previousRows||[],{label:STAT_TYPE_LABELS[rankingType]||'統計項目'});
  },[comparisonQuery.data,rankingType]);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Distribution</p><h2>統計圖</h2><p>統計圖顯示所選統計項目的完整分布，包含文字來源、風格、關鍵詞與多媒體 metadata。</p><p><strong>靈魂擺盪論：</strong>以大風格、風格與關鍵詞的增減、延續、消退、回返與擺盪觀察語言分布；系統描述變化，不替使用者下定義。</p></div></header>
    <div className="scope-v2-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      <label><span>圖形</span><select className="scope-v2-select" value={chartType} onChange={event=>setChartType(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error?<RankingChart type={chartType} rows={query.data||[]} height={380}/>:null}
    {!query.isPending&&!query.error&&automaticAnalysis.suggestions.length?<section className="scope-v2-card">
      <p className="loc-eyebrow">Automatic Analysis</p>
      <h3>自動分布分析</h3>
      <p>依目前統計分布做機械式判斷，只描述集中、低頻尾端與重複候選，不替使用者定義文化意義。</p>
      <div className="scope-v2-list">
        {automaticAnalysis.suggestions.map((item,index)=><article className="scope-v2-inline-card" key={item.type+'-'+index}>
          <strong>{item.type==='concentration'?'分布集中':item.type==='long_tail'?'低頻尾端':'重複候選'}</strong>
          <span>{item.text}</span>
        </article>)}
      </div>
      {rankingType==='keyword'?<p>關鍵詞治理：這些結果可作為新增、提高、降低或淘汰候選的依據；實際詞庫變更仍需由規則與時間比較確認。</p>:null}
    </section>:null}

    {comparisonQuery.isPending?<p className="scope-v2-status">比較目前時期與前一等長區間…</p>:null}
    {comparisonQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(comparisonQuery.error)}</p>:null}
    {!comparisonQuery.isPending&&!comparisonQuery.error&&comparisonQuery.data?<section className="scope-v2-card">
      <p className="loc-eyebrow">Weak Signal Comparison</p>
      <h3>時間變化／弱訊號</h3>
      <p>目前：{rangeLabel(comparisonQuery.data.currentRange)}｜前一區間：{rangeLabel(comparisonQuery.data.previousRange)}。兩段長度相同，只比較可觀察的頻率變化。</p>
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
      <p>這些是風險管理用的弱訊號提示；系統只指出「這裡開始不一樣」，不替使用者定義原因、好壞或事件性質。</p>
    </section>:null}
  </section>;
}

function KeywordPanel({scopeId}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Keywords</p><h2>關鍵詞設定</h2><p>關鍵詞設定是資料設定；關鍵詞統計則由排行榜與統計圖呈現。</p></div></header>
    <KeywordSettingsV2 scopeId={scopeId}/>
  </section>;
}

function StylePanel({scopeId}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Styles</p><h2>風格設定</h2><p>風格採兩層群組：小群組名稱就是風格標籤，多個風格標籤歸入同一個大群組。關鍵詞規則沿用同一分類結構，規則本身另外設定。</p></div></header>
    {scopeId==='lo3rwang'?<ContextStyleManager scopeId="lo3rwang"/>:<p className="scope-v2-status">此 Scope 使用既有符文／群組風格結構。</p>}
  </section>;
}

function MediaPanel({scopeId}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Media Metadata</p><h2>多媒體設定</h2><p>多媒體以 media_type、source_place 與 meta_tags 參與搜尋、文化時間分布與統計。</p></div></header>
    {scopeId==='lo3rwang'?<MediaMetaSettingsV2 databaseScopeId="lo3rwang"/>:<p className="scope-v2-status">此 Scope 的多媒體設定沿用既有資料治理。</p>}
  </section>;
}

function StatisticsShell({scopeId,navigation}){
  const account=useNeonAccount();
  const canManage=Boolean(account.user&&(account.canManageGlobalSync()||account.canManageScopeSync(scopeId)));
  const visibleTabs=scopeId==='loc'
    ?STAT_TABS.filter(([value])=>value==='ranking'||value==='charts')
    :(scopeId==='lo3rwang'?STAT_TABS:STAT_TABS.filter(([value])=>value!=='media'));
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
    {!typesQuery.isPending&&active==='ranking'?<RankingPanel scopeId={scopeId} navigation={navigation} types={types}/>:null}
    {active==='keywords'?<KeywordPanel scopeId={scopeId}/>:null}
    {active==='styles'?<StylePanel scopeId={scopeId}/>:null}
    {active==='media'?<MediaPanel scopeId={scopeId}/>:null}
    {!typesQuery.isPending&&active==='charts'?<ChartsPanel scopeId={scopeId} navigation={navigation} types={types}/>:null}
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
