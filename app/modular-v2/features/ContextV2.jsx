'use client';

import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {selectScopeContextData} from '../../loc/neon-context-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import ContextGraphV2 from '../modules/context-graph/ContextGraphV2';
import ContextWorkbenchV2 from './ContextWorkbenchV2';
import ContextStyleManager from './ContextStyleManager';
import FeaturePageV2 from '../FeaturePageV2';

export default function ContextV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useQuery({
    queryKey:['context-graph',scopeId],
    queryFn:()=>selectScopeContextData(scopeId),
    staleTime:5*60_000
  });
  const graph=query.data||{nodes:[],edges:[]};
  const hasGraph=Boolean(graph.nodes?.length&&graph.edges?.length);

  return <FeaturePageV2 featureId="context">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Graph</p>
      <h2>關係圖</h2>
      {query.isPending?<p className='scope-v2-status'>載入 Graph…</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {scopeId==='loc'?<ContextWorkbenchV2 scopeId={scopeId} rows={query.data?.rows||[]} focusIdentity={navigation.identity}/>:null}
      {scopeId!=='loc'&&!query.isPending&&!hasGraph?<ContextWorkbenchV2 scopeId={scopeId} rows={query.data?.rows||[]} focusIdentity={navigation.identity}/>:null}
      {scopeId!=='loc'&&hasGraph?<ContextGraphV2 nodes={graph.nodes} edges={graph.edges} focusIdentity={navigation.identity}/>:null}
      {scopeId==='lo3rwang'?<ContextStyleManager scopeId={scopeId}/>:null}
    </section>

  </FeaturePageV2>;
}