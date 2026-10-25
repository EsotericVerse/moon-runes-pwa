'use client';

import {registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../../i18n/ui-locale';
import UiText,{useUiText} from '../../i18n/UiText';
import statisticsZh from '../../i18n/sections/statistics.zh_tw.js';
import statisticsUIZh from '../../i18n/sections/uiExtra.statisticsUI.zh_tw.js';
import statisticsViewZh from '../../i18n/sections/uiExtra.statisticsView.zh_tw.js';
import chartTypesZh from '../../i18n/sections/uiExtra.chartTypes.zh_tw.js';
registerDefaultSection('statistics',statisticsZh);
registerDefaultSection('uiExtra.statisticsUI',statisticsUIZh);
registerDefaultSection('uiExtra.statisticsView',statisticsViewZh);
registerDefaultSection('uiExtra.chartTypes',chartTypesZh);

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter,useSearchParams} from 'next/navigation';
import {useAsyncResource,useAsyncInfiniteResource,useResourceCache} from '../../loc/use-async-resource';

// Defer Galaxy's data/query engine until the selected statistics mode needs it.
const loadGalaxyStatistics=()=>import('../../loc/galaxy-query');
import {selectRows} from '../../loc/db-query.mjs';


import {selectScopeRegistry,defaultScopeData} from '../../loc/scope-data';
import {featureNavigationHref,galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
import {useScopeRuntime} from '../use-scope-runtime';
import {ArticleSortSelect,FeaturePage,IncrementalList,WorkFullText} from '../ui';
import {workDisplayHeading,workDisplayText} from '../work-display-model';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/db-contract.mjs';
import {assignedSource} from '../../loc/member-intersection-model.mjs';
import {publishedSourceCategoryCatalog} from '../published-source-taxonomy.js';
import {administrativeSourceTrend} from '../../loc/statistics-admin-source.mjs';
import {useAccount} from '../../loc/use-account';
import {dbPublicClient} from '../../loc/db-client.mjs';
import {StatisticsFacets} from '../../loc/statistics-facets';
import {scopeHref} from '../scope-registry';
import ScopeLink from '../ScopeLink';
const LrunesDailyStatisticsPanel=dynamic(()=>import('../../lrunes/DailyRuneAnalytics').then(m=>m.LrunesDailyStatisticsPanel),{loading:()=>null});
import {STAT_VISUAL_TYPES,availableStatisticChartTypes,chartTypeGroups} from '../modules/statistics/statistics-time-zoom.mjs';
const StatisticsMultiChart=dynamic(()=>import('../modules/statistics/StatisticsMultiChart'),{loading:()=>null});
const Rune66Summary=dynamic(()=>import('../modules/statistics/StatisticsMultiChart').then(m=>m.Rune66Summary),{loading:()=>null});
const ScopeSelfIntersection=dynamic(()=>import('../modules/statistics/ScopeSelfIntersection'),{loading:()=>null});
const MediaCrossTagStatistics=dynamic(()=>import('../modules/statistics/MediaCrossTagStatistics'),{loading:()=>null});
const MediaFacetStatistics=dynamic(()=>import('../modules/statistics/MediaFacetStatistics'),{loading:()=>null});
const ScopeGroupStatistics=dynamic(()=>import('../modules/statistics/ScopeGroupStatistics'),{loading:()=>null});
const ScopeGroupOverview=dynamic(()=>import('../../loc/ScopeGroupOverview'),{loading:()=>null});
const Article=dynamic(()=>import('../Article'),{loading:()=>null});
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
function SourceArticleList({scope,startDate,endDate,sourceNames=null}){
  const [selectedUid,setSelectedUid]=useState('');
  const [articleSort,setArticleSort]=useState('desc');
  const group=Array.isArray(sourceNames);
  const worksQuery=useAsyncInfiniteResource({
    queryKey:['statistics-source-articles',scope.id,startDate,endDate,sourceNames,articleSort],
    initialPageParam:null,
    queryFn:async({pageParam})=>{
      const {selectScopePeriodWorkIndex,selectScopePeriodWorkDetails}=await import('../../loc/culture-query');
      const index=await selectScopePeriodWorkIndex(scope,{
        startDate,endDate,
        sourceName:group?'statistics-source':'',
        sourceNames:sourceNames||[],
        limit:DEFAULT_LIST_BATCH_SIZE,cursor:pageParam,sortDirection:articleSort
      });
      const {rows}=await selectScopePeriodWorkDetails(scope,{items:index.rows});
      const next=index.nextCursor;
      return {rows,totalCount:index.totalCount,nextCursor:next,
        hasMore:Number(next.galaxyOffset||0)+Number(next.mediaOffset||0)<Number(index.totalCount||0)};
    },
    getNextPageParam:page=>page.hasMore?page.nextCursor:undefined,
  });
  const bodyQuery=useAsyncResource({
    queryKey:['statistics-source-article-body',scope.id,selectedUid],
    enabled:Boolean(selectedUid),
    queryFn:async()=>{
      const {selectGalaxyContent}=await loadGalaxyStatistics();
      const result=await selectGalaxyContent(scope,selectedUid);
      if(!result)throw new Error('找不到文章內容');
      return workDisplayText(result.content||'');
    },
  });
  const works=(worksQuery.data?.pages||[]).flatMap(page=>page.rows||[]);
  return <div className="scope-stat-source-works">
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem'}}>
      <p className="scope-status">{group?'此來源的文章列表':'全部作品列表（含多媒體）'} · {startDate} ～ {endDate}</p>
      <ArticleSortSelect value={articleSort} onChange={setArticleSort}/>
    </div>
    {worksQuery.isPending?<p className="scope-status" role="status">Loading...</p>:null}
    {worksQuery.error?<p className="scope-status scope-error">
      {featureDataErrorMessage(worksQuery.error)} <button type="button" className="loc-button" onClick={()=>worksQuery.refetch()}>重新讀取</button>
    </p>:null}
    <IncrementalList
      items={works}
      batchSize={DEFAULT_LIST_BATCH_SIZE}
      resetKey={scope.id+'|'+startDate+'|'+endDate+'|'+(sourceNames||[]).join('|')+'|'+articleSort}
      className="scope-culture-source-work-scroll"
      loading={worksQuery.isFetchingNextPage}
      externalHasMore={Boolean(worksQuery.hasNextPage)}
      onLoadMore={()=>worksQuery.fetchNextPage()}
      renderItem={(work,index)=><Article
        key={work.key||work.uid||work.entry_id||index}
        uid={work.uid}
        title={workDisplayHeading(work,{media:false,limit:80})}
        source={work.source_name||work.group_label||''}
        scopeId={work.scope_id||scope.id}
        date={work.display_date||String(work.createtime||'').slice(0,10)}
        body={work.description||work.media_metadata_text||''}
        relationLinks={galaxyRelationLinks(scope.id,work)}
        links={work.links||[]}
      >{work.uid?<WorkFullText
        open={selectedUid===String(work.uid)}
        loading={selectedUid===String(work.uid)&&bodyQuery.isPending}
        error={selectedUid===String(work.uid)&&bodyQuery.error?featureDataErrorMessage(bodyQuery.error):''}
        content={selectedUid===String(work.uid)?bodyQuery.data||'':''}
        onToggle={()=>setSelectedUid(old=>old===String(work.uid)?'':String(work.uid))}
      />:null}</Article>}
    />
    {!worksQuery.isPending&&!worksQuery.error&&!works.length?<p className="scope-status">此區間沒有可顯示的作品。</p>:null}
  </div>;
}
// A Scope's subgroups only subdivide the Admin-defined Others total.
// Load on expansion; never turn small-group aliases into global categories.
async function readPersonalSourceClasses(scopeId){
  const {publishedSourceTaxonomy}=await import('../published-source-taxonomy.js');
  const published=publishedSourceTaxonomy(scopeId);
  if(published)return {groups:published.groups||[],aliases:published.groupAliases||[]};
  const {sourceTaxonomyFromArrays}=await import('../../loc/source-classification.mjs');
  const {rows}=await selectRows('silver.'+scopeId,{
    columns:'txt_class',filters:[{column:'id',operator:'eq',value:scopeId}],limit:1
  });
  const mapped=sourceTaxonomyFromArrays([],rows[0]?.txt_class||[]);
  return {groups:mapped.groups,aliases:mapped.groupAliases};
}
function SummaryList({rankingType,summary,scope,range,filteredSource=false}){
  const UI_COPY=useUiCopy();
  const rows=rankingType==='total'
    ?[{term:UI_COPY.statistics.totalSource,item_count:summary.total,
      sourceNames:filteredSource?summary.sources.flatMap(row=>row.sourceNames||[]):null}]
    :summary.sources;
  return <div className="scope-ranking">
    {rows.map(row=><div key={row.category||row.term} style={{display:'block'}}>
      <StatisticsDetails className="scope-stat-details" summary={<><strong>{row.term}</strong><span>{Number(row.item_count||0).toLocaleString()}</span></>}>
        {()=> <>
          {filteredSource&&rankingType==='total'&&!row.sourceNames?.length
            ?<p className="scope-status">所選來源在此區間沒有作品。</p>
            :<SourceArticleList key={scope.id+'|'+range.startDate+'|'+range.endDate}
              scope={scope} startDate={range.startDate} endDate={range.endDate}
              sourceNames={row.sourceNames}/>} 
        </>}
      </StatisticsDetails>
    </div>)}
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
  const [keywordSource,setKeywordSource]=useState('');
  const [sourceGroup,setSourceGroup]=useState('');
    useEffect(()=>{
    setStyleFilter('none');
    setKeywordSource('');
    setSourceGroup('');
  },[scopeId]);
  // Period is the primary Statistics navigation. Default to the latest
  // saved Period, not an unnecessary preliminary one-year statistics fetch.
  const [selectedPeriodKey,setSelectedPeriodKey]=useState('latest');
  useEffect(()=>{setSelectedPeriodKey('latest');},[scopeId]);
  const queryEndDate=useMemo(()=>taipeiDateKey(),[]);
  // The active route already resolves the requested Scope; no registry-wide SELECT.
  const targetScopes=useMemo(()=>isLrunesDaily?[]:[defaultScopeData(scopeId)].filter(Boolean),[scopeId,isLrunesDaily]);
  const resourceCache=useResourceCache();
  // The earliest date only widens the zoom-out limit. It arrives with the chart data
  // itself, so the first window (last year) never waits for it.
  const [knownEarliest,setKnownEarliest]=useState('');
  const customQueryRange=useMemo(()=>statisticsZoomWindow(zoomLevel,queryEndDate,knownEarliest),
    [zoomLevel,queryEndDate,knownEarliest]);
  const periodQuery=useAsyncResource({
    queryKey:['culture-time-periods',scopeId],
    enabled:!isLrunesDaily&&scopeId!=='local'&&scopeId!=='loc'&&Boolean(targetScopes[0]),
    queryFn:async()=>{
      const {readNumericIsr,usesNumericIsr}=await import('../../loc/numeric-isr-client');
      if(usesNumericIsr(scopeId))return readNumericIsr(scopeId,'periods');
      // Native/local data providers do not make remote ISR requests.
      const {selectScopeCultureData}=await import('../../loc/culture-query');
      return (await selectScopeCultureData(scopeId)).eras?.eras||[];
    },
    revalidateOnFocus:false,
    revalidateOnReconnect:false
  });
  const periods=useMemo(()=>(periodQuery.data||[])
    .filter(row=>String(row.scope_id||'')===scopeId&&row.start_date)
    .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))
      ||Number(a.order||0)-Number(b.order||0)),[periodQuery.data,scopeId]);
  const selectedPeriod=selectedPeriodKey==='latest'
    ?periods.at(-1)||null
    :periods.find(row=>String(row.period||row.era_id||row.record_id)===selectedPeriodKey)||null;
  // LOC aggregates member Scopes, but has no mandatory aggregate Period row.
  // An empty or non-period Scope must not request a nonexistent Period index.
  const periodNavigationReady=isLrunesDaily||scopeId==='local'||scopeId==='loc'||periodQuery.data!==undefined||Boolean(periodQuery.error);
  const queryRange=useMemo(()=>{
    if(!selectedPeriod)return customQueryRange;
    const startDate=String(selectedPeriod.start_date).slice(0,10);
    const endDate=String(selectedPeriod.end_date||queryEndDate).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate)||startDate>endDate)return customQueryRange;
    const days=Math.round((Date.parse(endDate+'T00:00:00Z')-Date.parse(startDate+'T00:00:00Z'))/86_400_000);
    return {...customQueryRange,startDate,endDate,bucket:days>180?'month':days>31?'week':'day',
      fullHistory:false,canZoomOut:false,canZoomIn:false};
  },[selectedPeriod,customQueryRange,queryEndDate]);
  // Both editors store flat names. Show one direct source choice, not a group tree.
  const activeSourceSelection=styleFilter==='rune66'?keywordSource:rankingType==='source'?sourceGroup:'';
  const sourceChart=!isLrunesDaily&&!mediaDimension&&Boolean(targetScopes.length)&&Boolean(rankingType);
  // ONE request per source chart: earliest date + exact daily counts + source taxonomy.
  const overview=useAsyncResource({
    queryKey:['scope-overview',scopeId,queryRange.startDate,queryRange.endDate],
    enabled:sourceChart&&periodNavigationReady&&Boolean(queryRange.startDate&&queryRange.endDate),
    queryFn:async()=>{
      const {selectScopeOverview}=await loadGalaxyStatistics();
      const data=await selectScopeOverview(targetScopes[0],queryRange);
      // The self-intersection panel reads the same rows; seed its cache so opening it is free.
      resourceCache.set(['own-scope-source-intersection',scopeId,queryRange.startDate,queryRange.endDate],data.rows);
      return data;
    },
  });
  // Media charts carry their own facet rows; the earliest date is one small request.
  const earliestQuery=useAsyncResource({
    queryKey:['statistics-history-start',scopeId],
    enabled:!isLrunesDaily&&mediaDimension&&periodNavigationReady&&!selectedPeriod&&!knownEarliest&&Boolean(targetScopes[0]),
    queryFn:async()=>{
      const {selectScopeEarliest}=await loadGalaxyStatistics();
      return selectScopeEarliest(targetScopes[0]);
    },
  });
  useEffect(()=>{
    const found=overview.data?.earliest||earliestQuery.data||'';
    if(found&&found!==knownEarliest)setKnownEarliest(found);
  },[overview.data,earliestQuery.data,knownEarliest]);
  const [crossTagRequested,setCrossTagRequested]=useState(false);
  useEffect(()=>setCrossTagRequested(false),[scopeId,rankingType]);
  const mediaQuery=useAsyncResource({
    queryKey:['statistics-media-facet',scopeId,rankingType,queryRange.startDate,queryRange.endDate],
    queryFn:async()=>{
      const {selectMediaStatisticsFacetRows}=await loadGalaxyStatistics();
      return selectMediaStatisticsFacetRows(targetScopes[0],rankingType,queryRange);
    },
    enabled:mediaDimension&&periodNavigationReady&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
  });
  const crossTagQuery=useAsyncResource({
    queryKey:['statistics-media-cross-tags',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:async()=>{
      const {selectMediaCrossTagRows}=await loadGalaxyStatistics();
      return selectMediaCrossTagRows(targetScopes[0],queryRange);
    },
    enabled:rankingType==='media_style'&&crossTagRequested&&Boolean(targetScopes[0])&&Boolean(queryRange.startDate&&queryRange.endDate),
  });
  const styleTreeQuery=useAsyncResource({
    queryKey:['music-style-tree',scopeId],
    queryFn:async()=>{
      const {data,error}=await dbPublicClient.schema('silver').rpc('read_music_style_tree');
      if(error)throw new Error(error.message||'Music Style Tree read failed');
      return Array.isArray(data)?data:[];
    },
    enabled:scopeId==='lo3rwang'&&rankingType==='media_style',
  });
  const sourceRows={isPending:overview.isPending&&sourceChart,isSuccess:overview.isSuccess,error:overview.error,
    data:overview.data?.rows,dataUpdatedAt:overview.dataUpdatedAt};
  // Public Scopes have a published JS category snapshot. Reuse it in Culture
  // and Statistics; never schedule a separate classification request to draw
  // an already ISR-cached chart. Only an unknown Scope falls back to txt_class.
  const publishedCatalog=useMemo(()=>publishedSourceCategoryCatalog(scopeId),[scopeId]);
  const othersConfig=useAsyncResource({
    queryKey:['scope-others-source-summary',scopeId],
    enabled:sourceChart&&Boolean(scopeId)&&!publishedCatalog,
    queryFn:async()=>readPersonalSourceClasses(scopeId),
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const sourceCatalog=useMemo(()=>{
    const ready=Boolean(publishedCatalog||othersConfig.isSuccess);
    const dynamic=othersConfig.data;
    return {
      isPending:(overview.isPending||!ready)&&sourceChart,
      isSuccess:overview.isSuccess&&ready,
      error:publishedCatalog?null:othersConfig.error,
      data:overview.data?(publishedCatalog||{
        categories:[...(overview.data.categories||[]),
          ...(dynamic?.groups||[]).map(group=>({
            category_code:group.group_code,display_name:group.display_name,enabled:true
          }))],
        aliases:[...(overview.data.aliases||[]),
          ...(dynamic?.aliases||[]).map(item=>({
            source_key:item.source_key,category_code:item.group_code
          }))]
      }):undefined,
      dataUpdatedAt:Math.max(overview.dataUpdatedAt||0,publishedCatalog?0:othersConfig.dataUpdatedAt||0)
    };
  },[publishedCatalog,overview.isPending,overview.isSuccess,overview.data,overview.dataUpdatedAt,
    othersConfig.isSuccess,othersConfig.data,othersConfig.error,othersConfig.dataUpdatedAt,sourceChart]);
  const selectedRawNames=null;
  // Numeric counts come from ISR. Category bucketing is tiny synchronous
  // presentation work, not an independent remote resource: avoid a second SWR
  // suspense/loading cycle after the cached numeric response arrives.
  const adminSource=useMemo(()=>{
    if(isLrunesDaily||mediaDimension||!sourceCatalog.isSuccess)return null;
    return administrativeSourceTrend(overview.data?.rows||[],sourceCatalog.data||{},{
      startDate:queryRange.startDate,endDate:queryRange.endDate,
      unit:queryRange.bucket,sourceCategory:activeSourceSelection,sourceNames:selectedRawNames
    });
  },[isLrunesDaily,mediaDimension,sourceCatalog.isSuccess,sourceCatalog.data,overview.data,
    queryRange.startDate,queryRange.endDate,queryRange.bucket,activeSourceSelection]);
  const adminSourceReady=Boolean(adminSource);
  const resolvedAdminSource=adminSource||{rows:[],series:[],distribution:[],total:0};
  const basicTrend=resolvedAdminSource.rows;
  const basicSeries=resolvedAdminSource.series;
  const basicDistribution=resolvedAdminSource.distribution;
  // The existing source breakdown already drives the chart and its summary.
  // Do not re-scan Galaxy and Galaxy Media in a second trend query.
  const sourceSummary={total:resolvedAdminSource.total,
    sources:resolvedAdminSource.distribution.map((row,index)=>{
      // Category codes and labels share the same order in administrativeSourceTrend.
      const category=String(resolvedAdminSource.series[index]?.key||'').replace(/^category_/,'');
      const sourceNames=[...new Set((sourceRows.data||[])
        .filter(entry=>entry.kind==='source'&&assignedSource(entry.category,
          sourceCatalog.data?.aliases||[],sourceCatalog.data?.categories||[])===category)
        .map(entry=>String(entry.category??'').trim())
        .filter(name=>!selectedRawNames||selectedRawNames.includes(name.toLowerCase())))];
      return {term:row.name,item_count:row.value,category,sourceNames};
    }),
    startDate:queryRange.startDate,endDate:queryRange.endDate,
    rawRows:selectedRawNames?(sourceRows.data||[]).filter(row=>row.kind!=='source'||selectedRawNames.includes(String(row.category||'').trim().toLowerCase())):sourceRows.data||[],
    catalog:sourceCatalog.data||{}
  };
  // The common chart reads the numeric ISR. Advanced cross-tags retain the
  // original row-level semantics but load only after the user requests them.
  const mediaRows=mediaQuery.data||[];
  const mediaLoading=mediaQuery.isPending;
  const mediaFetching=mediaQuery.isFetching;
  const mediaError=mediaQuery.error;
  const facetRange=rowsInWindow(mediaRows,queryRange);
  const facetTotalsForOptions=facetTotals(facetRange.rows);
  const facetNames=facetTotalsForOptions.slice(0,6).map(row=>row.term);
  const facetData=facetTrend(facetRange.rows,facetRange,facetNames);
  const facetDistribution=facetTotalsForOptions.slice(0,15).map(row=>({name:row.term,value:row.item_count}));
  const optionsForCurrent=availableStatisticChartTypes(mediaDimension
    ?{rows:facetData,series:facetNames.map(name=>({key:name,label:name})),distribution:facetDistribution}
    :{rows:basicTrend,series:basicSeries,distribution:basicDistribution,totalKey:rankingType==='total'?'total':''});
  const effectiveChartType=optionsForCurrent.some(([value])=>value===chartType)?chartType:(optionsForCurrent[0]?.[0]||'line');
  const chartGroups=chartTypeGroups(optionsForCurrent,rankingType==='total'
    ?['line','composed','bar']:['line','stacked','pie']);
  const styleRange=useMemo(()=>({
    startDate:queryRange.startDate||'',
    endDate:queryRange.endDate||''
  }),[queryRange.startDate,queryRange.endDate]);
  const keywordClassQuery=useAsyncResource({
    queryKey:['scope-active-keyword-class-name',scopeId],
    // The keyword class is optional; the ordinary Statistics view never queries it.
    enabled:!isLrunesDaily&&styleFilter==='rune66',
    queryFn:async()=>{
      const {selectActiveKeywordClassName}=await import('../../loc/keyword-analysis');
      return selectActiveKeywordClassName(scopeId);
    },
  });
  const keywordClassLabel=keywordClassQuery.data
    ?'關鍵詞組：'+keywordClassQuery.data
    :styleFilter!=='rune66'?'關鍵詞組'
      :keywordClassQuery.isPending?'關鍵詞組（讀取中）':'關鍵詞組（尚未設定）';
  const keywordSourcesQuery=sourceCatalog;
  const configuredSources=useMemo(()=>
    (keywordSourcesQuery.data?.categories||[]).filter(row=>row.enabled!==false),
    [keywordSourcesQuery.data]
  );
  useEffect(()=>{
    if(keywordSourcesQuery.data&&keywordSource&&keywordSource!=='unclassified'&&!configuredSources.some(row=>row.category_code===keywordSource)){
      setKeywordSource('');
    }
  },[keywordSource,keywordSourcesQuery.data,configuredSources]);
  const runeQuery=useAsyncResource({
    queryKey:['statistics-style-filter','rune66',scopeId,styleRange.startDate,styleRange.endDate,
      keywordSource,othersConfig.dataUpdatedAt,keywordSource?keywordSourcesQuery.dataUpdatedAt:0],
    queryFn:async()=>{
      const {selectKeywordAnalysisSummary}=await import('../../loc/keyword-analysis');
      return selectKeywordAnalysisSummary({
        scopeId,...styleRange,sourceCategory:keywordSource,
        sourceCategories:keywordSourcesQuery.data?.categories||[],
        sourceAliases:keywordSourcesQuery.data?.aliases||[],sourceNames:selectedRawNames
      });
    },
    enabled:!isLrunesDaily&&styleFilter==='rune66'&&Boolean(keywordClassQuery.data)&&Boolean(styleRange.startDate&&styleRange.endDate)
      &&(!keywordSource||keywordSourcesQuery.isSuccess),
  });

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading"><div><h2>{UI_COPY.statistics.result}</h2></div></header>
    <div className="scope-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      {!isLrunesDaily?<label>
        <span>顯示關鍵字</span>
        <select className="scope-select" value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}>
          {STYLE_FILTERS.map(item=><option key={item.value} value={item.value}>
            {item.value==='rune66'?keywordClassLabel:t(item.textKey)}
          </option>)}
        </select>
      </label>:null}
      {keywordClassQuery.error&&!isLrunesDaily?<p className="scope-status scope-error" role="status">
        關鍵詞組讀取失敗：{featureDataErrorMessage(keywordClassQuery.error,UI_COPY)}
      </p>:null}
      {!isLrunesDaily?<label>
        <span>時期</span>
        <select className="scope-select" aria-label="時期" value={selectedPeriodKey}
          onChange={event=>setSelectedPeriodKey(event.target.value)}>
          <option value="latest">{periods.length?'最新時期':'未設定時期（預設時間）'}</option>
          <option value="">自選時間（原有縮放）</option>
          {periodQuery.isPending?<option disabled value="__loading">正在載入時期…</option>:null}
          {periods.map(period=><option key={period.record_id||period.period} value={String(period.period||period.era_id||period.record_id)}>
            {period.title||period.name||period.period}
          </option>)}
        </select>
      </label>:null}
      {!isLrunesDaily&&!mediaDimension&&(rankingType==='source'||styleFilter==='rune66')?<label>
        <span>作品／個人分類</span>
        <select className="scope-select" aria-label="作品／個人分類" value={activeSourceSelection}
          onChange={event=>{
            if(styleFilter==='rune66')setKeywordSource(event.target.value);
            else setSourceGroup(event.target.value);
          }}>
          <option value="">全部來源</option>
          {(styleFilter==='rune66'?configuredSources:(sourceCatalog.data?.categories||[]).filter(row=>row.enabled!==false))
            .map(source=><option key={source.category_code} value={source.category_code}>{source.display_name}</option>)}
          <option value="unclassified">未分類</option>
        </select>
      </label>:null}
      {periodQuery.error&&!isLrunesDaily?<span className="scope-status scope-error">
        時期範圍無法載入，仍可使用自選時間：{featureDataErrorMessage(periodQuery.error,UI_COPY)}
      </span>:null}
      {!isLrunesDaily?<>{!mediaDimension?<label><span>{UI_COPY.statistics.chart}</span><select className="scope-select" value={effectiveChartType} onChange={event=>setChartType(event.target.value)}>
        {chartGroups.primary.length?<optgroup label={t('uiExtra.statisticsView.chartPrimary')}>
  {chartGroups.primary.map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
</optgroup>:null}
{chartGroups.advanced.length?<optgroup label={t('uiExtra.statisticsView.chartAdvanced')}>
  {chartGroups.advanced.map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
</optgroup>:null}{!optionsForCurrent.length?<option value="line"><UiText id="uiExtra.statisticsView.noVisual"/></option>:null}
      </select></label>:null}
      {!['pie','radar','radial','treemap','scatter'].includes(effectiveChartType)?<label className="scope-setting-toggle">
        <input type="checkbox" checked={foldBlank} onChange={event=>setFoldBlank(event.target.checked)}/> <UiText id="uiExtra.statisticsView.foldBlank"/>
      </label>:null}
      </>:null}
    </div>
    {isLrunesDaily?<LrunesDailyStatisticsPanel/>:<>
    {((mediaDimension&&mediaLoading)||(!mediaDimension&&!sourceRows.error&&!sourceCatalog.error&&(sourceRows.isPending||sourceCatalog.isPending||!adminSourceReady)))?<div className="scope-stat-data-pending">
      <p className="scope-status" role="status"><UiText id="uiExtra.statisticsUI.loading"/></p>
      <div className="scope-feature-loading__body" aria-hidden="true"><span/><span/><span/><span/></div>
    </div>:null}
    {earliestQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(earliestQuery.error,UI_COPY)}</p>:null}
    {!mediaDimension&&(sourceRows.error||sourceCatalog.error)?<p className="scope-status scope-error">{featureDataErrorMessage(sourceRows.error||sourceCatalog.error,UI_COPY)}</p>:null}
    {mediaDimension&&mediaError?<p className="scope-status scope-error">{featureDataErrorMessage(mediaError,UI_COPY)}</p>:null}
    {!mediaDimension&&!sourceRows.isPending&&!sourceCatalog.isPending&&adminSourceReady&&!sourceRows.error&&!sourceCatalog.error?<>
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
      <StatisticsDetails>{()=> <SummaryList rankingType={rankingType} summary={sourceSummary}
        scope={targetScopes[0]} range={queryRange} filteredSource={Boolean(activeSourceSelection)}/>}</StatisticsDetails>
    </>:null}
    {mediaDimension&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate)?<div className="scope-stat-controls">
      <button type="button" className="loc-button" onClick={()=>{mediaQuery.refetch();if(rankingType==='media_style'&&crossTagRequested)crossTagQuery.refetch();}} disabled={mediaFetching}>
        {mediaFetching?t('uiExtra.statisticsUI.refreshing'):t('uiExtra.statisticsUI.refresh')}
      </button>
    </div>:null}
    {rankingType==='media_style'&&styleTreeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(styleTreeQuery.error,UI_COPY)}</p>:null}
    {rankingType==='media_style'&&crossTagRequested&&crossTagQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(crossTagQuery.error,UI_COPY)}</p>:null}
    {rankingType==='media_style'&&crossTagRequested&&crossTagQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingMediaTags"/></p>:null}
    {mediaDimension&&!mediaLoading&&!mediaError?<MediaFacetStatistics
      key={rankingType}
      rankingType={rankingType}
      rows={mediaRows}
      mediaRows={crossTagQuery.data||[]}
      treeRows={styleTreeQuery.data||[]}
      onRequestRawStyles={()=>setCrossTagRequested(true)}
      rawStyleLoading={crossTagRequested&&crossTagQuery.isPending}
      rawStyleError={crossTagQuery.error}
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
    {rankingType==='media_style'?<StatisticsDetails
      summary={<UiText id="uiExtra.statisticsView.crossAdvancedTitle"/>}
      onOpen={()=>setCrossTagRequested(true)}>
      {()=>crossTagQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(crossTagQuery.error,UI_COPY)}</p>
        :crossTagQuery.isPending||!crossTagQuery.data
          ?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingMediaTags"/></p>
          :<MediaCrossTagStatistics
            scope={targetScopes[0]}
            rows={crossTagQuery.data}
            range={queryRange}
            zoomLevel={zoomLevel}
            onZoomLevelChange={setZoomLevel}
            facetTrend={facetTrend}
            loadGalaxyStatistics={loadGalaxyStatistics}
          />}
    </StatisticsDetails>:null}
    {styleFilter==='rune66'?<>
      {keywordSourcesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(keywordSourcesQuery.error,UI_COPY)}</p>:null}
      {keywordClassQuery.isPending?<p className="scope-status">正在讀取關鍵詞組設定…</p>:null}
      {!keywordClassQuery.isPending&&!keywordClassQuery.error&&!keywordClassQuery.data?<p className="scope-status">此 Scope 尚未設定關鍵詞組。</p>:null}
      {runeQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingKeywordAttrs"/></p>:null}
      {runeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error&&runeQuery.data?<Rune66Summary analysis={runeQuery.data} range={queryRange} scopeId={scopeId}/>:null}
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

function ScopeStatisticsPanel({scopeId,navigation,types,canManageSources=false}){
  return <ScopeStatisticsResults scopeId={scopeId} navigation={navigation} types={types}/>;
}

function StatisticsPanel({scopeId,aggregateScopes=false,navigation,types,canManageSources=false}){
  const t=useUiText();
  // Cross-Scope statistical aggregation belongs to LOC only. Other Scope
  // Groups remain overview/navigation surfaces, never merged COUNT queries.
  if(aggregateScopes&&scopeId==='loc')return <ScopeGroupStatistics
    taipeiDateKey={taipeiDateKey}
    trendBucket={trendBucket}
    loadGalaxyStatistics={loadGalaxyStatistics}/>;
  if(aggregateScopes)return <ScopeGroupOverview
    scopeId={scopeId}
    featureId="statics"
    title={t('uiExtra.statisticsView.scopeGroupStatisticsTitle')}
    description={t('uiExtra.statisticsView.scopeGroupStatisticsHelp')}
  />;
  return <ScopeStatisticsPanel scopeId={scopeId} navigation={navigation} types={types} canManageSources={canManageSources}/>;
}

export default function Statistics(){
  useUiSection('statistics');
  useUiSection('uiExtra.statisticsUI');
  useUiSection('uiExtra.statisticsView');
  useUiSection('uiExtra.chartTypes');
  const {scopeId,scope}=useScopeRuntime();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <StatisticsPanel
        scopeId={scopeId}
        aggregateScopes={Boolean(scope?.aggregateChildren)}
        navigation={navigation}
        types={scopeId==='lrunes'?['daily_rune',...STAT_TYPES]:STAT_TYPES}
        canManageSources={false}
      />
    </section>
  </FeaturePage>;
}
