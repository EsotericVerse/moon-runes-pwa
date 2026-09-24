'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {selectAuthorPeriodWorks,selectScopeCultureData} from '../../loc/neon-culture-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {CULTURE_OVERVIEW_LABEL,cultureDefaultPeriod,isCultureOverview} from '../culture-policy.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

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

export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({queryKey:['culture-timeline',scopeId],queryFn:()=>selectScopeCultureData(scopeId),staleTime:5*60_000});
  const rows=useMemo(()=>rowsOf(query.data),[query.data]);
  const [selectedPeriod,setSelectedPeriod]=useState(CULTURE_OVERVIEW_LABEL);

  useEffect(()=>{
    if(!rows.length){setSelectedPeriod(CULTURE_OVERVIEW_LABEL);return;}
    const requested=String(navigation.period||'');
    if(requested&&rows.some(item=>periodKey(item)===requested)){setSelectedPeriod(requested);return;}
    setSelectedPeriod(scopeId==='loc'||scopeId==='lo3rwang'?CULTURE_OVERVIEW_LABEL:cultureDefaultPeriod(rows));
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
  const visibleRows=scopeId==='loc'?currentRows:(overview?rows:(selected?[selected]:[]));
  const periodWorksQuery=useQuery({
    queryKey:['culture-period-works',scopeId,selected?.start_date,selected?.end_date],
    queryFn:()=>selectAuthorPeriodWorks({startDate:selected?.start_date,endDate:selected?.end_date,limit:200}),
    enabled:scopeId==='lo3rwang'&&Boolean(selected?.start_date),
    staleTime:5*60_000
  });
  const detailTimeline=useMemo(()=>{
    if(scopeId!=='lo3rwang'||!selected)return [];
    const start=String(selected.start_date||'');
    const end=String(selected.end_date||'9999-12-31');
    const inRange=item=>{
      const itemStart=String(item?.start_date||item?.date||'');
      const itemEnd=String(item?.end_date||itemStart||'');
      return itemStart&&itemEnd>=start&&itemStart<=end;
    };
    return [
      ...(query.data?.events||[]).filter(inRange),
      ...(query.data?.trajectories||[]).filter(inRange),
      ...(periodWorksQuery.data||[])
    ];
  },[scopeId,selected,query.data,periodWorksQuery.data]);

  return <section className='loc-view'>
    <h1>文化</h1>
    <p className='loc-subtitle'>{scopeFeatureSubtitleV2(scopeId,'culture')}</p>
    {scopeId==='loc'?<section className='loc-card'>
      <p className='loc-eyebrow'>Culture</p>
      <h2>文化</h2>
      <p>文化，是文字的演化。文字留下風格，風格經過時間累積，才看得見文字風格的變化。</p>
      <div className='home-author-copy'>
        <p>LOC 把脈絡重新放回時間中，透過時期、事件、趨勢與語彙軌跡的綜合分析，觀察語言如何累積、改變的趨勢，找出延伸的未來可能性。</p>
        <p>過去可以整理，沒有人可以知道未來，現在還在手上。不是替未來下定論，而是治理已知、觀察演化，再推演的可能性。</p>
        <p><a href='/statics'>排行榜</a>可先看全部，再切 Facebook、Threads、Suno，並依來源與時期觀察語彙變化。</p>
      </div>
      <div className='home-progress-grid' aria-label='文化搜尋、治理與演化'>
        <article className='home-progress-item'><strong>結合搜尋跟脈絡圖關聯</strong><span>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。</span></article>
        <article className='home-progress-item'><strong>治理、管理</strong><span>授權內容可用全文做搜尋與分析；公開結果則依內容治理決定顯示全文、片段或僅 metadata。Facebook、Threads 預設只顯示片段，歌詞不直接公開全文；系統並以治理管理文件約束資料權責、版權與公開邊界。</span></article>
      </div>
    </section>:null}
    {query.isPending?<p className='scope-v2-status'>載入時間長河…</p>:null}
    {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error&&!rows.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
    {!query.isPending&&!query.error&&rows.length?<>
      {scopeId!=='loc'?<label className='scope-v2-culture-period-select'>
        <span>時期</span>
        <select className='scope-v2-select' value={selectedPeriod} onChange={event=>setSelectedPeriod(event.target.value)}>
          <option value={CULTURE_OVERVIEW_LABEL}>{CULTURE_OVERVIEW_LABEL}</option>
          {rows.map((item,index)=><option key={periodKey(item)||index} value={periodKey(item)}>{labelOf(item,index)}</option>)}
        </select>
      </label>:null}
      {selected?.description?<p className='scope-v2-culture-period-description'>{selected.description}</p>:null}
      <CultureTimelineV2 items={visibleRows} labelOf={labelOf} focus={navigation} mode={overview?'overview':'period'} />
      {scopeId==='lo3rwang'&&selected?<>
        <h2>文字軌跡</h2>
        {periodWorksQuery.isPending?<p className='scope-v2-status'>載入時期文字作品…</p>:null}
        {periodWorksQuery.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(periodWorksQuery.error)}</p>:null}
        {!periodWorksQuery.isPending&&!periodWorksQuery.error&&!detailTimeline.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
        {detailTimeline.length?<CultureTimelineV2
          items={detailTimeline}
          labelOf={(item)=>item?.title||item?.name||item?.work_id||'文字紀錄'}
          focus={navigation}
          mode='period'
        />:null}
      </>:null}
    </>:null}
  </section>;
}
