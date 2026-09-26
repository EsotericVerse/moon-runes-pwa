'use client';

import {useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import KeywordSettingsV2 from './KeywordSettingsV2';
import MediaMetaSettingsV2 from './MediaMetaSettingsV2';
import FeaturePageV2 from '../FeaturePageV2';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_TYPES=[['bar','長條圖'],['line','折線圖'],['pie','圓餅圖']];
const TEXT_TYPES=[['text_type','文字小分類'],['text_category','文字分組'],['text_source','文字來源']];
const MEDIA_TYPES=[['meta_style','Meta Tag'],['meta_type','多媒體小分類'],['meta_source','媒體來源']];
const RUNE_TYPES=[['group','群組'],['keyword','關鍵詞']];
const STAT_TABS=[['ranking','排行榜'],['keywords','關鍵詞設定'],['charts','統計圖']];
const MEDIA_TERM_LABELS={song:'曲目',reel:'Reels',video:'影片',image:'圖像',audio:'音訊'};
const TEXT_TERM_LABELS={post:'貼文',reply:'回覆',article:'文章',lyrics:'歌詞',work:'文學作品',outline:'大綱',other:'其他'};
const TEXT_CATEGORY_LABELS={text:'一般文字',music:'音樂文字',literature:'文學'};
const SOURCE_TERM_LABELS={
  threads:'Threads',facebook:'Facebook',suno:'Suno',pixnet:'Pixnet',ptt:'PTT',
  kkcity:'KKCity',wretch:'Wretch',vocus:'Vocus',instagram:'Instagram',youtube:'YouTube'
};

function displayTerm(row){
  const type=String(row?.ranking_type||'');
  const term=String(row?.term||'');
  if(type==='meta_type')return MEDIA_TERM_LABELS[term.toLowerCase()]||term;
  if(type==='text_type')return TEXT_TERM_LABELS[term.toLowerCase()]||term;
  if(type==='text_category')return TEXT_CATEGORY_LABELS[term.toLowerCase()]||term;
  if(type==='text_source'||type==='meta_source')return SOURCE_TERM_LABELS[term.toLowerCase()]||term;
  return term;
}

function chartRows(rows){
  return (rows||[]).map(row=>({
    ...row,
    term:displayTerm(row),
    value:Number(row.rank_value??row.item_count??0)||0
  }));
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
    staleTime:30000
  });
}

