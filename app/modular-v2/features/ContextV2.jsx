'use client';

import {useMemo} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {selectRuneContextCatalog,selectScopeContextData} from '../../loc/neon-context-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import ContextGraphV2 from '../modules/context-graph/ContextGraphV2';
import ContextWorkbenchV2 from './ContextWorkbenchV2';
import ContextStyleManager from './ContextStyleManager';
import RuneContextV2 from './RuneContextV2';
import FeaturePageV2 from '../FeaturePageV2';

export default function ContextV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const isRuneScope=scopeId==='runes';
  const query=useQuery({
    queryKey:isRuneScope?['rune-context-catalog']:['context-graph',scopeId],
    queryFn:()=>isRuneScope?selectRuneContextCatalog():selectScopeContextData(scopeId),
    staleTime:5*60_000
  });
  const graph=query.data||{nodes:[],edges:[]};
  const hasGraph=Boolean(graph.nodes?.length&&graph.edges?.length);

  return <FeaturePageV2 featureId="context">
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>{isRuneScope?'LunaRunes Context':'Graph'}</p>
      <h2>{isRuneScope?'月之符文脈絡':'關係圖'}</h2>
      {query.isPending?<p className='scope-v2-status'>{isRuneScope?'載入符文…':'載入 Graph…'}</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {isRuneScope&&!query.isPending&&!query.error?<RuneContextV2 runes={query.data?.runes||[]}/>:null}
      {scopeId==='loc'?<ContextWorkbenchV2 scopeId={scopeId} rows={query.data?.rows||[]} focusIdentity={navigation.identity}/>:null}
      {scopeId!=='loc'&&!isRuneScope&&!query.isPending&&!hasGraph?<ContextWorkbenchV2 scopeId={scopeId} rows={query.data?.rows||[]} focusIdentity={navigation.identity}/>:null}
      {scopeId!=='loc'&&!isRuneScope&&hasGraph?<ContextGraphV2 nodes={graph.nodes} edges={graph.edges} focusIdentity={navigation.identity}/>:null}
      {scopeId==='lo3rwang'?<ContextStyleManager scopeId={scopeId}/>:null}
    </section>

  </FeaturePageV2>;
}