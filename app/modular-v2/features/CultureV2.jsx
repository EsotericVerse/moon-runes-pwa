'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  selectScopePeriodSourceSnapshot,
  selectScopePeriodWorkIndex,
  selectScopePeriodWorkDetails,
  selectScopeCultureData
} from '../../loc/neon-culture-client';
import {galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
import {analyzeRiverDensity} from '../modules/culture-timeline/river-density-analysis.mjs';
import {selectGalaxyContent} from '../../loc/aggregate-query';
import {neonAuthClient} from '../../loc/neon-client';
import {useNeonAccount} from '../../loc/use-neon-account';
import {resolveScopeTables} from '../../loc/scope-table-mapping';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';
import WorkSummaryCardV2 from '../WorkSummaryCardV2';
import WorkFullTextV2 from '../WorkFullTextV2';
import {workDisplayHeading,workDisplayText} from '../work-display-model.v2';
import IncrementalListV2 from '../IncrementalListV2';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';
import ContentEditorV2 from '../ContentEditorV2';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';

function labelOf(item,index){
  return item?.display_label||item?.name||item?.title||item?.period||'時期 '+(index+1);
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
    period:'all',title:'全部時間',display_label:'全部時間',
    start_date:starts[0]||'',end_date:openEnded?null:(ends.at(-1)||null),scope_id:scope
  };
}
function periodKey(item){
  return String(item?.period||item?.era_id||item?.id||'').trim();
}
function nextRiverDay(value){
  const key=String(value||'').slice(0,10);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return '';
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}
export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
    staleTime:5*60_000
  });

  const [selectedPeriodKey,setSelectedPeriodKey]=useState('');
  const [selectedCategory,setSelectedCategory]=useState('');
  const [selectedVirtualAnchorDates,setSelectedVirtualAnchorDates]=useState([]);
  const [anchorSaveBusy,setAnchorSaveBusy]=useState(false);
  const [anchorSaveMessage,setAnchorSaveMessage]=useState('');
  const workScrollRef=useRef(null);
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const [fullTextError,setFullTextError]=useState('');
  const [editingWorkKey,setEditingWorkKey]=useState('');
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');

  const openRows=useMemo(()=>(query.data?.openRanges||[])
    .filter(item=>scopeId==='loc'||String(item?.scope_id||'')===scopeId),[scopeId,query.data]);
  const openByScope=useMemo(()=>new Map(openRows.map(item=>[String(item.scope_id||''),item])),[openRows]);

  const allPeriods=useMemo(()=>sortPeriods(query.data?.eras?.eras||[]),[query.data]);
  const isLoc=scopeId==='loc';
  const classificationScope=scopeId;
  const primaryPeriods=isLoc?[]:allPeriods.filter(item=>String(item?.scope_id||'')===scopeId);
  const openPeriod=isLoc?null:(openByScope.get(scopeId)||null);
  const allTimePeriod=useMemo(()=>periodRange(primaryPeriods,classificationScope),[primaryPeriods,classificationScope]);
  useEffect(()=>{
    if(isLoc)return;
    const preferred=periodKey(openPeriod)||periodKey(primaryPeriods.at(-1))||'all';
    setSelectedPeriodKey(preferred);
  },[scopeId,isLoc,openPeriod?.period,openPeriod?.start_date,primaryPeriods.length]);
  const selectedWorkPeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(primaryPeriods.find(item=>periodKey(item)===selectedPeriodKey)||openPeriod||allTimePeriod);
  const selectedWindowStart=String(selectedWorkPeriod?.start_date||'');
  const selectedWindowEnd=String(selectedWorkPeriod?.end_date||new Date().toISOString().slice(0,10));
  const requestedWindowStart=String(navigation.from||'').slice(0,10);
  const requestedWindowEnd=String(navigation.to||'').slice(0,10);
  useEffect(()=>{
    if(isLoc||!requestedWindowStart||!primaryPeriods.length)return;
    const matched=primaryPeriods.find(item=>{
      const start=String(item?.start_date||'').slice(0,10);
      const end=String(item?.end_date||'9999-12-31').slice(0,10);
      return (!start||requestedWindowStart>=start)&&requestedWindowStart<=end;
    });
    if(matched)setSelectedPeriodKey(periodKey(matched));
  },[isLoc,requestedWindowStart,primaryPeriods]);

  const sourceSnapshotQuery=useQuery({
    queryKey:['culture-period-source-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectScopePeriodSourceSnapshot(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:!isLoc,
    staleTime:5*60_000
  });



  const classificationBucketsQuery=sourceSnapshotQuery;
  const categoryGroups=sourceSnapshotQuery.data?.groups||[];
  const categoryQuery=sourceSnapshotQuery;
  const selectedGroup=categoryGroups.find(item=>item.category_key===selectedCategory)||null;
  const periodWorkIndexQuery=useQuery({
    queryKey:['culture-period-work-count',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,selectedCategory,selectedGroup?.source_name||'all'],
    queryFn:()=>selectScopePeriodWorkIndex(classificationScope,{
      startDate:selectedWorkPeriod?.start_date||'',
      endDate:selectedWorkPeriod?.end_date,
      sourceName:selectedGroup?.source_name||'',
      sourceNames:selectedGroup?.source_names||[],
      mediaTypes:selectedGroup?.media_types||[],
      limit:1,
      offset:0
    }),
    enabled:!isLoc&&(!selectedCategory||Boolean(selectedGroup)),
    staleTime:5*60_000
  });
  const periodWorksPage=useOffsetPagination({
    key:[
      classificationScope,
      selectedWorkPeriod?.period||'all',
      selectedWorkPeriod?.start_date||'',
      selectedWorkPeriod?.end_date||'',
      selectedCategory||'all',
      Number(periodWorkIndexQuery.data?.totalCount)||0
    ].join('|'),
    pageSize:DEFAULT_LIST_BATCH_SIZE,
    enabled:!isLoc&&!periodWorkIndexQuery.isPending&&!periodWorkIndexQuery.error&&(!selectedCategory||Boolean(selectedGroup)),
    loadPage:async(cursor,limit)=>{
      const indexPage=await selectScopePeriodWorkIndex(classificationScope,{
        startDate:selectedWorkPeriod?.start_date||'',
        endDate:selectedWorkPeriod?.end_date,
        sourceName:selectedGroup?.source_name||'',
        sourceNames:selectedGroup?.source_names||[],
        mediaTypes:selectedGroup?.media_types||[],
        limit,
        cursor:cursor&&typeof cursor==='object'?cursor:null
      });
      const items=indexPage.rows||[];
      const details=await selectScopePeriodWorkDetails(classificationScope,{items});
      return {
        rows:details.rows||[],
        hasMore:Number(indexPage.nextCursor?.galaxyOffset||0)+Number(indexPage.nextCursor?.mediaOffset||0)<Number(indexPage.totalCount||0),
        nextCursor:indexPage.nextCursor
      };
    },
    getRowKey:row=>String(row?.key||row?.uid||row?.entry_id||'')
  });
  const selectedCount=Number(periodWorkIndexQuery.data?.totalCount)||Number(selectedGroup?.item_count)||0;
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
    (query.data?.timelineItems||[]).filter(item=>scopeId==='loc'||item.scope_id===scopeId)
  ,[query.data,scopeId]);
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
  const hasTimelineSurface=isLoc?Boolean(locSourceRiverItems.length):Boolean(timelineItems.length||selectedWorkPeriod?.start_date);

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
      const {time}=await resolveScopeTables(classificationScope,{email:account.email});
      const [schema,table]=String(time).split('.');
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
      const {error}=await neonAuthClient.schema(schema).from(table).insert(rows);
      if(error)throw new Error(error.message||'批量建立定錨點失敗');
      setSelectedVirtualAnchorDates([]);
      setAnchorSaveMessage('已一次建立 '+rows.length+' 個正式定錨點。');
      await query.refetch();
    }catch(error){
      setAnchorSaveMessage(error?.message||'批量建立定錨點失敗。');
    }finally{
      setAnchorSaveBusy(false);
    }
  }

  async function galaxyTable(){
    return (await resolveScopeTables(classificationScope)).galaxy.split('.').at(-1);
  }

  async function startEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    const key=String(work?.key||('galaxy:'+uid));
    setEditingWorkKey(key);setEditDraft(null);setEditError('');
    try{
      const {data,error}=await neonAuthClient.schema('silver').from(await galaxyTable())
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
      const content=requireGalaxyContent(editDraft.body);
      const {error}=await neonAuthClient.schema('silver').from(await galaxyTable())
        .update({
          title:resolveGalaxyTitle(editDraft.title,content),
          content,
          searchable:editDraft.hidden!==true
        })
        .eq('uid',uid);
      if(error)throw new Error(error.message||'作品儲存失敗');
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
      const row=await selectGalaxyContent(classificationScope,uid);
      if(!row)throw new Error('找不到這筆作品。');
      setFullText(workDisplayText(row.content||''));
    }catch(exception){
      setFullTextError(String(exception?.message||exception||'全文載入失敗。'));
    }finally{
      setFullTextLoading(false);
    }
  }

  return <FeaturePageV2 featureId="culture">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>時間分布</p>
      <h2>時間長河</h2>
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!hasTimelineSurface?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&hasTimelineSurface?<>


            {isLoc?<>

              <section className='scope-v2-card scope-v2-culture-classification-river scope-v2-loc-time-river'>
                <p className='loc-eyebrow'>時間分布</p>
                <h3>交會時間長河</h3>
                {locScopeTotals.length?<p className='scope-v2-status'>
                  交會時期的總文章數：{locIntersectionTotal.toLocaleString()} 篇，其中 {locScopeTotals.map(item=>item.scope+' '+Number(item.count||0).toLocaleString()+' 篇').join('、')}。
                </p>:null}
                {locScopeRiverItems.length?<CultureTimelineV2
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
                {locCombinedSourceRiverItems.length?<section className='scope-v2-culture-combined-source-river'>
                  <p className='loc-eyebrow'>Combined Sources</p>
                  <h4>綜合來源時間長河</h4>
                  <CultureTimelineV2
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
              <section className='scope-v2-card scope-v2-culture-structure-river'>
                <p className='loc-eyebrow'>時間分布</p>
                <h3>時期・事件・定錨點</h3>
                {timelineItems.length?<CultureTimelineV2
                  items={timelineItems}
                  labelOf={item=>item.display_label||item.title}
                  focus={navigation}
                  mode='overview'
                />:<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>}
              </section>

              {selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-classification-river'>
                <div className='scope-v2-stat-controls'>
                  <label className='scope-v2-culture-period-select'>
                    <span>時期</span>
                    <select className='scope-v2-select' value={selectedPeriodKey||periodKey(selectedWorkPeriod)} onChange={event=>setSelectedPeriodKey(event.target.value)}>
                      {primaryPeriods.map(item=><option key={periodKey(item)} value={periodKey(item)}>{labelOf(item,0)}</option>)}
                    </select>
                  </label>
                </div>
                <p className='loc-eyebrow'>Classification River</p>
                <h3>{labelOf(selectedWorkPeriod,0)}｜作品分類河道</h3>
                {classificationBucketsQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(classificationBucketsQuery.error)}</p>:null}
                {!classificationBucketsQuery.isFetching&&!classificationBucketsQuery.error&&!classificationBuckets.length
                  ?<p className='scope-v2-status'>目前沒有此時期的作品分類資料。</p>:null}
                {classificationRiverItems.length?<CultureTimelineV2
                  items={classificationRiverItems}
                  labelOf={()=>''}
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
                {riverAnalysis.suggestions.length?<section className='scope-v2-status scope-v2-culture-anchor-suggestions'>
                  <strong>虛擬定錨點</strong>
                  <p>點時間長河上的 ◇ 或下方日期可查看並選取切點；虛擬點不會寫入資料庫。</p>
                  {riverAnalysis.suggestions.map(item=><article key={item.date}>
                    <button type='button' onClick={()=>toggleVirtualAnchor(item.date)} aria-pressed={selectedVirtualAnchorDates.includes(item.date)}>
                      {selectedVirtualAnchorDates.includes(item.date)?'已選取｜':''}{item.date}
                    </button>
                    <p>切點前 3 日 {Number(item.beforeCount||0).toLocaleString()} 項｜後 3 日 {Number(item.afterCount||0).toLocaleString()} 項</p>
                    <ul>
                      {(item.analysis||[]).map((line,index)=><li key={item.date+':'+index}>{line}</li>)}
                    </ul>
                  </article>)}
                  {account.canManageScopeSync(classificationScope)&&selectedVirtualAnchorDates.length?<div className='scope-v2-tabs'>
                    <button type='button' disabled={anchorSaveBusy} onClick={saveSelectedVirtualAnchors}>
                      {anchorSaveBusy?'建立中…':'一次建立 '+selectedVirtualAnchorDates.length+' 個定錨點'}
                    </button>
                  </div>:null}
                  {anchorSaveMessage?<p role='status'>{anchorSaveMessage}</p>:null}
                </section>:null}

                <p className='scope-v2-status'>該時期總作品數：{Number(sourceSnapshotQuery.data?.totalCount||0).toLocaleString()} 項。</p>

                {categoryQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(categoryQuery.error)}</p>:null}
                {!categoryQuery.isFetching&&!categoryQuery.error&&!categoryGroups.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                {categoryGroups.length?<IncrementalListV2
                  items={categoryGroups}
                  batchSize={DEFAULT_LIST_BATCH_SIZE}
                  resetKey={'source|'+String(selectedWorkPeriod?.period||'')}
                  className='scope-v2-culture-source-groups'
                  renderItem={group=><button type='button' key={group.category_key}
                    className='scope-v2-culture-source-button'
                    aria-pressed={selectedCategory===group.category_key}
                    onClick={()=>{setSelectedCategory(selectedCategory===group.category_key?'':group.category_key);}}>
                    <strong>{group.display_label}</strong>
                    <span>{Number(group.item_count||0).toLocaleString()} 項 · {group.first_date||'—'} → {group.last_date||'—'}</span>
                  </button>}
                />:null}

                <section className='scope-v2-culture-source-detail' aria-label={(selectedGroup?.display_label||'全部作品')+'列表'}>
                  <header>
                    <h4>{selectedGroup?.display_label||'全部作品'} · {selectedCount.toLocaleString()} 項作品</h4>
                    {selectedGroup?<button type='button' className='scope-v2-pagination-button' onClick={()=>setSelectedCategory('')}>顯示全部作品</button>:null}
                  </header>
                  {periodWorkIndexQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorkIndexQuery.error)}</p>:null}
                  {periodWorksPage.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksPage.error)}</p>:null}
                  <IncrementalListV2
                    items={visibleWorkRows}
                    batchSize={DEFAULT_LIST_BATCH_SIZE}
                    resetKey={selectedCategory+'|source'}
                    className='scope-v2-culture-source-work-scroll'
                    externalHasMore={periodWorksPage.hasMore}
                    loading={periodWorkIndexQuery.isFetching||periodWorksPage.loading}
                    error={periodWorkIndexQuery.error||periodWorksPage.error}
                    onLoadMore={periodWorksPage.loadNext}
                    scrollRootRef={workScrollRef}
                    renderItem={(work,index)=><WorkSummaryCardV2
                      key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                      title={workDisplayHeading(work,{media:false,limit:80})}
                      source={work.source_name||work.group_label||''}
                      scopeId={work.scope_id||classificationScope}
                      date={work.display_date||formatCultureDateTime(work.createtime||work.created_at)}
                      body={work.description||work.media_metadata_text||''}
                      relationLinks={galaxyRelationLinks(classificationScope,work)}
                      links={work.links||[]}
                    >
                      {work.uid?<WorkFullTextV2
                        open={fullTextKey===work.key}
                        loading={fullTextLoading&&fullTextKey===work.key}
                        error={fullTextKey===work.key?fullTextError:''}
                        content={fullTextKey===work.key?fullText:''}
                        onToggle={()=>toggleWorkContent(work)}
                      />:null}
                      {work.uid&&account.canManageScopeSync(classificationScope)?<p><button type="button" onClick={()=>startEditingWork(work)}>{editingWorkKey===String(work.key||('galaxy:'+work.uid))?'編輯中':'編輯'}</button></p>:null}
                      {editingWorkKey===String(work.key||('galaxy:'+work.uid))&&editDraft?<ContentEditorV2
                        draft={editDraft}
                        setDraft={setEditDraft}
                        busy={editBusy}
                        error={editError}
                        showVisibility
                        onSave={()=>saveEditingWork(work)}
                        onCancel={()=>{setEditingWorkKey('');setEditDraft(null);setEditError('')}}
                      />:null}
                    </WorkSummaryCardV2>}
                  />
                  {!periodWorkIndexQuery.isFetching&&!periodWorksPage.loading&&!periodWorkIndexQuery.error&&!periodWorksPage.error&&!visibleWorkRows.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                </section>
              </section>:null}
            </>}
      </>:null}
    </section>
  </FeaturePageV2>;
}
