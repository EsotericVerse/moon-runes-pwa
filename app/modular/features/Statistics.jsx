'use client';

import {UI_COPY} from '../../i18n/ui-copy';
import {useUiCopy} from '../../i18n/ui-locale';
import UiText,{useUiText} from '../../i18n/UiText';

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';

// Defer Galaxy's data/query engine until the selected statistics mode needs it.
const loadGalaxyStatistics=()=>import('../../loc/galaxy-query');
import {selectRows} from '../../loc/db-query.mjs';


import {selectScopeRegistry,defaultScopeData} from '../../loc/scope-data';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
import {useScopeRuntime} from '../use-scope-runtime';
import {FeaturePage} from '../ui';
import {useAccount} from '../../loc/use-account';
import {dbPublicClient} from '../../loc/db-client.mjs';
import {StatisticsFacets} from '../../loc/statistics-facets';
import {scopeHref} from '../scope-registry';
const LrunesDailyStatisticsPanel=dynamic(()=>import('../../lrunes/DailyRuneAnalytics').then(m=>m.LrunesDailyStatisticsPanel),{loading:()=>null});
import {STAT_VISUAL_TYPES,availableStatisticChartTypes} from '../modules/statistics/statistics-time-zoom.mjs';
const StatisticsMultiChart=dynamic(()=>import('../modules/statistics/StatisticsMultiChart'),{loading:()=>null});
const Rune66Summary=dynamic(()=>import('../modules/statistics/StatisticsMultiChart').then(m=>m.Rune66Summary),{loading:()=>null});
const ScopeSelfIntersection=dynamic(()=>import('../modules/statistics/ScopeSelfIntersection'),{loading:()=>null});
const MediaCrossTagStatistics=dynamic(()=>import('../modules/statistics/MediaCrossTagStatistics'),{loading:()=>null});
const MediaFacetStatistics=dynamic(()=>import('../modules/statistics/MediaFacetStatistics'),{loading:()=>null});
const ScopeGroupStatistics=dynamic(()=>import('../modules/statistics/ScopeGroupStatistics'),{loading:()=>null});
const ScopeGroupOverview=dynamic(()=>import('../../loc/ScopeGroupOverview'),{loading:()=>null});
import StatisticsChartFrame from '../modules/statistics/StatisticsChartFrame';
import StatisticsDetails from '../modules/statistics/StatisticsDetails';
import {statisticsZoomWindow} from '../modules/statistics/statistics-time-zoom.mjs';

const CHART_TYPES=STAT_VISUAL_TYPES;
const STAT_TYPES=['total','source','media_type','media_platform','media_style'];
const STAT_TYPE_KEYS=Object.freeze({
  daily_rune:'uiExtra.statisticsUI.dailyRune',
  total:'statistics.totalSource',
  source:'uiExtra.statisticsUI.sourceGroup',
  media_type:'uiExtra.statisticsUI.mediaType',
  media_platform:'uiExtra.statisticsUI.mediaPlatform',
  media_style:'uiExtra.statisticsUI.mediaStyle'
});
const MEDIA_STAT_TYPES=new Set(['media_type','media_platform','media_style']);
const STYLE_FILTERS=Object.freeze([{value:'none',textKey:'uiExtra.statisticsUI.notApplied'},{value:'rune66',textKey:'uiExtra.statisticsUI.keywordClass'}]);
function dateKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
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
function rowsInWindow(rows=[],range={}){
  const startDate=dateKey(range.startDate),endDate=dateKey(range.endDate);
  const bucket=['month','week','day'].includes(range.bucket)?range.bucket:'day';
  if(!startDate||!endDate||startDate>endDate)return {rows:[],startDate:'',endDate:'',bucket};
  return {rows:rows.filter(row=>{
    const day=dateKey(row.day);
    return day&&day>=startDate&&day<=endDate;
  }),startDate,endDate,bucket};
}
function SummaryList({rankingType,summary}){
  const UI_COPY=useUiCopy();
  const rows=rankingType==='total'
    ?[{term:UI_COPY.statistics.totalSource,item_count:summary.total}]
    :summary.sources;
  return <div className="scope-ranking">
    {rows.map(row=><div key={row.term}><strong>{row.term}</strong><span>{Number(row.item_count||0).toLocaleString()}</span></div>)}
  </div>;
}
function facetTotals(rows=[]){
  const map=new Map();
  for(const row of rows){
    const category=String(row.category||'').trim();
    if(!category)continue;
    const key=category.normalize('NFKC').toLocaleLowerCase();
    const existing=map.get(key);
    if(existing)existing.item_count+=(Number(row.item_count)||0);
    else map.set(key,{term:category,item_count:Number(row.item_count)||0});
  }
  return [...map.values()].sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term));
}
function facetTrend(rows=[],window={},selectedCategories=[]){
  if(!window.startDate||!window.endDate)return [];
  const categories=new Map(selectedCategories.map(value=>[String(value).normalize('NFKC').toLocaleLowerCase(),value]));
  const buckets=new Map();
  for(let cursor=new Date(window.startDate+'T00:00:00Z'),end=new Date(window.endDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const bucket=trendBucket(cursor.toISOString().slice(0,10),window.bucket);
    if(bucket&&!buckets.has(bucket.key))buckets.set(bucket.key,{period:bucket.label,_sort:bucket.key});
  }
  for(const row of rows){
    const canonical=categories.get(String(row.category||'').normalize('NFKC').toLocaleLowerCase());
    if(!canonical)continue;
    const bucket=trendBucket(row.day,window.bucket);
    if(!bucket)continue;
    const output=buckets.get(bucket.key);
    if(output)output[canonical]=(Number(output[canonical])||0)+(Number(row.item_count)||0);
  }
  return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort)).map(row=>{
    const output={period:row.period};
    for(const category of selectedCategories)output[category]=Number(row[category])||0;
    return output;
  });
}

