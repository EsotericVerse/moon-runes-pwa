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
import GenericScopeHomeView from './views/GenericScopeHomeView';
import ScopeGroupOverview from './ScopeGroupOverview';
import {FeaturePage} from '../modular/ui';
import Statistics from '../modular/features/Statistics';
import Culture from '../modular/features/Culture';
import Search from '../modular/features/Search';
import Governance from '../modular/features/Governance';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const RunesHomeView=dynamic(()=>import('../lrunes/RunesClient'),{loading});
const GameView=dynamic(()=>import('../lrunes/game/GameBoard'),{ssr:false,loading});
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

function FeatureGate({scopeId,scopeMeta=null,view,children}){
  const flag=FEATURE_FLAGS[view]||'';
  const scope=scopeMeta||getScope(scopeId);
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
  const runtime=useScopeRuntime();
  const scopeId=forcedScope||runtime.scopeId;
  const scopeMeta=forcedScope?getScope(forcedScope):runtime.scope;
  const ActiveView=forcedView==='home'
    ?HOME_VIEWS[scopeId]||GenericScopeHomeView
    :VIEWS[forcedView]||AboutView;
  // LOC retains its bespoke aggregate pages. Every other DB Scope Group is
  // an overview/guide only: never query another Scope's Galaxy or Time here.
  const groupOverviewView=Boolean(scopeMeta?.aggregateChildren&&scopeId!=='loc'&&
    ['statics','culture','governance'].includes(forcedView));

  if(!forcedScope&&runtime.dynamic&&!runtime.registryResolved){
    return <div className="loc-next-main" data-loc-scope={scopeId}><div className="loc-loading">載入 Scope Registry…</div></div>;
  }
  if(!forcedScope&&runtime.dynamic&&(runtime.registryError||!runtime.registryRow)){
    return <main className="scope-main"><section className="scope-page"><section className="loc-card">
      <h1>Scope 無法使用</h1>
      <p className="scope-status scope-error">{runtime.registryError||'找不到已啟用的 Scope Registry。'}</p>
    </section></section></main>;
  }

  return <div className="loc-next-main" data-loc-scope={scopeId} data-loc-view={forcedView}>
    <Suspense fallback={<div className="loc-loading">載入頁面…</div>}>
      <FeatureGate scopeId={scopeId} scopeMeta={scopeMeta} view={forcedView}>
        {groupOverviewView?<FeaturePage featureId={forcedView}>
          <ScopeGroupOverview
            scopeId={scopeId}
            featureId={forcedView}
            title={scopeMeta.label+' · '+({statics:'統計',culture:'文化',governance:'治理'}[forcedView])}
            description="群組只負責成員總覽與導引；請進入各子 Scope 查詢或管理實際內容。"
          />
        </FeaturePage>:<ActiveView section={forcedSection}/>}
      </FeatureGate>
    </Suspense>
  </div>;
}
