'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {selectScopeCultureData} from '../../loc/neon-culture-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {CULTURE_OVERVIEW_LABEL,cultureDefaultPeriod,isCultureOverview} from '../culture-policy.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

function labelOf(item,index){return item?.display_label||item?.name||item?.title||item?.period||'時期 '+(index+1);}
function rowsOf(data){
  const rows=[...(data?.authorEras?.eras?.length?data.authorEras.eras:data?.eras?.eras||[])];
  return rows.sort((a,b)=>Number(a.order||0)-Number(b.order||0));
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
    setSelectedPeriod(scopeId==='lo3rwang'?CULTURE_OVERVIEW_LABEL:cultureDefaultPeriod(rows));
  },[rows,navigation.period,scopeId]);

  const overview=isCultureOverview(selectedPeriod);
  const selected=overview?null:rows.find(item=>periodKey(item)===String(selectedPeriod))||null;
  const visibleRows=overview?rows:(selected?[selected]:[]);

  return <section className='loc-view'>
    <h1>文化</h1>
    <p className='loc-subtitle'>{scopeFeatureSubtitleV2(scopeId,'culture')}</p>
    {query.isPending?<p className='scope-v2-status'>載入時間長河…</p>:null}
    {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error&&!rows.length?<p className='scope-v2-status'>{FEATURE_EMPTY_MESSAGE}</p>:null}
    {!query.isPending&&!query.error&&rows.length?<>
      <label className='scope-v2-culture-period-select'>
        <span>時期</span>
        <select className='scope-v2-select' value={selectedPeriod} onChange={event=>setSelectedPeriod(event.target.value)}>
          <option value={CULTURE_OVERVIEW_LABEL}>{CULTURE_OVERVIEW_LABEL}</option>
          {rows.map((item,index)=><option key={periodKey(item)||index} value={periodKey(item)}>{labelOf(item,index)}</option>)}
        </select>
      </label>
      {selected?.description?<p className='scope-v2-culture-period-description'>{selected.description}</p>:null}
      <CultureTimelineV2 items={visibleRows} labelOf={labelOf} focus={navigation} mode={overview?'overview':'period'} />
    </>:null}
  </section>;
}
