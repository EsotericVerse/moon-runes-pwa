'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useInfiniteQuery,useQuery} from '@tanstack/react-query';
import {selectAuthorPeriodWorks,selectScopeCultureData} from '../../loc/neon-culture-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
import CultureTimelineEditor from './CultureTimelineEditor';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';

const CULTURE_WORK_PAGE_SIZE=50;

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

  const currentRows=useMemo(()=>{
    const scopes=scopeId==='loc'?['lo3rwang','runes']:[scopeId].filter(Boolean);
    return scopes
      .map(id=>rows.find(item=>String(item?.scope_id||'')===id&&isCurrent(item)))
      .filter(Boolean);
  },[scopeId,rows]);
  const currentByScope=useMemo(()=>new Map(currentRows.map(item=>[String(item.scope_id||''),item])),[currentRows]);
  const currentAuthorPeriod=currentByScope.get('lo3rwang')||null;

  const periodWorksQuery=useInfiniteQuery({
    queryKey:['culture-current-period-works',scopeId,currentAuthorPeriod?.period,currentAuthorPeriod?.start_date,currentAuthorPeriod?.end_date],
    queryFn:({pageParam=0})=>selectAuthorPeriodWorks({
      startDate:currentAuthorPeriod?.start_date,
      endDate:currentAuthorPeriod?.end_date,
      limit:CULTURE_WORK_PAGE_SIZE,
      pageOffset:pageParam
    }),
    initialPageParam:0,
    getNextPageParam:lastPage=>lastPage.hasMore?lastPage.nextOffset:undefined,
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&Boolean(currentAuthorPeriod?.start_date),
    staleTime:5*60_000
  });
  const loadedWorks=useMemo(()=>periodWorksQuery.data?.pages.flatMap(page=>page.rows)||[],[periodWorksQuery.data]);
  const currentWorks=useMemo(
    ()=>scopeId==='loc'?uniqueInterleavedWorks(loadedWorks):loadedWorks,
    [scopeId,loadedWorks]
  );

  useEffect(()=>{
    if(!currentAuthorPeriod||!periodWorksQuery.hasNextPage||periodWorksQuery.isFetchingNextPage)return;
    const sentinel=document.querySelector('[data-culture-work-sentinel]');
    if(!sentinel)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))periodWorksQuery.fetchNextPage();
    },{rootMargin:'240px'});
    observer.observe(sentinel);
    return()=>observer.disconnect();
  },[currentAuthorPeriod,periodWorksQuery.hasNextPage,periodWorksQuery.isFetchingNextPage,periodWorksQuery.fetchNextPage,currentWorks.length]);

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
        <CultureTimelineV2
          items={timelineItems}
          labelOf={item=>item.display_label||item.title}
          focus={navigation}
          mode={currentRows.length?'current':'overview'}
          onSelect={item=>setSelectedEntryId(item?.entry_id||'')}
        />
        <CultureTimelineEditor scopeId={scopeId} selectedEntryId={selectedEntryId}/>

        {currentAuthorPeriod?<section className='scope-v2-card scope-v2-culture-current-works'>
          <p className='loc-eyebrow'>Current</p>
          <h3>{labelOf(currentAuthorPeriod,0)}｜Current 時期作品</h3>
          <p>按時間排列，每次載入 {CULTURE_WORK_PAGE_SIZE} 篇；往下捲動再讀取下一批。</p>
          {periodWorksQuery.isPending?<p className='scope-v2-status'>載入 Current 時期作品…</p>:null}
          {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
          {!periodWorksQuery.isPending&&!periodWorksQuery.error&&!currentWorks.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
          {currentWorks.map((work,index)=><article className='scope-v2-inline-card' key={work.galaxy_id||work.work_id||work.source_id||String(work.created_at)+'-'+index}>
            <strong>{work.title||work.work_id||'文字紀錄'}</strong>
            <span>{work.display_date||formatCultureDateTime(work.created_at)}</span>
            {work.meta_tags?<span className='scope-v2-meta'>{work.meta_tags}</span>:null}
            {work.url||work.source_ref?<a href={work.url||work.source_ref} target='_blank' rel='noreferrer'>查看來源</a>:null}
          </article>)}
          {periodWorksQuery.hasNextPage?<div className='scope-v2-load-sentinel' data-culture-work-sentinel>{periodWorksQuery.isFetchingNextPage?'讀取中…':''}</div>:null}
        </section>:null}
      </>:null}
    </section>
  </FeaturePageV2>;
}
