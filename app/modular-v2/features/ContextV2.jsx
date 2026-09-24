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

  return <section className='loc-view'>
    <h1>脈絡</h1>
    <p className='loc-subtitle'>{scopeFeatureSubtitleV2(scopeId,'context')}</p>
    {scopeId==='loc'?<section className='loc-card'>
      <p className='loc-eyebrow'>Context</p>
      <h2>脈絡</h2>
      <p>關鍵詞的分析與交互的互動關係圖，才會知道種子長出根的方向。</p>
      <div className='home-author-copy'>
        <p>不只整理資料，而是讓文字可以被搜尋、比較、追蹤變化，再與原始內容比較，進而學習成長進步。</p>
        <p>藉由分析關聯性，找出情境、事件與互動關係圖，形成可觀察、可互動的脈絡。</p>
        <p>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿彼此的關係查看相關內容。</p>
        <p>不感興趣也沒關係！那來看看排行榜吧！這些詞也能直接回查命中的文章、作品與紀錄。</p>
      </div>
    </section>:null}
    <section className='loc-card scope-v2-feature-card scope-v2-feature-card-wide'>
      <p className='loc-eyebrow'>Graph</p>
      <h2>關係圖</h2>
      {query.isPending?<p className='scope-v2-status'>載入 Graph…</p>:null}
      {query.error?<p className='scope-v2-status scope-v2-error'>{featureDataErrorMessage(query.error)}</p>:null}
      {scopeId==='loc'?<ContextWorkbenchV2 scopeId={scopeId} rows={query.data?.rows||[]} focusIdentity={navigation.identity}/>:null}
      {scopeId!=='loc'&&!query.isPending&&!hasGraph?<ContextWorkbenchV2 scopeId={scopeId} rows={query.data?.rows||[]} focusIdentity={navigation.identity}/>:null}
      {scopeId!=='loc'&&hasGraph?<ContextGraphV2 nodes={graph.nodes} edges={graph.edges} focusIdentity={navigation.identity}/>:null}
    </section>
  </section>;
}