function StatisticTypeSelect({scopeId,navigation,types}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
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
      {types.map(value=><option key={value} value={value}>{t(STAT_TYPE_KEYS[value]||value)}</option>)}
    </select>
  </label>;
}

async function selectPublicStatisticsMembers(){
  const rows=await selectScopeRegistry({scopeKind:'scope'});
  return rows.map(row=>({...defaultScopeData(row.scope_id),label:row.display_name||row.scope_id}))
    .filter(row=>row.id&&row.galaxy&&row.galaxyMedia);
}


function ScopeStatisticsResults({scopeId,navigation,types}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const mediaDimension=MEDIA_STAT_TYPES.has(rankingType);
  const isLrunesDaily=scopeId==='lrunes'&&rankingType==='daily_rune';
  const [chartType,setChartType]=useState('line');
  const [zoomLevel,setZoomLevel]=useState(0);
  const [foldBlank,setFoldBlank]=useState(true);
  // Leave potentially expensive keyword aggregation OFF until explicitly chosen.
  const [styleFilter,setStyleFilter]=useState('none');
  const queryEndDate=useMemo(()=>taipeiDateKey(),[]);
  // The active route already resolves the requested Scope; no registry-wide SELECT.
  const targetScopes=useMemo(()=>isLrunesDaily?[]:[defaultScopeData(scopeId)].filter(Boolean),[scopeId,isLrunesDaily]);
  const earliest=useQuery({
    queryKey:['statistics-history-start',scopeId],
    enabled:!isLrunesDaily&&Boolean(targetScopes[0]),
    queryFn:async()=>{
      const {selectFirstScopeStatisticsDate}=await loadGalaxyStatistics();
      return selectFirstScopeStatisticsDate(targetScopes[0]);
    },
    staleTime:5*60_000
  });
  const queryRange=useMemo(()=>statisticsZoomWindow(zoomLevel,queryEndDate,earliest.data||''),
    [zoomLevel,queryEndDate,earliest.data]);
  const mediaQuery=useQuery({
    queryKey:['statistics-media-facet',scopeId,rankingType,queryRange.startDate,queryRange.endDate],
    queryFn:async()=>{
      const {selectMediaStatisticsFacetRows}=await loadGalaxyStatistics();
      return selectMediaStatisticsFacetRows(targetScopes[0],rankingType,queryRange);
    },
    enabled:mediaDimension&&rankingType!=='media_style'&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  const crossTagQuery=useQuery({
    queryKey:['statistics-media-cross-tags',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:async()=>{
      const {selectMediaCrossTagRows}=await loadGalaxyStatistics();
      return selectMediaCrossTagRows(targetScopes[0],queryRange);
    },
    enabled:rankingType==='media_style'&&Boolean(targetScopes[0])&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  const styleTreeQuery=useQuery({
    queryKey:['music-style-tree',scopeId],
    queryFn:async()=>{
      const {data,error}=await dbPublicClient.schema('silver').rpc('read_music_style_tree');
      if(error)throw new Error(error.message||'Music Style Tree read failed');
      return Array.isArray(data)?data:[];
    },
    enabled:scopeId==='lo3rwang'&&rankingType==='media_style',
    staleTime:5*60_000
  });
  const sourceCatalog=useQuery({
    queryKey:['statistics-source-taxonomy',scopeId],
    enabled:!isLrunesDaily&&!mediaDimension&&Boolean(rankingType),
    queryFn:async()=>{
      const [cat,aliases]=await Promise.all([
        selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
        selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250})
      ]);
      return {categories:cat.rows,aliases:aliases.rows};
    },
    staleTime:5*60_000
  });
  const sourceRows=useQuery({
    queryKey:['own-scope-source-intersection',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:async()=>{
      const {selectScopeSourceBreakdownRows}=await loadGalaxyStatistics();
      return selectScopeSourceBreakdownRows(targetScopes[0],queryRange);
    },
    enabled:!isLrunesDaily&&!mediaDimension&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  // Source classification is a capability, not a prerequisite for media charts
  // or the LunaRunes daily page. Load its existing model only for source results.
  const adminSourceQuery=useQuery({
    queryKey:['administrative-source-trend',scopeId,rankingType,queryRange.startDate,queryRange.endDate,
      queryRange.bucket,sourceRows.dataUpdatedAt,sourceCatalog.dataUpdatedAt],
    enabled:!isLrunesDaily&&!mediaDimension&&sourceRows.isSuccess&&sourceCatalog.isSuccess,
    queryFn:async()=>{
      const {administrativeSourceTrend}=await import('../../loc/statistics-admin-source.mjs');
      return administrativeSourceTrend(sourceRows.data||[],sourceCatalog.data||{},{
        startDate:queryRange.startDate,endDate:queryRange.endDate,
        unit:queryRange.bucket
      });
    },
    staleTime:5*60_000
  });
  const adminSource=adminSourceQuery.data||{rows:[],series:[],distribution:[],total:0};
  const basicTrend=adminSource.rows;
  const basicSeries=adminSource.series;
  const basicDistribution=adminSource.distribution;
  // The existing source breakdown already drives the chart and its summary.
  // Do not re-scan Galaxy and Galaxy Media in a second trend query.
  const sourceSummary={total:adminSource.total,
    sources:adminSource.distribution.map(row=>({term:row.name,item_count:row.value})),
    startDate:queryRange.startDate,endDate:queryRange.endDate
  };
  // Media Style facets and cross-tag relationships are projections of one
  // identical metadata scan; never fetch the same media corpus twice.
  const mediaRows=useMemo(()=>rankingType==='media_style'
    ?(crossTagQuery.data?StatisticsFacets.base.mediaFacetDaily(crossTagQuery.data,'media_style'):[])
    :(mediaQuery.data||[]),[rankingType,crossTagQuery.data,mediaQuery.data]);
  const mediaLoading=rankingType==='media_style'?crossTagQuery.isPending:mediaQuery.isPending;
  const mediaFetching=rankingType==='media_style'?crossTagQuery.isFetching:mediaQuery.isFetching;
  const mediaError=rankingType==='media_style'?crossTagQuery.error:mediaQuery.error;
  const facetRange=rowsInWindow(mediaRows,queryRange);
  const facetTotalsForOptions=facetTotals(facetRange.rows);
  const facetNames=facetTotalsForOptions.slice(0,6).map(row=>row.term);
  const facetData=facetTrend(facetRange.rows,facetRange,facetNames);
  const facetDistribution=facetTotalsForOptions.slice(0,15).map(row=>({name:row.term,value:row.item_count}));
  const optionsForCurrent=availableStatisticChartTypes(mediaDimension
    ?{rows:facetData,series:facetNames.map(name=>({key:name,label:name})),distribution:facetDistribution}
    :{rows:basicTrend,series:basicSeries,distribution:basicDistribution,totalKey:rankingType==='total'?'total':''});
  const effectiveChartType=optionsForCurrent.some(([value])=>value===chartType)?chartType:(optionsForCurrent[0]?.[0]||'line');
  const styleRange=useMemo(()=>({
    startDate:queryRange.startDate||'',
    endDate:queryRange.endDate||''
  }),[queryRange.startDate,queryRange.endDate]);
  const runeQuery=useQuery({
    queryKey:['statistics-style-filter','rune66',scopeId,styleRange.startDate,styleRange.endDate],
    queryFn:async()=>{
      const {selectRune66Classification}=await import('../../loc/rune66-keyword-analysis');
      return selectRune66Classification({scopeId,...styleRange});
    },
    enabled:scopeId==='lo3rwang'&&styleFilter==='rune66'&&Boolean(styleRange.startDate&&styleRange.endDate),
    staleTime:5*60_000
  });

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading"><div><h2>{UI_COPY.statistics.result}</h2></div></header>
    <div className="scope-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      {!isLrunesDaily?<>{!mediaDimension?<label><span>{UI_COPY.statistics.chart}</span><select className="scope-select" value={effectiveChartType} onChange={event=>setChartType(event.target.value)}>
        {optionsForCurrent.length?optionsForCurrent.map(([value,label])=><option key={value} value={value}>{t(label)}</option>):<option value="line"><UiText id="uiExtra.statisticsView.noVisual"/></option>}
      </select></label>:null}
      {!['pie','radar','radial','treemap','scatter'].includes(effectiveChartType)?<label className="scope-setting-toggle">
        <input type="checkbox" checked={foldBlank} onChange={event=>setFoldBlank(event.target.checked)}/> <UiText id="uiExtra.statisticsView.foldBlank"/>
      </label>:null}
      </>:null}
      {scopeId==='lo3rwang'?<label><span><UiText id="uiExtra.statisticsView.displayStyle"/></span><select className="scope-select" value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}>
        {STYLE_FILTERS.map(item=><option key={item.value} value={item.value}>{t(item.textKey)}</option>)}
      </select></label>:null}
    </div>
    {isLrunesDaily?<LrunesDailyStatisticsPanel/>:<>
    {((mediaDimension&&mediaLoading)||(!mediaDimension&&(sourceRows.isPending||sourceCatalog.isPending||adminSourceQuery.isPending)))?<div className="scope-stat-data-pending">
      <p className="scope-status" role="status"><UiText id="uiExtra.statisticsUI.loading"/></p>
      <div className="scope-feature-loading__body" aria-hidden="true"><span/><span/><span/><span/></div>
    </div>:null}
    {earliest.error?<p className="scope-status scope-error">{featureDataErrorMessage(earliest.error,UI_COPY)}</p>:null}
    {!mediaDimension&&(sourceRows.error||sourceCatalog.error||adminSourceQuery.error)?<p className="scope-status scope-error">{featureDataErrorMessage(sourceRows.error||sourceCatalog.error||adminSourceQuery.error,UI_COPY)}</p>:null}
    {mediaDimension&&mediaError?<p className="scope-status scope-error">{featureDataErrorMessage(mediaError,UI_COPY)}</p>:null}
    {!mediaDimension&&!sourceRows.isPending&&!sourceCatalog.isPending&&!adminSourceQuery.isPending&&!sourceRows.error&&!sourceCatalog.error&&!adminSourceQuery.error?<>
      <p className="scope-status">{sourceSummary.startDate&&sourceSummary.endDate?sourceSummary.startDate+' ～ '+sourceSummary.endDate:''}</p>
      <StatisticsChartFrame level={zoomLevel} onChange={setZoomLevel} range={queryRange} idPrefix="scope-stat">
        <StatisticsMultiChart
          type={effectiveChartType}
          rows={basicTrend}
          series={basicSeries}
          distribution={basicDistribution}
          totalKey={rankingType==='total'?'total':''}
          foldBlank={foldBlank}
          height={420}
        />
      </StatisticsChartFrame>
      <StatisticsDetails>{()=> <SummaryList rankingType={rankingType} summary={sourceSummary}/>}</StatisticsDetails>
    </>:null}
    {mediaDimension&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate)?<div className="scope-stat-controls">
      <button type="button" className="loc-button" onClick={()=>rankingType==='media_style'?crossTagQuery.refetch():mediaQuery.refetch()} disabled={mediaFetching}>
        {mediaFetching?t('uiExtra.statisticsUI.refreshing'):t('uiExtra.statisticsUI.refresh')}
      </button>
    </div>:null}
    {rankingType==='media_style'&&styleTreeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(styleTreeQuery.error,UI_COPY)}</p>:null}
    {rankingType==='media_style'&&crossTagQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(crossTagQuery.error,UI_COPY)}</p>:null}
    {rankingType==='media_style'&&crossTagQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingMediaTags"/></p>:null}
    {rankingType==='media_style'&&!crossTagQuery.isPending&&!crossTagQuery.error?<MediaCrossTagStatistics
      scope={targetScopes[0]}
      rows={crossTagQuery.data||[]}
      range={queryRange}
      zoomLevel={zoomLevel}
      onZoomLevelChange={setZoomLevel}
      facetTrend={facetTrend}
      loadGalaxyStatistics={loadGalaxyStatistics}
    />:null}
    {mediaDimension&&!mediaLoading&&!mediaError?<MediaFacetStatistics
      key={rankingType}
      rankingType={rankingType}
      rows={mediaRows}
      mediaRows={crossTagQuery.data||[]}
      treeRows={styleTreeQuery.data||[]}
      chartType={chartType}
      onChartTypeChange={setChartType}
      range={queryRange}
      foldBlank={foldBlank}
      zoomLevel={zoomLevel}
      onZoomLevelChange={setZoomLevel}
      scopeId={scopeId}
      rowsInWindow={rowsInWindow}
      facetTotals={facetTotals}
      facetTrend={facetTrend}
    />:null}
    {styleFilter==='rune66'?<>
      {runeQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingKeywordAttrs"/></p>:null}
      {runeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error&&runeQuery.data?<Rune66Summary analysis={runeQuery.data}/>:null}
    </>:null}
    {!isLrunesDaily&&Boolean(targetScopes[0])?<StatisticsDetails
      summary={<UiText id="uiExtra.statisticsView.selfIntersectionTitle"/>}>
      {()=> <ScopeSelfIntersection
        key={scopeId}
        scope={targetScopes[0]}
        range={queryRange}
        zoomLevel={zoomLevel}
        onZoomLevelChange={setZoomLevel}
        sharedCatalog={mediaDimension?null:sourceCatalog}
      />}
    </StatisticsDetails>:null}
    </>}
  </section>;
}

function ScopeStatisticsPanel({scopeId,navigation,types,canManageKeywords=false,canManageSources=false}){
  return <>
    {canManageKeywords?<section className="scope-stat-section scope-stat-keyword-link">
      <a className="loc-button" href={scopeHref(scopeId,'statics/keywords')}>
        <UiText id="uiExtra.statisticsView.keywordSettings"/>
      </a>
    </section>:null}
    <ScopeStatisticsResults scopeId={scopeId} navigation={navigation} types={types}/>
  </>;
}

function StatisticsPanel({scopeId,aggregateScopes=false,navigation,types,canManageKeywords=false,canManageSources=false}){
  const t=useUiText();
  // Cross-Scope statistical aggregation belongs to LOC only. Other Scope
  // Groups remain overview/navigation surfaces, never merged COUNT queries.
  if(aggregateScopes&&scopeId==='loc')return <ScopeGroupStatistics
    selectPublicStatisticsMembers={selectPublicStatisticsMembers}
    taipeiDateKey={taipeiDateKey}
    trendBucket={trendBucket}
    loadGalaxyStatistics={loadGalaxyStatistics}/>;
  if(aggregateScopes)return <ScopeGroupOverview
    scopeId={scopeId}
    featureId="statics"
    title={t('uiExtra.statisticsView.scopeGroupStatisticsTitle')}
    description={t('uiExtra.statisticsView.scopeGroupStatisticsHelp')}
  />;
  return <ScopeStatisticsPanel scopeId={scopeId} navigation={navigation} types={types} canManageKeywords={canManageKeywords} canManageSources={canManageSources}/>;
}

export default function Statistics(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const canManageKeywords=Boolean(account.user)&&scopeId!=='lrunes'&&account.canManageScopeSync(scopeId);
  const canManageSources=Boolean(account.user)&&account.canManageScopeSync(scopeId);
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <StatisticsPanel
        scopeId={scopeId}
        aggregateScopes={Boolean(scope?.aggregateChildren)}
        navigation={navigation}
        types={scopeId==='lrunes'?['daily_rune',...STAT_TYPES]:STAT_TYPES}
        canManageKeywords={canManageKeywords}
        canManageSources={canManageSources}
      />
    </section>
  </FeaturePage>;
}
