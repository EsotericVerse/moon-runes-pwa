'use client';

import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectScopeCultureData} from '../../loc/neon-culture-client';
import CultureTimelineV2 from '../modules/culture-timeline/CultureTimelineV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

function labelOf(item,index){return item?.display_label||item?.name||item?.title||item?.period||`時期 ${index+1}`;}
function rowsOf(data){
  return [...(data?.authorEras?.eras?.length?data.authorEras.eras:data?.eras?.eras||[])]
    .sort((a,b)=>Number(a.order||0)-Number(b.order||0));
}
export default function CultureV2(){
  const {scopeId}=useScopeRuntimeV2();
  const query=useQuery({queryKey:['culture-timeline',scopeId],queryFn:()=>selectScopeCultureData(scopeId),staleTime:5*60_000});
  const rows=useMemo(()=>rowsOf(query.data),[query.data]);

  return <section className="loc-view">
    <h1>文化</h1>
    {query.isPending?<p className="scope-v2-status">載入時間長河…</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}
    {!query.isPending&&!query.error?<CultureTimelineV2 items={rows} labelOf={labelOf}/>:null}
  </section>;
}
