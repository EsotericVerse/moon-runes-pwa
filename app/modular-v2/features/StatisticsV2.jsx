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
import LanguageSpaceWorkspace from '../modules/language-space/LanguageSpaceWorkspace';
import {mergeLanguageItems,rankingItems} from '../modules/language-space/language-space-model';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_TYPES=[['bar','長條圖'],['line','折線圖'],['pie','圓餅圖']];
const TEXT_TYPES=[['text_type','文字小分類'],['text_category','文字分組'],['text_source','文字來源']];
const MEDIA_TYPES=[['meta_style','Meta Tag'],['meta_type','多媒體小分類'],['meta_source','媒體來源']];
const RUNE_TYPES=[['group','群組'],['keyword','關鍵詞']];
const MEDIA_TERM_LABELS={song:'曲目',reel:'Reels',video:'影片',image:'圖像',audio:'音訊'};
const TEXT_TERM_LABELS={post:'貼文',reply:'回覆',article:'文章',lyrics:'歌詞',work:'文學作品',outline:'大綱',other:'其他'};
const TEXT_CATEGORY_LABELS={text:'一般文字',music:'音樂文字',literature:'文學'};

function displayTerm(row){
  const type=String(row?.ranking_type||'');
  const term=String(row?.term||'');
  if(type==='meta_type')return MEDIA_TERM_LABELS[term.toLowerCase()]||term;
  if(type==='text_type')return TEXT_TERM_LABELS[term.toLowerCase()]||term;
  if(type==='text_category')return TEXT_CATEGORY_LABELS[term.toLowerCase()]||term;
  return term;
}

function chartRows(rows){
  return (rows||[]).slice(0,12).map(row=>({
    ...row,
    term:displayTerm(row),
    value:Number(row.rank_value??row.item_count??0)||0
  }));
}

function RankingChart({type='bar',rows,height=320}){
  const data=chartRows(rows);
  if(type==='line')return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:42,left:4}}>
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="term" angle={-28} textAnchor="end" interval={0} height={70}/>
      <YAxis/><Tooltip/>
      <Line type="monotone" dataKey="value" stroke="#7562cf" strokeWidth={2}/>
    </LineChart>
  </ResponsiveContainer>;
  if(type==='pie')return <ResponsiveContainer width="100%" height={height}>
    <PieChart><Tooltip/><Pie data={data} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={Math.min(120,height/2-26)}>
      {data.map((row,index)=><Cell key={row.ranking_key||row.term||index} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
    </Pie></PieChart>
  </ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} layout="vertical" margin={{top:8,right:18,bottom:8,left:8}}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
      <XAxis type="number"/><YAxis type="category" dataKey="term" width={118}/><Tooltip/>
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

function FaceNav({go,face}){
  return <nav className="scope-v2-stat-space-nav" aria-label="3D 統計空間">
    <button type="button" onClick={()=>go('keywords')} aria-current={face==='keywords'?'page':undefined}>↑ 關鍵詞</button>
    <button type="button" onClick={()=>go('textKeywords')} aria-current={face==='textKeywords'?'page':undefined}>← 文字設定</button>
    <button type="button" onClick={()=>go('overview')} aria-current={face==='overview'?'page':undefined}>● 首頁</button>
    <button type="button" onClick={()=>go('mediaKeywords')} aria-current={face==='mediaKeywords'?'page':undefined}>多媒體設定 →</button>
    <button type="button" onClick={()=>go('statistics')} aria-current={face==='statistics'?'page':undefined}>↓ 統計</button>
  </nav>;
}

function useRanking(scopeId,type,navigation,limit=100){
  return useQuery({
    queryKey:['statistics-ranking',scopeId,type,navigation.period||'all'],
    queryFn:async()=>(await selectScopeRankingPage(scopeId,{rankingType:type,limit,navigation})).rows,
    staleTime:30000
  });
}

function OverviewFace({scopeId,navigation,go}){
  const textQuery=useRanking(scopeId,'text_type',navigation,30);
  const mediaTypeQuery=useRanking(scopeId,'meta_type',navigation,30);
  const mediaTagQuery=useRanking(scopeId,'meta_style',navigation,30);
  const textRows=textQuery.data||[];
  const mediaRows=mediaTagQuery.data||[];
  const textTotal=textRows.reduce((sum,row)=>sum+Number(row.item_count||0),0);
  const mediaTotal=(mediaTypeQuery.data||[]).reduce((sum,row)=>sum+Number(row.item_count||0),0);
  const error=textQuery.error||mediaTypeQuery.error||mediaTagQuery.error;

  return <div className="scope-v2-stat-face-content">
    <header className="scope-v2-stat-face-heading">
      <div><p className="loc-eyebrow">Statistics · Overview</p><h2>統計首頁</h2><p>文字與多媒體同時可見，但資料源與分類完全分開。</p></div>
    </header>
    {error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(error)}</p>:null}
    <div className="scope-v2-stat-overview-grid">
      <section className="scope-v2-inline-card">
        <div className="scope-v2-stat-card-heading"><div><h3>文字排行榜</h3><span>{textTotal.toLocaleString()} 筆文字</span></div><button type="button" onClick={()=>go('textKeywords')}>文字關鍵詞設定</button></div>
        <RankingList rows={textRows}/>
        <RankingChart rows={textRows} height={260}/>
      </section>
      <section className="scope-v2-inline-card">
        <div className="scope-v2-stat-card-heading"><div><h3>多媒體排行榜</h3><span>{mediaTotal.toLocaleString()} 筆媒體</span></div><button type="button" onClick={()=>go('mediaKeywords')}>多媒體 Meta Tag 設定</button></div>
        <RankingList rows={mediaRows}/>
        <RankingChart rows={mediaRows} height={260}/>
      </section>
    </div>
    <FaceNav go={go} face="overview"/>
  </div>;
}

