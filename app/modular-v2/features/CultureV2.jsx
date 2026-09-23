'use client';

import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectScopeCultureData} from '../../loc/neon-culture-client';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

function labelOf(item,index){
  return item?.display_label||item?.name||item?.title||item?.period||`時期 ${index+1}`;
}

export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();
  const query=useQuery({
    queryKey:['culture-timeline',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
    staleTime:5*60_000
  });
  const rows=useMemo(()=>{
    const data=query.data||{};
    const source=data.authorEras?.eras?.length?data.authorEras.eras:data.eras?.eras||[];
    return [...source].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
  },[query.data]);

  return <FeaturePageV2 featureId="culture" subtitle={null}>
    {query.isPending?<p className="scope-v2-status">載入時間長河…</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}
    <ScopeCardV2 eyebrow="Culture" title="時間長河">
      <CultureTimelineV2 items={rows} labelOf={labelOf}/>
    </ScopeCardV2>
  </FeaturePageV2>;
}
