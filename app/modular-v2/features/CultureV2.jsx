'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  selectAuthorPeriodWorkSources,
  selectAuthorPeriodWorks,
  selectScopeClassificationBuckets,
  selectScopeCultureData,
  selectScopeStyleGroups,
  selectScopeStyleWorks
} from '../../loc/neon-culture-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import CultureVolumeGraph3D from '../modules/culture-timeline/CultureVolumeGraph3D';
import {formatCultureDateTime} from '../modules/culture-timeline/culture-timeline-model.mjs';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';

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
function matchesCurrentMarker(item,current){
  const samePeriod=current?.period&&item?.period&&String(item.period)===String(current.period);
  const identity=String(current?.era_id||'');
  const sameIdentity=identity&&[item?.era_id,item?.entry_key,item?.id].some(value=>String(value||'')===identity);
  const sameRune=Number(current?.rune_count)>0&&Number(item?.rune_count)===Number(current.rune_count);
  const sameTitle=String(item?.title||'')===String(current?.title||'');
  const sameDate=String(item?.start_date||item?.end_date||'').slice(0,10)===String(current?.start_date||current?.end_date||'').slice(0,10);
  return Boolean(samePeriod||sameIdentity||sameRune||(sameTitle&&sameDate));
}
function timelineFromCurrent(items,currentByScope){
  return (Array.isArray(items)?items:[]).filter(item=>{
    const current=currentByScope.get(String(item?.scope_id||''));
    if(!current)return true;
    const type=String(item?.entry_type||'');
    if(type==='period'||type==='period_legacy')return matchesCurrentMarker(item,current);
    if(!['anchor','event','style'].includes(type))return false;
    const currentTime=Date.parse(current?.start_date||current?.end_date||current?.date||'');
    const itemTime=Date.parse(item?.start_date||item?.end_date||item?.date||'');
    return !Number.isNaN(currentTime)&&!Number.isNaN(itemTime)&&itemTime>=currentTime;
  }).map(item=>currentByScope.has(String(item?.scope_id||''))
    ?{...item,group_label:String(item.scope_id)}
    :item
  );
}
function externalSourceHref(work){
  const value=String(work?.url||work?.media_link||work?.source_ref||'').trim();
  return /^https?:\/\//i.test(value)?value:'';
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
  const [cultureView,setCultureView]=useState('river');
  const [classificationMode,setClassificationMode]=useState(scopeId==='lunarunes'?'style':'source');
  const [styleLevel,setStyleLevel]=useState('label');
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
  const classificationScope=scopeId==='lunarunes'?'lunarunes':'lo3rwang';
  const primaryPeriods=scopeId==='lunarunes'?allRunePeriods:allAuthorPeriods;
  const primaryCurrent=scopeId==='lunarunes'?currentRunePeriod:currentAuthorPeriod;
  const selectedWorkPeriod=activeWorkPeriod||primaryCurrent||periodRange(primaryPeriods,classificationScope);

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
    enabled:(scopeId==='lo3rwang'||scopeId==='loc')&&visibleAuthorPeriods.length>0,
    staleTime:5*60_000
  });

  const sourceGroupsQuery=useQuery({
    queryKey:['culture-period-work-sources',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date],
    queryFn:()=>selectAuthorPeriodWorkSources({
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date
    }),
    enabled:classificationMode==='source'&&classificationScope==='lo3rwang'&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });

  const styleGroupsQuery=useQuery({
    queryKey:['culture-period-style-groups',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,styleLevel],
    queryFn:()=>selectScopeStyleGroups(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date,
      styleLevel
    }),
    enabled:classificationMode==='style'&&Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });

  const classificationBucketsQuery=useQuery({
    queryKey:['culture-classification-buckets',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,classificationMode,styleLevel],
    queryFn:()=>selectScopeClassificationBuckets(classificationScope,{
      startDate:selectedWorkPeriod?.start_date,
      endDate:selectedWorkPeriod?.end_date,
      dimension:classificationMode,
      styleLevel
    }),
    enabled:Boolean(selectedWorkPeriod?.start_date),
    staleTime:5*60_000
  });

  const categoryGroups=classificationMode==='source'?(sourceGroupsQuery.data||[]):(styleGroupsQuery.data||[]);
  const categoryQuery=classificationMode==='source'?sourceGroupsQuery:styleGroupsQuery;
  const selectedGroup=categoryGroups.find(item=>item.category_key===selectedCategory)||null;
  const selectedCount=Number(selectedGroup?.item_count)||0;
  const workPageCount=Math.max(1,Math.ceil(selectedCount/CULTURE_WORK_PAGE_SIZE));

  const periodWorksQuery=useQuery({
    queryKey:['culture-period-works',classificationScope,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date,classificationMode,styleLevel,selectedCategory,workPage],
    queryFn:()=>classificationMode==='source'
      ?selectAuthorPeriodWorks({
        startDate:selectedWorkPeriod?.start_date,
        endDate:selectedWorkPeriod?.end_date,
        sourceName:selectedGroup?.source_name,
        limit:CULTURE_WORK_PAGE_SIZE,
        pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
      })
      :selectScopeStyleWorks(classificationScope,{
        startDate:selectedWorkPeriod?.start_date,
        endDate:selectedWorkPeriod?.end_date,
        styleName:selectedGroup?.style_name,
        styleLevel,
        limit:CULTURE_WORK_PAGE_SIZE,
        pageOffset:workPage*CULTURE_WORK_PAGE_SIZE
      }),
    enabled:Boolean(selectedWorkPeriod?.start_date&&selectedGroup),
    staleTime:5*60_000
  });

  useEffect(()=>{
    setClassificationMode(scopeId==='lunarunes'?'style':'source');
    setStyleLevel('label');
    setSelectedCategory('');
    setWorkPage(0);
    setActiveWorkPeriod(null);
  },[scopeId]);

  useEffect(()=>{
    setSelectedCategory('');
    setWorkPage(0);
  },[classificationMode,styleLevel,selectedWorkPeriod?.period,selectedWorkPeriod?.start_date,selectedWorkPeriod?.end_date]);

  const periodVolumeByStart=useMemo(()=>new Map((periodVolumesQuery.data||[]).map(group=>[
    String(group.period?.start_date||'').slice(0,10),
    (group.sources||[]).reduce((sum,row)=>sum+(Number(row.item_count)||0),0)
  ])),[periodVolumesQuery.data]);

  const timelineItems=useMemo(()=>{
    const items=(query.data?.timelineItems||[]).filter(item=>scopeId==='loc'||item.scope_id===scopeId);
    const visible=currentRows.length?timelineFromCurrent(items,currentByScope):items;
    return visible.map(item=>{
      if(item.scope_id!=='lo3rwang'||item.entry_type!=='period')return item;
      const workCount=periodVolumeByStart.get(String(item.start_date||'').slice(0,10));
      return workCount===undefined?item:{...item,work_count:workCount};
    });
  },[query.data,currentRows,currentByScope,scopeId,periodVolumeByStart]);

  const classificationBuckets=classificationBucketsQuery.data||[];

  return <FeaturePageV2 featureId="culture">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Time River</p>
      <h2>時間長河</h2>
      {query.isPending?<p className='scope-v2-status'>載入時間長河…</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {!query.isPending&&!query.error&&!timelineItems.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
      {!query.isPending&&!query.error&&timelineItems.length?<>
        {(scopeId==='lo3rwang'||scopeId==='loc')?<div className='scope-v2-tabs scope-v2-culture-view-toggle' role='group' aria-label='時間長河顯示方式'>
          <button type='button' aria-pressed={cultureView==='river'} onClick={()=>setCultureView('river')}>時間長河</button>
          <button type='button' aria-pressed={cultureView==='volume3d'} onClick={()=>{setCultureView('volume3d');setClassificationMode('source');}}>3D 時期與作品量</button>
        </div>:null}

        {cultureView==='volume3d'&&(scopeId==='lo3rwang'||scopeId==='loc')
          ?<CultureVolumeGraph3D
            periods={periodVolumesQuery.data||[]}
            timelineItems={timelineItems}
            categories={sourceGroupsQuery.data||[]}
            selectedCategory={classificationMode==='source'?selectedCategory:''}
            selectedCategoryType={classificationMode==='source'?selectedGroup?.category_type||'':''}
            categoryLoading={sourceGroupsQuery.isFetching}
            categoryError={sourceGroupsQuery.error?featureDataErrorMessage(sourceGroupsQuery.error):''}
            works={classificationMode==='source'?(periodWorksQuery.data?.rows||[]):[]}
            workPage={workPage}
            workPageCount={workPageCount}
            workLoading={periodWorksQuery.isFetching}
            workError={periodWorksQuery.error?featureDataErrorMessage(periodWorksQuery.error):''}
            loading={periodVolumesQuery.isFetching}
            error={periodVolumesQuery.error?featureDataErrorMessage(periodVolumesQuery.error):''}
            onSelectCategory={value=>{setSelectedCategory(value);setWorkPage(0);}}
            onPageChange={setWorkPage}
            onSelectWorkPoint={point=>{
              if(point?.period){setActiveWorkPeriod(point.period);setSelectedCategory(point.category_key||'');setWorkPage(0);}
            }}
          />
          :<>
            <CultureTimelineV2
              items={timelineItems}
              labelOf={item=>item.display_label||item.title}
              focus={navigation}
              mode={currentRows.length?'current':'overview'}
            />

            {selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-classification-river'>
              <p className='loc-eyebrow'>Classification River</p>
              <h3>{labelOf(selectedWorkPeriod,0)}｜作品分類河道</h3>
              <div className='scope-v2-tabs' role='group' aria-label='作品分類方式'>
                <button type='button' aria-pressed={classificationMode==='source'} onClick={()=>setClassificationMode('source')}>作品來源</button>
                <button type='button' aria-pressed={classificationMode==='style'} onClick={()=>setClassificationMode('style')}>風格</button>
              </div>
              {classificationMode==='style'?<div className='scope-v2-tabs' role='group' aria-label='風格分類層級'>
                <button type='button' aria-pressed={styleLevel==='label'} onClick={()=>setStyleLevel('label')}>風格標籤</button>
                <button type='button' aria-pressed={styleLevel==='group'} onClick={()=>setStyleLevel('group')}>風格大群組</button>
              </div>:null}
              {classificationBucketsQuery.isPending?<p className='scope-v2-status'>載入分類河道…</p>:null}
              {classificationBucketsQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(classificationBucketsQuery.error)}</p>:null}
              {!classificationBucketsQuery.isPending&&!classificationBucketsQuery.error&&!classificationBuckets.length
                ?<p className='scope-v2-status'>{classificationMode==='source'&&classificationScope==='lunarunes'?'此 Scope 沒有作品來源分類。':'目前沒有此分類資料。'}</p>:null}
              {classificationBuckets.length?<CultureTimelineV2
                items={classificationBuckets}
                labelOf={item=>item.display_label||item.group_label}
                focus={{}}
                mode='overview'
              />:null}
            </section>:null}

            {selectedWorkPeriod?<section className='scope-v2-card scope-v2-culture-current-works'>
              <p className='loc-eyebrow'>Classification</p>
              <h3>{labelOf(selectedWorkPeriod,0)}｜{classificationMode==='source'?'作品來源':'風格分類'}</h3>
              <p>{classificationMode==='source'
                ?'來源名稱是匯入時自訂的字串；相同名稱會直接視為同一來源。'
                :(styleLevel==='label'?'風格標籤是小群組名稱。':'風格大群組彙整多個風格標籤。')}</p>
              {categoryQuery.isPending?<p className='scope-v2-status'>載入分類統計…</p>:null}
              {categoryQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(categoryQuery.error)}</p>:null}
              {!categoryQuery.isPending&&!categoryQuery.error&&!categoryGroups.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
              {categoryGroups.length?<div className='scope-v2-culture-source-groups' aria-label='作品分類'>
                {categoryGroups.map(group=><button type='button' key={group.category_key}
                  className='scope-v2-culture-source-button'
                  aria-pressed={selectedCategory===group.category_key}
                  onClick={()=>{setSelectedCategory(selectedCategory===group.category_key?'':group.category_key);setWorkPage(0);}}>
                  <strong>{group.display_label}</strong><span>{Number(group.item_count||0).toLocaleString()} 項作品</span>
                </button>)}
              </div>:null}

              {selectedGroup?<section className='scope-v2-culture-source-detail' aria-label={selectedGroup.display_label+'列表'}>
                <header>
                  <h4>{selectedGroup.display_label} · {selectedCount.toLocaleString()} 項作品</h4>
                  <button type='button' className='scope-v2-pagination-button' onClick={()=>setSelectedCategory('')}>收合列表</button>
                </header>
                {periodWorksQuery.isPending?<p className='scope-v2-status'>載入第 {workPage+1} 頁…</p>:null}
                {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
                <div className='scope-v2-culture-source-work-scroll'>
                  {(periodWorksQuery.data?.rows||[]).map((work,index)=><article className='scope-v2-inline-card' key={work.media_id||work.galaxy_id||work.record_id||work.source_id||String(work.created_at)+'-'+index}>
                    <div className='scope-v2-culture-work-heading'>
                      <strong>{work.title||work.galaxy_id||work.media_id||'未命名作品'}</strong>
                      <time>{work.display_date||formatCultureDateTime(work.created_at)}</time>
                    </div>
                    {classificationMode==='style'?<p>{work.style_label?('風格標籤：'+work.style_label):''}{work.style_group?(' · 大群組：'+work.style_group):''}</p>:null}
                    {externalSourceHref(work)?<a href={externalSourceHref(work)} target='_blank' rel='noreferrer'>查看來源</a>:null}
                  </article>)}
                </div>
                {!periodWorksQuery.isPending&&!periodWorksQuery.error&&!(periodWorksQuery.data?.rows||[]).length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
                <nav className='scope-v2-culture-source-pages' aria-label='作品分頁'>
                  <button type='button' className='scope-v2-pagination-button' disabled={workPage<=0||periodWorksQuery.isPending} onClick={()=>setWorkPage(page=>Math.max(0,page-1))}>上一頁</button>
                  <span>第 {workPage+1} / {workPageCount} 頁</span>
                  <button type='button' className='scope-v2-pagination-button' disabled={workPage+1>=workPageCount||periodWorksQuery.isPending} onClick={()=>setWorkPage(page=>Math.min(workPageCount-1,page+1))}>下一頁</button>
                </nav>
              </section>:null}
            </section>:null}
          </>}
      </>:null}
    </section>
  </FeaturePageV2>;
}
