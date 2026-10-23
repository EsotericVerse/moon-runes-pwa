'use client';
import FieldText from '../i18n/FieldText';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection} from '../i18n/ui-copy';
import {useUiSection} from '../i18n/ui-locale';
import featureZh from '../i18n/sections/uiExtra.feature.zh_tw.js';
registerDefaultSection('uiExtra.feature',featureZh);

import dynamic from 'next/dynamic';
import {Suspense,useEffect} from 'react';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {getScope} from '../modular/scope-registry';
import {useAppBootstrap} from './app-bootstrap';
import {FeaturePage} from '../modular/ui';
const loading=()=> <div className="loc-loading"><UiText id="uiExtra.feature.moduleLoading"/></div>;
// Heavy visualizations and editors should load only when their own page opens.
// Each home and group capability is independently loaded for its actual route.
const AboutView=dynamic(()=>import('./views/AboutView'),{loading});
const AuthorHomeView=dynamic(()=>import('./views/AuthorHomeView'),{loading});
const AdminHomeView=dynamic(()=>import('./views/AdminHomeView'),{loading});
const GenericScopeHomeView=dynamic(()=>import('./views/GenericScopeHomeView'),{loading});
const ScopeGroupOverview=dynamic(()=>import('./ScopeGroupOverview'),{loading});
const Statistics=dynamic(()=>import('../modular/features/Statistics'),{loading});
const KeywordSettings=dynamic(()=>import('../modular/features/KeywordSettings'),{loading});
const Culture=dynamic(()=>import('../modular/features/Culture'),{loading});
const Search=dynamic(()=>import('../modular/features/Search'),{loading});
const SearchManagement=dynamic(()=>import('./SearchManagement'),{loading});
const Governance=dynamic(()=>import('../modular/features/Governance'),{loading});
const RunesHomeView=dynamic(()=>import('../lrunes/RunesClient'),{loading});
const GameView=dynamic(()=>import('../lrunes/game/GameBoard'),{ssr:false,loading});
const ManagementView=dynamic(()=>import('./GovernanceManagement'),{loading});
const LocalSettingView=dynamic(()=>import('./views/LocalSettingView'),{loading});

const VIEWS={
  game:GameView,
  statics:Statistics,
  keywords:KeywordSettings,
  culture:Culture,
  search:Search,
  searchManage:SearchManagement,
  governance:Governance,
  manage:ManagementView,
  setting:LocalSettingView
};
const HOME_VIEWS={loc:AboutView,lrunes:RunesHomeView,lo3rwang:AuthorHomeView,admin:AdminHomeView};
// Same modules as the dynamic() declarations above, so the bundler reuses the same
// chunks. Only the view that is about to render is requested, and it is requested
// immediately, in parallel with the registry and FeatureGate config queries,
// instead of after they finish.
const VIEW_PRELOADERS={
  game:()=>import('../lrunes/game/GameBoard'),
  statics:()=>import('../modular/features/Statistics'),
  keywords:()=>import('../modular/features/KeywordSettings'),
  culture:()=>import('../modular/features/Culture'),
  search:()=>import('../modular/features/Search'),
  searchManage:()=>import('./SearchManagement'),
  governance:()=>import('../modular/features/Governance'),
  manage:()=>import('./GovernanceManagement'),
  setting:()=>import('./views/LocalSettingView')
};
const HOME_PRELOADERS={
  loc:()=>import('./views/AboutView'),
  lrunes:()=>import('../lrunes/RunesClient'),
  lo3rwang:()=>import('./views/AuthorHomeView'),
  admin:()=>import('./views/AdminHomeView')
};
const FEATURE_FLAGS=Object.freeze({
  statics:'statistics_able',
  keywords:'statistics_able',
  culture:'culture_able'
});

function FeatureGate({scopeId,scopeMeta=null,view,children}){
  const flag=FEATURE_FLAGS[view]||'';
  const scope=scopeMeta||getScope(scopeId);
  const enabled=Boolean(flag)&&!scope.aggregateChildren&&scope.id!=='admin';
  // Shares the shell's bootstrap request for this same page; no second config read.
  const bootstrap=useAppBootstrap(scopeId,view==='home'?'index':view,{enabled});
  const query={isPending:enabled&&bootstrap.isPending,data:bootstrap.data?.config};
  if(!enabled)return children;
  if(query.isPending)return <FeaturePage featureId={view==='keywords'?'statics':view}>
    <section className="loc-card scope-feature-card scope-feature-loading">
      <div className="scope-feature-loading__controls" aria-hidden="true"><span/><span/><span/></div>
      <div className="scope-feature-loading__body" aria-hidden="true"><span/><span/><span/><span/></div>
      <p className="scope-status" role="status"><UiText id="uiExtra.feature.settingsLoading"/></p>
    </section>
  </FeaturePage>;
  if(query.data?.[flag]===false)return <main className="scope-main"><section className="scope-page"><section className="loc-card"><p className="scope-status"><UiText id="uiExtra.feature.unpublished"/></p></section></section></main>;
  return children;
}

export default function LocApp({forcedView='home',forcedSection=null,forcedScope=null}){
  useUiSection('uiExtra.feature');
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

  useEffect(()=>{
    const preload=forcedView==='home'
      ?HOME_PRELOADERS[scopeId]||(()=>import('./views/GenericScopeHomeView'))
      :VIEW_PRELOADERS[forcedView]||HOME_PRELOADERS.loc;
    preload().catch(()=>{});
    if(groupOverviewView)import('./ScopeGroupOverview').catch(()=>{});
  },[forcedView,scopeId,groupOverviewView]);

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
        </FeaturePage>:<ActiveView section={forcedSection} scopeId={scopeId}/>}
      </FeatureGate>
    </Suspense>
  </div>;
}
