'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Line,LineChart,
  Pie,PieChart,PolarAngleAxis,PolarGrid,PolarRadiusAxis,Radar,RadarChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import KeywordSettingsV2 from './KeywordSettingsV2';
import FeaturePageV2 from '../FeaturePageV2';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_TYPES=Object.freeze([
  ['bar','長條圖'],
  ['line','折線圖'],
  ['area','面積圖'],
  ['pie','圓餅圖'],
  ['radar','雷達圖']
]);
const RANKING_PAGE_SIZE=20;
const RANKING_TYPE_LABELS=Object.freeze({
  group:'群組',keyword:'關鍵詞',
  text_source:'文字來源',text_category:'文字分組',text_type:'文字小分類',
  meta_source:'媒體來源',meta_type:'多媒體小分類',meta_style:'Meta Tag'
});
const STATISTICS_TABS=Object.freeze([
  ['ranking','排行榜'],
  ['keywords','關鍵詞設定'],
  ['charts','統計圖']
]);
const TEXT_TYPES=Object.freeze(['text_type','text_category','text_source']);
const MEDIA_TYPES=Object.freeze(['meta_style','meta_type','meta_source']);
const MEDIA_TERM_LABELS=Object.freeze({song:'曲目',reel:'Reels',video:'影片',image:'圖像',audio:'音訊'});
const TEXT_TERM_LABELS=Object.freeze({post:'貼文',reply:'回覆',article:'文章',lyrics:'歌詞',work:'文學作品',outline:'大綱',other:'其他'});
const TEXT_CATEGORY_LABELS=Object.freeze({text:'一般文字',music:'音樂文字',literature:'文學'});
function displayTerm(row){
  const type=String(row?.ranking_type||'');
  const term=String(row?.term||'');
  if(type==='meta_type')return MEDIA_TERM_LABELS[term.toLowerCase()]||term;
  if(type==='text_type')return TEXT_TERM_LABELS[term.toLowerCase()]||term;
  if(type==='text_category')return TEXT_CATEGORY_LABELS[term.toLowerCase()]||term;
  return term;
}

