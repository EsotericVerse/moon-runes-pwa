'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  selectAuthorPeriodSourceSnapshot,
  selectAuthorPeriodWorks,
  selectScopeCultureData,
  selectScopeMediaSnapshot,
  selectScopeMediaWorks,
  selectScopeStyleSnapshot,
  selectScopeStyleWorks
} from '../../loc/neon-culture-client';
import {galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';
import WorkSummaryCardV2 from '../WorkSummaryCardV2';
import PagedResultV2 from '../PagedResultV2';

const CULTURE_WORK_PAGE_SIZE=20;

function labelOf(item,index){
  return item?.display_label||item?.name||item?.title||item?.period||'時期 '+(index+1);
}
function rowsOf(data){
  const authorRows=Array.isArray(data?.authorEras?.eras)?data.authorEras.eras.map(item=>({...item,scope_id:item?.scope_id||'lo3rwang'})):[];
  const runeRows=Array.isArray(data?.runeEras?.eras)?data.runeEras.eras.map(item=>({...item,scope_id:item?.scope_id||'lunarunes'})):[];
  const rows=authorRows.length&&runeRows.length?[...authorRows,...runeRows]:
    (authorRows.length?authorRows:(runeRows.length?runeRows:(data?.eras?.eras||[])));
  return rows.sort((a,b)=>{
    const ad=String(a?.start_date||a?.end_date||a?.date||'');
    const bd=String(b?.start_date||b?.end_date||b?.date||'');
    if(ad&&bd&&ad!==bd)return ad.localeCompare(bd);
    return Number(a.order||0)-Number(b.order||0);
  });
}
function isCurrent(item){
  return String(item?.status||'').trim().toLowerCase()==='current';
}
function sortPeriods(rows=[]){
  return [...rows].filter(item=>item?.start_date||item?.end_date).sort((a,b)=>
    String(a.start_date||a.end_date||'').localeCompare(String(b.start_date||b.end_date||''))||
    Number(a.order||0)-Number(b.order||0)
  );
}
function periodRange(rows=[],scope='lo3rwang'){
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
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
    staleTime:5*60_000
  });

  const rows=useMemo(()=>rowsOf(query.data),[query.data]);
  const [classificationMode,setClassificationMode]=useState(scopeId==='lunarunes'?'style':'source');
  const [styleLevel,setStyleLevel]=useState('label');
  const [mediaDimension,setMediaDimension]=useState('type');
  const [selectedCategory,setSelectedCategory]=useState('');
  const [workPage,setWorkPage]=useState(0);
  const [activeWorkPeriod,setActiveWorkPeriod]=useState(null);

  const currentRows=useMemo(()=>{
    const scopes=scopeId==='loc'?['lo3rwang','lunarunes']:[scopeId].filter(Boolean);
    return scopes
      .map(id=>rows.find(item=>String(item?.scope_id||'')===id&&isCurrent(item)))
      .filter(Boolean);
  },[scopeId,rows]);
  const currentByScope=useMemo(()=>new Map(currentRows.map(item=>[String(item.scope_id||''),item])),[currentRows]);
  const currentAuthorPeriod=currentByScope.get('lo3rwang')||null;
  const currentRunePeriod=currentByScope.get('lunarunes')||null;

  const allAuthorPeriods=useMemo(()=>sortPeriods(query.data?.authorEras?.eras||[]),[query.data]);
  const allRunePeriods=useMemo(()=>sortPeriods([
    ...(query.data?.runeHistory?.records||[]),
    ...(query.data?.runeEras?.eras||[])
  ]),[query.data]);
  const isLoc=scopeId==='loc';
  const classificationScope=scopeId==='lunarunes'?'lunarunes':'lo3rwang';
  const primaryPeriods=scopeId==='lunarunes'?allRunePeriods:allAuthorPeriods;
  const primaryCurrent=scopeId==='lunarunes'?currentRunePeriod:currentAuthorPeriod;
  const selectedWorkPeriod=activeWorkPeriod||primaryCurrent||periodRange(primaryPeriods,classificationScope);
  const selectedPeriodIndex=primaryPeriods.findIndex(item=>
    String(item?.period||'')===String(selectedWorkPeriod?.period||'')
    ||String(item?.start_date||'')===String(selectedWorkPeriod?.start_date||'')
  );
  const previousWorkPeriod=selectedPeriodIndex>0?primaryPeriods[selectedPeriodIndex-1]:null;

  const visibleAuthorPeriods=allAuthorPeriods;

  const sourceSnapshotQuery=useQuery({
    queryKey:['culture-period-source-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectAuthorPeriodSourceSnapshot({
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:classificationScope==='lo3rwang'&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });

  const periodVolumesQuery=useQuery({
    queryKey:['culture-period-source-volumes',scopeId,visibleAuthorPeriods.map(item=>[item.period,item.start_date,item.end_date])],
    queryFn:async()=>{
      const settled=await Promise.allSettled(visibleAuthorPeriods.map(async(period,index)=>({
        period:{...period,scope_id:'lo3rwang'},
        snapshot:await selectAuthorPeriodSourceSnapshot({startDate:period.start_date,endDate:period.end_date}),
        periodIndex:index
      })));
      return settled.filter(item=>item.status==='fulfilled').map(item=>item.value);
    },
    enabled:scopeId==='lo3rwang'&&visibleAuthorPeriods.length>0,
    staleTime:5*60_000
  });

  const styleSnapshotQuery=useQuery({
    queryKey:['culture-period-style-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,styleLevel],
    queryFn:()=>selectScopeStyleSnapshot(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date,
      styleLevel
    }),
    enabled:classificationMode==='style'&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });

  const mediaSnapshotQuery=useQuery({
    queryKey:['culture-period-media-snapshot',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,mediaDimension],
    queryFn:()=>selectScopeMediaSnapshot(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date,
      dimension:mediaDimension
    }),
    enabled:classificationMode==='media'&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });


  const classificationBucketsQuery=classificationMode==='source'
    ?sourceSnapshotQuery
    :(classificationMode==='style'?styleSnapshotQuery:mediaSnapshotQuery);
  const categoryGroups=classificationMode==='source'
    ?(sourceSnapshotQuery.data?.groups||[])
    :(classificationMode==='style'?(styleSnapshotQuery.data?.groups||[]):(mediaSnapshotQuery.data?.groups||[]));
  const categoryQuery=classificationMode==='source'
    ?sourceSnapshotQuery
    :(classificationMode==='style'?styleSnapshotQuery:mediaSnapshotQuery);
  const selectedGroup=categoryGroups.find(item=>item.category_key===selectedCategory)||null;
  const selectedCount=Number(selectedGroup?.item_count)||0;
  const periodWorksQuery=useQuery({
    queryKey:['culture-period-works',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,classificationMode,styleLevel,mediaDimension,selectedCategory,workPage],
    queryFn:()=>classificationMode==='source'
      ?selectAuthorPeriodWorks({
        startDate:selectedWorkPeriod?.start_date,
        endDate:selectedWorkPeriod?.end_date,
        sourceName:selectedGroup?.source_name,
        limit:CULTURE_WORK_PAGE_SIZE,
        pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
      })
      :(classificationMode==='style'
        ?selectScopeStyleWorks(classificationScope,{
          startDate:selectedWorkPeriod?.start_date,
          endDate:selectedWorkPeriod?.end_date,
          styleName:selectedGroup?.style_name,
          styleLevel,
          limit:CULTURE_WORK_PAGE_SIZE,
          pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
        })
        :selectScopeMediaWorks(classificationScope,{
          startDate:selectedWorkPeriod?.start_date,
          endDate:selectedWorkPeriod?.end_date,
          mediaName:selectedGroup?.media_name,
          dimension:mediaDimension,
          limit:CULTURE_WORK_PAGE_SIZE,
          pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
        })),
    enabled:!isLoc&&Boolean(selectedWorkPeriod?.start_date&&selectedGroup),
    staleTime:5*60_000
  });
  const groupedCount=Number(periodWorksQuery.data?.totalCount)||selectedCount;
  const workPageCount=Math.max(1,Math.ceil(groupedCount/CULTURE_WORK_PAGE_SIZE));

  useEffect(()=>{
    setClassificationMode(scopeId==='lunarunes'?'style':'source');
    setStyleLevel('label');
    setMediaDimension('type');
    setSelectedCategory('');
    setWorkPage(0);
    setActiveWorkPeriod(null);
  },[scopeId]);

  useEffect(()=>{
    setSelectedCategory('');
    setWorkPage(0);
  },[classificationMode,styleLevel,mediaDimension,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date]);

  const periodVolumeByStart=useMemo(()=>{
    const map=new Map((periodVolumesQuery.data||[]).map(group=>[
      String(group.period?.start_date||'').slice(0,10),
      Number(group.snapshot?.totalCount)||0
    ]));
    if(sourceSnapshotQuery.data&&selectedWorkPeriod?.start_date){
      map.set(String(selectedWorkPeriod.start_date).slice(0,10),Number(sourceSnapshotQuery.data.totalCount)||0);
    }
    return map;
  },[periodVolumesQuery.data,sourceSnapshotQuery.data,selectedWorkPeriod?.start_date]);

  const timelineItems=useMemo(()=>{
    const items=(query.data?.timelineItems||[]).filter(item=>scopeId==='loc'||item.scope_id===scopeId);
    return items.map(item=>{
      if(item.scope_id!=='lo3rwang'||item.entry_type!=='period')return item;
      const workCount=periodVolumeByStart.get(String(item.start_date||'').slice(0,10));
      return workCount===undefined?item:{...item,work_count:workCount};
    });
  },[query.data,scopeId,periodVolumeByStart]);

  const classificationBuckets=classificationMode==='source'
    ?(sourceSnapshotQuery.data?.buckets||[])
    :(classificationMode==='style'?(styleSnapshotQuery.data?.buckets||[]):(mediaSnapshotQuery.data?.buckets||[]));


  return <FeaturePageV2 featureId="culture">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Time River</p>
      <h2>時間長河</h2>
      {query.isPending?<p className='scope-v2-status'>{FEATURE_LOADING_MESSAGE}</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!timelineItems.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&timelineItems.length?<>


            {isLoc?<CultureTimelineV2
              items={timelineItems}
              labelOf={item=>item.display_label||item.title}
              focus={navigation}
              mode='current'
            />:<section className='scope-v2-card scope-v2-culture-period-2d' aria-label='時期'>
              <p className='loc-eyebrow'>Period</p>
              <h3>時期</h3>
              <label className='scope-v2-culture-period-select'>
                <span>選擇完整時期</span>
                <select className='scope-v2-select'
                  value={selectedWorkPeriod?.period||selectedWorkPeriod?.start_date||''}
                  onChange={event=>{
                    const value=event.target.value;
                    const matched=primaryPeriods.find(item=>
                      String(item?.period||item?.start_date||'')===value
                    );
                    if(matched)setActiveWorkPeriod(matched);
                  }}>
                  {primaryPeriods.map((item,index)=><option
                    key={String(item?.period||item?.start_date||index)}
                    value={String(item?.period||item?.start_date||'')}>
                    {labelOf(item,index)}
                  </option>)}
                </select>
              </label>
              {selectedWorkPeriod?<p className='scope-v2-culture-period-description'>
                {[selectedWorkPeriod.start_date,selectedWorkPeriod.end_date||'Current'].filter(Boolean).join(' – ')}
              </p>:null}
            </section>}

            {selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-classification-river'>
              <p className='loc-eyebrow'>Classification River</p>
              <h3>{labelOf(selectedWorkPeriod,0)}｜作品分類河道</h3>
              <div className='scope-v2-tabs' role='group' aria-label='作品分類方式'>
                <button type='button' aria-pressed={classificationMode==='source'} onClick={()=>setClassificationMode('source')}>作品來源</button>
                <button type='button' aria-pressed={classificationMode==='style'} onClick={()=>setClassificationMode('style')}>風格</button>
                <button type='button' aria-pressed={classificationMode==='media'} onClick={()=>setClassificationMode('media')}>多媒體</button>
              </div>
              {classificationMode==='style'?<div className='scope-v2-tabs' role='group' aria-label='風格分類層級'>
                <button type='button' aria-pressed={styleLevel==='label'} onClick={()=>setStyleLevel('label')}>風格標籤</button>
                <button type='button' aria-pressed={styleLevel==='group'} onClick={()=>setStyleLevel('group')}>風格大群組</button>
              </div>:null}
              {classificationMode==='media'?<div className='scope-v2-tabs' role='group' aria-label='多媒體分類層級'>
                <button type='button' aria-pressed={mediaDimension==='type'} onClick={()=>setMediaDimension('type')}>媒體類型</button>
                <button type='button' aria-pressed={mediaDimension==='place'} onClick={()=>setMediaDimension('place')}>地點</button>
              </div>:null}
              {classificationBucketsQuery.isPending?<p className='scope-v2-status'>{FEATURE_LOADING_MESSAGE}</p>:null}
              {classificationBucketsQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(classificationBucketsQuery.error)}</p>:null}
              {!classificationBucketsQuery.isPending&&!classificationBucketsQuery.error&&!classificationBuckets.length
                ?<p className='scope-v2-status'>{classificationMode==='source'&&classificationScope==='lunarunes'?'此 Scope 沒有作品來源分類。':'目前沒有此分類資料。'}</p>:null}
              {classificationBuckets.length?<CultureTimelineV2
                items={classificationBuckets}
                labelOf={item=>classificationMode==='source'
                  ?''
                  :(item.display_label||item.group_label)}
                focus={{}}
                mode={classificationMode==='source'?'source':'overview'}
              />:null}


            </section>:null}

            {selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-current-works'>
              <p className='loc-eyebrow'>Classification</p>
              <h3>{labelOf(selectedWorkPeriod,0)}｜{classificationMode==='source'?'作品來源':(classificationMode==='style'?'風格分類':'多媒體分類')}</h3>
              <p>{classificationMode==='source'
                ?'來源名稱是匯入時自訂的字串；相同名稱會直接視為同一來源。'
                :(classificationMode==='style'
                  ?(styleLevel==='label'?'風格標籤是小群組名稱。':'風格大群組彙整多個風格標籤。')
                  :(mediaDimension==='place'?'依 source_place 顯示多媒體的地點分布。':'依 media_type 顯示圖片、影音、音樂與其他媒體類型分布。'))}</p>
              {categoryQuery.isPending?<p className='scope-v2-status'>{FEATURE_LOADING_MESSAGE}</p>:null}
              {categoryQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(categoryQuery.error)}</p>:null}
              {!categoryQuery.isPending&&!categoryQuery.error&&!categoryGroups.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
              {categoryGroups.length?<div className='scope-v2-culture-source-groups' aria-label='作品分類'>
                {categoryGroups.map(group=>isLoc
                  ?<article key={group.category_key} className='scope-v2-culture-source-button'>
                    <strong>{group.display_label}</strong><span>{Number(group.item_count||0).toLocaleString()} 項作品</span>
                  </article>
                  :<button type='button' key={group.category_key}
                    className='scope-v2-culture-source-button'
                    aria-pressed={selectedCategory===group.category_key}
                    onClick={()=>{setSelectedCategory(selectedCategory===group.category_key?'':group.category_key);setWorkPage(0);}}>
                    <strong>{group.display_label}</strong><span>{Number(group.item_count||0).toLocaleString()} 項作品</span>
                  </button>)}
              </div>:null}

              {!isLoc&&selectedGroup?<section className='scope-v2-culture-source-detail' aria-label={selectedGroup.display_label+'列表'}>
                <header>
                  <h4>{selectedGroup.display_label} · {selectedCount.toLocaleString()} 項作品</h4>
                  <button type='button' className='scope-v2-pagination-button' onClick={()=>setSelectedCategory('')}>收合列表</button>
                </header>
                {periodWorksQuery.isPending?<p className='scope-v2-status'>載入第 {workPage+1} 頁…</p>:null}
                {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
                <div className='scope-v2-culture-source-work-scroll'>
                  {(periodWorksQuery.data?.rows||[]).map((work,index)=><WorkSummaryCardV2
                    key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                    title={work.title||work.uid||'未命名作品'}
                    source={work.source_name||work.group_label||''}
                    date={work.display_date||formatCultureDateTime(work.createtime||work.created_at)}
                    body={work.description||work.media_metadata_text||''}
                    relationLinks={galaxyRelationLinks(classificationScope,work)}
                    links={work.links||[]}
                  >
                    {classificationMode==='style'?<p>{work.style_label?('風格標籤：'+work.style_label):''}{work.style_group?(' · 大群組：'+work.style_group):''}</p>:null}
                    {classificationMode==='media'?<p>{work.media_type?('媒體類型：'+work.media_type):''}{work.source_place?(' · 地點：'+work.source_place):''}</p>:null}
                  </WorkSummaryCardV2>)}
                </div>
                {!periodWorksQuery.isPending&&!periodWorksQuery.error&&!(periodWorksQuery.data?.rows||[]).length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                <PagedResultV2
                  label="作品"
                  totalCount={groupedCount}
                  offset={workPage*CULTURE_WORK_PAGE_SIZE}
                  pageSize={CULTURE_WORK_PAGE_SIZE}
                  hasMore={workPage+1<workPageCount}
                  onPrevious={()=>setWorkPage(page=>Math.max(0,page-1))}
                  onNext={()=>setWorkPage(page=>Math.min(workPageCount-1,page+1))}
                />
              </section>:null}
            </section>:null}
      </>:null}
    </section>
  </FeaturePageV2>;
}
