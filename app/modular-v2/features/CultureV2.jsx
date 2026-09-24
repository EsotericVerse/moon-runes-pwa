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

  return <FeaturePageV2 featureId="culture">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Time River</p>
      <h2>時間長河</h2>
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
    </section>

  </FeaturePageV2>;
}
