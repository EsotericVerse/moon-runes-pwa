'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {
  selectScopePeriodSourceSnapshot,
  selectScopePeriodWorkIndex,
  selectScopePeriodWorkDetails,
  selectScopeCultureData
} from '../../loc/culture-query';
import {featureNavigationHref,galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state';
import CultureTimeline from '../modules/culture-timeline/CultureTimeline';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
import {analyzeRiverDensity} from '../modules/culture-timeline/river-density-analysis.mjs';
import {selectGalaxyContent} from '../../loc/galaxy-query';
import {selectRune66Classification} from '../../loc/rune66-keyword-analysis';
import {deleteRows,insertRows,dbAuthRelation,updateRows} from '../../loc/db-client.mjs';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {ContentEditor,FeaturePage,IncrementalList,WorkFullText,WorkSummaryCard} from '../ui';
import {plainTextToBlocks} from '../../loc/blocknote-content.mjs';
import CultureTimelineEditor from './CultureTimelineEditor';
import CultureStyleTagsEditor from './CultureStyleTagsEditor';
import {workDisplayHeading,workDisplayText} from '../work-display-model';
import {useOffsetPagination} from '../use-offset-pagination';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

function labelOf(item,index){
  return item?.display_label||item?.name||item?.title||item?.period||UI_COPY.format.period(index+1);
}
function sortPeriods(rows=[]){
  return [...rows].filter(item=>item?.start_date||item?.end_date).sort((a,b)=>
    String(a.start_date||a.end_date||'').localeCompare(String(b.start_date||b.end_date||''))||
    Number(a.order||0)-Number(b.order||0)
  );
}
function periodRange(rows=[],scope=''){
  const starts=rows.map(row=>row.start_date||row.end_date).filter(Boolean).sort();
  const ends=rows.map(row=>row.end_date||row.start_date).filter(Boolean).sort();
  const openEnded=rows.some(row=>Boolean(row?.open_end)||!row?.end_date);
  return {
    period:'all',title:UI_COPY.culture.allTime,display_label:UI_COPY.culture.allTime,
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
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const queryClient=useQueryClient();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
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
  const primaryPeriods=isAggregateScope?[]:allPeriods.filter(item=>String(item?.scope_id||'')===scopeId);
  const openPeriod=isAggregateScope?null:(openByScope.get(scopeId)||null);
  const allTimePeriod=useMemo(()=>periodRange(primaryPeriods,classificationScope),[primaryPeriods,classificationScope]);
  useEffect(()=>{
    if(isAggregateScope)return;
    const preferred=periodKey(openPeriod)||periodKey(primaryPeriods.at(-1))||'all';
    setSelectedPeriodKey(current=>(current==='all'||primaryPeriods.some(period=>periodKey(period)===current))?current:preferred);
  },[scopeId,isAggregateScope,openPeriod?.period,openPeriod?.start_date,primaryPeriods.length]);
  const selectedWorkPeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(primaryPeriods.find(item=>periodKey(item)===selectedPeriodKey)||openPeriod||allTimePeriod);
  const selectedWindowStart=String(selectedWorkPeriod?.start_date||'');
  const selectedWindowEnd=String(selectedWorkPeriod?.end_date||new Date().toISOString().slice(0,10));
  const requestedWindowStart=String(navigation.from||'').slice(0,10);
  const requestedWindowEnd=String(navigation.to||'').slice(0,10);
  useEffect(()=>{
    if(isAggregateScope||!requestedWindowStart||!primaryPeriods.length)return;
    const matched=primaryPeriods.find(item=>{
      const start=String(item?.start_date||'').slice(0,10);
      const end=String(item?.end_date||'9999-12-31').slice(0,10);
      return (!start||requestedWindowStart>=start)&&requestedWindowStart<=end;
    });
    if(matched)setSelectedPeriodKey(periodKey(matched));
  },[isAggregateScope,requestedWindowStart,primaryPeriods]);

  const sourceSnapshotQuery=useQuery({
    queryKey:['culture-period-source-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectScopePeriodSourceSnapshot(scopeData,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:!isAggregateScope&&Boolean(scopeData),
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
  },[styleQuery.data]);
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
        title:date+' · '+classLabel(className)+' · '+count+' 篇',
        start_date:date,
        end_date:nextRiverDay(date),
        item_count:count,
        density_ratio:count/Math.max(1,classMax.get(className)||1)
      };
    }).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))||String(a.group_label).localeCompare(String(b.group_label)));
  },[styleQuery.data]);



  const categoryGroups=sourceSnapshotQuery.data?.groups||[];
  const selectedGroup=categoryGroups.find(item=>item.category_key===selectedCategory)||null;
  const periodWorksPage=useOffsetPagination({
    key:[
      classificationScope,
      selectedWorkPeriod?.period||'all',
      selectedWorkPeriod?.start_date||'',
      selectedWorkPeriod?.end_date||'',
      selectedCategory||'all'
    ].join('|'),
    pageSize:DEFAULT_LIST_BATCH_SIZE,
    enabled:!isAggregateScope&&Boolean(scopeData)&&(!selectedCategory||Boolean(selectedGroup)),
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
      labels.set(String(group?.source_name||group?.display_label||''),String(group?.display_label||group?.source_name||'')+' '+count.toLocaleString()+' 篇 · '+ratio.toFixed(1)+'%');
    }
    return labels;
  },[locSourceGroups,locCombinedSourceTotal]);
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
        title:day+' · '+scope+' · '+count+' 項',
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
        title:locDistributionStart+' · '+scope+' · 0 項',
        start_date:locDistributionStart,
        end_date:nextRiverDay(locDistributionStart),
        item_count:0,
        density_ratio:0,
        global_density_ratio:0
      });
    }
    return rows;
  },[locScopeDistributionItems,locIntersectionScopeIds,locDistributionStart]);
  const hasTimelineSurface=isAggregateScope?Boolean(locSourceRiverItems.length):Boolean(timelineItems.length||selectedWorkPeriod?.start_date);

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
      if(!date)throw new Error('定錨點日期無效。');
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
      setEditError(error?.message||'定錨點日期調整失敗。');
      return null;
    }
  }
  async function removeTimelineRecord(item,row){
    if(!row?.recordId||!scopeData?.time)return null;
    const source=row?.raw||{};
    if(row.entryType==='anchor'){
      const anchorId=String(source?.resource_id||row.resourceId||'').trim();
      const referenced=timelineItems.some(candidate=>
        String(candidate?.entry_type||'')!=='anchor'&&
        Array.isArray(candidate?.anchor_ids)&&candidate.anchor_ids.map(String).includes(anchorId)
      );
      if(referenced){
        setEditError('此定錨點仍被時期或事件使用，請先調整引用。');
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
      setEditError(error?.message||'刪除失敗。');
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
  const riverAnalysis=useMemo(
    ()=>analyzeRiverDensity(classificationBuckets,existingAnchorDates),
    [classificationBuckets,existingAnchorDates]
  );
  const locRiverAnalysis=useMemo(
    ()=>analyzeRiverDensity(locCombinedSourceRiverItems,[]),
    [locCombinedSourceRiverItems]
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
        title:'建議定錨 '+item.date+'｜時期位置 '+(position*100).toFixed(1)+'%｜前 3 日 '+beforeCount.toLocaleString()+' 項 ('+((beforeCount/total)*100).toFixed(1)+'%)／後 3 日 '+afterCount.toLocaleString()+' 項 ('+((afterCount/total)*100).toFixed(1)+'%)｜'+(item.analysis||[]).join(' '),
        display_label:selected?'◆':'◇',
        group_label:'建議定錨',
        item_count:0,
        className:'scope-virtual-anchor'+(selected?' is-selected':''),
        style:'--virtual-anchor-strength:'+strength+';font-size:18px;',
        virtual_anchor:{...item,position_ratio:position,before_ratio:beforeCount/total,after_ratio:afterCount/total,strength_ratio:strength}
      };
    });
  },[riverAnalysis.suggestions,riverAnalysis.totalCount,selectedVirtualAnchorDates,selectedWindowStart,selectedWindowEnd]);
  const windowAnchorRecords=useMemo(()=>anchorRecords.filter(item=>{
    const date=String(item.start_date||'').slice(0,10);
    return date&&(!selectedWindowStart||date>=selectedWindowStart)&&(!selectedWindowEnd||date<=selectedWindowEnd);
  }),[anchorRecords,selectedWindowStart,selectedWindowEnd]);
  const anchorReviews=useMemo(()=>{
    const counts=new Map((riverAnalysis.density||[]).map(item=>[String(item.date),Number(item.count||0)]));
    return windowAnchorRecords.map(anchor=>{
      const date=String(anchor.start_date||'').slice(0,10);
      const origin=Date.parse(date+'T00:00:00Z');
      const countAt=offset=>counts.get(new Date(origin+offset*86400000).toISOString().slice(0,10))||0;
      const before=[-3,-2,-1].reduce((total,offset)=>total+countAt(offset),0);
      const after=[1,2,3].reduce((total,offset)=>total+countAt(offset),0);
      const references=timelineItems.filter(row=>
        ['period','event'].includes(String(row.entry_type||''))&&
        Array.isArray(row.anchor_ids)&&row.anchor_ids.map(String).includes(String(anchor.resource_id))
      );
      return {anchor,date,before,after,references,hasDensity:counts.size>0};
    });
  },[windowAnchorRecords,timelineItems,riverAnalysis.density]);
  const visibleExistingAnchors=useMemo(()=>windowAnchorRecords.map(item=>({
    ...item,
    display_label:'●',
    group_label:'既有定錨',
    group_key:'existing-anchors',
    group_order:0,
    className:'scope-existing-anchor',
    title:'既有定錨：'+String(item.display_label||item.title||'')+'｜'+String(item.start_date||'').slice(0,10)
  })),[windowAnchorRecords]);
  const classificationRiverItems=useMemo(
    ()=>[...classificationBuckets,...visibleExistingAnchors,...virtualAnchorItems],
    [classificationBuckets,visibleExistingAnchors,virtualAnchorItems]
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
      if(!account.canManageScopeSync(classificationScope))throw new Error('沒有建立此資料區域定錨點的權限。');
      const time=scopeData?.time;
      if(!time)throw new Error('Scope data 未解析');
      const now=new Date().toISOString();
      const existingDays=anchorRecords.map(item=>Date.parse(String(item.start_date||'').slice(0,10)+'T00:00:00Z')).filter(Number.isFinite);
      const safeDates=selectedVirtualAnchorDates.filter(date=>{
        const day=Date.parse(date+'T00:00:00Z');
        return Number.isFinite(day)&&!existingDays.some(existing=>Math.abs(day-existing)<=3*86400000);
      });
      if(!safeDates.length)throw new Error('所選日期附近已有正式定錨點，請優先回顧既有定錨，而不是重複新增。');
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
      setAnchorSaveMessage('已建立 '+rows.length+' 個正式定錨點；請回顧其名稱、轉折原因與關聯時期／事件。'+(rows.length<selectedVirtualAnchorDates.length?' 靠近既有定錨的日期已略過。':''));
      await query.refetch();
    }catch(error){
      setAnchorSaveMessage(error?.message||'批量建立定錨點失敗。');
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
      if(!scopeData)throw new Error('Scope data 未解析');
      const {data,error}=await dbAuthRelation(scopeData.galaxy)
        .select('uid,title,content,content_blocks,searchable')
        .eq('uid',uid)
        .limit(1);
      if(error)throw new Error(error.message||'作品內容讀取失敗');
      const row=data?.[0];
      if(!row)throw new Error('找不到這筆作品。');
      setEditDraft({
        title:String(row.title||work.title||''),
        body:String(row.content||''),
        bodyBlocks:Array.isArray(row.content_blocks)&&row.content_blocks.length
          ?row.content_blocks
          :plainTextToBlocks(String(row.content||'')),
        editorKey:uid,
        hidden:row.searchable===false
      });
    }catch(exception){
      setEditingWorkKey('');
      setEditError(String(exception?.message||exception||'無法載入編輯內容。'));
    }
  }

  async function saveEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid||!editDraft)return;
    setEditBusy(true);setEditError('');
    try{
      if(!account.canManageScopeSync(classificationScope))throw new Error('沒有修改此資料區域的權限。');
      if(!scopeData)throw new Error('Scope data 未解析');
      const content=requireGalaxyContent(editDraft.body);
      await updateRows(scopeData.galaxy,{
        title:resolveGalaxyTitle(editDraft.title,content),
        content,
        content_blocks:Array.isArray(editDraft.bodyBlocks)?editDraft.bodyBlocks:null,
        searchable:editDraft.hidden!==true,
        UpdateTime:new Date().toISOString()
      },{filters:[{column:'uid',operator:'eq',value:uid}]});
      const key=String(work?.key||('galaxy:'+uid));
      if(fullTextKey===key)setFullText(String(editDraft.body||''));
      setEditingWorkKey('');setEditDraft(null);
      periodWorksPage.reload();
    }catch(exception){
      setEditError(String(exception?.message||exception||'儲存失敗。'));
    }finally{
      setEditBusy(false);
    }
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
      if(!scopeData)throw new Error('Scope data 未解析');
      const row=await selectGalaxyContent(scopeData,uid);
      if(!row)throw new Error('找不到這筆作品。');
      setFullText(workDisplayText(row.content||''));
    }catch(exception){
      setFullTextError(String(exception?.message||exception||'全文載入失敗。'));
    }finally{
      setFullTextLoading(false);
    }
  }

  return <FeaturePage featureId="culture">
    <section className='loc-card scope-feature-card scope-feature-card-wide'>
      <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
      <h2>{UI_COPY.culture.river}</h2>
      {query.error?<p className='scope-status scope-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!hasTimelineSurface?<p className='scope-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&hasTimelineSurface?<>


            {isAggregateScope?<>

              <section className='scope-card scope-culture-classification-river scope-loc-time-river'>
                <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
                <h3>{UI_COPY.culture.intersectionRiver}</h3>
                {locScopeTotals.length?<p className='scope-status'>
                  交會時期的總文章數：{locIntersectionTotal.toLocaleString()} 篇，其中 {locScopeTotals.map(item=>item.scope+' '+Number(item.count||0).toLocaleString()+' 篇').join('、')}。
                </p>:null}
                {locScopeRiverItems.length?<CultureTimeline
                  items={locScopeRiverItems}
                  labelOf={()=>''}
                  focus={{}}
                  mode='source'
                  windowStart={requestedWindowStart||locDistributionStart}
                  windowEnd={requestedWindowEnd||locDistributionEnd}
                  fixedMin={locDistributionStart}
                  fixedMax={locDistributionEnd}
                  hiddenDates={locRiverAnalysis.hiddenDates}
                />:null}
                <p className='scope-status'>本頁面只顯示所屬人員的交會時間作品。若需以時間查詢其他人的作品列表，請前往該人員的文化功能頁面。</p>
                <div className='scope-result-links'>
                  {locIntersectionScopeIds.map(id=><a key={id} href={featureNavigationHref(id,'culture')}>scope_id: {id} · 個人時間長河</a>)}
                </div>
                {locCombinedSourceRiverItems.length?<section className='scope-culture-combined-source-river'>
                  <p className='loc-eyebrow'>{UI_COPY.culture.combinedSources}</p>
                  <h4>{UI_COPY.culture.combinedRiver}</h4>
                  <CultureTimeline
                    items={locCombinedSourceRiverItems}
                    labelOf={()=>''}
                    focus={{}}
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
                {account.canManageScopeSync(scopeId)?<div className='scope-culture-timeline-tools'>
                  <label><span>檢視時期範圍</span><select className='scope-select' value={selectedPeriodKey||periodKey(selectedWorkPeriod)} onChange={event=>setSelectedPeriodKey(event.target.value)}>
                    <option value='all'>全部時期</option>
                    {primaryPeriods.map(item=><option key={periodKey(item)} value={periodKey(item)}>{labelOf(item,0)}</option>)}
                  </select></label>
                  <button type='button' className='loc-button' onClick={()=>beginTimelineCreation('anchor',currentStructureStart)}>＋ 新增正式定錨點</button>
                  {['period','event'].map(type=><button key={type} type='button' className='loc-button' onClick={()=>beginTimelineCreation(type,'')}>
                    ＋ 新增{type==='period'?'時期':'事件'}（選擇既有定錨點）
                  </button>)}
                  <label><span>尋找既有定錨點</span><select className='scope-select' value='' onChange={event=>{
                    const anchor=anchorRecords.find(item=>item.record_id===event.target.value);
                    if(!anchor)return;
                    setSelectedTimelineRecordId(anchor.record_id);
                    setSelectedTimelineDate('');
                  }}>
                    <option value=''>選擇日期或名稱</option>
                    {anchorRecords.map(item=><option key={item.record_id} value={item.record_id}>
                      {String(item.start_date||'年份未定').slice(0,10)}｜{item.display_label||item.title||item.resource_id}
                    </option>)}
                  </select></label>
                  <span className='scope-status'>先選擇要回顧的時期範圍，再檢視既有定錨的轉折原因、作品變化及建議點。拖曳河道瀏覽全部時期；雙擊空白日期僅用來新增正式定錨點。</span>
                </div>:null}
                {timelineItems.length?<CultureTimeline
                  items={timelineItems}
                  labelOf={labelOf}
                  focus={navigation}
                  mode='overview'
                  windowStart={currentStructureStart}
                  windowEnd={currentStructureEnd}
                  onTimeClick={account.canManageScopeSync(scopeId)?date=>{
                    beginTimelineCreation('anchor',date);
                  }:null}
                  onSelect={item=>{
                    const recordId=String(item?.recordId||'').trim();
                    if(recordId){
                      setSelectedTimelineRecordId(recordId);
                      setSelectedTimelineDate('');
                    }
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
                />:<p className='scope-status'>{FEATURE_EMPTY_MESSAGE}</p>}
                {account.canManageScopeSync(scopeId)?<CultureTimelineEditor
                  scopeId={scopeId}
                  selectedRecordId={selectedTimelineRecordId}
                  suggestedAnchorDate={selectedTimelineDate}
                  suggestedRecordType={suggestedRecordType}
                  suggestedRequestNonce={suggestedRequestNonce}
                  onClose={()=>{setSelectedTimelineRecordId('');setSelectedTimelineDate('')}}
                />:null}
              </section>

              {selectedWorkPeriod?<section className='scope-card scope-culture-classification-river'>
                <div className='scope-stat-controls'>
                  {scopeId==='lo3rwang'?<label className='scope-culture-period-select'>
                    <span>表現風格</span>
                    <select className='scope-select' value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}>
                      <option value='none'>不套用</option>
                      <option value='rune66'>關鍵詞 Class</option>
                    </select>
                  </label>:null}
                </div>
                <p className='loc-eyebrow'>{UI_COPY.culture.classificationRiver}</p>
                <h3>{labelOf(selectedWorkPeriod,0)}｜作品分類河道</h3>
                <CultureStyleTagsEditor
                  period={selectedWorkPeriod}
                  anchors={anchorRecords}
                  scopeId={scopeId}
                  table={scopeData?.time}
                  canEdit={account.canManageScopeSync(scopeId)}
                  onSaved={refreshTimelineData}
                />
                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error)}</p>:null}
                {!sourceSnapshotQuery.isFetching&&!sourceSnapshotQuery.error&&!classificationBuckets.length
                  ?<p className='scope-status'>{UI_COPY.culture.noPeriodClassification}</p>:null}
                <section className='scope-culture-anchor-review' aria-label='既有定錨點持續回顧'>
                  <h4>既有定錨點｜持續檢討</h4>
                  <p className='scope-status'>先回顧範圍內的關鍵觀察點與形成原因，再對照前後作品、關聯時期／事件與系統建議。引用後的定錨點也能反覆檢視。</p>
                  {anchorReviews.length?<div className='scope-culture-anchor-review-list'>
                    {anchorReviews.map(({anchor,date,before,after,references,hasDensity})=><article key={anchor.record_id} className='scope-culture-anchor-review-item'>
                      <div>
                        <strong>{date}｜{anchor.display_label||anchor.title||'未命名定錨'}</strong>
                        <p className='scope-status'>{anchor.summary||anchor.note||'尚未記錄此處的轉折原因，可開啟既有定錨點補充。'}</p>
                        <p className='scope-status'>關聯：{references.length?references.map(item=>(item.entry_type==='period'?'時期':'事件')+'「'+(item.title||item.display_label||'未命名')+'」').join('、'):'目前尚未被時期／事件引用；仍保留作為獨立觀察點。'}</p>
                        {hasDensity?<p className='scope-status'>本範圍作品數：前 3 日 {before} 項／後 3 日 {after} 項（僅代表作品量，不取代文化判斷）。</p>:null}
                      </div>
                      {account.canManageScopeSync(scopeId)?<button type='button' className='loc-button' onClick={()=>{
                        setSelectedTimelineRecordId(anchor.record_id);
                        setSelectedTimelineDate('');
                      }}>回顧／編輯定錨</button>:null}
                    </article>)}
                  </div>:<p className='scope-status'>本範圍內沒有既有定錨點。可檢視其他時期或比較建議，不需要為了填滿河道而新增。</p>}
                </section>
                <div className='scope-culture-anchor-actions'>
                  <span>既有定錨 {anchorReviews.length} 個／候選建議 {riverAnalysis.suggestions.length} 個 · 已選候選 {selectedVirtualAnchorDates.length} 個。建議用來查核是否遺漏重要轉折，不要求全部建立。</span>
                  {riverAnalysis.suggestions.length?<details className='scope-culture-anchor-picker' open>
                    <summary>比對可能遺漏的轉折（僅為建議，不會自動建立）</summary>
                    <div className='scope-culture-anchor-choices'>
                      {riverAnalysis.suggestions.map(item=><label key={item.date} title={(item.analysis||[]).join(' ')}>
                        <input type='checkbox' checked={selectedVirtualAnchorDates.includes(item.date)} disabled={anchorSaveBusy} onChange={()=>toggleVirtualAnchor(item.date)}/>
                        <span>{item.date}｜前 3 日 {Number(item.beforeCount||0).toLocaleString()} 項／後 3 日 {Number(item.afterCount||0).toLocaleString()} 項｜{(item.analysis||[]).join(' ')}</span>
                      </label>)}
                    </div>
                  </details>:<span className='scope-status'>目前沒有可建議的定錨日期。</span>}
                  <div className='scope-preview-links'>
                    <button type='button' className='loc-button' disabled={anchorSaveBusy||!riverAnalysis.suggestions.length} onClick={()=>setSelectedVirtualAnchorDates(riverAnalysis.suggestions.map(item=>item.date))}>全選待審候選</button>
                    <button type='button' className='loc-button' disabled={anchorSaveBusy||!selectedVirtualAnchorDates.length} onClick={()=>setSelectedVirtualAnchorDates([])}>清除選取</button>
                    <button type='button' className='loc-button primary' disabled={anchorSaveBusy||!selectedVirtualAnchorDates.length||!account.canManageScopeSync(classificationScope)} onClick={saveSelectedVirtualAnchors}>
                      {anchorSaveBusy?UI_COPY.culture.creating:'審核後建立 '+selectedVirtualAnchorDates.length+' 個正式定錨點'}
                    </button>
                  </div>
                  {!account.canManageScopeSync(classificationScope)?<span className='scope-status'>登入管理權限後才能建立正式定錨點。</span>:null}
                  {anchorSaveMessage?<span role='status'>{anchorSaveMessage}</span>:null}
                </div>
                {classificationRiverItems.length?<CultureTimeline
                  items={classificationRiverItems}
                  labelOf={item=>item?.entry_type==='virtual_anchor'?(item.display_label||'◇'):item?.entry_type==='anchor'?'●':''}
                  focus={{}}
                  mode='source'
                  windowStart={selectedWindowStart}
                  windowEnd={selectedWindowEnd}
                  hiddenDates={riverAnalysis.hiddenDates}
                  onSelect={item=>{
                    if(item?.entryType==='virtual_anchor'){
                      toggleVirtualAnchor(String(item?.start||'').slice(0,10));
                      return;
                    }
                    if(item?.entryType==='anchor'&&item.recordId){
                      if(account.canManageScopeSync(scopeId)){
                        setSelectedTimelineRecordId(item.recordId);
                        setSelectedTimelineDate('');
                      }
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
                  {styleQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(styleQuery.error)}</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&!styleQuery.data?.staticstime?<p className='scope-status'>關鍵詞尚未定錨；請登入 Statistics 的「關鍵詞設定」重新分析文章。</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.staticstime&&!styleQuery.data?.statisticsEnabled?<p className='scope-status'>目前有效文章 {Number(styleQuery.data?.keywordDocumentCount||0).toLocaleString()} 篇；必須大於 {Number(styleQuery.data?.keywordMinDocuments||0).toLocaleString()} 篇才啟用關鍵詞統計。</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.statisticsEnabled&&styleClassRows.length?<div className='scope-ranking'>
                    {styleClassRows.map(row=><div key={row.group}><strong>{row.class_label}</strong><span>{Number(row.document_count||0).toLocaleString()} 篇 · {Number(row.ratio||0).toFixed(1)}%</span></div>)}
                  </div>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.statisticsEnabled&&styleClassRiverItems.length?<CultureTimeline
                    items={styleClassRiverItems}
                    labelOf={()=>''}
                    focus={{}}
                    mode='source'
                    windowStart={selectedWindowStart}
                    windowEnd={selectedWindowEnd}
                  />:null}
                </section>:null}
                <p className='scope-status'>該時期總作品數：{Number(sourceSnapshotQuery.data?.totalCount||0).toLocaleString()} 項。</p>

                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error)}</p>:null}
                {!sourceSnapshotQuery.isFetching&&!sourceSnapshotQuery.error&&!categoryGroups.length?<p className='scope-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
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
                    <span>{Number(group.item_count||0).toLocaleString()} 項 · {group.first_date||'—'} → {group.last_date||'—'}</span>
                  </button>}
                />:null}

                <section className='scope-culture-source-detail' aria-label={(selectedGroup?.display_label||UI_COPY.culture.allWorks)+'列表'}>
                  <header>
                    <h4>{selectedGroup?.display_label||UI_COPY.culture.allWorks} · {selectedCount.toLocaleString()} 項作品</h4>
                    {selectedGroup?<button type='button' className='scope-pagination-button' onClick={()=>setSelectedCategory('')}>{UI_COPY.culture.showAllWorks}</button>:null}
                  </header>
                  {periodWorksPage.error?<p className='scope-status scope-error'>{featureDataErrorMessage(periodWorksPage.error)}</p>:null}
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
                      const canEditWork=Boolean(work.uid&&account.canManageScopeSync(classificationScope));
                      const workKey=String(work.key||('galaxy:'+work.uid));
                      return <WorkSummaryCard
                      key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                      title={workDisplayHeading(work,{media:false,limit:80})}
                      source={work.source_name||work.group_label||''}
                      scopeId={work.scope_id||classificationScope}
                      date={work.display_date||formatCultureDateTime(work.createtime||work.created_at)}
                      body={work.description||work.media_metadata_text||''}
                      relationLinks={galaxyRelationLinks(classificationScope,work)}
                      links={work.links||[]}
                      className={canEditWork&&editingWorkKey!==workKey?'is-editable-idle':''}
                      onClick={canEditWork&&editingWorkKey!==workKey?event=>{if(!isInteractiveTarget(event.target))startEditingWork(work)}:null}
                    >
                      {work.uid?<WorkFullText
                        open={fullTextKey===work.key}
                        loading={fullTextLoading&&fullTextKey===work.key}
                        error={fullTextKey===work.key?fullTextError:''}
                        content={fullTextKey===work.key?fullText:''}
                        onToggle={()=>toggleWorkContent(work)}
                      />:null}
                      {editingWorkKey===workKey&&editDraft?<ContentEditor
                        draft={editDraft}
                        setDraft={setEditDraft}
                        busy={editBusy}
                        error={editError}
                        showVisibility
                        onSave={()=>saveEditingWork(work)}
                        onCancel={()=>{setEditingWorkKey('');setEditDraft(null);setEditError('')}}
                      />:null}
                    </WorkSummaryCard>;
                    }}
                  />
                  {!periodWorksPage.loading&&!periodWorksPage.error&&!visibleWorkRows.length?<p className='scope-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                </section>
              </section>:null}
            </>}
      </>:null}
    </section>
  </FeaturePage>;
}
