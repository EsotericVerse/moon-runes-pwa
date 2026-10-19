'use client';
import FieldText from '../../i18n/FieldText';

import {UI_COPY} from '../../i18n/ui-copy';
import {useUiCopy} from '../../i18n/ui-locale';
import UiText,{useUiText} from '../../i18n/UiText';

import {useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';

import {selectMediaStatisticsFacetRows,selectMediaCrossTagRows,selectMediaCrossPairWorks,selectScopeDensityRows,selectScopeSourceBreakdownRows,selectFirstScopeStatisticsDate} from '../../loc/galaxy-query';
import {selectRows} from '../../loc/db-query.mjs';
import {selectFirstDailyRuneDate} from '../../loc/daily-runes';


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
const LocMemberIntersection=dynamic(()=>import('../modules/statistics/LocMemberIntersection'),{loading:()=>null});
const ScopeGroupOverview=dynamic(()=>import('../../loc/ScopeGroupOverview'),{loading:()=>null});
const ScopeCustomSourceCategories=dynamic(()=>import('../../loc/SourceCategoryEditor').then(m=>m.ScopeCustomSourceCategories),{loading:()=>null});
const ScopeGroupStatisticsSharing=dynamic(()=>import('../../loc/ScopeGroupStatisticsSharing'),{loading:()=>null});
import {selectCrossScopeSharing} from '../../loc/statistics-group-sharing-query.mjs';
import {canParticipateInCrossStatistics,sharedScopeDensity} from '../../loc/statistics-group-sharing.mjs';
import StatisticsChartFrame from '../modules/statistics/StatisticsChartFrame';
import StatisticsDetails from '../modules/statistics/StatisticsDetails';
import {statisticsZoomWindow} from '../modules/statistics/statistics-time-zoom.mjs';

const OTHER_RANKING_PAGE_SIZE=10;
const CHART_TYPES=STAT_VISUAL_TYPES;
const STAT_TYPES=['total','source','source_custom','media_type','media_platform','media_style'];
const STAT_TYPE_KEYS=Object.freeze({
  daily_rune:'uiExtra.statisticsUI.dailyRune',
  total:'statistics.totalSource',
  source:'uiExtra.statisticsUI.sourceGroup',
  source_custom:'uiExtra.statisticsUI.sourceCustom',
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
function MediaFacetStatistics({rankingType,rows=[],mediaRows=[],treeRows=[],chartType='line',onChartTypeChange,range={},scopeId,foldBlank=false,zoomLevel=0,onZoomLevelChange}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const [selectedTag,setSelectedTag]=useState('all');
  const [rankingPage,setRankingPage]=useState(1);
  const [styleLevel,setStyleLevel]=useState('tags');
  const [styleClass,setStyleClass]=useState('');
  const classes=useMemo(()=>StatisticsFacets.style.styleTreeClasses(treeRows),[treeRows]);
  const effectiveRows=useMemo(()=>rankingType==='media_style'&&styleLevel!=='tags'
    ?StatisticsFacets.style.mediaStyleTreeDaily(mediaRows,treeRows,styleLevel,styleClass):rows,
    [rankingType,styleLevel,styleClass,rows,mediaRows,treeRows]);
  const window=useMemo(()=>rowsInWindow(effectiveRows,range),[effectiveRows,range]);
  // No NOT/exclusion list; count all existing Meta Tags.
  const facetRows=window.rows;
  const totals=useMemo(()=>facetTotals(facetRows),[facetRows]);
  const chosen=totals.find(row=>row.term===selectedTag)?selectedTag:'all';
  const displayed=chosen==='all'?totals:totals.filter(row=>row.term===chosen);
  const pageSize=scopeId==='lrunes'?RUNE_RANKING_PAGE_SIZE:OTHER_RANKING_PAGE_SIZE;
  const pages=Math.max(1,Math.ceil(displayed.length/pageSize));
  const currentPage=Math.max(1,Math.min(pages,rankingPage));
  const chartCategories=chosen==='all'?totals.slice(0,6).map(row=>row.term):[chosen];
  const chartRows=useMemo(()=>facetTrend(facetRows,window,chartCategories),[facetRows,window.startDate,window.endDate,window.bucket,chartCategories.join('\u0000')]);
  const bars=(chosen==='all'?totals.slice(0,15):displayed).map(row=>({term:row.term,value:row.item_count}));
  const supported=availableStatisticChartTypes({
    rows:chartRows,series:chartCategories.map(category=>({key:category,label:category})),
    distribution:bars.map(row=>({name:row.term,value:row.value}))
  });
  const chosenChartType=supported.some(([value])=>value===chartType)?chartType:(supported[0]?.[0]||'line');
  return <>
    {rankingType==='media_style'&&scopeId==='lo3rwang'&&classes.length?<div className="scope-stat-controls">
      <label><span><UiText id="uiExtra.statisticsUI.mediaStyle"/></span><select className="scope-select" value={styleLevel} onChange={event=>{setStyleLevel(event.target.value);setSelectedTag('all');setRankingPage(1);}}>
        <option value="tags"><UiText id="uiExtra.statisticsView.facetTags"/></option>
        <option value="class"><UiText id="uiExtra.statisticsView.facetClass"/></option>
        <option value="group"><UiText id="uiExtra.statisticsView.facetGroup"/></option>
        <option value="item"><UiText id="uiExtra.statisticsView.facetItem"/></option>
      </select></label>
      {styleLevel!=='tags'?<label><span><UiText id="uiExtra.statisticsView.facetClass"/></span><select className="scope-select" value={styleClass} onChange={event=>{setStyleClass(event.target.value);setSelectedTag('all');setRankingPage(1);}}>
        <option value=""><UiText id="uiExtra.statisticsView.facetAllClasses"/></option>
        {classes.map(name=><option key={name} value={name}>{name}</option>)}
      </select></label>:null}
    </div>:null}
    <div className="scope-stat-controls">
      <label><span><UiText id={rankingType==='media_style'?'uiExtra.statisticsView.selectMeta':'uiExtra.statisticsView.selectItem'}/></span>
        <select className="scope-select" value={chosen} onChange={event=>{setSelectedTag(event.target.value);setRankingPage(1);}}>
          <option value="all"><UiText id="uiExtra.statisticsView.allItems"/></option>
          {totals.map(row=><option key={row.term} value={row.term}>{row.term}（{row.item_count.toLocaleString()}）</option>)}
        </select>
      </label>
      <label><span><UiText id="statistics.chart"/></span>
        <select className="scope-select" value={chosenChartType} onChange={event=>onChartTypeChange?.(event.target.value)}>
          {supported.length?supported.map(([value,label])=><option key={value} value={value}>{t(label)}</option>):<option value="line"><UiText id="uiExtra.statisticsView.noVisual"/></option>}
        </select>
      </label>
    </div>
    {!totals.length?<StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat">
      <p className="scope-status">{UI_COPY.uiExtra.dataErrors.empty}</p>
    </StatisticsChartFrame>:<>
      <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat">
        <StatisticsMultiChart type={chosenChartType}
          rows={chartRows}
          series={chartCategories.map(category=>({key:category,label:category}))}
          distribution={bars.map(row=>({name:row.term,value:row.value}))}
          foldBlank={foldBlank}
          height={420}
        />
      </StatisticsChartFrame>
      <StatisticsDetails>{()=><>
      <div className="scope-ranking">
        {displayed.slice((currentPage-1)*pageSize,currentPage*pageSize).map(row=><div key={row.term}><strong>{row.term}</strong><span>{row.item_count.toLocaleString()}</span></div>)}
      </div>
      {pages>1?<nav className="scope-stat-controls" aria-label={t('uiExtra.statisticsView.pageNav')}>
        <button type="button" className="loc-button" disabled={currentPage===1} onClick={()=>setRankingPage(currentPage-1)}><UiText id="uiExtra.statisticsView.previous"/></button>
        <span>{currentPage} / {pages}</span>
        <button type="button" className="loc-button" disabled={currentPage===pages} onClick={()=>setRankingPage(currentPage+1)}><UiText id="uiExtra.statisticsView.next"/></button>
      </nav>:null}
      </>}</StatisticsDetails>
    </>}
  </>;
}

function MediaCrossTagPicker({title,options,selected,onChange}){
  const chosen=new Set(selected);
  return <details className="scope-stat-cross-picker">
    <summary><FieldText text={title}/>（<UiText id="uiExtra.statisticsView.selected"/> {chosen.size} <UiText id="uiExtra.statisticsView.unitItem"/>）</summary>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'8px 0'}}>
      <button className="loc-button" type="button" onClick={()=>onChange(options.map(x=>x.key))}><UiText id="uiExtra.statisticsView.selectAll"/></button>
      <button className="loc-button" type="button" onClick={()=>onChange([])}><UiText id="uiExtra.statisticsView.clear"/></button>
    </div>
    <div style={{maxHeight:210,overflowY:'auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:6}}>
      {options.map(tag=><label key={tag.key} className="scope-setting-toggle" style={{display:'flex',alignItems:'center',gap:6}}>
        <input type="checkbox" checked={chosen.has(tag.key)} onChange={event=>{
          onChange(event.target.checked?[...chosen,tag.key]:[...chosen].filter(key=>key!==tag.key));
        }}/>
        <span>{tag.label}（{tag.count}）</span>
      </label>)}
    </div>
  </details>;
}
function MediaCrossTagStatistics({scope,rows=[],range={},zoomLevel=0,onZoomLevelChange}){
  const t=useUiText();
  const [leftOverride,setLeftOverride]=useState(null);
  const [rightOverride,setRightOverride]=useState(null);
  const [mode,setMode]=useState('ranking');
  const [selectedPair,setSelectedPair]=useState('');
  const [works,setWorks]=useState([]);
  const [worksOffset,setWorksOffset]=useState(0);
  const [worksHasMore,setWorksHasMore]=useState(false);
  const [worksLoading,setWorksLoading]=useState(false);
  const [worksError,setWorksError]=useState('');
  const worksRequest=useRef(0);
  const catalog=useMemo(()=>StatisticsFacets.cross.mediaCrossTagCatalog(rows),[rows]);
  const tagKeys=new Set(catalog.options.map(x=>x.key));
  const defaults=StatisticsFacets.cross.defaultMediaCrossAxes(catalog);
  const left=leftOverride===null?defaults.left:leftOverride.filter(x=>tagKeys.has(x));
  const leftSet=new Set(left);
  const right=rightOverride===null?catalog.options.filter(x=>!leftSet.has(x.key)).map(x=>x.key)
    :rightOverride.filter(x=>tagKeys.has(x));
  const pairs=useMemo(()=>StatisticsFacets.cross.mediaCrossIntersections(catalog,left,right),[catalog,left.join('\u0000'),right.join('\u0000')]);
  const selected=pairs.find(x=>x.key===selectedPair);
  async function loadPairWorks(pair,offset=0,append=false){
    const request=++worksRequest.current;
    setWorksLoading(true);setWorksError('');
    if(!append)setWorks([]);
    try{
      const page=await selectMediaCrossPairWorks(scope,pair,{
        startDate:range.startDate,endDate:range.endDate,offset,limit:10
      });
      if(request!==worksRequest.current)return;
      setWorks(current=>append?[...current,...page.rows]:page.rows);
      setWorksOffset(page.nextOffset);
      setWorksHasMore(page.hasMore);
    }catch(error){
      if(request===worksRequest.current)setWorksError(featureDataErrorMessage(error,UI_COPY));
    }finally{
      if(request===worksRequest.current)setWorksLoading(false);
    }
  }
  function togglePairWorks(pair){
    if(selectedPair===pair.key){
      worksRequest.current++;setSelectedPair('');setWorks([]);setWorksHasMore(false);setWorksError('');
      return;
    }
    setSelectedPair(pair.key);setWorksOffset(0);setWorksHasMore(false);
    loadPairWorks(pair,0,false);
  }
  const leading=pairs.slice(0,12);
  const trendPairs=pairs.slice(0,6);
  const trendData=useMemo(()=>{
    const daily=trendPairs.flatMap(pair=>[...pair.days].map(([day,item_count])=>({
      day,category:pair.key,item_count
    })));
    return facetTrend(daily,{
      startDate:range.startDate,endDate:range.endDate,bucket:range.bucket||'day'
    },trendPairs.map(pair=>pair.key));
  },[pairs,range.startDate,range.endDate,range.bucket]);
  return <section className="scope-stat-cross" aria-label={t('uiExtra.statisticsView.crossLabel')}>
    <h3><UiText id="uiExtra.statisticsView.crossTitle"/></h3>
    <p className="scope-status"><UiText id="uiExtra.statisticsView.crossHint"/></p>
    {!catalog.options.length?<p className="scope-status"><UiText id="uiExtra.statisticsView.noPairsInRange"/></p>:<>
      <div className="scope-stat-controls" style={{alignItems:'start'}}>
        <MediaCrossTagPicker title={t('uiExtra.statisticsView.tagGroup1')} options={catalog.options} selected={left} onChange={setLeftOverride}/>
        <MediaCrossTagPicker title={t('uiExtra.statisticsView.tagGroup2')} options={catalog.options} selected={right} onChange={setRightOverride}/>
        <button type="button" className="loc-button" onClick={()=>{
          setLeftOverride(null);setRightOverride(null);worksRequest.current++;setSelectedPair('');setWorks([]);setWorksHasMore(false);
        }}><UiText id="uiExtra.statisticsView.resetPairs"/></button>
      </div>
      <div className="scope-stat-controls">
        <label><span><UiText id="uiExtra.statisticsView.chart"/></span><select className="scope-select" value={mode} onChange={event=>setMode(event.target.value)}>
          <option value="ranking"><UiText id="uiExtra.statisticsView.pairCount"/></option><option value="trend"><UiText id="uiExtra.statisticsView.pairTrend"/></option>
        </select></label>
        <span><UiText id="uiExtra.statisticsView.matchingPairs"/>：{pairs.length.toLocaleString()} <UiText id="uiExtra.statisticsView.unitPair"/></span>
      </div>
      {!pairs.length?<p className="scope-status"><UiText id="uiExtra.statisticsView.noPairOverlap"/></p>:<>
        <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat-cross">
          {mode==='ranking'?<div style={{overflowX:'auto'}}>
            <div style={{minWidth:480}}>
              <StatisticsMultiChart type="bar" barLayout="vertical" rows={[]}
                distribution={leading.map(pair=>({
                  key:pair.key,name:pair.leftLabel+' × '+pair.rightLabel,value:pair.count
                }))}
                height={Math.max(250,leading.length*38+70)}
                onCategoryClick={key=>{const pair=leading.find(item=>item.key===key);if(pair)togglePairWorks(pair);}}/>
            </div>
          </div>:<StatisticsMultiChart type="line"
            rows={trendData}
            series={trendPairs.map(pair=>({key:pair.key,label:pair.leftLabel+' × '+pair.rightLabel}))}
            onSeriesClick={key=>{const pair=trendPairs.find(item=>item.key===key);if(pair)togglePairWorks(pair);}}
            height={420}/>}

        </StatisticsChartFrame>
        {selected?<div className="scope-stat-cross-matches">
          <h4>{selected.leftLabel} × {selected.rightLabel} · {selected.count} {t('uiExtra.statisticsView.unitCase')}</h4>
          <div className="scope-ranking" style={{maxHeight:360,overflowY:'auto'}}>
            {works.map(media=><div key={media.id}>
              <strong>{media.title||media.id}</strong>
              <span>{media.day||t('uiExtra.statisticsView.noDate')} {/^https?:\/\//iu.test(media.url)?<a href={media.url} target="_blank" rel="noopener noreferrer"><UiText id="uiExtra.statisticsView.viewMedia"/></a>:null}</span>
            </div>)}
          </div>
          {worksLoading?<p className="scope-status"><UiText id="uiExtra.pagination.loading"/></p>:null}
          {worksError?<p className="scope-status scope-error">{worksError}</p>:null}
          {worksHasMore?<button type="button" className="loc-button" disabled={worksLoading} onClick={()=>loadPairWorks(selected,worksOffset,true)}><UiText id="uiExtra.pagination.loadMore"/></button>:null}
        </div>:null}
      </>}
    </>}
  </section>;
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

function ScopeGroupStatistics(){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const [aggregateType,setAggregateType]=useState('total');
  const [chartType,setChartType]=useState('line');
  const [zoomLevel,setZoomLevel]=useState(0);
  // Persist intersection selections while the range-specific query remounts.
  const [memberLaneCount,setMemberLaneCount]=useState(2);
  const [memberChoices,setMemberChoices]=useState([]);
  const [memberGraph,setMemberGraph]=useState('line');
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectPublicStatisticsMembers,
    staleTime:5*60_000
  });
  const policy=useQuery({
    queryKey:['cross-statistics-sharing'],
    queryFn:selectCrossScopeSharing,
    staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:true
  });
  const scopes=useMemo(()=>(scopesQuery.data||[]).filter(scope=>
    canParticipateInCrossStatistics(scope.id,policy.data?.permissions,policy.data?.categories)
  ),[scopesQuery.data,policy.data]);
  const scopeIds=useMemo(()=>scopes.map(scope=>String(scope.id||'').trim()).filter(Boolean),[scopes]);
  const endDate=useMemo(()=>taipeiDateKey(),[]);
  const earliest=useQuery({
    queryKey:['statistics-history-start','loc',scopesQuery.data?.map(row=>row.id).join('|')],
    enabled:scopesQuery.isSuccess,
    queryFn:async()=>{
      const starts=await Promise.all([
        ...(scopesQuery.data||[]).map(selectFirstScopeStatisticsDate),
        selectFirstDailyRuneDate()
      ]);
      return starts.filter(Boolean).sort()[0]||'';
    },
    staleTime:5*60_000
  });
  const zoomRange=useMemo(()=>statisticsZoomWindow(zoomLevel,endDate,earliest.data||''),
    [zoomLevel,endDate,earliest.data]);
  const {startDate,endDate:rangeEndDate,bucket}=zoomRange;
  const densityQuery=useQuery({
    queryKey:['scope-density','loc',zoomLevel,startDate,rangeEndDate,scopeIds.join('|'),JSON.stringify(policy.data?.permissions||[])],
    queryFn:async()=>{
      return Promise.all(scopes.map(async scope=>{
        const rows=await selectScopeSourceBreakdownRows(scope,{startDate,endDate:rangeEndDate});
        return {scopeId:scope.id,rows,density:sharedScopeDensity(rows,scope.id,policy.data)};
      }));
    },
    enabled:Boolean(policy.data&&scopes.length&&startDate&&rangeEndDate),
    staleTime:5*60_000
  });
  const densityRows=useMemo(()=>(densityQuery.data||[]).flatMap(entry=>entry.density),[densityQuery.data]);
  const preloadedSources=useMemo(()=>densityQuery.data
    ?new Map(densityQuery.data.map(entry=>[entry.scopeId,entry.rows]))
    :null,[densityQuery.data]);
  const overallTotal=useMemo(
    ()=>densityRows.reduce((sum,row)=>sum+(Number(row.item_count)||0),0),
    [densityRows]
  );
  const totals=useMemo(()=>{
    const map=new Map(scopeIds.map(id=>[id,0]));
    for(const row of densityRows){
      const id=String(row.scope_id||'').trim();
      if(!map.has(id))continue;
      map.set(id,(map.get(id)||0)+(Number(row.item_count)||0));
    }
    return scopeIds.map(id=>{
      const total=map.get(id)||0;
      return {scope_id:id,total,ratio:overallTotal>0?(total/overallTotal)*100:0};
    });
  },[densityRows,scopeIds,overallTotal]);
  const trendData=useMemo(()=>{
    if(!startDate||!rangeEndDate)return [];
    const bucketUnit=bucket;
    const buckets=new Map();
    for(let cursor=new Date(startDate+'T00:00:00Z'),end=new Date(rangeEndDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
      const day=cursor.toISOString().slice(0,10);
      const bucket=trendBucket(day,bucketUnit);
      if(!bucket||buckets.has(bucket.key))continue;
      const row={period:bucket.label,_sort:bucket.key,total:0};
      for(const id of scopeIds)row[id]=0;
      buckets.set(bucket.key,row);
    }
    for(const sourceRow of densityRows){
      const bucket=trendBucket(sourceRow.day,bucketUnit);
      if(!bucket)continue;
      const row=buckets.get(bucket.key)||{period:bucket.label,_sort:bucket.key,total:0};
      for(const id of scopeIds)if(row[id]===undefined)row[id]=0;
      const id=String(sourceRow.scope_id||'').trim();
      const count=Number(sourceRow.item_count)||0;
      if(scopeIds.includes(id))row[id]=(Number(row[id])||0)+count;
      row.total=(Number(row.total)||0)+count;
      buckets.set(bucket.key,row);
    }
    return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort));
  },[densityRows,startDate,rangeEndDate,scopeIds,bucket]);
  const distributionData=totals.map(row=>({term:row.scope_id,value:row.total}));
  // Even when displaying a combined total, its composition is the real
  // set of child Scopes. A single 100% "LOC total" pie is not analytics.
  const locSeries=scopeIds.map(id=>({key:id,label:id}));
  const locDistribution=distributionData.map(row=>({name:row.term,value:row.value}));
  const locAllowed=availableStatisticChartTypes({
    rows:trendData,series:locSeries,distribution:locDistribution,totalKey:aggregateType==='total'?'total':''
  });
  const locChartType=locAllowed.some(([value])=>value===chartType)?chartType:(locAllowed[0]?.[0]||'line');

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading">
      <div>
        <h2>{UI_COPY.statistics.result}</h2>
      </div>
    </header>
    <div className="scope-stat-controls">
      <label>
        <span>{UI_COPY.statistics.item}</span>
        <select className="scope-select" value={aggregateType} onChange={event=>setAggregateType(event.target.value)}>
          <option value="total"><UiText id="uiExtra.statisticsView.memberCount"/></option>
          <option value="scope"><UiText id="uiExtra.statisticsView.memberDistribution"/></option>
        </select>
      </label>
      <label>
        <span>{UI_COPY.statistics.chart}</span>
        <select className="scope-select" value={locChartType} onChange={event=>setChartType(event.target.value)}>
          {locAllowed.length?locAllowed.map(([value,label])=><option key={value} value={value}>{t(label)}</option>):<option value="line"><UiText id="uiExtra.statisticsView.noVisual"/></option>}
        </select>
      </label>
    </div>

    <p className="scope-status">{startDate&&rangeEndDate?startDate+' ～ '+rangeEndDate:''}</p>
    <p className="scope-status"><UiText id="uiExtra.statisticsView.groupAggregateHelp"/></p>
    <StatisticsChartFrame level={zoomLevel} onChange={setZoomLevel} range={zoomRange} idPrefix="loc-stat">
      {!densityQuery.isPending&&!densityQuery.error&&trendData.length?<StatisticsMultiChart
        type={locChartType} rows={trendData} series={locSeries}
        distribution={locDistribution} totalKey={aggregateType==='total'?'total':''} height={420}
      />:<p className="scope-status">{densityQuery.isPending?t('uiExtra.statisticsUI.loading'):t('uiExtra.statisticsUI.noChart')}</p>}
    </StatisticsChartFrame>
    <StatisticsDetails>{()=><>
    <div className="scope-ranking">
      <div>
        <strong><UiText id="uiExtra.statisticsView.memberCount"/></strong>
        <span>{t('uiExtra.statisticsView.totalWithCount',{count:overallTotal.toLocaleString()})}</span>
      </div>
    </div>

    <div className="scope-result-links">
      {scopeIds.map(id=><a key={id} href={featureNavigationHref(id,'statics')}>{id} · {t('uiExtra.statisticsView.viewMemberStat')}</a>)}
    </div>

    </>}</StatisticsDetails>
    <StatisticsDetails className="scope-stat-details" summary={<UiText id="uiExtra.statisticsView.memberCrossTitle"/>}>
      {()=> <LocMemberIntersection key={startDate+'|'+rangeEndDate}
        scopes={scopesQuery.data||[]} startDate={startDate} endDate={rangeEndDate}
        unit={bucket} sharing={policy.data||{}} preloadedSources={preloadedSources}
        laneCount={memberLaneCount} onLaneCountChange={setMemberLaneCount}
        choices={memberChoices} onChoicesChange={setMemberChoices}
        graph={memberGraph} onGraphChange={setMemberGraph}
        zoomLevel={zoomLevel} onZoomLevelChange={setZoomLevel} zoomRange={zoomRange}/>}
    </StatisticsDetails>
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error,UI_COPY)}</p>:null}
    {policy.error?<p className="scope-status scope-error">{featureDataErrorMessage(policy.error,UI_COPY)}</p>:null}
    {earliest.error?<p className="scope-status scope-error">{featureDataErrorMessage(earliest.error,UI_COPY)}</p>:null}
    {densityQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(densityQuery.error,UI_COPY)}</p>:null}
  </section>;
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
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectPublicStatisticsMembers,
    staleTime:5*60_000
  });
  const targetScopes=useMemo(()=>{
    const scopes=scopesQuery.data||[];
    return scopes.filter(scope=>scope.id===scopeId);
  },[scopeId,scopesQuery.data]);
  const earliest=useQuery({
    queryKey:['statistics-history-start',scopeId],
    enabled:!isLrunesDaily&&Boolean(targetScopes[0]),
    queryFn:()=>selectFirstScopeStatisticsDate(targetScopes[0]),
    staleTime:5*60_000
  });
  const queryRange=useMemo(()=>statisticsZoomWindow(zoomLevel,queryEndDate,earliest.data||''),
    [zoomLevel,queryEndDate,earliest.data]);
  const mediaQuery=useQuery({
    queryKey:['statistics-media-facet',scopeId,rankingType,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectMediaStatisticsFacetRows(targetScopes[0],rankingType,queryRange),
    enabled:mediaDimension&&rankingType!=='media_style'&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  const crossTagQuery=useQuery({
    queryKey:['statistics-media-cross-tags',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectMediaCrossTagRows(targetScopes[0],queryRange),
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
      const [cat,aliases,personal]=await Promise.all([
        selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
        selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250}),
        selectRows('silver.scope_source_subcategories',{columns:'scope_id,source_key,category_code,display_name,enabled',
          filters:[{column:'scope_id',operator:'eq',value:scopeId}],limit:250})
      ]);
      return {categories:cat.rows,aliases:aliases.rows,scopeSources:personal.rows};
    },
    staleTime:5*60_000
  });
  const sourceRows=useQuery({
    queryKey:['own-scope-source-intersection',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectScopeSourceBreakdownRows(targetScopes[0],queryRange),
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
        unit:queryRange.bucket,scopeId,
        dimension:rankingType==='source_custom'?'personal':'group'
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
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error,UI_COPY)}</p>:null}
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
    />:null}
    {styleFilter==='rune66'?<>
      {runeQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingKeywordAttrs"/></p>:null}
      {runeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error&&runeQuery.data?<Rune66Summary analysis={runeQuery.data}/>:null}
    </>:null}
    {!isLrunesDaily&&Boolean(targetScopes[0])?<StatisticsDetails
      summary={<FieldText text="作品自交互統計"/>}>
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
    {canManageSources?<StatisticsDetails className="scope-stat-section"
      summary={<UiText id="uiExtra.statisticsView.groupSourcesShare"/>}>
      {()=> <ScopeGroupStatisticsSharing scopeId={scopeId}/>}
    </StatisticsDetails>:null}
    {canManageSources?<StatisticsDetails className="scope-stat-section"
      summary={<UiText id="uiExtra.statisticsView.personalSourcesManage"/>}>
      {()=> <ScopeCustomSourceCategories scopeId={scopeId}/>}
    </StatisticsDetails>:null}
  </>;
}

function StatisticsPanel({scopeId,aggregateScopes=false,navigation,types,canManageKeywords=false,canManageSources=false}){
  const t=useUiText();
  // Cross-Scope statistical aggregation belongs to LOC only. Other Scope
  // Groups remain overview/navigation surfaces, never merged COUNT queries.
  if(aggregateScopes&&scopeId==='loc')return <ScopeGroupStatistics/>;
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
