'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
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
import {insertRows,dbAuthRelation,updateRows} from '../../loc/db-client.mjs';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {ContentEditor,FeaturePage,IncrementalList,WorkFullText,WorkSummaryCard} from '../ui';
import CultureTimelineEditor from './CultureTimelineEditor';
import {workDisplayHeading,workDisplayText} from '../work-display-model';
import {useOffsetPagination} from '../use-offset-pagination';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';

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
export default function Culture(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
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
    setSelectedPeriodKey(preferred);
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
  const currentStructurePeriod=openPeriod||primaryPeriods.find(item=>String(item?.status||'').toLowerCase()==='current')||primaryPeriods.at(-1)||null;
  const currentStructureStart=String(currentStructurePeriod?.start_date||'').slice(0,10);
  const currentStructureEnd=String(currentStructurePeriod?.end_date||new Date().toISOString().slice(0,10)).slice(0,10);
  const currentTimelineItems=useMemo(()=>{
    if(isAggregateScope||!currentStructurePeriod)return [];
    const currentKey=periodKey(currentStructurePeriod);
    return timelineItems.filter(item=>{
      if(String(item?.entry_type||'')==='period')return periodKey(item)===currentKey;
      const start=String(item?.start_date||item?.date||'').slice(0,10);
      const end=String(item?.end_date||start||'').slice(0,10);
      if(!start&&!end)return false;
      return (!currentStructureStart||end>=currentStructureStart)
        &&(!currentStructureEnd||start<=currentStructureEnd);
    });
  },[isAggregateScope,timelineItems,currentStructurePeriod?.period,currentStructurePeriod?.start_date,currentStructurePeriod?.end_date,currentStructureStart,currentStructureEnd]);
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
  const virtualAnchorItems=useMemo(()=>riverAnalysis.suggestions.map(item=>({
    id:'virtual-anchor:'+item.date,
    entry_id:'virtual-anchor:'+item.date,
    entry_type:'virtual_anchor',
    start_date:item.date,
    title:'建議定錨 '+item.date+'｜前 3 日 '+Number(item.beforeCount||0).toLocaleString()+' 項／後 3 日 '+Number(item.afterCount||0).toLocaleString()+' 項',
    display_label:'◇',
    group_label:'建議定錨',
    item_count:0,
    virtual_anchor:item
  })),[riverAnalysis.suggestions]);
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
      if(!account.canManageScopeSync(classificationScope))throw new Error('沒有建立此資料區域定錨點的權限。');
      const time=scopeData?.time;
      if(!time)throw new Error('Scope data 未解析');
      const now=new Date().toISOString();
      const rows=selectedVirtualAnchorDates.map(date=>({
        record_type:'anchor',
        label:date,
        resource_id:'anchor:'+globalThis.crypto.randomUUID(),
        note:'由時間長河建議定錨批量建立。',
        status:null,
        display_order:null,
        visibility:null,
        time_date:date,
        anchor_pair:null,
        date_status:'exact',
        year_value:null,
        updated_at:now
      }));
      await insertRows(time,rows);
      setSelectedVirtualAnchorDates([]);
      setAnchorSaveMessage('已一次建立 '+rows.length+' 個正式定錨點。');
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
        .select('uid,title,content,searchable')
        .eq('uid',uid)
        .limit(1);
      if(error)throw new Error(error.message||'作品內容讀取失敗');
      const row=data?.[0];
      if(!row)throw new Error('找不到這筆作品。');
      setEditDraft({
        title:String(row.title||work.title||''),
        body:String(row.content||''),
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
                <p className='scope-status'>LOC 文化頁顯示 Scope Group 的時間分布與交會；需要查詢個別文章列表，請前往各 Scope／作者自己的時間長河。</p>
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
                {timelineItems.length?<CultureTimeline
                  items={timelineItems}
                  labelOf={item=>item.display_label||item.title}
                  focus={navigation}
                  mode='overview'
                  windowStart={currentStructureStart}
                  windowEnd={currentStructureEnd}
                  onSelect={item=>{
                    const recordId=String(item?.record_id||item?.recordId||'').trim();
                    if(recordId){
                      setSelectedTimelineRecordId(recordId);
                      setSelectedTimelineDate('');
                    }
                  }}
                  onTimeClick={account.canManageScopeSync(scopeId)?date=>{
                    setSelectedTimelineRecordId('');
                    setSelectedTimelineDate(date);
                  }:null}
                />:<p className='scope-status'>{FEATURE_EMPTY_MESSAGE}</p>}
                {account.canManageScopeSync(scopeId)?<CultureTimelineEditor
                  scopeId={scopeId}
                  selectedRecordId={selectedTimelineRecordId}
                  suggestedAnchorDate={selectedTimelineDate}
                />:null}
              </section>

              {selectedWorkPeriod?<section className='scope-card scope-culture-classification-river'>
                <div className='scope-stat-controls'>
                  <label className='scope-culture-period-select'>
                    <span>{UI_COPY.culture.period}</span>
                    <select className='scope-select' value={selectedPeriodKey||periodKey(selectedWorkPeriod)} onChange={event=>setSelectedPeriodKey(event.target.value)}>
                      {primaryPeriods.map(item=><option key={periodKey(item)} value={periodKey(item)}>{labelOf(item,0)}</option>)}
                    </select>
                  </label>
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
                {String(selectedWorkPeriod?.style_tags||'').trim()?<div className='scope-style-tags' aria-label='風格標籤'>
                  {String(selectedWorkPeriod.style_tags).split(/[,，]/).map(item=>item.trim()).filter(Boolean).map(tag=><span key={tag}>{tag}</span>)}
                </div>:null}
                {sourceSnapshotQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceSnapshotQuery.error)}</p>:null}
                {!sourceSnapshotQuery.isFetching&&!sourceSnapshotQuery.error&&!classificationBuckets.length
                  ?<p className='scope-status'>{UI_COPY.culture.noPeriodClassification}</p>:null}
                {classificationRiverItems.length?<CultureTimeline
                  items={classificationRiverItems}
                  labelOf={item=>item?.entry_type==='virtual_anchor'?'◇':''}
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
                  {!styleQuery.isPending&&!styleQuery.error&&!styleQuery.data?.staticstime?<p className='scope-status'>關鍵詞尚未定錨；請先到 Scope 管理的關鍵詞庫重新分析文章。</p>:null}
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
                {riverAnalysis.suggestions.length?<section className='scope-status scope-culture-anchor-suggestions'>
                  <strong>{UI_COPY.culture.virtualAnchor}</strong>
                  <p>{UI_COPY.culture.virtualAnchorHelp}</p>
                  {riverAnalysis.suggestions.map(item=><article key={item.date}>
                    <button type='button' onClick={()=>toggleVirtualAnchor(item.date)} aria-pressed={selectedVirtualAnchorDates.includes(item.date)}>
                      {selectedVirtualAnchorDates.includes(item.date)?UI_COPY.culture.selectedPrefix:''}{item.date}
                    </button>
                    <p>切點前 3 日 {Number(item.beforeCount||0).toLocaleString()} 項｜後 3 日 {Number(item.afterCount||0).toLocaleString()} 項</p>
                    <ul>
                      {(item.analysis||[]).map((line,index)=><li key={item.date+':'+index}>{line}</li>)}
                    </ul>
                  </article>)}
                  {account.canManageScopeSync(classificationScope)&&selectedVirtualAnchorDates.length?<div className='scope-tabs'>
                    <button type='button' disabled={anchorSaveBusy} onClick={saveSelectedVirtualAnchors}>
                      {anchorSaveBusy?UI_COPY.culture.creating:'一次建立 '+selectedVirtualAnchorDates.length+' 個定錨點'}
                    </button>
                  </div>:null}
                  {anchorSaveMessage?<p role='status'>{anchorSaveMessage}</p>:null}
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
                    renderItem={(work,index)=><WorkSummaryCard
                      key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                      title={workDisplayHeading(work,{media:false,limit:80})}
                      source={work.source_name||work.group_label||''}
                      scopeId={work.scope_id||classificationScope}
                      date={work.display_date||formatCultureDateTime(work.createtime||work.created_at)}
                      body={work.description||work.media_metadata_text||''}
                      relationLinks={galaxyRelationLinks(classificationScope,work)}
                      links={work.links||[]}
                    >
                      {work.uid?<WorkFullText
                        open={fullTextKey===work.key}
                        loading={fullTextLoading&&fullTextKey===work.key}
                        error={fullTextKey===work.key?fullTextError:''}
                        content={fullTextKey===work.key?fullText:''}
                        onToggle={()=>toggleWorkContent(work)}
                      />:null}
                      {work.uid&&account.canManageScopeSync(classificationScope)?<p><button type="button" onClick={()=>startEditingWork(work)}>{editingWorkKey===String(work.key||('galaxy:'+work.uid))?UI_COPY.culture.editing:'編輯'}</button></p>:null}
                      {editingWorkKey===String(work.key||('galaxy:'+work.uid))&&editDraft?<ContentEditor
                        draft={editDraft}
                        setDraft={setEditDraft}
                        busy={editBusy}
                        error={editError}
                        showVisibility
                        onSave={()=>saveEditingWork(work)}
                        onCancel={()=>{setEditingWorkKey('');setEditDraft(null);setEditError('')}}
                      />:null}
                    </WorkSummaryCard>}
                  />
                  {!periodWorksPage.loading&&!periodWorksPage.error&&!visibleWorkRows.length?<p className='scope-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                </section>
              </section>:null}
            </>}
      </>:null}
    </section>
  </FeaturePage>;
}
