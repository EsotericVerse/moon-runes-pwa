'use client';
import FieldText from '../i18n/FieldText';
import UiText,{useUiText} from '../i18n/UiText';

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
import KeywordSettings from '../modular/features/KeywordSettings';
import Culture from '../modular/features/Culture';
import Search from '../modular/features/Search';
import Governance from '../modular/features/Governance';

const loading=()=> <div className="loc-loading"><UiText id="uiExtra.feature.moduleLoading"/></div>;
const RunesHomeView=dynamic(()=>import('../lrunes/RunesClient'),{loading});
const GameView=dynamic(()=>import('../lrunes/game/GameBoard'),{ssr:false,loading});
const ManagementView=dynamic(()=>import('./GovernanceManagement'),{loading});

const VIEWS={
  game:GameView,
  statics:Statistics,
  keywords:KeywordSettings,
  culture:Culture,
  search:Search,
  governance:Governance,
  manage:ManagementView
};
const HOME_VIEWS={loc:AboutView,lrunes:RunesHomeView,lo3rwang:AuthorHomeView,admin:AdminHomeView};
const FEATURE_FLAGS=Object.freeze({
  search:'search_able',
  statics:'statistics_able',
  keywords:'statistics_able',
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
  if(query.isPending)return <div className="loc-loading"><UiText id="uiExtra.feature.settingsLoading"/></div>;
  if(query.data?.[flag]===false)return <main className="scope-main"><section className="scope-page"><section className="loc-card"><p className="scope-status"><UiText id="uiExtra.feature.unpublished"/></p></section></section></main>;
  return children;
}

export default function LocApp({forcedView='home',forcedSection=null,forcedScope=null}){
  const t=useUiText();
  const runtime=useScopeRuntime();
  const scopeId=forcedScope||runtime.scopeId;
  const scopeMeta=forcedScope&&runtime.scopeId!==forcedScope?getScope(forcedScope):runtime.scope;
  const ActiveView=forcedView==='home'
    ?HOME_VIEWS[scopeId]||GenericScopeHomeView
    :VIEWS[forcedView]||AboutView;
  // LOC retains its bespoke aggregate pages. Every other DB Scope Group is
  // an overview/guide only: never query another Scope's Galaxy or Time here.
  const groupOverviewView=Boolean(scopeMeta?.aggregateChildren&&scopeId!=='loc'&&
    ['statics','culture','governance'].includes(forcedView));

  if(!forcedScope&&runtime.dynamic&&!runtime.registryResolved){
    return <div className="loc-next-main" data-loc-scope={scopeId}><div className="loc-loading"><UiText id="uiExtra.feature.registryLoading"/></div></div>;
  }
  if(!forcedScope&&runtime.dynamic&&(runtime.registryError||!runtime.registryRow)){
    return <main className="scope-main"><section className="scope-page"><section className="loc-card">
      <h1><UiText id="uiExtra.feature.registryUnavailable"/></h1>
      <p className="scope-status scope-error">{runtime.registryError||t('uiExtra.feature.registryNotFound')}</p>
    </section></section></main>;
  }

  return <div className="loc-next-main" data-loc-scope={scopeId} data-loc-view={forcedView}>
    <Suspense fallback={<div className="loc-loading"><UiText id="uiExtra.feature.pageLoading"/></div>}>
      <FeatureGate scopeId={scopeId} scopeMeta={scopeMeta} view={forcedView}>
        {groupOverviewView?<FeaturePage featureId={forcedView}>
          <ScopeGroupOverview
            scopeId={scopeId}
            featureId={forcedView}
            title={scopeMeta.label+' · '+t({statics:'features.statics.title',culture:'features.culture.title',governance:'features.governance.title'}[forcedView])}
            description={t('uiExtra.feature.groupGuide')}
          />
        </FeaturePage>:<ActiveView section={forcedSection}/>}
      </FeatureGate>
    </Suspense>
  </div>;
}
