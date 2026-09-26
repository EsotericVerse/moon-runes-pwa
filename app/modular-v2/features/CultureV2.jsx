'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {selectAuthorPeriodWorkSources,selectAuthorPeriodWorks,selectScopeCultureData} from '../../loc/neon-culture-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import CultureVolumeGraph3D from '../modules/culture-timeline/CultureVolumeGraph3D';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
import CultureTimelineEditor from './CultureTimelineEditor';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';

const CULTURE_WORK_PAGE_SIZE=20;

function labelOf(item,index){
  return item?.display_label||item?.name||item?.title||item?.period||'時期 '+(index+1);
}
function rowsOf(data){
  const authorRows=Array.isArray(data?.authorEras?.eras)?data.authorEras.eras.map(item=>({...item,scope_id:item?.scope_id||'lo3rwang'})):[];
  const runeRows=Array.isArray(data?.runeEras?.eras)?data.runeEras.eras.map(item=>({...item,scope_id:item?.scope_id||'runes'})):[];
  const rows=authorRows.length&&runeRows.length?[...authorRows,...runeRows]:
    (authorRows.length?authorRows:(runeRows.length?runeRows:(data?.eras?.eras||[])));
  return rows.sort((a,b)=>{
    const ad=String(a?.start_date||a?.date||'');
    const bd=String(b?.start_date||b?.date||'');
    if(ad&&bd&&ad!==bd)return ad.localeCompare(bd);
    return Number(a.order||0)-Number(b.order||0);
  });
}
function isCurrent(item){
  return String(item?.status||'').trim().toLowerCase()==='current';
}
function matchesCurrentMarker(item,current){
  const samePeriod=current?.period&&item?.period&&String(item.period)===String(current.period);
  const identity=String(current?.era_id||'');
  const sameIdentity=identity&&[item?.era_id,item?.entry_key,item?.id].some(value=>String(value||'')===identity);
  const sameRune=Number(current?.rune_count)>0&&Number(item?.rune_count)===Number(current.rune_count);
  const sameTitle=String(item?.title||'')===String(current?.title||'');
  const sameDate=String(item?.start_date||'').slice(0,10)===String(current?.start_date||'').slice(0,10);
  return Boolean(samePeriod||sameIdentity||sameRune||(sameTitle&&sameDate));
}
function timelineFromCurrent(items,currentByScope){
  return (Array.isArray(items)?items:[]).filter(item=>{
    const current=currentByScope.get(String(item?.scope_id||''));
    if(!current)return true;
    const type=String(item?.entry_type||'');
    if(type==='period'||type==='period_legacy')return matchesCurrentMarker(item,current);
    if(!['anchor','event','style'].includes(type))return false;
    const currentTime=Date.parse(current?.start_date||current?.date||'');
    const itemTime=Date.parse(item?.start_date||item?.date||'');
    return !Number.isNaN(currentTime)&&!Number.isNaN(itemTime)&&itemTime>=currentTime;
  }).map(item=>currentByScope.has(String(item?.scope_id||''))
    ?{...item,group_label:String(item.scope_id)}
    :item
  );
}
function uniqueInterleavedWorks(rows){
  const seen=new Set();
  return (Array.isArray(rows)?rows:[]).filter(work=>{
    const content=String(work?.content||'').replace(/\s+/g,' ').trim();
    const key=String(work?.content_hash||'').trim()||content;
    if(!key)return true;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({queryKey:['culture-timeline',scopeId],queryFn:()=>selectScopeCultureData(scopeId),staleTime:5*60_000});
  const rows=useMemo(()=>rowsOf(query.data),[query.data]);
  const [selectedEntryId,setSelectedEntryId]=useState('');
  const [selectedWorkSource,setSelectedWorkSource]=useState('');
  const [workPage,setWorkPage]=useState(0);
  const [activeWorkPeriod,setActiveWorkPeriod]=useState(null);
  const [cultureView,setCultureView]=useState('river');
  const [canEditRiver,setCanEditRiver]=useState(false);
  const [anchorPickMode,setAnchorPickMode]=useState(false);
  const [riverCommand,setRiverCommand]=useState(null);

  const currentRows=useMemo(()=>{
    const scopes=scopeId==='loc'?['lo3rwang','runes']:[scopeId].filter(Boolean);
    return scopes
      .map(id=>rows.find(item=>String(item?.scope_id||'')===id&&isCurrent(item)))
      .filter(Boolean);
  },[scopeId,rows]);
  const currentByScope=useMemo(()=>new Map(currentRows.map(item=>[String(item.scope_id||''),item])),[currentRows]);
  const currentAuthorPeriod=currentByScope.get('lo3rwang')||null;

  const allAuthorPeriods=useMemo(()=>[...(query.data?.authorEras?.eras||[])].filter(item=>item?.start_date).sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))),[query.data]);
  const allPeriodsRange=allAuthorPeriods.length?{
    period:'全部時期',title:'全部時期',display_label:'全部時期',
    start_date:allAuthorPeriods[0].start_date,
    end_date:allAuthorPeriods[allAuthorPeriods.length-1].end_date||null,
    scope_id:'lo3rwang'
  }:null;
  const selectedWorkPeriod=activeWorkPeriod||currentAuthorPeriod||allPeriodsRange;
  const visibleAuthorPeriods=currentAuthorPeriod
    ?[allAuthorPeriods.find(item=>item.start_date===currentAuthorPeriod.start_date)||currentAuthorPeriod]
    :allAuthorPeriods;
  const periodVolumesQuery=useQuery({
    queryKey:['culture-period-source-volumes',scopeId,visibleAuthorPeriods.map(item=>[item.period,item.start_date,item.end_date])],
    queryFn:async()=>Promise.all(visibleAuthorPeriods.map(async(period,index)=>({
      period:{...period,scope_id:'lo3rwang'},
      sources:await selectAuthorPeriodWorkSources({startDate:period.start_date,endDate:period.end_date}),
      periodIndex:index
    }))),
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&cultureView==='volume3d'&&visibleAuthorPeriods.length>0,
    staleTime:5*60_000
  });

  const workSourcesQuery=useQuery({
    queryKey:['culture-period-work-sources',scopeId,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectAuthorPeriodWorkSources({
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });
  const selectedWorkGroup=(workSourcesQuery.data||[]).find(item=>item.category_key===selectedWorkSource)||null;
  const selectedSourceCount=Number(selectedWorkGroup?.item_count)||0;
  const workPageCount=Math.max(1,Math.ceil(selectedSourceCount/CULTURE_WORK_PAGE_SIZE));
  const periodWorksQuery=useQuery({
    queryKey:['culture-period-works',scopeId,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,selectedWorkSource,workPage],
    queryFn:()=>selectAuthorPeriodWorks({
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date,
      sourcePlatform:selectedWorkGroup?.source_platform,
      categoryType:selectedWorkGroup?.category_type,
      limit:CULTURE_WORK_PAGE_SIZE,
      pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
    }),
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&Boolean(selectedWorkPeriod?.start_date&&selectedWorkGroup),
    staleTime:5*60_000
  });

  useEffect(()=>{
    setSelectedWorkSource('');
    setWorkPage(0);
    setActiveWorkPeriod(null);
  },[scopeId,currentAuthorPeriod?.period,currentAuthorPeriod?.start_date,currentAuthorPeriod?.end_date]);

  const timelineItems=useMemo(()=>{
    const items=(query.data?.timelineItems||[]).filter(item=>scopeId==='loc'||item.scope_id===scopeId);
    return currentRows.length?timelineFromCurrent(items,currentByScope):items;
  },[query.data,currentRows,currentByScope,scopeId]);

  return <FeaturePageV2 featureId="culture">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Time River</p>
      <h2>時間長河</h2>
      {query.isPending?<p className='scope-v2-status'>載入時間長河…</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!timelineItems.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&timelineItems.length?<>
        {(scopeId==='lo3rwang'||scopeId==='loc')?<div className='scope-v2-tabs scope-v2-culture-view-toggle' role='group' aria-label='時間長河顯示方式'>
          <button type='button' aria-pressed={cultureView==='river'} onClick={()=>{setCultureView('river');setAnchorPickMode(false)}}>時間長河</button>
          <button type='button' aria-pressed={cultureView==='volume3d'} onClick={()=>{setCultureView('volume3d');setAnchorPickMode(false)}}>3D 時期與作品量</button>
          {canEditRiver&&cultureView==='river'?<button type='button' aria-pressed={anchorPickMode} onClick={()=>setAnchorPickMode(value=>!value)}>{anchorPickMode?'取消新增定錨點':'新增定錨點'}</button>:null}
        </div>:null}
        {cultureView==='volume3d'&&(scopeId==='lo3rwang'||scopeId==='loc')
          ?<CultureVolumeGraph3D
            periods={periodVolumesQuery.data||[]}
            timelineItems={timelineItems}
            categories={workSourcesQuery.data||[]}
            selectedCategory={selectedWorkSource}
            selectedCategoryType={selectedWorkGroup?.category_type||''}
            categoryLoading={workSourcesQuery.isFetching}
            categoryError={workSourcesQuery.error?featureDataErrorMessage(workSourcesQuery.error):''}
            works={periodWorksQuery.data?.rows||[]}
            workPage={workPage}
            workPageCount={workPageCount}
            workLoading={periodWorksQuery.isFetching}
            workError={periodWorksQuery.error?featureDataErrorMessage(periodWorksQuery.error):''}
            loading={periodVolumesQuery.isFetching}
            error={periodVolumesQuery.error?featureDataErrorMessage(periodVolumesQuery.error):''}
            canEdit={canEditRiver}
            onSelectCategory={source=>{setSelectedWorkSource(source);setWorkPage(0);}}
            onPageChange={setWorkPage}
            onSelectWorkPoint={point=>{
              if(point?.period){setActiveWorkPeriod(point.period);setSelectedWorkSource(point.category_key||'');setWorkPage(0);}
            }}
            onSelectTimelineEntry={item=>setSelectedEntryId(item?.entry_id||'')}
            onCommand={command=>setRiverCommand({...command,nonce:Date.now()})}
          />
          :<CultureTimelineV2
            items={timelineItems}
            labelOf={item=>item.display_label||item.title}
            focus={navigation}
            mode={currentRows.length?'current':'overview'}
            onSelect={item=>setSelectedEntryId(item?.entry_id||'')}
            canAddAnchor={anchorPickMode}
            onAddAnchor={date=>{
              setRiverCommand({scopeId:'lo3rwang',type:'anchor',values:{start_date:date},nonce:Date.now()});
              setAnchorPickMode(false);
            }}
          />}
        <CultureTimelineEditor scopeId={scopeId} selectedEntryId={selectedEntryId} riverCommand={riverCommand} onCapabilityChange={setCanEditRiver}/>

        {currentAuthorPeriod&&cultureView!=='volume3d'?<section className='scope-v2-card scope-v2-culture-current-works'>
          <p className='loc-eyebrow'>Current</p>
          <h3>{labelOf(selectedWorkPeriod,0)}｜{currentAuthorPeriod?(selectedWorkPeriod?.start_date===currentAuthorPeriod?.start_date&&selectedWorkPeriod?.period===currentAuthorPeriod?.period?'Current 時期作品':'所選時期作品'):'全部時期作品'}</h3>
          <p>先依來源查看作品數量；選擇來源後再載入該來源作品，每頁 {CULTURE_WORK_PAGE_SIZE} 篇。</p>
          {workSourcesQuery.isPending?<p className='scope-v2-status'>載入來源統計…</p>:null}
          {workSourcesQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(workSourcesQuery.error)}</p>:null}
          {!workSourcesQuery.isPending&&!workSourcesQuery.error&&!workSourcesQuery.data?.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
          {workSourcesQuery.data?.length?<div className='scope-v2-culture-source-groups' aria-label='作品與多媒體分開統計'>
            {workSourcesQuery.data.map(group=><button type='button' key={group.category_key}
              className='scope-v2-culture-source-button'
              aria-pressed={selectedWorkSource===group.category_key}
              onClick={()=>{setSelectedWorkSource(selectedWorkSource===group.category_key?'':group.category_key);setWorkPage(0);}}>
              <strong>{group.display_label}</strong><span>{group.item_count.toLocaleString()} {group.category_type==='media'?'筆多媒體':'項作品'}</span>
            </button>)}
          </div>:null}
          {selectedWorkGroup?<section className='scope-v2-culture-source-detail' aria-label={selectedWorkGroup.display_label+'列表'}>
            <header><h4>{selectedWorkGroup.display_label} · {selectedSourceCount.toLocaleString()} {selectedWorkGroup.category_type==='media'?'筆多媒體':'項作品'}</h4>
              <button type='button' className='scope-v2-pagination-button' onClick={()=>setSelectedWorkSource('')}>收合列表</button>
            </header>
            {periodWorksQuery.isPending?<p className='scope-v2-status'>載入{selectedWorkGroup?.category_type==='media'?'多媒體':'作品'}第 {workPage+1} 頁…</p>:null}
            {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
            <div className='scope-v2-culture-source-work-scroll'>
              {(periodWorksQuery.data?.rows||[]).map((work,index)=>{
                const isMedia=work.entry_type==='media_metadata';
                return <article className='scope-v2-inline-card' key={work.media_id||work.galaxy_id||work.work_id||work.source_id||String(work.created_at)+'-'+index}>
                  <div className='scope-v2-culture-work-heading'><strong>{isMedia?'多媒體項目':work.title||work.work_id||'未命名作品'}</strong><time>{work.display_date||formatCultureDateTime(work.created_at)}</time></div>
                  {work.description?<p>{work.description}</p>:null}
                  {isMedia?<p className='scope-v2-culture-work-meta-description'><strong>metadata：</strong>{work.media_metadata_text}</p>:null}
                  {!isMedia&&work.meta_tags?<span className='scope-v2-meta'>{work.meta_tags}</span>:null}
                  {!isMedia&&(work.url||work.source_ref)?<a href={work.url||work.source_ref} target='_blank' rel='noreferrer'>查看來源</a>:null}
                </article>;
              })}
            </div>
            {!periodWorksQuery.isPending&&!periodWorksQuery.error&&!(periodWorksQuery.data?.rows||[]).length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
            <nav className='scope-v2-culture-source-pages' aria-label={selectedWorkGroup.category_type==='media'?'多媒體分頁':'作品分頁'}>
              <button type='button' className='scope-v2-pagination-button' disabled={workPage<=0||periodWorksQuery.isPending} onClick={()=>setWorkPage(page=>Math.max(0,page-1))}>上一頁</button>
              <span>第 {workPage+1} / {workPageCount} 頁</span>
              <button type='button' className='scope-v2-pagination-button' disabled={workPage+1>=workPageCount||periodWorksQuery.isPending} onClick={()=>setWorkPage(page=>Math.min(workPageCount-1,page+1))}>下一頁</button>
            </nav>
          </section>:null}
        </section>:null}
      </>:null}
    </section>
  </FeaturePageV2>;
}
