'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useInfiniteQuery,useQuery} from '@tanstack/react-query';
import {selectAuthorPeriodWorkCounts,selectAuthorPeriodWorks,selectScopeCultureData} from '../../loc/neon-culture-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {CULTURE_OVERVIEW_LABEL,cultureDefaultPeriod,isCultureOverview} from '../culture-policy.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {groupWorksByWeekAndSource} from '../modules/culture-timeline/culture-timeline-model.mjs';
import CultureTimelineEditor from './CultureTimelineEditor';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';

function labelOf(item,index){return item?.display_label||item?.name||item?.title||item?.period||'時期 '+(index+1);}
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
function periodKey(item){return String(item?.period||item?.era_id||'');}
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
  const [selectedPeriod,setSelectedPeriod]=useState(CULTURE_OVERVIEW_LABEL);
  const [viewMode,setViewMode]=useState('periods');
  const [selectedEntryId,setSelectedEntryId]=useState('');
  const [groupVisibleCounts,setGroupVisibleCounts]=useState({});

  useEffect(()=>{
    if(!rows.length){setSelectedPeriod(CULTURE_OVERVIEW_LABEL);return;}
    const requested=String(navigation.period||'');
    if(requested&&rows.some(item=>periodKey(item)===requested)){setSelectedPeriod(requested);return;}
    setSelectedPeriod(scopeId==='loc'?CULTURE_OVERVIEW_LABEL:cultureDefaultPeriod(rows));
  },[rows,navigation.period,scopeId]);

  const overview=isCultureOverview(selectedPeriod);
  const selected=overview?null:rows.find(item=>periodKey(item)===String(selectedPeriod))||null;
  const currentRows=useMemo(()=>{
    if(scopeId!=='loc')return [];
    const byScope=['lo3rwang','runes'].map(id=>{
      const scoped=rows.filter(item=>String(item?.scope_id||'')===id);
      return scoped.find(item=>String(item?.status||'').toLowerCase()==='current')||scoped.at(-1)||null;
    }).filter(Boolean);
    return byScope;
  },[scopeId,rows]);
  const currentAuthorPeriod=scopeId==='loc'?currentRows.find(item=>item.scope_id==='lo3rwang')||null:null;
  const authorPeriods=rows.filter(item=>item.scope_id==='lo3rwang');
  const activePeriod=scopeId==='loc'?authorPeriods.find(item=>periodKey(item)===selectedPeriod)||currentAuthorPeriod:selected;
  const periodWorksQuery=useInfiniteQuery({
    queryKey:['culture-period-works',scopeId,activePeriod?.period,activePeriod?.start_date,activePeriod?.end_date],
    queryFn:({pageParam=0})=>selectAuthorPeriodWorks({startDate:activePeriod?.start_date,endDate:activePeriod?.end_date,limit:100,pageOffset:pageParam}),
    initialPageParam:0,
    getNextPageParam:lastPage=>lastPage.hasMore?lastPage.nextOffset:undefined,
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&viewMode==='works'&&Boolean(activePeriod?.start_date),
    staleTime:5*60_000
  });
  const periodWorkCountsQuery=useQuery({
    queryKey:['culture-period-work-counts',activePeriod?.period,activePeriod?.start_date,activePeriod?.end_date],
    queryFn:()=>selectAuthorPeriodWorkCounts({startDate:activePeriod?.start_date,endDate:activePeriod?.end_date}),
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&viewMode==='works'&&Boolean(activePeriod?.start_date),
    staleTime:5*60_000
  });
  const loadedWorks=useMemo(()=>periodWorksQuery.data?.pages.flatMap(page=>page.rows)||[],[periodWorksQuery.data]);
  const timelineWorks=useMemo(
    ()=>scopeId==='loc'?uniqueInterleavedWorks(loadedWorks):loadedWorks,
    [scopeId,loadedWorks]
  );
  const detailTimeline=useMemo(()=>{
    if(viewMode!=='works'||!activePeriod||((scopeId!=='lo3rwang'||!selected)&&scopeId!=='loc'))return [];
    const counts=new Map((periodWorkCountsQuery.data||[]).map(row=>[
      `${row.source}:${String(row.week_start).slice(0,10)}`,
      Number(row.work_count)||0
    ]));
    return groupWorksByWeekAndSource(timelineWorks).map(group=>{
      const hasCount=counts.has(group.id);
      const count=hasCount?counts.get(group.id):null;
      return {...group,work_count:count??0,display_label:hasCount?`${group.source} ${count} 篇`:group.source};
    });
  },[viewMode,scopeId,selected,activePeriod,timelineWorks,periodWorkCountsQuery.data]);
  useEffect(()=>{
    if(viewMode!=='works'||!periodWorksQuery.hasNextPage||periodWorksQuery.isFetchingNextPage)return;
    const sentinel=document.querySelector('[data-culture-work-sentinel]');
    if(!sentinel)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))periodWorksQuery.fetchNextPage();
    },{rootMargin:'240px'});
    observer.observe(sentinel);
    return()=>observer.disconnect();
  },[viewMode,periodWorksQuery.hasNextPage,periodWorksQuery.isFetchingNextPage,periodWorksQuery.fetchNextPage,detailTimeline.length]);
  useEffect(()=>{
    if(viewMode!=='works')return;
    const sentinels=[...document.querySelectorAll('[data-culture-group-key]')];
    if(!sentinels.length)return;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const groupId=entry.target.getAttribute('data-culture-group-key');
        if(groupId)setGroupVisibleCounts(current=>({...current,[groupId]:(current[groupId]||10)+10}));
      }
    },{rootMargin:'120px'});
    sentinels.forEach(sentinel=>observer.observe(sentinel));
    return()=>observer.disconnect();
  },[viewMode,detailTimeline]);
  useEffect(()=>{setGroupVisibleCounts({})},[scopeId,selectedPeriod,viewMode]);
  const periodViewItems=(query.data?.timelineItems||[]).filter(item=>scopeId==='loc'||item.scope_id===scopeId);

  return <FeaturePageV2 featureId="culture">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Time River</p>
      <h2>時間長河</h2>
      {query.isPending?<p className='scope-v2-status'>載入時間長河…</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!rows.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&rows.length?<>
        <label className='scope-v2-culture-period-select'>
          <span>檢視</span>
          <select className='scope-v2-select' value={viewMode} onChange={event=>setViewMode(event.target.value)}>
            <option value='periods'>時期表示</option>
            <option value='works' disabled={scopeId==='runes'}>時期內的作品列表</option>
          </select>
        </label>
        {viewMode==='periods'?<>
          <CultureTimelineV2 items={periodViewItems} labelOf={item=>item.display_label||item.title} focus={navigation} mode='period' onSelect={item=>setSelectedEntryId(item?.entry_id||'')} />
          <CultureTimelineEditor scopeId={scopeId} selectedEntryId={selectedEntryId}/>
        </>:<>
          <label className='scope-v2-culture-period-select'>
            <span>時期</span>
            <select className='scope-v2-select' value={periodKey(activePeriod)||''} onChange={event=>setSelectedPeriod(event.target.value)}>
              {authorPeriods.map((item,index)=><option key={periodKey(item)||index} value={periodKey(item)}>{labelOf(item,index)}</option>)}
            </select>
          </label>
          {periodWorksQuery.isPending?<p className='scope-v2-status'>載入時期文字作品…</p>:null}
          {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
          {periodWorkCountsQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorkCountsQuery.error)}</p>:null}
          {!periodWorksQuery.isPending&&!periodWorksQuery.error&&!detailTimeline.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
          {detailTimeline.map(group=><section className='scope-v2-card' key={group.id}>
            <h3>{group.display_label}</h3>
            <p>{group.week_start.slice(0,10)} – {group.week_end.slice(0,10)}</p>
            {group.works.slice(0,groupVisibleCounts[group.id]||10).map((work,index)=><article className='scope-v2-inline-card' key={work.galaxy_id||work.work_id||`${work.created_at}-${index}`}>
              <strong>{work.title||work.work_id||'文字紀錄'}</strong>
              <span>{work.created_at||''}</span>
              {work.url||work.source_ref?<a href={work.url||work.source_ref} target='_blank' rel='noreferrer'>查看來源</a>:null}
            </article>)}
            {group.works.length>(groupVisibleCounts[group.id]||10)?<div className='scope-v2-load-sentinel' data-culture-group-key={group.id}/>:null}
          </section>)}
          {periodWorksQuery.hasNextPage?<div className='scope-v2-load-sentinel' data-culture-work-sentinel>{periodWorksQuery.isFetchingNextPage?'讀取中…':''}</div>:null}
        </>}
      </>:null}
    </section>

  </FeaturePageV2>;
}
