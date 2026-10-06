'use client';

import dynamic from 'next/dynamic';
import {Suspense} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {getScope} from '../modular/scope-registry';
import {selectScopeConfig} from './scope-data';
import AboutView from './views/AboutView';
import AuthorHomeView from './views/AuthorHomeView';
import AdminHomeView from './views/AdminHomeView';
import Statistics from '../modular/features/Statistics';
import Culture from '../modular/features/Culture';
import Search from '../modular/features/Search';
import Governance from '../modular/features/Governance';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const RunesHomeView=dynamic(()=>import('../lrunes/RunesClient'),{loading});
const GameView=dynamic(()=>import('../lrunes/game/GameView'),{ssr:false,loading});
const ManagementView=dynamic(()=>import('./GovernanceManagement'),{loading});

const VIEWS={
  game:GameView,
  statics:Statistics,
  culture:Culture,
  search:Search,
  governance:Governance,
  manage:ManagementView
};
const HOME_VIEWS={loc:AboutView,lrunes:RunesHomeView,lo3rwang:AuthorHomeView,admin:AdminHomeView};
const FEATURE_FLAGS=Object.freeze({
  search:'search_able',
  statics:'statistics_able',
  culture:'culture_able'
});

function FeatureGate({scopeId,view,children}){
  const flag=FEATURE_FLAGS[view]||'';
  const scope=getScope(scopeId);
  const enabled=Boolean(flag)&&!scope.aggregateChildren&&scope.id!=='admin';
  const query=useQuery({
    queryKey:['scope-public-config',scopeId],
    queryFn:()=>selectScopeConfig(scopeId),
    staleTime:60_000,
    enabled
  });
  if(!enabled)return children;
  if(query.isPending)return <div className="loc-loading">載入功能設定…</div>;
  if(query.data?.[flag]===false)return <main className="scope-main"><section className="scope-page"><section className="loc-card"><p className="scope-status">此功能目前未公開。</p></section></section></main>;
  return children;
}

export default function LocApp({forcedView='home',forcedSection=null,forcedScope=null}){
  const {scopeId}=useScopeRuntime();
  const scope=forcedScope||scopeId;
  const ActiveView=forcedView==='home'
    ?HOME_VIEWS[scope]||AboutView
    :VIEWS[forcedView]||AboutView;

  return <div className="loc-next-main" data-loc-scope={scope} data-loc-view={forcedView}>
    <Suspense fallback={<div className="loc-loading">載入頁面…</div>}>
      <FeatureGate scopeId={scope} view={forcedView}>
        <ActiveView section={forcedSection}/>
      </FeatureGate>
    </Suspense>
  </div>;
}
