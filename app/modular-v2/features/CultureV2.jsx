'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  selectScopePeriodSourceSnapshot,
  selectScopePeriodWorks,
  selectScopeCultureData,
  selectScopeWorkSnapshot,
  selectScopeMediaSnapshot,
  selectScopeMediaWorks
} from '../../loc/neon-culture-client';
import {galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
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
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';
import ContentEditorV2 from '../ContentEditorV2';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';

const CULTURE_WORK_PAGE_SIZE=DEFAULT_LIST_BATCH_SIZE;

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
  if(!rows.length)return null;
  const starts=rows.map(row=>row.start_date||row.end_date).filter(Boolean).sort();
  const ends=rows.map(row=>row.end_date||row.start_date).filter(Boolean).sort();
  if(!starts.length)return null;
  return {
    period:'全部時期',title:'全部時期',display_label:'全部時期',
    start_date:starts[0],end_date:ends.at(-1)||null,scope_id:scope
  };
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

  const [timelineMode,setTimelineMode]=useState('works');
  const [classificationMode,setClassificationMode]=useState('source');
  const [selectedCategory,setSelectedCategory]=useState('');
  const [workPage,setWorkPage]=useState(0);
  const [workRows,setWorkRows]=useState([]);
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
  const selectedWorkPeriod=openPeriod||periodRange(primaryPeriods,classificationScope);

  const periodWorkTimelineQuery=useQuery({
    queryKey:['culture-period-work-timeline',scopeId,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectScopeWorkSnapshot(scopeId,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:!isLoc&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });

  const sourceSnapshotQuery=useQuery({
    queryKey:['culture-period-source-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectScopePeriodSourceSnapshot(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:!isLoc&&Boolean(selectedWorkPeriod?.start_date)&&classificationMode==='source',
    staleTime:5*60_000
  });



  const mediaSnapshotQuery=useQuery({
    queryKey:['culture-period-media-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectScopeMediaSnapshot(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date,
    }),
    enabled:!isLoc&&classificationMode==='media'&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });


  const classificationBucketsQuery=classificationMode==='source'?sourceSnapshotQuery:mediaSnapshotQuery;
  const categoryGroups=classificationMode==='source'
    ?(sourceSnapshotQuery.data?.groups||[])
    :(mediaSnapshotQuery.data?.groups||[]);
  const categoryQuery=classificationMode==='source'?sourceSnapshotQuery:mediaSnapshotQuery;
  const selectedGroup=categoryGroups.find(item=>item.category_key===selectedCategory)||null;
  const selectedCount=Number(selectedGroup?.item_count)||0;
  const periodWorksQuery=useQuery({
    queryKey:['culture-period-works',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,classificationMode,selectedCategory,workPage],
    queryFn:()=>classificationMode==='source'
      ?selectScopePeriodWorks(classificationScope,{
        startDate:selectedWorkPeriod?.start_date,
        endDate:selectedWorkPeriod?.end_date,
        sourceName:selectedGroup?.source_name,
        limit:CULTURE_WORK_PAGE_SIZE,
        pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
      })
      :selectScopeMediaWorks(classificationScope,{
          startDate:selectedWorkPeriod?.start_date,
          endDate:selectedWorkPeriod?.end_date,
          mediaName:selectedGroup?.media_name,
          limit:CULTURE_WORK_PAGE_SIZE,
          pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
        }),
    enabled:!isLoc&&Boolean(selectedWorkPeriod?.start_date&&selectedGroup),
    staleTime:5*60_000
  });

  useEffect(()=>{
    setTimelineMode('works');
    setClassificationMode('source');
    setSelectedCategory('');
    setWorkPage(0);
    setWorkRows([]);
  },[scopeId]);

  useEffect(()=>{
    setSelectedCategory('');
    setWorkPage(0);
    setWorkRows([]);
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
  },[classificationMode,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date]);

  useEffect(()=>{
    setWorkRows([]);
    setWorkPage(0);
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[selectedCategory]);

  useEffect(()=>{
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
  },[workPage]);

  useEffect(()=>{
    const next=periodWorksQuery.data?.rows||[];
    if(!next.length)return;
    setWorkRows(current=>{
      if(workPage===0)return next;
      const map=new Map(current.map((row,index)=>[String(row.key||row.uid||row.entry_id||index),row]));
      next.forEach((row,index)=>map.set(String(row.key||row.uid||row.entry_id||('next-'+index)),row));
      return [...map.values()];
    });
  },[periodWorksQuery.data,workPage]);

  const periodVolumeByStart=useMemo(()=>{
    const map=new Map();
    if(sourceSnapshotQuery.data&&selectedWorkPeriod?.start_date){
      map.set(String(selectedWorkPeriod.start_date).slice(0,10),Number(sourceSnapshotQuery.data.totalCount)||0);
    }
    return map;
  },[sourceSnapshotQuery.data,selectedWorkPeriod?.start_date]);


  const timelineItems=useMemo(()=>
    (query.data?.timelineItems||[]).filter(item=>scopeId==='loc'||item.scope_id===scopeId)
  ,[query.data,scopeId]);
  const locSourceRiverItems=useMemo(()=>query.data?.sourceRiverItems||[],[query.data]);
  const locSourceGroups=useMemo(()=>query.data?.sourceGroups||[],[query.data]);
  const locSuggestions=useMemo(()=>{
    const totals=new Map();
    for(const item of locSourceRiverItems){
      const day=String(item?.start_date||'').slice(0,10);
      if(!day)continue;
      totals.set(day,(totals.get(day)||0)+(Number(item?.item_count)||0));
    }
    return [...totals.entries()]
      .map(([date,item_count])=>({date,item_count}))
      .sort((a,b)=>b.item_count-a.item_count||b.date.localeCompare(a.date))
      .slice(0,5);
  },[locSourceRiverItems]);
  const anchoredEvents=useMemo(()=>(query.data?.events||[])
    .filter(item=>String(item?.scope_id||'')===scopeId&&item?.start_date&&item?.end_date)
    .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))||String(a.title||'').localeCompare(String(b.title||''))),[query.data,scopeId]);
  const eventTimelineItems=anchoredEvents;
  const anchorTimelineItems=useMemo(()=>timelineItems.filter(item=>String(item?.entry_type||'')==='anchor'),[timelineItems]);
  const periodWorkTimelineItems=periodWorkTimelineQuery.data?.buckets||[];
  const hasTimelineSurface=isLoc?Boolean(locSourceRiverItems.length):Boolean(timelineItems.length||selectedWorkPeriod?.start_date);

  const classificationBuckets=classificationMode==='source'
    ?(sourceSnapshotQuery.data?.buckets||[])
    :(mediaSnapshotQuery.data?.buckets||[]);


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
      if(!account.canManageScopeSync(classificationScope))throw new Error('沒有修改此 Scope 的權限。');
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
      await periodWorksQuery.refetch();
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
      <p className='loc-eyebrow'>Time River</p>
      <h2>時間長河</h2>
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!hasTimelineSurface?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&hasTimelineSurface?<>


            {isLoc?<>

              <section className='scope-v2-card scope-v2-culture-classification-river'>
                <p className='loc-eyebrow'>Source Density</p>
                <h3>作品來源分佈</h3>
                <CultureTimelineV2
                  items={locSourceRiverItems}
                  labelOf={item=>item.entry_type==='intersection_start'?item.display_label:''}
                  focus={{}}
                  mode='source'
                />
                {locSourceGroups.length?<div className='scope-v2-culture-source-groups' aria-label='作品來源分類'>
                  {locSourceGroups.map(group=><article className='scope-v2-inline-card' key={group.category_key}>
                    <strong>{group.display_label}</strong>
                    <span>{Number(group.item_count||0).toLocaleString()} 項</span>
                  </article>)}
                </div>:null}
              </section>

            </>:<>
              {!isLoc?<label className='scope-v2-culture-period-select'>
                <span>時間長河</span>
                <select className='scope-v2-select' value={timelineMode} onChange={event=>setTimelineMode(event.target.value)}>
                  <option value='works'>時期分割作品</option>
                  {anchoredEvents.length?<option value='event'>事件分割作品</option>:null}
                  <option value='anchor'>定錨點</option>
                </select>
              </label>:null}
              {timelineMode==='anchor'
                ?<CultureTimelineV2
                    items={anchorTimelineItems}
                    labelOf={item=>item.display_label||item.title}
                    focus={navigation}
                    mode='overview'
                  />
                :timelineMode==='event'
                  ?<>
                      {!anchoredEvents.length?<p className='scope-v2-status'>目前沒有具有前後定錨點的事件。</p>:null}
                      {eventTimelineItems.length?<CultureTimelineV2
                        items={eventTimelineItems}
                        labelOf={item=>item.display_label||item.title}
                        focus={{}}
                        mode='overview'
                      />:null}
                    </>
                  :<>
                      {periodWorkTimelineQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorkTimelineQuery.error)}</p>:null}
                      {!periodWorkTimelineQuery.isFetching&&!periodWorkTimelineQuery.error&&!periodWorkTimelineItems.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                      {periodWorkTimelineItems.length?<CultureTimelineV2
                        items={periodWorkTimelineItems}
                        labelOf={item=>item.display_label||item.evidence_group||item.group_label}
                        focus={{}}
                        mode='overview'
                      />:null}
                    </>}

            </>}

            {!isLoc&&selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-classification-river'>
              <p className='loc-eyebrow'>Classification River</p>
              <h3>{labelOf(selectedWorkPeriod,0)}｜作品分類河道</h3>
              {!isLoc?<div className='scope-v2-tabs' role='group' aria-label='作品分類方式'>
                <button type='button' aria-pressed={classificationMode==='source'} onClick={()=>setClassificationMode('source')}>作品來源</button>
                <button type='button' aria-pressed={classificationMode==='media'} onClick={()=>setClassificationMode('media')}>多媒體</button>
              </div>:null}
              {classificationBucketsQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(classificationBucketsQuery.error)}</p>:null}
              {!classificationBucketsQuery.isFetching&&!classificationBucketsQuery.error&&!classificationBuckets.length
                ?<p className='scope-v2-status'>{'目前沒有此分類資料。'}</p>:null}
              {classificationBuckets.length?<CultureTimelineV2
                items={classificationBuckets}
                labelOf={item=>classificationMode==='source'
                  ?''
                  :(item.display_label||item.group_label)}
                focus={{}}
                mode={classificationMode==='source'?'source':'overview'}
                onSelect={item=>{
                  const term=String(item?.group||'').trim();
                  if(!term)return;
                  const key=classificationMode==='source'
                    ?'source:'+term
                    :'media:type:'+term;
                  if(categoryGroups.some(group=>group.category_key===key)){
                    setWorkRows([]);
                    setWorkPage(0);
                    setSelectedCategory(key);
                  }
                }}
              />:null}


            </section>:null}

            {!isLoc&&selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-current-works'>
              <p className='loc-eyebrow'>Classification</p>
              <h3>{labelOf(selectedWorkPeriod,0)}｜{classificationMode==='source'?'作品來源':'多媒體分類'}</h3>
              {categoryQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(categoryQuery.error)}</p>:null}
              {!categoryQuery.isFetching&&!categoryQuery.error&&!categoryGroups.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
              {categoryGroups.length?<IncrementalListV2
                items={categoryGroups}
                batchSize={DEFAULT_LIST_BATCH_SIZE}
                resetKey={classificationMode+'|'+String(selectedWorkPeriod?.period||'all')}
                className='scope-v2-culture-source-groups'
                renderItem={group=><button type='button' key={group.category_key}
                  className='scope-v2-culture-source-button'
                  aria-pressed={selectedCategory===group.category_key}
                  onClick={()=>{setWorkRows([]);setWorkPage(0);setSelectedCategory(selectedCategory===group.category_key?'':group.category_key);}}>
                  <strong>{group.display_label}</strong><span>{Number(group.item_count||0).toLocaleString()} 項作品</span>
                </button>}
              />:null}

              {!isLoc&&selectedGroup?<section className='scope-v2-culture-source-detail' aria-label={selectedGroup.display_label+'列表'}>
                <header>
                  <h4>{selectedGroup.display_label} · {selectedCount.toLocaleString()} 項作品</h4>
                  <button type='button' className='scope-v2-pagination-button' onClick={()=>{setWorkRows([]);setWorkPage(0);setSelectedCategory('')}}>收合列表</button>
                </header>
                {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
                <IncrementalListV2
                  items={workRows}
                  batchSize={CULTURE_WORK_PAGE_SIZE}
                  resetKey={selectedCategory+'|'+classificationMode}
                  className='scope-v2-culture-source-work-scroll'
                  externalHasMore={Boolean(periodWorksQuery.data?.hasMore)}
                  loading={periodWorksQuery.isFetching}
                  error={periodWorksQuery.error}
                  onLoadMore={()=>setWorkPage(page=>page+1)}
                  scrollRootRef={workScrollRef}
                  renderItem={(work,index)=><WorkSummaryCardV2
                    key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                    title={workDisplayHeading(work,{media:false,limit:80})}
                    source={work.source_name||work.group_label||''}
                    date={work.display_date||formatCultureDateTime(work.createtime||work.created_at)}
                    body={work.description||work.media_metadata_text||''}
                    relationLinks={galaxyRelationLinks(classificationScope,work)}
                    links={work.links||[]}
                  >
                    {classificationMode==='source'&&work.uid?<WorkFullTextV2
                      open={fullTextKey===work.key}
                      loading={fullTextLoading&&fullTextKey===work.key}
                      error={fullTextKey===work.key?fullTextError:''}
                      content={fullTextKey===work.key?fullText:''}
                      onToggle={()=>toggleWorkContent(work)}
                    />:null}
                    {classificationMode==='media'?<p>{work.media_type?('媒體類型：'+work.media_type):''}</p>:null}
                    {classificationMode==='source'&&work.uid&&account.canManageScopeSync(classificationScope)?<p><button type="button" onClick={()=>startEditingWork(work)}>{editingWorkKey===String(work.key||('galaxy:'+work.uid))?'編輯中':'編輯'}</button></p>:null}
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
                {!periodWorksQuery.isFetching&&!periodWorksQuery.error&&!workRows.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
              </section>:null}
            </section>:null}
      </>:null}
    </section>
  </FeaturePageV2>;
}