function useAllRanking(scopeId,type,navigation){
  return useQuery({
    queryKey:['statistics-ranking-all',scopeId,type,navigation.period||'all'],
    queryFn:async()=>{
      const rows=[];
      let offset=0;
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

function RankingPanel({scopeId,navigation}){
  const [textType,setTextType]=useState('text_type');
  const [mediaType,setMediaType]=useState('meta_style');
  const textQuery=useRanking(scopeId,textType,navigation,10);
  const mediaQuery=useRanking(scopeId,mediaType,navigation,10);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Top 10</p><h2>排行榜</h2><p>排行榜只顯示前 10 名；完整分布請切到「統計圖」。</p></div></header>
    <div className="scope-v2-stat-overview-grid">
      <section className="scope-v2-inline-card">
        <h3>文字排行榜</h3>
        <div className="scope-v2-stat-controls"><label><span>分類</span><select className="scope-v2-select" value={textType} onChange={event=>setTextType(event.target.value)}>{TEXT_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        {textQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(textQuery.error)}</p>:null}
        <RankingList rows={textQuery.data||[]} limit={10}/>
      </section>
      <section className="scope-v2-inline-card">
        <h3>多媒體排行榜</h3>
        <div className="scope-v2-stat-controls"><label><span>分類</span><select className="scope-v2-select" value={mediaType} onChange={event=>setMediaType(event.target.value)}>{MEDIA_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        {mediaQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(mediaQuery.error)}</p>:null}
        <RankingList rows={mediaQuery.data||[]} limit={10}/>
      </section>
    </div>
  </section>;
}

function ChartsPanel({scopeId,navigation}){
  const [textType,setTextType]=useState('text_type');
  const [mediaType,setMediaType]=useState('meta_style');
  const [textChart,setTextChart]=useState('bar');
  const [mediaChart,setMediaChart]=useState('bar');
  const textQuery=useAllRanking(scopeId,textType,navigation);
  const mediaQuery=useAllRanking(scopeId,mediaType,navigation);
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Distribution</p><h2>統計圖</h2><p>顯示所選分類的完整分布，不套用 Top 10 截斷。</p></div></header>
    <div className="scope-v2-stat-overview-grid">
      <section className="scope-v2-inline-card">
        <h3>文字完整分布</h3>
        <div className="scope-v2-stat-controls">
          <label><span>分類</span><select className="scope-v2-select" value={textType} onChange={event=>setTextType(event.target.value)}>{TEXT_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>圖形</span><select className="scope-v2-select" value={textChart} onChange={event=>setTextChart(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {textQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(textQuery.error)}</p>:null}
        <RankingChart type={textChart} rows={textQuery.data||[]}/>
      </section>
      <section className="scope-v2-inline-card">
        <h3>多媒體完整分布</h3>
        <div className="scope-v2-stat-controls">
          <label><span>分類</span><select className="scope-v2-select" value={mediaType} onChange={event=>setMediaType(event.target.value)}>{MEDIA_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>圖形</span><select className="scope-v2-select" value={mediaChart} onChange={event=>setMediaChart(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {mediaQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(mediaQuery.error)}</p>:null}
        <RankingChart type={mediaChart} rows={mediaQuery.data||[]}/>
      </section>
    </div>
  </section>;
}

function KeywordPanel({scopeId,scope}){
  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading"><div><p className="loc-eyebrow">Keywords</p><h2>關鍵詞設定</h2><p>正式 3D 關鍵詞圖與可編輯詞庫都在這一頁，不再用 CSS 立方體模擬 3D。</p></div></header>
    <KeywordSettingsV2 scopeId={scopeId} databaseScopeId={scope.databaseScopeId||scopeId}/>
    {scopeId==='lo3rwang'?<MediaMetaSettingsV2 databaseScopeId={scope.databaseScopeId||'lo3rwang'}/>:null}
  </section>;
}

function AuthorStatistics({scopeId,scope,navigation}){
  const active=STAT_TABS.some(([value])=>value===navigation.statTab)?navigation.statTab:'ranking';
  return <section className="loc-card scope-v2-feature-card">
    <StatTabs scopeId={scopeId} navigation={navigation} active={active}/>
    {active==='ranking'?<RankingPanel scopeId={scopeId} navigation={navigation}/>:null}
    {active==='keywords'?<KeywordPanel scopeId={scopeId} scope={scope}/>:null}
    {active==='charts'?<ChartsPanel scopeId={scopeId} navigation={navigation}/>:null}
  </section>;
}

function SimpleStatistics({scopeId,scope,navigation}){
  const types=scopeId==='lunarunes'?RUNE_TYPES:TEXT_TYPES;
  const [rankingType,setRankingType]=useState(types[0][0]);
  const [chartType,setChartType]=useState('bar');
  const query=useAllRanking(scopeId,rankingType,navigation);
  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">Statistics</p><h2>統計功能</h2>
    <div className="scope-v2-stat-controls">
      <label><span>分類</span><select className="scope-v2-select" value={rankingType} onChange={event=>setRankingType(event.target.value)}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>圖形</span><select className="scope-v2-select" value={chartType} onChange={event=>setChartType(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    <RankingList rows={query.data||[]} limit={10}/><RankingChart type={chartType} rows={query.data||[]} height={380}/>
    {scopeId==='lunarunes'?<KeywordSettingsV2 scopeId={scopeId} databaseScopeId={scope.databaseScopeId||scopeId}/>:null}
  </section>;
}

export default function StatisticsV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  return <FeaturePageV2 featureId="statics">
    {scopeId==='lo3rwang'
      ?<AuthorStatistics scopeId={scopeId} scope={scope} navigation={navigation}/>
      :<SimpleStatistics scopeId={scopeId} scope={scope} navigation={navigation}/>}
  </FeaturePageV2>;
}