function StatisticsFace({scopeId,navigation,go}){
  const [textType,setTextType]=useState('text_type');
  const [mediaType,setMediaType]=useState('meta_style');
  const [textChart,setTextChart]=useState('bar');
  const [mediaChart,setMediaChart]=useState('bar');
  const textQuery=useRanking(scopeId,textType,navigation,100);
  const mediaQuery=useRanking(scopeId,mediaType,navigation,100);
  return <div className="scope-v2-stat-face-content">
    <header className="scope-v2-stat-face-heading"><div><p className="loc-eyebrow">Statistics · Down</p><h2>文字統計 × 多媒體統計</h2><p>同一層呈現，互不混算。</p></div></header>
    <div className="scope-v2-stat-overview-grid">
      <section className="scope-v2-inline-card">
        <h3>文字統計</h3>
        <div className="scope-v2-stat-controls">
          <label><span>分類</span><select className="scope-v2-select" value={textType} onChange={event=>setTextType(event.target.value)}>{TEXT_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>圖形</span><select className="scope-v2-select" value={textChart} onChange={event=>setTextChart(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {textQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(textQuery.error)}</p>:null}
        <RankingChart type={textChart} rows={textQuery.data||[]} height={380}/>
      </section>
      <section className="scope-v2-inline-card">
        <h3>多媒體統計</h3>
        <div className="scope-v2-stat-controls">
          <label><span>分類</span><select className="scope-v2-select" value={mediaType} onChange={event=>setMediaType(event.target.value)}>{MEDIA_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>圖形</span><select className="scope-v2-select" value={mediaChart} onChange={event=>setMediaChart(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {mediaQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(mediaQuery.error)}</p>:null}
        <RankingChart type={mediaChart} rows={mediaQuery.data||[]} height={380}/>
      </section>
    </div>
    <FaceNav go={go} face="statistics"/>
  </div>;
}

function KeywordOverviewFace({scopeId,navigation,go}){
  const mediaTags=useRanking(scopeId,'meta_style',navigation,100);
  return <div className="scope-v2-stat-face-content">
    <header className="scope-v2-stat-face-heading"><div><p className="loc-eyebrow">Statistics · Up</p><h2>關鍵詞設定</h2><p>文字關鍵詞與多媒體 Meta Tag 各自治理，不共用詞庫。</p></div></header>
    <div className="scope-v2-stat-overview-grid">
      <section className="scope-v2-inline-card">
        <h3>文字關鍵詞</h3>
        <p>用於文字內容、文字風格與既有關鍵詞規則。</p>
        <button type="button" onClick={()=>go('textKeywords')}>← 進入文字關鍵詞細節</button>
      </section>
      <section className="scope-v2-inline-card">
        <h3>多媒體關鍵詞／Meta Tag</h3>
        <p>直接來自多媒體自身的 <code>style_tags</code>，目前已有 {(mediaTags.data||[]).length.toLocaleString()} 種可統計標籤。</p>
        <button type="button" onClick={()=>go('mediaKeywords')}>進入多媒體設定細節 →</button>
      </section>
    </div>
    <FaceNav go={go} face="keywords"/>
  </div>;
}

function TextKeywordFace({scopeId,scope,go}){
  return <div className="scope-v2-stat-face-content">
    <header className="scope-v2-stat-face-heading"><div><p className="loc-eyebrow">Statistics · Left</p><h2>文字關鍵詞設定細節</h2></div></header>
    <KeywordSettingsV2 scopeId={scopeId} databaseScopeId={scope.databaseScopeId||scopeId}/>
    <FaceNav go={go} face="textKeywords"/>
  </div>;
}

function MediaKeywordFace({scope,go}){
  return <div className="scope-v2-stat-face-content">
    <header className="scope-v2-stat-face-heading"><div><p className="loc-eyebrow">Statistics · Right</p><h2>多媒體 Meta Tag 設定細節</h2><p>直接編輯媒體的分類文字；不建立另一套文字關鍵詞資料。</p></div></header>
    <MediaMetaSettingsV2 databaseScopeId={scope.databaseScopeId||'lo3rwang'}/>
    <FaceNav go={go} face="mediaKeywords"/>
  </div>;
}

function SpatialStatistics({scopeId,scope,navigation}){
  const router=useRouter();
  const textSpaceQuery=useRanking(scopeId,'text_type',navigation,100);
  const mediaSpaceQuery=useRanking(scopeId,'meta_style',navigation,100);
  const languageSpaceItems=useMemo(()=>mergeLanguageItems(
    rankingItems(textSpaceQuery.data||[],'text'),
    rankingItems(mediaSpaceQuery.data||[],'media')
  ),[textSpaceQuery.data,mediaSpaceQuery.data]);
  const legacyFace=navigation.statTab==='charts'?'statistics':navigation.statTab==='keywords'?'keywords':'overview';
  const face=navigation.statFace||legacyFace;
  function go(nextFace){
    router.push(featureNavigationHref(scopeId,'statics',{...navigation,statFace:nextFace}));
  }
  return <>
    <section className="loc-card scope-v2-feature-card scope-v2-feature-card-wide">
      <LanguageSpaceWorkspace items={languageSpaceItems} title="文字與多媒體的立體語言空間"/>
    </section>
    <section className="loc-card scope-v2-feature-card">
    <div className="scope-v2-stat-space" data-face={face}>
      <div className="scope-v2-stat-cube" data-face={face}>
        <section className="scope-v2-stat-cube-face scope-v2-stat-cube-front" aria-hidden={face!=='overview'}>
          <OverviewFace scopeId={scopeId} navigation={navigation} go={go}/>
        </section>
        <section className="scope-v2-stat-cube-face scope-v2-stat-cube-bottom" aria-hidden={face!=='statistics'}>
          <StatisticsFace scopeId={scopeId} navigation={navigation} go={go}/>
        </section>
        <section className="scope-v2-stat-cube-face scope-v2-stat-cube-top" aria-hidden={face!=='keywords'}>
          <KeywordOverviewFace scopeId={scopeId} navigation={navigation} go={go}/>
        </section>
        <section className="scope-v2-stat-cube-face scope-v2-stat-cube-left" aria-hidden={face!=='textKeywords'}>
          {face==='textKeywords'?<TextKeywordFace scopeId={scopeId} scope={scope} go={go}/>:null}
        </section>
        <section className="scope-v2-stat-cube-face scope-v2-stat-cube-right" aria-hidden={face!=='mediaKeywords'}>
          {face==='mediaKeywords'?<MediaKeywordFace scope={scope} go={go}/>:null}
        </section>
      </div>
    </div>
  </section>
  </>;
}

function SimpleStatistics({scopeId,scope,navigation}){
  const types=scopeId==='runes'?RUNE_TYPES:TEXT_TYPES;
  const [rankingType,setRankingType]=useState(types[0][0]);
  const [chartType,setChartType]=useState('bar');
  const query=useRanking(scopeId,rankingType,navigation,100);
  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">Statistics</p><h2>統計功能</h2>
    <div className="scope-v2-stat-controls">
      <label><span>分類</span><select className="scope-v2-select" value={rankingType} onChange={event=>setRankingType(event.target.value)}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>圖形</span><select className="scope-v2-select" value={chartType} onChange={event=>setChartType(event.target.value)}>{CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    <RankingList rows={query.data||[]}/><RankingChart type={chartType} rows={query.data||[]} height={380}/>
    {scopeId==='runes'?<KeywordSettingsV2 scopeId={scopeId} databaseScopeId={scope.databaseScopeId||scopeId}/>:null}
  </section>;
}

export default function StatisticsV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  return <FeaturePageV2 featureId="statics">
    {scopeId==='lo3rwang'
      ?<SpatialStatistics scopeId={scopeId} scope={scope} navigation={navigation}/>
      :<SimpleStatistics scopeId={scopeId} scope={scope} navigation={navigation}/>}
  </FeaturePageV2>;
}
