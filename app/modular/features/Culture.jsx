'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {UI_COPY} from '../../i18n/ui-copy';
import {useUiCopy,useUiLocale} from '../../i18n/ui-locale';
import {translateUiField} from '../../i18n/ui-functional-copy.mjs';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {
  selectScopePeriodSourceSnapshot,
  selectScopePeriodWorkIndex,
  selectScopePeriodWorkDetails,
  selectScopeCultureData
} from '../../loc/culture-query';
import {featureNavigationHref,galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
const CultureTimeline=dynamic(()=>import('../modules/culture-timeline/CultureTimeline'),{loading:()=>null});
import {CultureTimelineModel} from '../modules/culture-timeline/culture-timeline-model';
import {analyzeRiverDensity} from '../modules/culture-timeline/river-density-analysis.mjs';
import {selectGalaxyContent} from '../../loc/galaxy-query';
import {selectRune66Classification} from '../../loc/rune66-keyword-analysis';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {selectRows} from '../../loc/db-query.mjs';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {FeaturePage,IncrementalList,WorkFullText} from '../ui';
import Article from '../Article';
import {blocksToPlainText,plainTextToBlocks} from '../../loc/blocknote-content.mjs';
const CultureTimelineEditor=dynamic(()=>import('./CultureTimelineEditor'),{loading:()=>null});
import {workDisplayHeading,workDisplayText} from '../work-display-model';
import {useOffsetPagination} from '../use-offset-pagination';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
const LrunesDailyCulturePanel=dynamic(()=>import('../../lrunes/DailyRuneAnalytics').then(m=>m.LrunesDailyCulturePanel),{loading:()=>null});
const LocItemConfluence=dynamic(()=>import('./LocItemConfluence'),{loading:()=>null});

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

// Preserve timeline instances while editor dialogs, suggested points and
// density suggestions update around them.
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
  return !text?'':text.endsWith('群組')?text:text+'群組';
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
  const UI_COPY=useUiCopy();
  const l=UI_COPY.uiExtra.cultureView;
  const localizedLabelOf=useMemo(()=> (item,index)=>labelOf(item,index,UI_COPY.format.period(index+1)),[UI_COPY]);
  const {locale}=useUiLocale();
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const [lrunesView,setLrunesView]=useState('daily');
  const [locCultureView,setLocCultureView]=useState('period');
  const isLrunesDaily=scopeId==='lrunes'&&lrunesView==='daily';
  const isLocItemView=scopeId==='loc'&&locCultureView==='item';
  const queryClient=useQueryClient();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
    enabled:!isLrunesDaily&&!isLocItemView,
    staleTime:5*60_000
  });

  const [selectedPeriodKey,setSelectedPeriodKey]=useState('');
  const [selectedCategory,setSelectedCategory]=useState('');
  const [styleFilter,setStyleFilter]=useState(scopeId==='lo3rwang'?'rune66':'none');
  const [selectedVirtualAnchorDates,setSelectedVirtualAnchorDates]=useState([]);
  const [anchorSaveBusy,setAnchorSaveBusy]=useState(false);
  const [anchorSaveMessage,setAnchorSaveMessage]=useState('');
  const workScrollRef=useRef(null);
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const [fullTextError,setFullTextError]=useState('');
  const [editingWorkKey,setEditingWorkKey]=useState('');
  const [selectedTimelineRecordId,setSelectedTimelineRecordId]=useState('');
  const [selectedTimelineInfo,setSelectedTimelineInfo]=useState(null);
  const [selectedTimelineDate,setSelectedTimelineDate]=useState('');
  const [suggestedRecordType,setSuggestedRecordType]=useState('anchor');
  const [suggestedRequestNonce,setSuggestedRequestNonce]=useState(0);
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');

  useEffect(()=>{
    setStyleFilter(scopeId==='lo3rwang'?'rune66':'none');
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
  const allTimePeriod=useMemo(()=>periodRange(primaryPeriods,classificationScope,UI_COPY.culture.allTime),[primaryPeriods,classificationScope,UI_COPY.culture.allTime]);
  useEffect(()=>{
    if(isAggregateScope||!query.data)return;
    const preferred=periodKey(openPeriod)||periodKey(primaryPeriods.at(-1))||'all';
    setSelectedPeriodKey(current=>(current==='all'||primaryPeriods.some(period=>periodKey(period)===current))?current:preferred);
  },[scopeId,isAggregateScope,query.data,openPeriod?.period,openPeriod?.start_date,primaryPeriods]);
  const selectedWorkPeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(primaryPeriods.find(item=>periodKey(item)===selectedPeriodKey)||openPeriod||allTimePeriod);
  const selectedWindowStart=String(selectedWorkPeriod?.start_date||'');
  const selectedWindowEnd=String(selectedWorkPeriod?.end_date||new Date().toISOString().slice(0,10));
  const requestedWindowStart=String(navigation.from||'').slice(0,10);
  const requestedWindowEnd=String(navigation.to||'').slice(0,10);
  // Deep-linked date ranges pick the initial period only once per URL request.
  // Without this guard, re-rendered period arrays used to reapply the old URL
  // and immediately undo a user's selection in the Culture period dropdown.
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
    queryKey:['culture-period-source-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectScopePeriodSourceSnapshot(scopeData,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:!isLrunesDaily&&!isLocItemView&&!isAggregateScope&&Boolean(scopeData),
    staleTime:5*60_000
  });
  const styleQuery=useQuery({
    queryKey:['culture-style-filter','rune66',classificationScope,selectedWindowStart,selectedWindowEnd],
    queryFn:()=>selectRune66Classification({startDate:selectedWindowStart,endDate:selectedWindowEnd}),
    enabled:!isAggregateScope&&scopeId==='lo3rwang'&&styleFilter==='rune66'&&Boolean(selectedWindowStart&&selectedWindowEnd),
    staleTime:5*60_000
  });
  const styleClassRows=useMemo(()=>{
    const total=Math.max(0,Number(styleQuery.data?.classifiedCount||0));
    return [...(styleQuery.data?.groupTotals||[])]
      .filter(row=>Number(row.document_count||0)>0)
      .sort((a,b)=>Number(b.document_count||0)-Number(a.document_count||0)||Number(a.order||0)-Number(b.order||0))
      .map(row=>({
        ...row,
        class_label:classLabel(row.group),
        ratio:total>0?(Number(row.document_count||0)/total)*100:0
      }));
  },[styleQuery.data,l,locale]);
  const styleClassRiverItems=useMemo(()=>{
    const classifications=(styleQuery.data?.classifications||[])
      .filter(row=>row?.status==='classified'&&row?.classification_group&&row?.date);
    const counts=new Map();
    const classMax=new Map();
    for(const row of classifications){
      const date=String(row.date||'').slice(0,10);
      const className=String(row.classification_group||'').trim();
      if(!date||!className)continue;
      const key=className+'\u0000'+date;
      const count=(counts.get(key)||0)+1;
      counts.set(key,count);
      classMax.set(className,Math.max(classMax.get(className)||0,count));
    }
    return [...counts.entries()].map(([key,count],index)=>{
      const [className,date]=key.split('\u0000');
      return {
        id:'style-class:'+className+':'+date+':'+index,
        entry_id:'style-class:'+className+':'+date+':'+index,
        entry_type:'style_class_density',
        group_label:classLabel(className),
        category:className,
        display_label:'',
        title:formatCultureUi(l.densityTitle,{date,group:classLabel(className),count:count.toLocaleString(locale)}),
        start_date:date,
        end_date:nextRiverDay(date),
        item_count:count,
        density_ratio:count/Math.max(1,classMax.get(className)||1)
      };
    }).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))||String(a.group_label).localeCompare(String(b.group_label)));
  },[styleQuery.data,l,locale]);



  const categoryGroups=sourceSnapshotQuery.data?.groups||[];
  const selectedGroup=categoryGroups.find(item=>item.category_key===selectedCategory)||null;
  // When a period changes, the old category may not exist in the new period.
  // Fall back to all works instead of disabling pagination and clearing it.
  // Keyword Class is an independent visualization, not a work-list filter.
  const effectiveCategoryKey=selectedGroup?.category_key||'';
  const periodWorksPage=useOffsetPagination({
    key:[
      classificationScope,
      selectedWorkPeriod?.period||'all',
      selectedWorkPeriod?.start_date||'',
      selectedWorkPeriod?.end_date||'',
      effectiveCategoryKey||'all'
    ].join('|'),
    pageSize:DEFAULT_LIST_BATCH_SIZE,
    enabled:!isLrunesDaily&&!isAggregateScope&&Boolean(scopeData)&&Boolean(selectedWorkPeriod),
    loadPage:async(cursor,limit)=>{
      const indexPage=await selectScopePeriodWorkIndex(scopeData,{
        startDate:selectedWorkPeriod?.start_date||'',
        endDate:selectedWorkPeriod?.end_date,
        sourceName:selectedGroup?.source_name||'',
        sourceNames:selectedGroup?.source_names||[],
        mediaTypes:selectedGroup?.media_types||[],
        limit,
        cursor:cursor&&typeof cursor==='object'?cursor:null
      });
      const details=await selectScopePeriodWorkDetails(scopeData,{items:indexPage.rows||[]});
      return {
        rows:details.rows||[],
        totalCount:Number(indexPage.totalCount)||0,
        hasMore:Number(indexPage.nextCursor?.galaxyOffset||0)+Number(indexPage.nextCursor?.mediaOffset||0)<Number(indexPage.totalCount||0),
        nextCursor:indexPage.nextCursor
      };
    },
    getRowKey:row=>String(row?.key||row?.uid||row?.entry_id||'')
  });
  const selectedCount=Number(periodWorksPage.totalCount??selectedGroup?.item_count)||0;
  const visibleWorkRows=periodWorksPage.rows||[];

  useEffect(()=>{
    setSelectedCategory('');
  },[scopeId]);

  useEffect(()=>{
    setSelectedCategory('');
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date]);

  useEffect(()=>{
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[selectedCategory]);


  const timelineItems=useMemo(()=>
    (query.data?.timelineItems||[]).filter(item=>isAggregateScope||item.scope_id===scopeId)
  ,[query.data,scopeId]);
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
  const locScopeTotals=useMemo(()=>{
    const totals=new Map();
    for(const item of locScopeDistributionItems){
      const scope=String(item?.scope_id||'').trim();
      if(!scope)continue;
      totals.set(scope,(totals.get(scope)||0)+(Number(item?.item_count)||0));
    }
    for(const scopeId of locIntersectionScopeIds){
      const scope=String(scopeId||'').trim();
      if(scope&&!totals.has(scope))totals.set(scope,0);
    }
    return [...totals.entries()]
      .map(([scope,count])=>({scope,count}))
      .sort((a,b)=>a.scope.localeCompare(b.scope));
  },[locScopeDistributionItems,locIntersectionScopeIds]);
  const locIntersectionTotal=useMemo(()=>locScopeTotals.reduce((sum,item)=>sum+Number(item.count||0),0),[locScopeTotals]);
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
      queryClient.invalidateQueries({queryKey:['culture-period-settings',scopeId]})
    ]);
  }
  async function moveTimelineRecord(item,row){
    // Dates on Time periods/events are derived exclusively from existing
    // anchor_ids. Only a real anchor point can be moved on the river.
    if(row?.entryType!=='anchor'||!row.recordId||!scopeData?.time)return null;
    try{
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

  const classificationBuckets=sourceSnapshotQuery.data?.buckets||[];

  const existingAnchorDates=useMemo(()=>
    timelineItems
      .filter(item=>String(item?.entry_type||'')==='anchor')
      .map(item=>String(item?.start_date||item?.date||'').slice(0,10))
      .filter(Boolean)
  ,[timelineItems]);
  // Unselected modes must not execute the density-change algorithm.
  const riverAnalysis=useMemo(
    ()=>!isAggregateScope&&!isLrunesDaily&&!isLocItemView&&classificationBuckets.length
      ?analyzeRiverDensity(classificationBuckets,existingAnchorDates):EMPTY_RIVER_ANALYSIS,
    [isAggregateScope,isLrunesDaily,isLocItemView,classificationBuckets,existingAnchorDates]
  );
  const locRiverAnalysis=useMemo(
    ()=>isAggregateScope&&locCombinedSourceRiverItems.length
      ?analyzeRiverDensity(locCombinedSourceRiverItems,[]):EMPTY_RIVER_ANALYSIS,
    [isAggregateScope,locCombinedSourceRiverItems]
  );
  const virtualAnchorItems=useMemo(()=>{
    const total=Math.max(1,Number(riverAnalysis.totalCount)||0);
    return riverAnalysis.suggestions.map(item=>{
      const selected=selectedVirtualAnchorDates.includes(item.date);
      const beforeCount=Number(item.beforeCount||0);
      const afterCount=Number(item.afterCount||0);
      const strength=Math.min(1,Math.abs(Number(item.afterMean||0)-Number(item.beforeMean||0))/Math.max(1,Number(item.afterMean||0),Number(item.beforeMean||0)));
      const position=periodPositionRatio(item.date,selectedWindowStart,selectedWindowEnd);
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
  },[riverAnalysis.suggestions,riverAnalysis.totalCount,selectedVirtualAnchorDates,selectedWindowStart,selectedWindowEnd,l,locale]);
  // The first river is the one canonical place for existing anchors.
  // The work-classification river compares works with optional *candidate*
  // density dates; never render a second copy of official anchors.
  const classificationRiverItems=useMemo(
    ()=>[...classificationBuckets,...virtualAnchorItems],
    [classificationBuckets,virtualAnchorItems]
  );
  useEffect(()=>{
    setSelectedVirtualAnchorDates(current=>current.filter(date=>riverAnalysis.suggestions.some(item=>item.date===date)));
    setAnchorSaveMessage('');
  },[scopeId,selectedWorkPeriod?.period,riverAnalysis.suggestions]);

  const toggleVirtualAnchor=date=>{
    setSelectedVirtualAnchorDates(current=>current.includes(date)?current.filter(item=>item!==date):[...current,date].sort());
  };

  async function saveSelectedVirtualAnchors(){
    if(!selectedVirtualAnchorDates.length||anchorSaveBusy)return;
    setAnchorSaveBusy(true);setAnchorSaveMessage('');
    try{
      if(!account.canManageScopeSync(classificationScope))throw new Error(l.createDenied);
      const time=scopeData?.time;
      if(!time)throw new Error(l.sourceUnresolved);
      const now=new Date().toISOString();
      const existingDays=anchorRecords.map(item=>Date.parse(String(item.start_date||'').slice(0,10)+'T00:00:00Z')).filter(Number.isFinite);
      const safeDates=selectedVirtualAnchorDates.filter(date=>{
        const day=Date.parse(date+'T00:00:00Z');
        return Number.isFinite(day)&&!existingDays.some(existing=>Math.abs(day-existing)<=3*86400000);
      });
      if(!safeDates.length)throw new Error(l.existingAnchorNearby);
      const rows=safeDates.map(date=>({
        record_type:'anchor',
        label:'文化作品密度轉折｜'+date,
        resource_id:'anchor:'+globalThis.crypto.randomUUID(),
        note:'作品分類河道建議：'+(riverAnalysis.suggestions.find(item=>item.date===date)?.analysis||[]).join(' ')+'；需持續回顧與作品、事件及時期的關係。',
        status:null,
        display_order:null,
        visibility:null,
        time_date:date,
        anchor_ids:null,
        date_status:'exact',
        year_value:null,
        updated_at:now
      }));
      await insertRows(time,rows);
      setSelectedVirtualAnchorDates([]);
      setAnchorSaveMessage(formatCultureUi(l.anchorsCreated,{count:rows.length})+(rows.length<selectedVirtualAnchorDates.length?l.anchorDatesSkipped:''));
      await query.refetch();
    }catch(error){
      setAnchorSaveMessage(error?.message||l.bulkAnchorFailed);
    }finally{
      setAnchorSaveBusy(false);
    }
  }


  async function startEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    const key=String(work?.key||('galaxy:'+uid));
    setEditingWorkKey(key);setEditDraft(null);setEditError('');
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const {rows=[]}=await selectRows(scopeData.galaxy,{
        columns:'uid,title,content,searchable',
        filters:[{column:'uid',operator:'eq',value:uid}],
        limit:1
      });
      const row=rows[0];
      if(!row)throw new Error(l.workNotFound);
      setEditDraft({
        title:String(row.title||work.title||''),
        body:String(row.content||''),
        bodyHtml:String(row.content||''),
        bodyBlocks:plainTextToBlocks(String(row.content||'')),
        editorKey:uid,
        hidden:row.searchable===false
      });
    }catch(exception){
      setEditingWorkKey('');
      setEditError(String(exception?.message||exception||l.editReadFailed));
    }
  }

  async function saveEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid||!editDraft)return;
    setEditBusy(true);setEditError('');
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const content=requireGalaxyContent(editDraft.bodyHtml??blocksToPlainText(editDraft.bodyBlocks));
      const plainBody=blocksToPlainText(editDraft.bodyHtml??editDraft.bodyBlocks);
      await updateRows(scopeData.galaxy,{
        title:resolveGalaxyTitle(editDraft.title,plainBody),
        content,
        searchable:editDraft.hidden!==true,
        UpdateTime:new Date().toISOString()
      },{filters:[{column:'uid',operator:'eq',value:uid}]});
      const key=String(work?.key||('galaxy:'+uid));
      if(fullTextKey===key)setFullText(content);
      setEditingWorkKey('');setEditDraft(null);
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
      setEditingWorkKey('');setEditDraft(null);
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
                {locScopeTotals.length?<p className='scope-status'>
                  {l.intersectionTotalPrefix}{locIntersectionTotal.toLocaleString(locale)}{l.intersectionByScope}{locScopeTotals.map(item=>item.scope+' '+Number(item.count||0).toLocaleString(locale)+l.articleUnit).join(l.listSeparator)}{l.intersectionEnd}
                </p>:null}
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
                  {locIntersectionScopeIds.map(id=><a key={id} href={featureNavigationHref(id,'culture')}>{id}{l.personalTimelineSuffix}</a>)}
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
                  {account.canManageScopeSync(scopeId)?<>
                  <button type='button' className='loc-button' onClick={()=>beginTimelineCreation('anchor',currentStructureStart)}><UiText id="uiExtra.cultureView.ddOfficialAnchor"/></button>
                  <select className='scope-select' aria-label={translateUiField(locale,'新增時間長河紀錄')} defaultValue='' onChange={event=>{
                    const recordType=event.currentTarget.value;
                    if(!['period','event','style_comment'].includes(recordType))return;
                    event.currentTarget.value='';
                    beginTimelineCreation(recordType,'');
                  }}>
                    <option value='' disabled><UiText id="uiExtra.cultureView.dd"/></option>
                    <option value='period'><UiText id="uiExtra.cultureView.period"/></option>
                    <option value='event'><UiText id="uiExtra.cultureView.event"/></option>
                    <option value='style_comment'><UiText id="uiExtra.cultureView.styleTag"/></option>
                  </select>
                  <span className='scope-status'><UiText id="uiExtra.cultureView.theFirstRiverShowsAnchorsEventsStyleTagsAndPeriodsSelectARecordToEditItAssignUnanchoredStylesFromAddStyleTag"/></span>
                  </>:null}
                </div>
                {timelineItems.length?<CultureTimeline
                  items={timelineItems}
                  labelOf={localizedLabelOf}
                  focus={navigation}
                  mode='overview'
                  windowStart={currentStructureStart}
                  windowEnd={currentStructureEnd}
                  onTimeClick={account.canManageScopeSync(scopeId)?date=>{
                    beginTimelineCreation('anchor',date);
                  }:null}
                  onSelect={item=>{
                    setSelectedTimelineInfo(item||null);
                    const recordId=String(item?.recordId||'').trim();
                    if(!recordId)return;
                    setSelectedTimelineRecordId(recordId);
                    setSelectedTimelineDate('');
                  }}
                  editable={account.canManageScopeSync(scopeId)}
                  onAdd={null}
                  onMove={account.canManageScopeSync(scopeId)?moveTimelineRecord:null}
                  onUpdate={account.canManageScopeSync(scopeId)?(item,row)=>{
                    if(row?.recordId){
                      setSelectedTimelineRecordId(row.recordId);
                      setSelectedTimelineDate('');
                    }
                    return null;
                  }:null}
                  onRemove={account.canManageScopeSync(scopeId)?removeTimelineRecord:null}
                />:<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>}
                {selectedTimelineInfo?<div className='scope-card scope-culture-timeline-selection' role='status'>
                  <strong>{selectedTimelineInfo.content||selectedTimelineInfo.raw?.display_label||selectedTimelineInfo.title||translateUiField(locale,'時間長河紀錄')}</strong>
                  <p className='scope-status'>{String(selectedTimelineInfo.start||'').slice(0,10)}{selectedTimelineInfo.end?' ～ '+String(selectedTimelineInfo.end).slice(0,10):''}</p>
                  {selectedTimelineInfo.title?<p>{selectedTimelineInfo.title}</p>:null}
                </div>:null}
                {account.canManageScopeSync(scopeId)&&Boolean(
                  selectedTimelineRecordId||selectedTimelineDate||suggestedRequestNonce||searchParams?.get('anchorDate')
                )?<CultureTimelineEditor
                  scopeId={scopeId}
                  selectedRecordId={selectedTimelineRecordId}
                  suggestedAnchorDate={selectedTimelineDate}
                  suggestedRecordType={suggestedRecordType}
                  suggestedRequestNonce={suggestedRequestNonce}
                  onClose={()=>{setSelectedTimelineRecordId('');setSelectedTimelineDate('');setSuggestedRequestNonce(0)}}
                />:null}
              </section>

              {selectedWorkPeriod?<section className='scope-card scope-culture-classification-river'>
                <div className='scope-stat-controls'>
                  {scopeId==='lo3rwang'?<label className='scope-culture-period-select'>
                    <span><UiText id="uiExtra.cultureView.style"/></span>
                    <select className='scope-select' value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}>
                      <option value='none'><UiText id="uiExtra.cultureView.noFilter"/></option>
                      <option value='rune66'><UiText id="uiExtra.cultureView.keywordClass"/></option>
                    </select>
                  </label>:null}
                </div>
                <p className='loc-eyebrow'>{UI_COPY.culture.classificationRiver}</p>
                <h3>{localizedLabelOf(selectedWorkPeriod,0)}｜<UiText id="uiExtra.cultureView.workClassificationLane"/></h3>
                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error,UI_COPY)}</p>:null}
                {!sourceSnapshotQuery.isFetching&&!sourceSnapshotQuery.error&&!classificationBuckets.length
                  ?<p className='scope-status'>{UI_COPY.culture.noPeriodClassification}</p>:null}
                <div className='scope-culture-anchor-actions'>
                  <span>{formatCultureUi(l.candidateSummary,{count:riverAnalysis.suggestions.length})}</span>
                  {riverAnalysis.suggestions.length?<details className='scope-culture-anchor-picker'>
                    <summary><UiText id="uiExtra.cultureView.expandToCompareWorkVolumeChanges"/></summary>
                    <div className='scope-culture-anchor-choices'>
                      {riverAnalysis.suggestions.map(item=><label key={item.date} title={(item.analysis||[]).join(' ')}>
                        <input type='checkbox' checked={selectedVirtualAnchorDates.includes(item.date)} disabled={anchorSaveBusy} onChange={()=>toggleVirtualAnchor(item.date)}/>
                        <span>{formatCultureUi(l.candidateComparison,{date:item.date,before:Number(item.beforeCount||0).toLocaleString(locale),after:Number(item.afterCount||0).toLocaleString(locale),analysis:(item.analysis||[]).join(' ')})}</span>
                      </label>)}
                    </div>
                    <div className='scope-preview-links'>
                      <button type='button' className='loc-button' disabled={anchorSaveBusy} onClick={()=>setSelectedVirtualAnchorDates(riverAnalysis.suggestions.map(item=>item.date))}><UiText id="uiExtra.cultureView.selectAllCandidates"/></button>
                      <button type='button' className='loc-button' disabled={anchorSaveBusy||!selectedVirtualAnchorDates.length} onClick={()=>setSelectedVirtualAnchorDates([])}><UiText id="uiExtra.cultureView.clearSelection"/></button>
                      <button type='button' className='loc-button primary' disabled={anchorSaveBusy||!selectedVirtualAnchorDates.length||!account.canManageScopeSync(classificationScope)} onClick={saveSelectedVirtualAnchors}>
                        {anchorSaveBusy?UI_COPY.culture.creating:<><UiText id="uiExtra.cultureView.createAfterReview"/> {selectedVirtualAnchorDates.length} <UiText id="uiExtra.cultureView.formalAnchors"/></>}
                      </button>
                    </div>
                  </details>:null}
                              {anchorSaveMessage?<span role='status'>{anchorSaveMessage}</span>:null}
                </div>
                {classificationRiverItems.length?<CultureTimeline
                  items={classificationRiverItems}
                  labelOf={classificationRiverLabel}
                  focus={EMPTY_RIVER_FOCUS}
                  mode='source'
                  windowStart={selectedWindowStart}
                  windowEnd={selectedWindowEnd}
                  hiddenDates={riverAnalysis.hiddenDates}
                  onSelect={item=>{
                    if(item?.entryType==='virtual_anchor'){
                      toggleVirtualAnchor(String(item?.start||'').slice(0,10));
                      return;
                    }
                    const term=String(item?.category||item?.group||'').split(' · ')[0].trim();
                    if(!term)return;
                    const key='source:'+term;
                    if(categoryGroups.some(group=>group.category_key===key)){
                      setSelectedCategory(key);
                    }
                  }}
                />:null}
                {styleFilter==='rune66'?<section className='scope-culture-style-filter'>
                  <p className='loc-eyebrow'>表現風格 · {String(styleQuery.data?.keywordMeta?.class_name||'關鍵詞 Class')}</p>
                  <h4>Class｜符文群組比例</h4>
                  {styleQuery.isPending?<p className='scope-status'>正在讀取已定錨的關鍵詞 Attr…</p>:null}
                  {styleQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(styleQuery.error,UI_COPY)}</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&!styleQuery.data?.staticstime?<p className='scope-status'>關鍵詞尚未定錨；請登入 Statistics 的「關鍵詞設定」重新分析文章。</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.staticstime&&!styleQuery.data?.statisticsEnabled?<p className='scope-status'>目前有效文章 {Number(styleQuery.data?.keywordDocumentCount||0).toLocaleString()} 篇；必須大於 {Number(styleQuery.data?.keywordMinDocuments||0).toLocaleString()} 篇才啟用關鍵詞統計。</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.statisticsEnabled&&styleClassRows.length?<div className='scope-ranking'>
                    {styleClassRows.map(row=><div key={row.group}><strong>{row.class_label}</strong><span>{Number(row.document_count||0).toLocaleString()} 篇 · {Number(row.ratio||0).toFixed(1)}%</span></div>)}
                  </div>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.statisticsEnabled&&styleClassRiverItems.length?<CultureTimeline
                    items={styleClassRiverItems}
                    labelOf={emptyRiverLabel}
                    focus={EMPTY_RIVER_FOCUS}
                    mode='source'
                    windowStart={selectedWindowStart}
                    windowEnd={selectedWindowEnd}
                  />:null}
                </section>:null}
                <p className='scope-status'>{formatCultureUi(l.periodWorksTotal,{count:Number(sourceSnapshotQuery.data?.totalCount||0).toLocaleString(locale)})}</p>

                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error,UI_COPY)}</p>:null}
                {!sourceSnapshotQuery.isFetching&&!sourceSnapshotQuery.error&&!categoryGroups.length?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
                {categoryGroups.length?<IncrementalList
                  items={categoryGroups}
                  batchSize={DEFAULT_LIST_BATCH_SIZE}
                  resetKey={'source|'+String(selectedWorkPeriod?.period||'')}
                  className='scope-culture-source-groups'
                  renderItem={group=><button type='button' key={group.category_key}
                    className='scope-culture-source-button'
                    aria-pressed={selectedCategory===group.category_key}
                    onClick={()=>{setSelectedCategory(selectedCategory===group.category_key?'':group.category_key);}}>
                    <strong>{group.display_label}</strong>
                    <span>{Number(group.item_count||0).toLocaleString(locale)}{l.itemUnit} · {group.first_date||'—'} → {group.last_date||'—'}</span>
                  </button>}
                />:null}

                <section className='scope-culture-source-detail' aria-label={(selectedGroup?.display_label||UI_COPY.culture.allWorks)+l.listSuffix}>
                  <header>
                    <h4>{selectedGroup?.display_label||UI_COPY.culture.allWorks} · {selectedCount.toLocaleString(locale)}{l.workItemUnit}</h4>
                    {selectedGroup?<button type='button' className='scope-pagination-button' onClick={()=>setSelectedCategory('')}>{UI_COPY.culture.showAllWorks}</button>:null}
                  </header>
                  {periodWorksPage.error?<p className='scope-status scope-error'>{featureDataErrorMessage(periodWorksPage.error,UI_COPY)} <button type='button' className='loc-button' onClick={periodWorksPage.reload}><UiText id="uiExtra.cultureView.reloadWorks"/></button></p>:null}
                  {periodWorksPage.loading&&!visibleWorkRows.length?<p role='status' className='scope-status'>{l.loadingPeriodWorks}</p>:null}
                  <IncrementalList
                    items={visibleWorkRows}
                    batchSize={DEFAULT_LIST_BATCH_SIZE}
                    resetKey={selectedCategory+'|source'}
                    className='scope-culture-source-work-scroll'
                    externalHasMore={periodWorksPage.hasMore}
                    loading={periodWorksPage.loading}
                    error={periodWorksPage.error}
                    onLoadMore={periodWorksPage.loadNext}
                    scrollRootRef={workScrollRef}
                    renderItem={(work,index)=>{
                      const canEditWork=Boolean(work.uid&&account.user);
                      const workKey=String(work.key||('galaxy:'+work.uid));
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
                      onCancel={()=>{setEditingWorkKey('');setEditDraft(null);setEditError('')}}
                      editBusy={editBusy}
                      editError={editError}
                      showHidden
                    >
                      {work.uid&&editingWorkKey!==workKey?<WorkFullText
                        open={fullTextKey===work.key}
                        loading={fullTextLoading&&fullTextKey===work.key}
                        error={fullTextKey===work.key?fullTextError:''}
                        content={fullTextKey===work.key?fullText:''}
                        onToggle={()=>toggleWorkContent(work)}
                      />:null}
                    </Article>;
                    }}
                  />
                  {!periodWorksPage.loading&&!periodWorksPage.error&&!visibleWorkRows.length?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
                </section>
              </section>:null}
            </>}
      </>:null}
      </>}
    </section>
  </FeaturePage>;
}