function RankingChart({type,rows}){
  if(type==='line')return <ResponsiveContainer width="100%" height={360}>
    <LineChart data={rows} margin={{top:8,right:20,bottom:36,left:8}}>
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="term" angle={-30} textAnchor="end" interval={0} height={72}/>
      <YAxis/>
      <Tooltip/>
      <Line type="monotone" dataKey="value" stroke="#7562cf" strokeWidth={2}/>
    </LineChart>
  </ResponsiveContainer>;

  if(type==='area')return <ResponsiveContainer width="100%" height={360}>
    <AreaChart data={rows} margin={{top:8,right:20,bottom:36,left:8}}>
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="term" angle={-30} textAnchor="end" interval={0} height={72}/>
      <YAxis/>
      <Tooltip/>
      <Area type="monotone" dataKey="value" stroke="#7562cf" fill="#7562cf" fillOpacity={0.24}/>
    </AreaChart>
  </ResponsiveContainer>;

  if(type==='pie')return <ResponsiveContainer width="100%" height={360}>
    <PieChart>
      <Tooltip/>
      <Pie data={rows} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={130}>
        {rows.map((row,index)=><Cell key={row.ranking_key||row.term||index} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
      </Pie>
    </PieChart>
  </ResponsiveContainer>;

  if(type==='radar')return <ResponsiveContainer width="100%" height={400}>
    <RadarChart data={rows} outerRadius="72%">
      <PolarGrid/>
      <PolarAngleAxis dataKey="term"/>
      <PolarRadiusAxis/>
      <Tooltip/>
      <Radar dataKey="value" stroke="#7562cf" fill="#7562cf" fillOpacity={0.28}/>
    </RadarChart>
  </ResponsiveContainer>;

  return <ResponsiveContainer width="100%" height={Math.max(320,rows.length*36)}>
    <BarChart data={rows} layout="vertical" margin={{top:8,right:20,bottom:8,left:8}}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
      <XAxis type="number"/>
      <YAxis type="category" dataKey="term" width={128}/>
      <Tooltip/>
      <Bar dataKey="value" fill="#7562cf" radius={[0,4,4,0]}/>
    </BarChart>
  </ResponsiveContainer>;
}

export default function StatisticsV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const supportsMediaDomain=scopeId==='lo3rwang'||scopeId==='loc';
  const [statDomain,setStatDomain]=useState(supportsMediaDomain?(navigation.statDomain||'text'):'text');
  const rawTab=navigation.statTab||'ranking';
  const statTab=statDomain==='media'&&rawTab==='keywords'?'ranking':rawTab;
  const availableTypes=scopeId==='runes'
    ?['group','keyword']
    :statDomain==='media'?MEDIA_TYPES:TEXT_TYPES;
  const defaultRankingType=availableTypes[0]||'';
  const requestedRankingType=navigation.rankingType;
  const [rankingType,setRankingType]=useState(availableTypes.includes(requestedRankingType)?requestedRankingType:defaultRankingType);
  const [chartType,setChartType]=useState('bar');
  useEffect(()=>{
    const nextTypes=scopeId==='runes'?['group','keyword']:statDomain==='media'?MEDIA_TYPES:TEXT_TYPES;
    setRankingType(nextTypes.includes(navigation.rankingType)?navigation.rankingType:(nextTypes[0]||''));
  },[navigation.rankingType,scopeId,statDomain]);
  function switchDomain(nextDomain){
    if(!supportsMediaDomain||nextDomain===statDomain)return;
    const nextTypes=nextDomain==='media'?MEDIA_TYPES:TEXT_TYPES;
    const nextRanking=nextTypes[0]||'';
    setStatDomain(nextDomain);
    setRankingType(nextRanking);
    if(typeof window!=='undefined'){
      const nextNavigation={...navigation,statDomain:nextDomain,rankingType:nextRanking,statTab:rawTab==='keywords'&&nextDomain==='media'?'ranking':rawTab};
      window.history.pushState({},'',featureNavigationHref(scopeId,'statics',nextNavigation));
    }
  }
  const paginationKey=[scopeId,statDomain,rankingType,navigation.q,navigation.identity,navigation.source,navigation.period,navigation.anchor,navigation.from,navigation.to].join('|');
  const page=useOffsetPagination({
    key:paginationKey,
    pageSize:RANKING_PAGE_SIZE,
    enabled:statTab!=='keywords',
    loadPage:(offset,limit)=>selectScopeRankingPage(scopeId,{offset,limit,rankingType,navigation})
  });
  const {rows,loading,error,hasMore}=page;
  const types=availableTypes;
  const chartSource=rows.slice(0,10);
  const chartRows=useMemo(
    ()=>chartSource.map((row,index)=>({
      ...row,
      term:displayTerm(row),
      order:index+1,
      value:Number(row.rank_value??row.item_count??0)||0,
      count:Number(row.item_count??0)||0
    })),
    [chartSource]
  );

  return <FeaturePageV2 featureId="statics">
    <section className="loc-card scope-v2-feature-card">
      <p className="loc-eyebrow">Statistics</p>
      <div className="scope-v2-stat-domain-heading">
        <div>
          <h2>{statDomain==='media'?'多媒體 Meta Tag 統計':'文字統計'}</h2>
          <p>{statDomain==='media'
            ?'分組：多媒體。小分類包含曲目、Reels、影片、圖像等；Meta Tag 直接來自媒體資料，與文字關鍵詞完全分開。'
            :'文字獨立統計：只讀 Galaxy 文字資料；歌詞、章節、貼文、文章等文字內容在此統計。'}</p>
        </div>
        {supportsMediaDomain?<button type="button" className="scope-v2-stat-flip-button" onClick={()=>switchDomain(statDomain==='media'?'text':'media')}>
          ↻ 轉到{statDomain==='media'?'文字統計':'多媒體 Meta Tag 統計'}
        </button>:null}
      </div>
      <nav className="scope-v2-tabs scope-v2-stat-tabs" aria-label="統計功能">
        {STATISTICS_TABS.filter(([key])=>statDomain!=='media'||key!=='keywords').map(([key,label])=><a
          key={key}
          href={featureNavigationHref(scopeId,'statics',{...navigation,statDomain,statTab:key,rankingType})}
          aria-current={statTab===key?'page':undefined}
        >{label}</a>)}
      </nav>

      <div className={'scope-v2-stat-flip '+(statDomain==='media'?'is-media':'is-text')} data-stat-domain={statDomain}>
      <div className="scope-v2-stat-face">
      {statTab==='ranking'?<section aria-labelledby="statistics-ranking-title">
        <h3 id="statistics-ranking-title">{statDomain==='media'?'Meta Tag 排行榜':'文字排行榜'}</h3>
        <div className="scope-v2-stat-controls">
          {types.length>1?<label>
            <span>{statDomain==='media'?'Meta Tag 分類':'文字分類'}</span>
            <select
              className="scope-v2-select"
              value={rankingType}
              onChange={event=>setRankingType(event.target.value)}
              aria-label="排行榜類型"
            >
              {types.map(type=><option key={type} value={type}>{RANKING_TYPE_LABELS[type]||type}</option>)}
            </select>
          </label>:null}
        </div>
        {error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(error)}</p>:null}
        {!loading&&!error&&!rows.length?<p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>:null}
        {rows.length?<div className="scope-v2-ranking" aria-label="排行榜">
          {rows.map((row,index)=><div key={row.ranking_key||row.term||index}>
            <strong>{index+1}. {displayTerm(row)}</strong>
            <span>{Number(row.item_count||0).toLocaleString()}</span>
          </div>)}
        </div>:null}
        {hasMore?<div className="scope-v2-load-sentinel" aria-live="polite">
          &lt; {loading?'載入中…':'…'} &gt;
        </div>:null}
      </section>:null}

      {statTab==='keywords'&&statDomain==='text'?<section aria-labelledby="statistics-keywords-title">
        <h3 id="statistics-keywords-title">文字關鍵詞設定</h3>
        <KeywordSettingsV2 scopeId={scopeId} databaseScopeId={scope.databaseScopeId||scopeId}/>
      </section>:null}

      {statTab==='charts'?<section aria-labelledby="statistics-charts-title">
        <h3 id="statistics-charts-title">{statDomain==='media'?'Meta Tag 統計圖':'文字統計圖'}</h3>
        <div className="scope-v2-stat-controls">
          {types.length>1?<label>
            <span>{statDomain==='media'?'Meta Tag 分類':'文字分類'}</span>
            <select
              className="scope-v2-select"
              value={rankingType}
              onChange={event=>setRankingType(event.target.value)}
              aria-label="統計類型"
            >
              {types.map(type=><option key={type} value={type}>{RANKING_TYPE_LABELS[type]||type}</option>)}
            </select>
          </label>:null}
          <label>
            <span>圖形</span>
            <select
              className="scope-v2-select"
              value={chartType}
              onChange={event=>setChartType(event.target.value)}
              aria-label="圖形類型"
            >
              {CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(error)}</p>:null}
        {!loading&&!error&&!chartRows.length?<p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>:null}
        {chartRows.length?<div className="scope-v2-ranking-chart" aria-label={CHART_TYPES.find(([value])=>value===chartType)?.[1]||'統計圖'}>
          <RankingChart type={chartType} rows={chartRows}/>
        </div>:null}
      </section>:null}
      </div>
      </div>
    </section>
  </FeaturePageV2>;
}
