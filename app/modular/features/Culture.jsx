'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {translateUiField,UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiLocale,useUiSection} from '../../i18n/ui-locale';
import cultureZh from '../../i18n/sections/culture.zh_tw.js';
import cultureViewZh from '../../i18n/sections/uiExtra.cultureView.zh_tw.js';
import dataErrorsZh from '../../i18n/sections/uiExtra.dataErrors.zh_tw.js';
import paginationZh from '../../i18n/sections/uiExtra.pagination.zh_tw.js';
registerDefaultSection('culture',cultureZh);
registerDefaultSection('uiExtra.cultureView',cultureViewZh);
registerDefaultSection('uiExtra.dataErrors',dataErrorsZh);
registerDefaultSection('uiExtra.pagination',paginationZh);

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useInfiniteQuery,useQuery,useQueryClient} from '@tanstack/react-query';
import {featureNavigationHref,galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation';
import ScopeLink from '../ScopeLink';
import ManagementSectionNav,{useManagementSection} from '../ManagementSectionNav';
import {useEditDock} from '../edit-dock';
import {featureDataErrorMessage} from '../feature-data-state';
const CultureTimeline=dynamic(()=>import('../modules/culture-timeline/CultureTimeline'),{loading:()=>null});
import {CultureTimelineModel} from '../modules/culture-timeline/culture-timeline-model';

import {selectGalaxyContent} from '../../loc/galaxy-query';

import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {selectAllRows,selectRows} from '../../loc/db-query.mjs';
import {parseGroupLists} from '../../loc/group-lists.mjs';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {ArticleSortSelect,FeaturePage,IncrementalList,WorkFullText} from '../ui';
// Article cards/editing are requested only when results actually render.
const Article=dynamic(()=>import('../Article'),{loading:()=>null});
const CultureTimelineEditor=dynamic(()=>import('./CultureTimelineEditor'),{loading:()=>null});
import {workDisplayHeading,workDisplayText} from '../work-display-model';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/db-contract.mjs';
import {publicContentFilters,requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
const LrunesDailyCulturePanel=dynamic(()=>import('../../lrunes/DailyRuneAnalytics').then(m=>m.LrunesDailyCulturePanel),{loading:()=>null});
const LocItemConfluence=dynamic(()=>import('./LocItemConfluence'),{loading:()=>null});

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

// Preserve timeline instances while editor dialogs, suggested points and
// density suggestions update around them.
const TIME_EDITOR_SECTIONS=Object.freeze([
  {value:'anchor-style',label:'定錨點／風格標籤',description:'編輯日期定錨點與依附定錨點的風格標籤。'},
  {value:'event',label:'事件',description:'編輯以正式定錨點界定的事件。'},
  {value:'period',label:'時期',description:'編輯時期與起訖定錨點。'}
]);
const EMPTY_RIVER_FOCUS=Object.freeze({});
const EMPTY_RIVER_ANALYSIS=Object.freeze({density:[],changepoints:[],hiddenDates:[],suggestions:[],totalCount:0});
function emptyRiverLabel(){return '';}
function classificationRiverLabel(item){
  return item?.entry_type==='virtual_anchor'?(item.display_label||'◇'):'';
}
function labelOf(item,index,periodName=UI_COPY.format.period(index+1)){
  return item?.display_label||item?.name||item?.title||item?.period||periodName;
}
function sortPeriods(rows=[]){
  return [...rows].filter(item=>item?.start_date||item?.end_date).sort((a,b)=>
    String(a.start_date||a.end_date||'').localeCompare(String(b.start_date||b.end_date||''))||
    Number(a.order||0)-Number(b.order||0)
  );
}
function periodRange(rows=[],scope='',allTime=UI_COPY.culture.allTime){
  const starts=rows.map(row=>row.start_date||row.end_date).filter(Boolean).sort();
  const ends=rows.map(row=>row.end_date||row.start_date).filter(Boolean).sort();
  const openEnded=rows.some(row=>Boolean(row?.open_end)||!row?.end_date);
  return {
    period:'all',title:allTime,display_label:allTime,
    start_date:starts[0]||'',end_date:openEnded?null:(ends.at(-1)||null),scope_id:scope
  };
}
function periodKey(item){
  return String(item?.period||item?.era_id||item?.id||'').trim();
}
function classLabel(value){
  const text=String(value||'').trim();
  return !text?'':text.endsWith('群組')?text:text+' 群組';
}
// Render Class density first. After selecting a Class, show the distribution
// of its Group items from saved group_lists, never the underlying keywords.
function keywordDrillRiverItems(rows,{source='',groupId='',meta={},groupItems=[]}={}){
  const classes=meta?.classes||{};
  const className=String(meta?.class_name||'').trim();
  const knownGroups=new Map(groupItems.map(item=>[String(Number(item.item_no)),item]));
  const buckets=new Map(),maximum=new Map();
  const add=(key,label,day,count,order=0)=>{
    if(!key||!label||!count)return;
    const id=key+'\u0000'+day;
    buckets.set(id,{key,label,day,count:(buckets.get(id)?.count||0)+count,order});
    maximum.set(key,Math.max(maximum.get(key)||0,buckets.get(id).count));
  };
  for(const row of rows||[]){
    const day=String(row.createtime||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    const hits=parseGroupLists(row.group_lists);
    if(hits===false)continue;
    const rowSource=String(row.source_name||'').trim()||'未分類';
    if(source&&rowSource!==source)continue;
    const rowGroup=String(row.class_id||'').trim();
    if(groupId){
      if(rowGroup!==String(groupId))continue;
      for(const [id,rawCount] of Object.entries(hits)){
        const group=knownGroups.get(id);
        const count=Number(rawCount)||0;
        if(group&&count>0)add(id,String(group.item_name||id),day,count,Number(group.order_no)||Number(id));
      }
    }else{
      const label=String(classes[rowGroup]||'').trim();
      if(label)add(rowGroup,[className,label,'群組'].filter(Boolean).join(' '),day,1,Number(rowGroup)||0);
    }
  }
  return [...buckets.values()].map(({key,label,day,count,order})=>({
    id:'keyword-density:'+(groupId?'item':'class')+':'+key+':'+day,
    entry_id:'keyword-density:'+(groupId?'item':'class')+':'+key+':'+day,
    entry_type:'keyword_density',
    drill_key:key,
    group_label:label,
    category:label,
    display_label:'',
    title:day+' · '+label+' · '+count.toLocaleString()+(groupId?' 次':' 篇'),
    start_date:day,end_date:nextRiverDay(day),
    item_count:count,group_order:order,
    density_ratio:count/Math.max(1,maximum.get(key)||1)
  })).sort((a,b)=>a.start_date.localeCompare(b.start_date)
    ||Number(a.group_order)-Number(b.group_order)||a.group_label.localeCompare(b.group_label));
}
function formatCultureUi(template,values={}){
  return String(template||'').replace(/\{([a-zA-Z][\w]*)\}/gu,(match,key)=>
    Object.prototype.hasOwnProperty.call(values,key)?String(values[key]??''):match);
}
function nextRiverDay(value){
  const key=String(value||'').slice(0,10);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return '';
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}
function dayKeyFromTimelineValue(value){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toISOString().slice(0,10);
}
function periodPositionRatio(date,start,end){
  const a=Date.parse(String(start||'').slice(0,10));
  const b=Date.parse(String(end||'').slice(0,10));
  const x=Date.parse(String(date||'').slice(0,10));
  if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(x)||b<=a)return 0;
  return Math.max(0,Math.min(1,(x-a)/(b-a)));
}
export default function Culture(){
  useUiSection('culture');
  useUiSection('uiExtra.cultureView');
  useUiSection('uiExtra.dataErrors');
  useUiSection('uiExtra.pagination');
  const UI_COPY=useUiCopy();
  const l=UI_COPY.uiExtra.cultureView;
  const localizedLabelOf=useMemo(()=> (item,index)=>labelOf(item,index,UI_COPY.format.period(index+1)),[UI_COPY]);
  const {locale}=useUiLocale();
  const {scopeId,scope}=useScopeRuntime();
  const searchParams=useSearchParams();
  const isTimeEditingView=searchParams?.get('edit')==='1';
  const account=useAccount({enabled:false});
  const editDock=useEditDock();
  const [timeEditorSection,,timeEditorHrefFor]=useManagementSection(TIME_EDITOR_SECTIONS,'anchor-style');
  const [lrunesView,setLrunesView]=useState('daily');
  const [locCultureView,setLocCultureView]=useState('period');
  const isLrunesDaily=!isTimeEditingView&&scopeId==='lrunes'&&lrunesView==='daily';
  const isLocItemView=scopeId==='loc'&&locCultureView==='item';
  const queryClient=useQueryClient();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:async()=>{
      const {selectScopeCultureData}=await import('../../loc/culture-query');
      return selectScopeCultureData(scopeId);
    },
    enabled:!isLrunesDaily&&!isLocItemView,
    staleTime:5*60_000
  });

  const [selectedPeriodKey,setSelectedPeriodKey]=useState('');
  const periodSelectionScopeRef=useRef('');
  const [selectedCategory,setSelectedCategory]=useState('');
  const [worksOpen,setWorksOpen]=useState(false);
  const [articleSort,setArticleSort]=useState('desc');
  // Keyword Class is optional; ordinary Time River views must not scan the whole article corpus.
  const [styleFilter,setStyleFilter]=useState('none');
  const [keywordOptionsRequested,setKeywordOptionsRequested]=useState(false);
  const [keywordDrillSource,setKeywordDrillSource]=useState('');
  const [keywordDrillGroup,setKeywordDrillGroup]=useState('');
  const [keywordPeriodKey,setKeywordPeriodKey]=useState('latest');
  const [keywordCustomStart,setKeywordCustomStart]=useState('');
  const [keywordCustomEnd,setKeywordCustomEnd]=useState('');
  const [selectedVirtualAnchorDates,setSelectedVirtualAnchorDates]=useState([]);
  const [creatingSuggestedAnchors,setCreatingSuggestedAnchors]=useState(false);
  const workScrollRef=useRef(null);
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const [fullTextError,setFullTextError]=useState('');
  const [editingWorkKey,setEditingWorkKey]=useState('');
  const [authorizedWorkKey,setAuthorizedWorkKey]=useState('');
  const [selectedTimelineRecordId,setSelectedTimelineRecordId]=useState('');
  const [selectedTimelineInfo,setSelectedTimelineInfo]=useState(null);
  const [selectedTimelineDate,setSelectedTimelineDate]=useState('');
  // Opening the time editor is a UI action, not an authorization check.
  // Verify the active user only when a write is actually requested.
  useEffect(()=>{
    if(isTimeEditingView&&scopeId&&scopeId!=='loc')editDock?.begin(scopeId);
  },[isTimeEditingView,scopeId,editDock?.begin]);
  useEffect(()=>{
    setSelectedTimelineRecordId('');
    setSelectedTimelineInfo(null);
    setSelectedTimelineDate('');
    setSuggestedRequestNonce(0);
  },[timeEditorSection]);
  const [suggestedRecordType,setSuggestedRecordType]=useState('anchor');
  const [suggestedRequestNonce,setSuggestedRequestNonce]=useState(0);
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');

  useEffect(()=>{
    setStyleFilter('none');
    setKeywordOptionsRequested(false);
    setKeywordPeriodKey('latest');
    setKeywordCustomStart('');
    setKeywordCustomEnd('');
  },[scopeId]);

  const isAggregateScope=Boolean(scope?.aggregateChildren);
  const openRows=useMemo(()=>(query.data?.openRanges||[])
    .filter(item=>isAggregateScope||String(item?.scope_id||'')===scopeId),[isAggregateScope,scopeId,query.data]);
  const openByScope=useMemo(()=>new Map(openRows.map(item=>[String(item.scope_id||''),item])),[openRows]);

  const allPeriods=useMemo(()=>sortPeriods(query.data?.eras?.eras||[]),[query.data]);
  const classificationScope=scopeId;
  const scopeData=query.data?.scope||null;
  // Use a stable periods array: date-navigation effects must not re-run just
  // because a different Culture panel or query refreshed the page.
  const primaryPeriods=useMemo(()=>isAggregateScope?[]:allPeriods.filter(item=>String(item?.scope_id||'')===scopeId),[isAggregateScope,allPeriods,scopeId]);
  const openPeriod=isAggregateScope?null:(openByScope.get(scopeId)||null);
  // The newest recorded period, not the open/current flag, is the default.
  const latestPeriod=primaryPeriods.at(-1)||null;
  const allTimePeriod=useMemo(()=>periodRange(primaryPeriods,classificationScope,UI_COPY.culture.allTime),[primaryPeriods,classificationScope,UI_COPY.culture.allTime]);
  useEffect(()=>{
    if(isAggregateScope||!query.data)return;
    const preferred=periodKey(latestPeriod)||'all';
    const scopeChanged=periodSelectionScopeRef.current!==scopeId;
    periodSelectionScopeRef.current=scopeId;
    // A new Scope always starts at its own latest period; manual selections
    // within the same Scope are preserved across query refreshes.
    setSelectedPeriodKey(current=>scopeChanged?preferred:
      (current==='all'||primaryPeriods.some(period=>periodKey(period)===current))?current:preferred);
  },[scopeId,isAggregateScope,query.data,latestPeriod,primaryPeriods]);
  const selectedWorkPeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(primaryPeriods.find(item=>periodKey(item)===selectedPeriodKey)||latestPeriod||allTimePeriod);
  // Without a current period, the first effect selects the latest saved period.
  // Do not scan all-time metadata only to immediately scan that period again.
  // The latest period is already derived synchronously from loaded records.
  // Do not hold up the source snapshot waiting for a separate UI selection effect.
  const selectedWindowStart=String(selectedWorkPeriod?.start_date||'');
  const selectedWindowEnd=String(selectedWorkPeriod?.end_date||new Date().toISOString().slice(0,10));
  // The lower Culture panel shares one selected interval across the source
  // classification river, keyword-density river, suggestions, and work list.
  // The upper Time structure river keeps its own period navigation.
  const keywordPeriod=keywordPeriodKey==='all'?allTimePeriod
    :keywordPeriodKey==='latest'?(latestPeriod||selectedWorkPeriod)
    :keywordPeriodKey==='current'?selectedWorkPeriod
    :primaryPeriods.find(period=>periodKey(period)===keywordPeriodKey)||latestPeriod||selectedWorkPeriod;
  const keywordWindowStart=keywordPeriodKey==='custom'
    ?keywordCustomStart:String(keywordPeriod?.start_date||'').slice(0,10);
  const keywordWindowEnd=keywordPeriodKey==='custom'
    ?keywordCustomEnd:String(keywordPeriod?.end_date||new Date().toISOString().slice(0,10)).slice(0,10);
  const keywordWindowValid=/^\d{4}-\d{2}-\d{2}$/.test(keywordWindowStart)
    &&/^\d{4}-\d{2}-\d{2}$/.test(keywordWindowEnd)
    &&keywordWindowStart<=keywordWindowEnd;
  const classificationWindowStart=keywordWindowStart;
  const classificationWindowEnd=keywordWindowEnd;
  const classificationWindowValid=keywordWindowValid;
  const classificationPeriodLabel=keywordPeriodKey==='custom'
    ?'自訂區間':localizedLabelOf(keywordPeriod,0);
  const requestedWindowStart=String(navigation.from||'').slice(0,10);
  const requestedWindowEnd=String(navigation.to||'').slice(0,10);
  const appliedDateNavigationRef=useRef('');
  useEffect(()=>{
    if(!requestedWindowStart){
      appliedDateNavigationRef.current='';
      return;
    }
    if(isAggregateScope||!primaryPeriods.length)return;
    const navigationKey=[scopeId,requestedWindowStart,requestedWindowEnd].join('|');
    if(appliedDateNavigationRef.current===navigationKey)return;
    const matched=primaryPeriods.find(item=>{
      const start=String(item?.start_date||'').slice(0,10);
      const end=String(item?.end_date||'9999-12-31').slice(0,10);
      return (!start||requestedWindowStart>=start)&&requestedWindowStart<=end;
    });
    if(matched){
      appliedDateNavigationRef.current=navigationKey;
      setSelectedPeriodKey(periodKey(matched));
    }
  },[scopeId,isAggregateScope,requestedWindowStart,requestedWindowEnd,primaryPeriods]);

  const sourceSnapshotQuery=useQuery({
    queryKey:['culture-period-source-snapshot','v3',classificationScope,classificationWindowStart,classificationWindowEnd],
    queryFn:async()=>{
      const {selectScopePeriodSourceSnapshot}=await import('../../loc/culture-query');
      return selectScopePeriodSourceSnapshot(scopeData,{
        startDate:classificationWindowStart,
        endDate:classificationWindowEnd
      });
    },
    enabled:!isLrunesDaily&&!isLocItemView&&!isAggregateScope&&Boolean(scopeData)&&classificationWindowValid,
    staleTime:5*60_000
  });
  const keywordClassQuery=useQuery({
    queryKey:['scope-active-keyword-class-name',scopeId],
    // Opening/focusing the style selector is the first reason to look up
    // the active Class. Ordinary Time River viewing performs no keyword SQL.
    enabled:keywordOptionsRequested&&!isAggregateScope&&!isLrunesDaily&&!isLocItemView,
    queryFn:async()=>{
      const {selectActiveKeywordClassName}=await import('../../loc/keyword-analysis');
      return selectActiveKeywordClassName(scopeId);
    },
    staleTime:5*60_000
  });
  const keywordClassLabel=keywordClassQuery.data?'關鍵詞組：'+keywordClassQuery.data
    :keywordClassQuery.isPending?'關鍵詞組（讀取中）':'關鍵詞組（尚未設定）';
  const styleQuery=useQuery({
    queryKey:['culture-style-filter','rune66',classificationScope,keywordWindowStart,keywordWindowEnd],
    queryFn:async()=>{
      const {selectKeywordAnalysisSummary}=await import('../../loc/keyword-analysis');
      return selectKeywordAnalysisSummary({scopeId,startDate:keywordWindowStart,endDate:keywordWindowEnd});
    },
    enabled:!isAggregateScope&&!isLrunesDaily&&styleFilter==='rune66'&&Boolean(keywordClassQuery.data)&&keywordWindowValid,
    staleTime:5*60_000
  });
  // The original source-classification river must not wait for (or disappear
  // when) a separate keyword-density query runs.
  const riverRangeLoading=classificationWindowValid&&(sourceSnapshotQuery.isPending||sourceSnapshotQuery.isFetching);
  const keywordDensityQuery=useQuery({
    queryKey:['culture-keyword-attributes',scopeId,keywordWindowStart,keywordWindowEnd],
    enabled:styleFilter==='rune66'&&!isAggregateScope&&!isLrunesDaily&&!isLocItemView
      &&Boolean(scopeData)&&keywordWindowValid&&Boolean(styleQuery.data?.statisticsEnabled),
    queryFn:async()=>{
      const {rows}=await selectAllRows(scopeData.galaxy,{
        columns:'createtime,source_name,class_id,group_lists',
        filters:publicContentFilters([
          {column:'statistics_able',operator:'eq',value:true},
          {column:'createtime',operator:'gte',value:keywordWindowStart+'T00:00:00+08:00'},
          {column:'createtime',operator:'lte',value:keywordWindowEnd+'T23:59:59.999+08:00'}
        ]),
        orders:[{column:'createtime',ascending:true}]
      });
      return rows;
    },
    staleTime:5*60_000
  });
  useEffect(()=>{
    setKeywordDrillSource('');
    setKeywordDrillGroup('');
  },[scopeId]);
  // Second-river source choices come from the exact Scope source snapshot.
  // These must be available before choosing a keyword style.
  const keywordSourceOptions=useMemo(()=>sourceSnapshotQuery.data?.groups||[],[sourceSnapshotQuery.data]);
  // Keep raw source values intact for river filtering; simply separate text
  // platforms from media and sort each group instead of ranking by volume.
  const sourceOptionGroups=useMemo(()=>[
    {label:'文字來源',items:keywordSourceOptions.filter(item=>item.category_type!=='media')},
    {label:'多媒體類型',items:keywordSourceOptions.filter(item=>item.category_type==='media')}
  ].map(group=>({...group,items:[...group.items].sort((a,b)=>String(a.display_label||'').localeCompare(String(b.display_label||''),locale))}))
    .filter(group=>group.items.length>0),[keywordSourceOptions,locale]);
  const keywordGroupOptions=useMemo(()=>Object.entries(styleQuery.data?.keywordMeta?.classes||{})
    .map(([id,name])=>({id,label:String(name||'').trim()}))
    .filter(item=>item.label).sort((a,b)=>Number(a.id)-Number(b.id)),
  [styleQuery.data?.keywordMeta?.classes]);
  // Fetch Group names/membership only after the user opens a specific Class.
  // The initial Class-density river never downloads the Group catalog.
  const keywordGroupCatalogQuery=useQuery({
    queryKey:['culture-keyword-group-catalog',scopeId,styleQuery.data?.keywordMeta?.class_id||'',keywordDrillGroup],
    enabled:styleFilter==='rune66'&&Boolean(keywordDrillGroup)
      &&Boolean(styleQuery.data?.keywordMeta?.class_id)&&Boolean(scopeData?.keywords),
    queryFn:async()=>{
      const groupName=String(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'').trim();
      if(!groupName)return [];
      const {rows}=await selectAllRows(scopeData.keywords,{
        columns:'item_no,item_name,order_no,class_group',
        filters:[
          {column:'class_id',operator:'eq',value:String(styleQuery.data.keywordMeta.class_id)},
          {column:'class_group',operator:'eq',value:groupName}
        ],
        orders:[{column:'order_no',ascending:true}]
      });
      return rows;
    },
    staleTime:5*60_000
  });
  const keywordDrillItems=useMemo(()=>
    keywordDrillGroup&&!keywordGroupCatalogQuery.data?[]
      :keywordDrillRiverItems(keywordDensityQuery.data,{
        source:keywordDrillSource,groupId:keywordDrillGroup,
        meta:styleQuery.data?.keywordMeta,groupItems:keywordGroupCatalogQuery.data||[]
      }),[keywordDensityQuery.data,keywordDrillSource,keywordDrillGroup,styleQuery.data?.keywordMeta,keywordGroupCatalogQuery.data]);

  const categoryGroups=sourceSnapshotQuery.data?.groups||[];
  const selectedGroup=categoryGroups.find(item=>item.category_key===(
    keywordDrillSource?'source:'+keywordDrillSource:selectedCategory
  ))||null;
  const effectiveCategoryKey=selectedGroup?.category_key||'';
  const periodWorksQuery=useInfiniteQuery({
    queryKey:['culture-period-works',classificationScope,classificationWindowStart,classificationWindowEnd,effectiveCategoryKey||'all',articleSort],
    initialPageParam:null,
    getNextPageParam:lastPage=>lastPage.hasMore?lastPage.nextCursor:undefined,
    enabled:worksOpen&&!isLrunesDaily&&!isAggregateScope&&Boolean(scopeData)&&Boolean(selectedWorkPeriod)&&classificationWindowValid,
    queryFn:async({pageParam})=>{
      const {selectScopePeriodWorkIndex,selectScopePeriodWorkDetails}=await import('../../loc/culture-query');
      const indexPage=await selectScopePeriodWorkIndex(scopeData,{
        startDate:classificationWindowStart,
        endDate:classificationWindowEnd,
        sourceName:selectedGroup?.source_name||'',
        sourceNames:selectedGroup?.source_names||[],
        mediaTypes:selectedGroup?.media_types||[],
        limit:DEFAULT_LIST_BATCH_SIZE,
        sortDirection:articleSort,
        cursor:pageParam&&typeof pageParam==='object'?pageParam:null
      });
      const details=await selectScopePeriodWorkDetails(scopeData,{items:indexPage.rows||[]});
      return {
        rows:details.rows||[],
        totalCount:Number(indexPage.totalCount)||0,
        hasMore:Number(indexPage.nextCursor?.galaxyOffset||0)+Number(indexPage.nextCursor?.mediaOffset||0)<Number(indexPage.totalCount||0),
        nextCursor:indexPage.nextCursor
      };
    }
  });
  const periodWorksPages=periodWorksQuery.data?.pages||[];
  const visibleWorkRows=useMemo(()=>{
    const map=new Map();
    periodWorksPages.forEach((page,pageIndex)=>(page.rows||[]).forEach((row,index)=>{
      map.set(String(row?.key||row?.uid||row?.entry_id||'')||(pageIndex+':'+index),row);
    }));
    return [...map.values()];
  },[periodWorksPages]);
  const periodWorksPage={
    rows:visibleWorkRows,
    totalCount:periodWorksPages[periodWorksPages.length-1]?.totalCount,
    loading:periodWorksQuery.isLoading||periodWorksQuery.isFetchingNextPage,
    error:periodWorksQuery.error,
    hasMore:Boolean(periodWorksQuery.hasNextPage),
    loadNext:periodWorksQuery.fetchNextPage,
    reload:periodWorksQuery.refetch
  };
  const selectedCount=Number(periodWorksPage.totalCount??selectedGroup?.item_count)||0;

  useEffect(()=>{
    setSelectedCategory('');
    setWorksOpen(false);
  },[scopeId]);

  useEffect(()=>{
    setSelectedCategory('');
    setWorksOpen(false);
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[classificationWindowStart,classificationWindowEnd]);

  useEffect(()=>{
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[selectedCategory]);


  const timelineItems=useMemo(()=>
    (query.data?.timelineItems||[]).filter(item=>isAggregateScope||item.scope_id===scopeId)
  ,[query.data,scopeId]);
  const timeEditorItems=useMemo(()=>timelineItems.filter(item=>
    timeEditorSection==='anchor-style'
      ?['anchor','style_comment'].includes(item.entry_type)
      :item.entry_type===timeEditorSection
  ),[timelineItems,timeEditorSection]);
  const currentStructurePeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(!isAggregateScope&&selectedWorkPeriod&&selectedWorkPeriod.period!=='all')
      ?selectedWorkPeriod
      :(openPeriod||primaryPeriods.find(item=>String(item?.status||'').toLowerCase()==='current')||primaryPeriods.at(-1)||null);
  const currentStructureStart=String(currentStructurePeriod?.start_date||'').slice(0,10);
  const currentStructureEnd=String(currentStructurePeriod?.end_date||new Date().toISOString().slice(0,10)).slice(0,10);
  // Keep every Time record in the first river. The selected period controls
  // the initial camera window, not which historic anchors are accessible.
  const anchorRecords=useMemo(()=>timelineItems
    .filter(item=>item.entry_type==='anchor'&&item.record_id)
    .sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||''))||String(a.display_label||'').localeCompare(String(b.display_label||''))),[timelineItems]);
  const locSourceRiverItems=useMemo(()=>query.data?.sourceRiverItems||[],[query.data]);
  const locSourceGroups=useMemo(()=>query.data?.sourceGroups||[],[query.data]);
  const locCombinedSourceTotal=useMemo(()=>locSourceGroups.reduce((sum,item)=>sum+Number(item?.item_count||0),0),[locSourceGroups]);
  const locSourceGroupLabel=useMemo(()=>{
    const labels=new Map();
    for(const group of locSourceGroups){
      const count=Number(group?.item_count)||0;
      const ratio=locCombinedSourceTotal>0?(count/locCombinedSourceTotal)*100:0;
      labels.set(String(group?.source_name||group?.display_label||''),String(group?.display_label||group?.source_name||'')+' '+formatCultureUi(l.sourceGroupCount,{count:count.toLocaleString(locale),ratio:ratio.toFixed(1)}));
    }
    return labels;
  },[locSourceGroups,locCombinedSourceTotal,l,locale]);
  const locCombinedSourceRiverItems=useMemo(()=>locSourceRiverItems.map(item=>({
    ...item,
    end_date:nextRiverDay(item?.start_date),
    group_label:locSourceGroupLabel.get(String(item?.category||item?.group_label||''))||String(item?.group_label||'')
  })),[locSourceRiverItems,locSourceGroupLabel]);
  const locScopeDistributionItems=useMemo(()=>query.data?.scopeRanges||[],[query.data]);
  const locIntersectionScopeIds=useMemo(()=>query.data?.intersectionScopeIds||[],[query.data]);
  const locDistributionStart=String(query.data?.intersectionStart||'');
  const locDistributionEnd=String(query.data?.intersectionEnd||new Date().toISOString().slice(0,10));
  const locScopeRiverItems=useMemo(()=>{
    const perScopeMax=new Map();
    let globalMax=0;
    for(const item of locScopeDistributionItems){
      const scope=String(item?.scope_id||'').trim();
      const count=Number(item?.item_count)||0;
      if(!scope)continue;
      perScopeMax.set(scope,Math.max(perScopeMax.get(scope)||0,count));
      globalMax=Math.max(globalMax,count);
    }
    const rows=locScopeDistributionItems.map((item,index)=>{
      const scope=String(item?.scope_id||'').trim();
      const day=String(item?.start_date||'').slice(0,10);
      const count=Number(item?.item_count)||0;
      return {
        ...item,
        id:item?.id||('loc-scope:'+scope+':'+day+':'+index),
        entry_id:item?.entry_id||('loc-scope:'+scope+':'+day+':'+index),
        entry_type:'scope_density',
        group_label:scope,
        category:scope,
        display_label:'',
        title:formatCultureUi(l.scopeDensityTitle,{date:day,scope,count:count.toLocaleString(locale)}),
        end_date:nextRiverDay(day),
        density_ratio:count/Math.max(1,perScopeMax.get(scope)||1),
        global_density_ratio:count/Math.max(1,globalMax)
      };
    }).filter(item=>item.group_label&&item.start_date);
    const represented=new Set(rows.map(item=>String(item.group_label||'')));
    for(const scopeId of locIntersectionScopeIds){
      const scope=String(scopeId||'').trim();
      if(!scope||represented.has(scope)||!locDistributionStart)continue;
      rows.push({
        id:'loc-scope-empty:'+scope,
        entry_id:'loc-scope-empty:'+scope,
        entry_type:'scope_density',
        scope_id:scope,
        group_label:scope,
        category:scope,
        display_label:'',
        title:formatCultureUi(l.scopeDensityTitle,{date:locDistributionStart,scope,count:'0'}),
        start_date:locDistributionStart,
        end_date:nextRiverDay(locDistributionStart),
        item_count:0,
        density_ratio:0,
        global_density_ratio:0
      });
    }
    return rows;
  },[locScopeDistributionItems,locIntersectionScopeIds,locDistributionStart,l,locale]);
  const hasTimelineSurface=isAggregateScope?Boolean(locSourceRiverItems.length||query.data?.scopes?.length):Boolean(timelineItems.length||selectedWorkPeriod?.start_date);

  function beginTimelineCreation(type,date){
    // Creation must work even for periods without an exact Gregorian start day.
    const creationDate=/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))?String(date):new Date().toISOString().slice(0,10);
    setSelectedTimelineRecordId('');
    setSuggestedRecordType(type);
    setSelectedTimelineDate(type==='anchor'?creationDate:'');
    setSuggestedRequestNonce(value=>value+1);
  }

  async function refreshTimelineData(){
    await Promise.all([
      queryClient.invalidateQueries({queryKey:['culture-timeline',scopeId]}),
      queryClient.invalidateQueries({queryKey:['culture-period-settings',scopeId]}),
      queryClient.invalidateQueries({queryKey:['search-style-keyword']})
    ]);
  }
  async function moveTimelineRecord(item,row){
    // Dates on Time periods/events are derived exclusively from existing
    // anchor_ids. Only a real anchor point can be moved on the river.
    if(row?.entryType!=='anchor'||!row.recordId||!scopeData?.time)return null;
    try{
      // Scope permissions are enforced by the database write RPC.
      const date=dayKeyFromTimelineValue(item?.start);
      if(!date)throw new Error(l.invalidAnchorDate);
      await updateRows(scopeData.time,{
        time_date:date,
        date_status:'exact',
        year_value:null,
        updated_at:new Date().toISOString()
      },{filters:[{column:'record_id',operator:'eq',value:row.recordId}]});
      await refreshTimelineData();
      setEditError('');
      return {...item,start:date};
    }catch(error){
      setEditError(error?.message||l.moveAnchorFailed);
      return null;
    }
  }
  async function removeTimelineRecord(item,row){
    if(!row?.recordId||!scopeData?.time)return null;
    const source=row?.raw||{};
    if(row.entryType==='anchor'){
      const anchorId=String(source?.resource_id||row.resourceId||'').trim();
      const referenced=[...timelineItems,...(query.data?.styleComments||[])].some(candidate=>
        String(candidate?.entry_type||'')!=='anchor'&&
        Array.isArray(candidate?.anchor_ids)&&candidate.anchor_ids.map(String).includes(anchorId)
      );
      if(referenced){
        setEditError(l.anchorReferenced);
        return null;
      }
    }
    try{
      // Scope permissions are enforced by the database write RPC.
      await deleteRows(scopeData.time,{filters:[{column:'record_id',operator:'eq',value:row.recordId}]});
      setSelectedTimelineRecordId('');
      setSelectedTimelineDate('');
      setEditError('');
      await refreshTimelineData();
      return item;
    }catch(error){
      setEditError(error?.message||l.deleteFailed);
      return null;
    }
  }

  // The source selector drives the SECOND river, whether or not a keyword
  // style is active. LOC aggregate's own source river is separate.
  const classificationBuckets=useMemo(()=>(
    sourceSnapshotQuery.data?.buckets||[]
  ).filter(item=>!keywordDrillSource||String(item.category||'')===keywordDrillSource),
  [sourceSnapshotQuery.data,keywordDrillSource]);
  const secondRiverBuckets=classificationBuckets;

  const existingAnchorDates=useMemo(()=>
    timelineItems
      .filter(item=>String(item?.entry_type||'')==='anchor')
      .map(item=>String(item?.start_date||item?.date||'').slice(0,10))
      .filter(Boolean)
  ,[timelineItems]);
  // Unselected modes must not execute the density-change algorithm.
  // Import the changepoint analysis only when a visible river has data.
  // Basic timeline modes must not download the karaul detection engine eagerly.
  const [riverDensityAnalyzer,setRiverDensityAnalyzer]=useState(null);
  const needsRiverDensity=Boolean(
    isAggregateScope?locCombinedSourceRiverItems.length:
      !isLrunesDaily&&!isLocItemView&&secondRiverBuckets.length
  );
  useEffect(()=>{
    if(!needsRiverDensity||riverDensityAnalyzer)return undefined;
    let active=true;
    import('../modules/culture-timeline/river-density-analysis.mjs')
      .then(module=>{
        if(active)setRiverDensityAnalyzer(()=>module.analyzeRiverDensity);
      })
      .catch(error=>{if(active)console.error('Culture river-density module failed to load',error);});
    return ()=>{active=false;};
  },[needsRiverDensity,riverDensityAnalyzer]);
  const riverAnalysis=useMemo(
    ()=>riverDensityAnalyzer&&!isAggregateScope&&!isLrunesDaily&&!isLocItemView&&secondRiverBuckets.length
      ?riverDensityAnalyzer(secondRiverBuckets,existingAnchorDates):EMPTY_RIVER_ANALYSIS,
    [riverDensityAnalyzer,isAggregateScope,isLrunesDaily,isLocItemView,secondRiverBuckets,existingAnchorDates]
  );
  const styleRiverAnalysis=useMemo(
    ()=>riverDensityAnalyzer&&styleFilter==='rune66'&&keywordDrillItems.length
      ?riverDensityAnalyzer(keywordDrillItems,existingAnchorDates):EMPTY_RIVER_ANALYSIS,
    [riverDensityAnalyzer,styleFilter,keywordDrillItems,existingAnchorDates]
  );
  const locRiverAnalysis=useMemo(
    ()=>riverDensityAnalyzer&&isAggregateScope&&locCombinedSourceRiverItems.length
      ?riverDensityAnalyzer(locCombinedSourceRiverItems,[]):EMPTY_RIVER_ANALYSIS,
    [riverDensityAnalyzer,isAggregateScope,locCombinedSourceRiverItems]
  );
  const virtualAnchorItems=useMemo(()=>{
    const total=Math.max(1,Number(riverAnalysis.totalCount)||0);
    return riverAnalysis.suggestions.map(item=>{
      const selected=selectedVirtualAnchorDates.includes(item.date);
      const beforeCount=Number(item.beforeCount||0);
      const afterCount=Number(item.afterCount||0);
      const strength=Math.min(1,Math.abs(Number(item.afterMean||0)-Number(item.beforeMean||0))/Math.max(1,Number(item.afterMean||0),Number(item.beforeMean||0)));
      const position=periodPositionRatio(item.date,classificationWindowStart,classificationWindowEnd);
      return {
        id:'virtual-anchor:'+item.date,
        entry_id:'virtual-anchor:'+item.date,
        entry_type:'virtual_anchor',
        start_date:item.date,
        title:formatCultureUi(l.candidateTitle,{date:item.date,position:(position*100).toFixed(1),before:beforeCount.toLocaleString(locale),beforeRatio:((beforeCount/total)*100).toFixed(1),after:afterCount.toLocaleString(locale),afterRatio:((afterCount/total)*100).toFixed(1),analysis:(item.analysis||[]).join(' ')}),
        display_label:selected?'◆':'◇',
        group_label:l.candidateAnchor,
        item_count:0,
        className:'scope-virtual-anchor'+(selected?' is-selected':''),
        style:'--virtual-anchor-strength:'+strength+';font-size:18px;',
        virtual_anchor:{...item,position_ratio:position,before_ratio:beforeCount/total,after_ratio:afterCount/total,strength_ratio:strength}
      };
    });
  },[riverAnalysis.suggestions,riverAnalysis.totalCount,selectedVirtualAnchorDates,classificationWindowStart,classificationWindowEnd,l,locale]);
  // The first river is the one canonical place for existing anchors.
  // The work-classification river compares works with optional *candidate*
  // density dates; never render a second copy of official anchors.
  const classificationRiverItems=useMemo(
    ()=>[...secondRiverBuckets,...virtualAnchorItems],
    [secondRiverBuckets,virtualAnchorItems]
  );
  useEffect(()=>{
    setSelectedVirtualAnchorDates(current=>current.filter(date=>riverAnalysis.suggestions.some(item=>item.date===date)));
  },[scopeId,classificationWindowStart,classificationWindowEnd,riverAnalysis.suggestions]);

  const toggleVirtualAnchor=date=>{
    setSelectedVirtualAnchorDates(current=>current.includes(date)?current.filter(item=>item!==date):[...current,date].sort());
  };

  async function createSelectedSuggestedAnchors(){
    if(creatingSuggestedAnchors||!scopeData?.time)return;
    const suggestedDates=new Set(riverAnalysis.suggestions.map(item=>item.date));
    const existingDates=new Set(existingAnchorDates);
    const dates=[...new Set(selectedVirtualAnchorDates)]
      .filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&suggestedDates.has(date)&&!existingDates.has(date));
    if(!dates.length){setEditError('目前沒有可新增的建議定錨點。');return;}
    setCreatingSuggestedAnchors(true);setEditError('');
    try{
      // Only this explicitly requested bulk write needs the extra foreground
      // authorization check. The database RPC remains the final guard.
      const verified=await account.refresh();
      if(!verified?.authorizer?.canManageScopeSync(scopeId))throw new Error('請先登入具備此 Scope 權限的帳號。');
      const updatedAt=new Date().toISOString();
      await insertRows(scopeData.time,dates.map(date=>({
        record_type:'anchor',label:'建議定錨 '+date,
        resource_id:'anchor:'+globalThis.crypto.randomUUID(),
        note:null,status:'active',display_order:null,visibility:null,
        time_date:date,anchor_ids:null,date_status:'exact',year_value:null,
        updated_at:updatedAt
      })));
      setSelectedVirtualAnchorDates([]);
      await refreshTimelineData();
    }catch(error){setEditError(String(error?.message||error));}
    finally{setCreatingSuggestedAnchors(false);}
  }

  async function startEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    const key=String(work?.key||('galaxy:'+uid));
    setEditingWorkKey(key);setEditDraft(null);setAuthorizedWorkKey('');setEditError('');
    try{
      // Editing is offered to every reader, but only an authorized Scope
      // editor may load an editable draft after clicking the button.
      const verified=await account.refresh();
      if(!verified?.authorizer?.canManageScopeSync(scopeId))throw new Error('請先登入具有此 Scope 編輯權限的帳號。');
      setAuthorizedWorkKey(key);
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const {rows=[]}=await selectRows(scopeData.galaxy,{
        columns:'uid,title,content,searchable',
        filters:[{column:'uid',operator:'eq',value:uid}],
        limit:1
      });
      const row=rows[0];
      if(!row)throw new Error(l.workNotFound);
      const {plainTextToBlocks}=await import('../../loc/blocknote-content.mjs');
      setEditDraft({
        title:String(row.title||work.title||''),
        body:String(row.content||''),
        bodyHtml:String(row.content||''),
        bodyBlocks:plainTextToBlocks(String(row.content||'')),
        editorKey:uid,
        hidden:row.searchable===false
      });
    }catch(exception){
      setEditingWorkKey('');setAuthorizedWorkKey('');
      const message=String(exception?.message||exception||l.editReadFailed);
      setEditError(message);setFullTextError(message);
    }
  }

  async function saveEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid||!editDraft)return;
    setEditBusy(true);setEditError('');
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const {blocksToPlainText}=await import('../../loc/blocknote-content.mjs');
      const content=await requireGalaxyContent(editDraft.bodyHtml??blocksToPlainText(editDraft.bodyBlocks));
      const plainBody=blocksToPlainText(editDraft.bodyHtml??editDraft.bodyBlocks);
      await updateRows(scopeData.galaxy,{
        title:resolveGalaxyTitle(editDraft.title,plainBody),
        content,
        searchable:editDraft.hidden!==true,
        UpdateTime:new Date().toISOString()
      },{filters:[{column:'uid',operator:'eq',value:uid}]});
      const key=String(work?.key||('galaxy:'+uid));
      if(fullTextKey===key)setFullText(content);
      setEditingWorkKey('');setAuthorizedWorkKey('');setEditDraft(null);
      periodWorksPage.reload();
    }catch(exception){
      setEditError(String(exception?.message||exception||l.saveFailed));
    }finally{
      setEditBusy(false);
    }
  }

  async function deleteEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    setEditBusy(true);setEditError('');
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      await deleteRows(scopeData.galaxy,{filters:[{column:'uid',operator:'eq',value:uid}]});
      const key=String(work?.key||('galaxy:'+uid));
      if(fullTextKey===key){setFullTextKey('');setFullText('');}
      setEditingWorkKey('');setAuthorizedWorkKey('');setEditDraft(null);
      periodWorksPage.reload();
    }catch(exception){
      setEditError(String(exception?.message||exception||l.deleteFailed));
    }finally{setEditBusy(false)}
  }

  async function toggleWorkContent(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    const key=String(work?.key||('galaxy:'+uid));
    if(fullTextKey===key){
      setFullTextKey('');
      setFullText('');
      setFullTextError('');
      return;
    }
    setFullTextKey(key);
    setFullText('');
    setFullTextError('');
    setFullTextLoading(true);
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const row=await selectGalaxyContent(scopeData,uid);
      if(!row)throw new Error(l.workNotFound);
      setFullText(workDisplayText(row.content||''));
    }catch(exception){
      setFullTextError(String(exception?.message||exception||l.fullTextFailed));
    }finally{
      setFullTextLoading(false);
    }
  }

  // The dedicated management entry is already in edit mode. Only its selected
  // record kind appears on the right, with the same native zoom/pan controls.
  if(isTimeEditingView){
    const editorAvailable=Boolean(scopeId&&scopeId!=='loc');
    const choice=TIME_EDITOR_SECTIONS.find(item=>item.value===timeEditorSection)||TIME_EDITOR_SECTIONS[0];
    return <FeaturePage featureId="culture">
      <section className='loc-card scope-feature-card scope-feature-card-wide'>
        <h2>時間編輯</h2>
        {!editorAvailable?<p className='scope-status'>此區沒有個別 Scope 的時間編輯資料。</p>:null}
        {editorAvailable?<div className='management-workspace scope-time-edit-workspace'>
          <ManagementSectionNav id='time-editor-sections' title='編輯項目'
            panelId='time-editor-panel' items={TIME_EDITOR_SECTIONS}
            value={timeEditorSection} onChange={next=>{
              if(next===timeEditorSection)return;
              const href=timeEditorHrefFor(next);
              if(!href)return;
              const url=new URL(href,window.location.href);
              url.searchParams.delete('anchorDate');
              const target=url.pathname+url.search+url.hash;
              if(editDock?.active)editDock.switchTo(target,{history:'push'});
              else window.history.pushState(null,'',target);
            }}/>
          <div className='management-workspace-panel' id='time-editor-panel' role='region'
            aria-labelledby={'time-editor-sections-option-'+choice.value}>
            <div className='scope-culture-timeline-tools'>
              <h3>{choice.label}｜時間長河</h3>
              <div className='scope-stat-controls'>
                {timeEditorSection==='anchor-style'?<>
                  <button type='button' className='loc-button' onClick={()=>beginTimelineCreation('anchor',currentStructureStart)}>＋ 定錨點</button>
                  <button type='button' className='loc-button' onClick={()=>beginTimelineCreation('style_comment','')}>＋ 風格標籤</button>
                </>:<button type='button' className='loc-button' onClick={()=>beginTimelineCreation(timeEditorSection,'')}>＋ {choice.label}</button>}
              </div>
            </div>
            {query.isPending?<p className='scope-status' role='status'>正在載入時間紀錄…</p>:null}
            {query.error?<p className='scope-status scope-error' role='alert'>{featureDataErrorMessage(query.error,UI_COPY)}</p>:null}
            {!query.isPending&&!query.error?<CultureTimeline
              key={'time-editor-'+timeEditorSection}
              items={timeEditorItems}
              labelOf={localizedLabelOf}
              focus={EMPTY_RIVER_FOCUS}
              mode='overview'
              windowStart={currentStructureStart}
              windowEnd={currentStructureEnd}
              onTimeClick={timeEditorSection==='anchor-style'?date=>beginTimelineCreation('anchor',date):null}
              onSelect={item=>{
                setSelectedTimelineInfo(item||null);
                setSelectedTimelineRecordId(String(item?.recordId||''));
                setSelectedTimelineDate('');
              }}
              editable
              onMove={moveTimelineRecord}
              onUpdate={(item,row)=>{
                if(row?.recordId)setSelectedTimelineRecordId(row.recordId);
                return null;
              }}
              onRemove={removeTimelineRecord}
            />:null}
            {selectedTimelineInfo?<div className='scope-card scope-culture-timeline-selection' role='status'>
              <strong>{selectedTimelineInfo.content||selectedTimelineInfo.title||'時間紀錄'}</strong>
              <p className='scope-status'>{String(selectedTimelineInfo.start||'').slice(0,10)}{selectedTimelineInfo.end?' ～ '+String(selectedTimelineInfo.end).slice(0,10):''}</p>
            </div>:null}
            {Boolean(selectedTimelineRecordId||selectedTimelineDate||suggestedRequestNonce||searchParams?.get('anchorDate'))?
              <CultureTimelineEditor scopeId={scopeId}
                timeTable={scopeData?.time||''}
                selectedRecordId={selectedTimelineRecordId}
                suggestedAnchorDate={selectedTimelineDate}
                suggestedRecordType={suggestedRecordType}
                suggestedRequestNonce={suggestedRequestNonce}
                onClose={()=>{setSelectedTimelineRecordId('');setSelectedTimelineDate('');setSuggestedRequestNonce(0)}}/>:null}
            {editError?<p className='scope-status scope-error' role='alert'>{editError}</p>:null}
          </div>
        </div>:null}
      </section>
    </FeaturePage>;
  }

  return <FeaturePage featureId="culture">
    <section className='loc-card scope-feature-card scope-feature-card-wide'>
      {scopeId==='lrunes'?<div className='scope-stat-controls'><label><span><UiText id="uiExtra.cultureView.timelineContent"/></span>
        <select className='scope-select' value={lrunesView} onChange={event=>setLrunesView(event.target.value)}>
          <option value='daily'><UiText id="uiExtra.cultureView.dailyRunes"/></option>
          <option value='works'><UiText id="uiExtra.cultureView.worksAndPeriods"/></option>
        </select>
      </label></div>:null}
      {scopeId==='loc'?<div className='scope-stat-controls'><label><span>{UI_COPY.culture.viewMode}</span>
        <select className='scope-select' aria-label={UI_COPY.culture.viewMode} value={locCultureView} onChange={event=>setLocCultureView(event.target.value)}>
          <option value='period'><UiText id="uiExtra.cultureView.periodIntersectionWorks"/></option>
          <option value='item'><UiText id="uiExtra.cultureView.itemIntersectionTwoRivers"/></option>
        </select>
      </label></div>:null}
      {isLrunesDaily?<LrunesDailyCulturePanel/>:isLocItemView?<LocItemConfluence/>:<>
      <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
      <h2>{UI_COPY.culture.river}</h2>
      {query.isPending?<p className="scope-status" role="status" aria-live="polite">{UI_COPY.common.loading}</p>:null}
      {query.error?<p className='scope-status scope-error'>{featureDataErrorMessage(query.error,UI_COPY)}</p>:null}
      {!query.isPending&&!query.error&&!hasTimelineSurface?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
      {!query.isPending&&!query.error&&hasTimelineSurface?<>


            {isAggregateScope?<>

              <section className='scope-card scope-culture-classification-river scope-loc-time-river'>
                <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
                <h3>{UI_COPY.culture.intersectionRiver}</h3>
                {locScopeRiverItems.length?<CultureTimeline
                  items={locScopeRiverItems}
                  labelOf={emptyRiverLabel}
                  focus={EMPTY_RIVER_FOCUS}
                  mode='source'
                  windowStart={requestedWindowStart||locDistributionStart}
                  windowEnd={requestedWindowEnd||locDistributionEnd}
                  fixedMin={locDistributionStart}
                  fixedMax={locDistributionEnd}
                  hiddenDates={locRiverAnalysis.hiddenDates}
                />:null}
                <div className='scope-result-links'>
                  {locIntersectionScopeIds.map(id=><ScopeLink key={id} href={featureNavigationHref(id,'culture')}>{id}{l.personalTimelineSuffix}</ScopeLink>)}
                </div>
                {locCombinedSourceRiverItems.length?<section className='scope-culture-combined-source-river'>
                  <p className='loc-eyebrow'>{UI_COPY.culture.combinedSources}</p>
                  <h4>{UI_COPY.culture.combinedRiver}</h4>
                  <CultureTimeline
                    items={locCombinedSourceRiverItems}
                    labelOf={emptyRiverLabel}
                    focus={EMPTY_RIVER_FOCUS}
                    mode='source'
                    windowStart={requestedWindowStart||locDistributionStart}
                    windowEnd={requestedWindowEnd||locDistributionEnd}
                    fixedMin={locDistributionStart}
                    fixedMax={locDistributionEnd}
                    hiddenDates={locRiverAnalysis.hiddenDates}
                  />
                </section>:null}

              </section>


            </>:<>
              <section className='scope-card scope-culture-structure-river'>
                <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
                <h3>{UI_COPY.culture.structure}</h3>
                <div className='scope-culture-timeline-tools'>
                  <label><span><UiText id="uiExtra.cultureView.periodRange"/></span><select className='scope-select' value={selectedPeriodKey||periodKey(selectedWorkPeriod)} onChange={event=>setSelectedPeriodKey(event.target.value)}>
                    <option value='all'><UiText id="uiExtra.cultureView.allPeriods"/></option>
                    {primaryPeriods.map(item=><option key={periodKey(item)} value={periodKey(item)}>{localizedLabelOf(item,0)}</option>)}
                  </select></label>
                </div>
                {timelineItems.length?<CultureTimeline
                  items={timelineItems}
                  labelOf={localizedLabelOf}
                  focus={navigation}
                  mode='overview'
                  windowStart={currentStructureStart}
                  windowEnd={currentStructureEnd}
                  onSelect={item=>setSelectedTimelineInfo(item||null)}
                  editable={false}
                />:<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>}
                {selectedTimelineInfo?<div className='scope-card scope-culture-timeline-selection' role='status'>
                  <strong>{selectedTimelineInfo.content||selectedTimelineInfo.raw?.display_label||selectedTimelineInfo.title||translateUiField(locale,'時間長河紀錄')}</strong>
                  <p className='scope-status'>{String(selectedTimelineInfo.start||'').slice(0,10)}{selectedTimelineInfo.end?' ～ '+String(selectedTimelineInfo.end).slice(0,10):''}</p>
                  {selectedTimelineInfo.title?<p>{selectedTimelineInfo.title}</p>:null}
                </div>:null}
              </section>

              {selectedWorkPeriod?<section className='scope-card scope-culture-classification-river'>
                <div className='scope-stat-controls'>
                  {keywordOptionsRequested&&keywordClassQuery.error?<span className='scope-status scope-error' role='status'>
                    關鍵詞組讀取失敗：{featureDataErrorMessage(keywordClassQuery.error,UI_COPY)}
                  </span>:null}
                  <>
                    <label className='scope-culture-period-select'>
                      <span>時期</span>
                      <select className='scope-select' aria-label='時期'
                        value={keywordPeriodKey} onChange={event=>{
                          const next=event.target.value;
                          if(next==='custom'){
                            if(!keywordCustomStart)setKeywordCustomStart(keywordWindowStart);
                            if(!keywordCustomEnd)setKeywordCustomEnd(keywordWindowEnd);
                          }
                          setKeywordPeriodKey(next);
                        }}>
                        <option value='latest'>最近的時期{latestPeriod?'：'+localizedLabelOf(latestPeriod,0):''}</option>
                        <option value='current'>目前檢視時期</option>
                        <option value='all'><UiText id="uiExtra.cultureView.allPeriods"/></option>
                        {primaryPeriods.map(period=><option key={periodKey(period)} value={periodKey(period)}>{localizedLabelOf(period,0)}</option>)}
                        <option value='custom'>自訂區間</option>
                      </select>
                    </label>
                    {keywordPeriodKey==='custom'?<>
                      <label><span>起始日期</span>
                        <input className='scope-select' aria-label='時間區間起始日期' type='date'
                          value={keywordCustomStart} max={keywordCustomEnd||undefined}
                          onChange={event=>setKeywordCustomStart(event.target.value)}/>
                      </label>
                      <label><span>結束日期</span>
                        <input className='scope-select' aria-label='時間區間結束日期' type='date'
                          value={keywordCustomEnd} min={keywordCustomStart||undefined}
                          onChange={event=>setKeywordCustomEnd(event.target.value)}/>
                      </label>
                    </>:null}
                  </>
                  <label className='scope-culture-period-select'>
                    <span>來源</span>
                    <select className='scope-select' aria-label='來源' value={keywordDrillSource}
                      disabled={sourceSnapshotQuery.isPending||Boolean(sourceSnapshotQuery.error)}
                      onChange={event=>{
                        setKeywordDrillSource(event.target.value);
                        setSelectedCategory('');
                      }}>
                      <option value=''>全部來源</option>
                      {sourceOptionGroups.map(group=><optgroup key={group.label} label={group.label}>
                        {group.items.map(source=><option key={source.category_key} value={source.source_name}>
                          {source.display_label}
                        </option>)}
                      </optgroup>)}
                    </select>
                  </label>
                  {!isAggregateScope&&!isLrunesDaily&&!isLocItemView?<label className='scope-culture-period-select'>
                    <span><UiText id="uiExtra.cultureView.style"/></span>
                    <select className='scope-select' value={styleFilter}
                      onFocus={()=>setKeywordOptionsRequested(true)}
                      onPointerDown={()=>setKeywordOptionsRequested(true)}
                      onChange={event=>{setStyleFilter(event.target.value);setKeywordDrillGroup('');}}>
                      <option value='none'><UiText id="uiExtra.cultureView.noFilter"/></option>
                      <option value='rune66' disabled={!keywordClassQuery.data}>{keywordOptionsRequested?keywordClassLabel:'關鍵詞組（點選載入）'}</option>
                    </select>
                  </label>:null}
                  {styleFilter==='rune66'&&Boolean(styleQuery.data?.keywordMeta?.classes)?<label className='scope-culture-period-select'>
                    <span>風格群組</span>
                    <select className='scope-select' aria-label='風格群組' value={keywordDrillGroup}
                      onChange={event=>setKeywordDrillGroup(event.target.value)}>
                      <option value=''>全部群組</option>
                      {keywordGroupOptions.map(group=><option key={group.id} value={group.id}>
                        {[String(styleQuery.data?.keywordMeta?.class_name||keywordClassQuery.data||'').trim(),group.label,'群組'].filter(Boolean).join(' ')}
                      </option>)}
                    </select>
                  </label>:null}
                  {riverRangeLoading?<span className='scope-status' role='status' aria-live='polite'>Loading...</span>:null}
                </div>
                <p className='loc-eyebrow'>{UI_COPY.culture.classificationRiver}</p>
                <h3>第二條河道｜來源作品密度｜{classificationPeriodLabel}</h3>
                {!classificationWindowValid?<p className='scope-status scope-error' role='status'>請選擇有效的時間區間（起始日期不得晚於結束日期）。</p>:null}
                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error,UI_COPY)}</p>:null}
                {classificationWindowValid&&!riverRangeLoading&&!sourceSnapshotQuery.error&&sourceSnapshotQuery.data&&!secondRiverBuckets.length
                  ?<p className='scope-status'>{UI_COPY.culture.noPeriodClassification}</p>:null}
                {!riverRangeLoading&&riverAnalysis.suggestions.length>0?<div className='scope-culture-anchor-actions'>
                  <span>{formatCultureUi(l.candidateSummary,{count:riverAnalysis.suggestions.length})}</span>
                  <button type='button' className='loc-button' disabled={creatingSuggestedAnchors||!selectedVirtualAnchorDates.length}
                    onClick={createSelectedSuggestedAnchors}>
                    {creatingSuggestedAnchors?'正在新增…':'新增選取的建議定錨點（'+selectedVirtualAnchorDates.length+'）'}
                  </button>
                  {editError?<p className='scope-status scope-error' role='alert'>{editError}</p>:null}
                  <details className='scope-culture-anchor-picker'>
                    <summary><UiText id="uiExtra.cultureView.expandToCompareWorkVolumeChanges"/></summary>
                    <div className='scope-culture-anchor-choices'>
                      {riverAnalysis.suggestions.map(item=>{
                        const route=featureNavigationHref(scopeId,'culture');
                        const href=route+(route.includes('?')?'&':'?')+'edit=1&anchorDate='+encodeURIComponent(item.date);
                        return <div key={item.date} className='scope-status'>
                          <label><input type='checkbox' checked={selectedVirtualAnchorDates.includes(item.date)}
                            onChange={()=>toggleVirtualAnchor(item.date)}/>
                            {formatCultureUi(l.candidateComparison,{date:item.date,before:Number(item.beforeCount||0).toLocaleString(locale),after:Number(item.afterCount||0).toLocaleString(locale),analysis:(item.analysis||[]).join(' ')})}
                          </label>
                          <ScopeLink href={href}>前往時間編輯</ScopeLink>
                        </div>;
                      })}
                    </div>
                  </details>
                </div>:null}
                {!riverRangeLoading&&classificationRiverItems.length?<CultureTimeline
                  items={classificationRiverItems}
                  labelOf={classificationRiverLabel}
                  focus={EMPTY_RIVER_FOCUS}
                  mode='source'
                  windowStart={classificationWindowStart}
                  windowEnd={classificationWindowEnd}
                  hiddenDates={riverAnalysis.hiddenDates}
                  onSelect={item=>{
                    if(item?.entryType==='virtual_anchor'){
                      toggleVirtualAnchor(String(item?.start||'').slice(0,10));
                      return;
                    }
                    const term=String(item?.raw?.category||item?.category||item?.group||'').trim();
                    if(!term)return;
                    const key='source:'+term;
                    if(categoryGroups.some(group=>group.category_key===key)){
                      setSelectedCategory(key);
                    }
                  }}
                />:null}
                {styleFilter==='rune66'?<section className='scope-culture-style-filter'>
                  <p className='loc-eyebrow'>第三條河道｜風格：{String(styleQuery.data?.keywordMeta?.class_name||keywordClassQuery.data||'尚未設定')}</p>
                  <div className='scope-stat-controls'>
                    {keywordDrillGroup?<button type='button' className='loc-button' onClick={()=>setKeywordDrillGroup('')}>← 返回群組總覽</button>
                      :keywordDrillSource?<button type='button' className='loc-button' onClick={()=>setKeywordDrillSource('')}>← 返回全部來源</button>:null}
                    <span className='scope-status' aria-live='polite'>
                      {classificationPeriodLabel} → {keywordDrillSource||'全部來源'} → {keywordDrillGroup
                        ?String(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'群組')+' · Group 分布'
                        :'全部群組'}
                    </span>
                  </div>
                  <h4>{keywordDrillGroup?'Group 分布｜'+String(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'群組'):'風格群組密度'}</h4>
                  {!keywordWindowValid?<p className='scope-status scope-error' role='status'>請選擇有效的時間區間。</p>:null}
                  {styleRiverAnalysis.suggestions.length>0?<details className='scope-culture-anchor-picker'>
                    <summary>風格密度建議定錨點：{styleRiverAnalysis.suggestions.length} 個（點開查看）</summary>
                    {styleRiverAnalysis.suggestions.length?<div className='scope-culture-anchor-choices'>
                      {styleRiverAnalysis.suggestions.map(item=>{
                        const route=featureNavigationHref(scopeId,'culture');
                        const href=route+(route.includes('?')?'&':'?')+'edit=1&anchorDate='+encodeURIComponent(item.date);
                        return <div key={item.date} className='scope-status'>
                          <strong>{item.date}</strong>
                          <span>｜前 3 日 {Number(item.beforeCount||0).toLocaleString(locale)} 次／後 3 日 {Number(item.afterCount||0).toLocaleString(locale)} 次</span>
                          {(item.analysis||[]).length?<span>｜{item.analysis.join(' ')}</span>:null}
                          <span>｜<ScopeLink href={href}>前往時間編輯，確認定錨點</ScopeLink></span>
                        </div>;
                      })}
                    </div>:<p className='scope-status'>此時間區間暫無足夠的風格密度變化，或分析資料尚在載入。</p>}
                  </details>:null}
                  {styleQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(styleQuery.error,UI_COPY)}</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&!styleQuery.data?.staticstime?<p className='scope-status'>關鍵詞尚未定錨；請先於關鍵詞設定完成分析。</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.staticstime&&!styleQuery.data?.statisticsEnabled?<p className='scope-status'>目前關鍵詞統計尚未啟用。</p>:null}
                  {keywordDensityQuery.isPending&&styleQuery.data?.statisticsEnabled
                    ?<p className='scope-status' role='status'>正在讀取已儲存的文章屬性…</p>:null}
                  {keywordDrillGroup&&keywordGroupCatalogQuery.isPending?<p className='scope-status' role='status'>正在載入所選群組的 Group 分布…</p>:null}
                  {keywordDensityQuery.error||keywordGroupCatalogQuery.error
                    ?<p className='scope-status scope-error'>{featureDataErrorMessage(keywordDensityQuery.error||keywordGroupCatalogQuery.error,UI_COPY)}</p>:null}
                  {!keywordDensityQuery.isPending&&(!keywordDrillGroup||!keywordGroupCatalogQuery.isPending)
                    &&!keywordDensityQuery.error&&!keywordGroupCatalogQuery.error&&keywordDrillItems.length?<CultureTimeline
                    key={keywordDrillSource+'|'+keywordDrillGroup}
                    items={keywordDrillItems}
                    labelOf={emptyRiverLabel}
                    focus={EMPTY_RIVER_FOCUS}
                    mode='source'
                    windowStart={keywordWindowStart}
                    windowEnd={keywordWindowEnd}
                    onSelect={item=>{
                      const key=String(item?.raw?.drill_key||'').trim();
                      if(!key)return;
                      if(!keywordDrillGroup)setKeywordDrillGroup(key);
                    }}
                  />:null}
                  {!keywordDensityQuery.isPending&&(!keywordDrillGroup||!keywordGroupCatalogQuery.isPending)
                    &&!keywordDensityQuery.error&&!keywordGroupCatalogQuery.error&&!keywordDrillItems.length
                    ?<p className='scope-status'>此範圍沒有可顯示的命中資料。</p>:null}
                </section>:null}
                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error,UI_COPY)}</p>:null}
                {classificationWindowValid&&!riverRangeLoading&&!sourceSnapshotQuery.error&&sourceSnapshotQuery.data&&!categoryGroups.length?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
                <details className='scope-culture-source-detail' open={worksOpen} onToggle={event=>setWorksOpen(event.currentTarget.open)}>
                  <summary>點開文章列表</summary>
                  {worksOpen?<><header style={{display:'flex',justifyContent:'space-between',gap:'.75rem',alignItems:'center',flexWrap:'wrap'}}>
                    {selectedGroup?<button type='button' className='scope-pagination-button' onClick={()=>setSelectedCategory('')}>{UI_COPY.culture.showAllWorks}</button>:<span/>}
                    <ArticleSortSelect value={articleSort} onChange={setArticleSort} disabled={Boolean(editingWorkKey)}/>
                  </header>
                  {periodWorksPage.error?<p className='scope-status scope-error'>{featureDataErrorMessage(periodWorksPage.error,UI_COPY)} <button type='button' className='loc-button' onClick={periodWorksPage.reload}><UiText id="uiExtra.cultureView.reloadWorks"/></button></p>:null}
                  {periodWorksPage.loading&&!visibleWorkRows.length?<p role='status' className='scope-status'>{l.loadingPeriodWorks}</p>:null}
                  <IncrementalList
                    items={visibleWorkRows}
                    batchSize={DEFAULT_LIST_BATCH_SIZE}
                    resetKey={classificationWindowStart+'|'+classificationWindowEnd+'|'+selectedCategory+'|source|'+articleSort}
                    className='scope-culture-source-work-scroll'
                    externalHasMore={periodWorksPage.hasMore}
                    loading={periodWorksPage.loading}
                    error={periodWorksPage.error}
                    onLoadMore={periodWorksPage.loadNext}
                    scrollRootRef={workScrollRef}
                    renderItem={(work,index)=>{
                      const workKey=String(work.key||('galaxy:'+work.uid));
                      const canEditWork=authorizedWorkKey===workKey;
                      return <Article
                      key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                      uid={work.uid}
                      title={workDisplayHeading(work,{media:false,limit:80})}
                      source={work.source_name||work.group_label||''}
                      scopeId={work.scope_id||classificationScope}
                      date={work.display_date||CultureTimelineModel.formatCultureDateTime(work.createtime||work.created_at)}
                      body={editingWorkKey===workKey&&editDraft?'':work.description||work.media_metadata_text||''}
                      relationLinks={galaxyRelationLinks(classificationScope,work)}
                      links={work.links||[]}
                      editable={canEditWork}
                      editing={editingWorkKey===workKey}
                      onEdit={uid=>startEditingWork({...work,uid})}
                      editorDraft={editingWorkKey===workKey?editDraft:null}
                      onDraftChange={setEditDraft}
                      onSave={()=>saveEditingWork(work)}
                      onDelete={()=>deleteEditingWork(work)}
                      onCancel={()=>{setEditingWorkKey('');setAuthorizedWorkKey('');setEditDraft(null);setEditError('')}}
                      editBusy={editBusy}
                      editError={editError}
                      showHidden
                    >
                      {work.uid&&editingWorkKey!==workKey?<div className="scope-work-fulltext-row">
                        <WorkFullText
                          open={fullTextKey===workKey}
                          loading={fullTextLoading&&fullTextKey===workKey}
                          error={fullTextKey===workKey?fullTextError:''}
                          content={fullTextKey===workKey?fullText:''}
                          onToggle={()=>toggleWorkContent(work)}
                        />
                        {fullTextKey===workKey?<button type='button' className='loc-button scope-work-edit-button'
                          onClick={()=>startEditingWork(work)}>編輯</button>:null}
                        
                      </div>:null}
                    </Article>;
                    }}
                  />
                  {!periodWorksPage.loading&&!periodWorksPage.error&&!visibleWorkRows.length?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
                  </>:null}
                </details>
              </section>:null}
            </>}
      </>:null}
      </>}
    </section>
  </FeaturePage>;
}
