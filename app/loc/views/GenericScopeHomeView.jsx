'use client';

import {FeaturePage} from '../../modular/ui';
import {navigationHref} from '../../modular/nav-destinations.mjs';
import useNativeNavigation from '../../modular/use-native-navigation';
import {useScopeRuntime} from '../../modular/use-scope-runtime';
import ScopeGroupOverview from '../ScopeGroupOverview';
import ScopeEditableBlocks from '../ScopeEditableBlocks';

export default function GenericScopeHomeView(){
  const native=useNativeNavigation();
  const {scopeId,scope,registryRow}=useScopeRuntime();
  if(scope?.aggregateChildren){
    return <FeaturePage featureId="governance" subtitle={scope.label}>
      <ScopeGroupOverview
        scopeId={scopeId}
        featureId="governance"
        title={scope.label+' · Scope Group'}
        description="此 Scope Group 只負責成員總覽與導引；實際內容與分析由各子 Scope 自己處理。"
      />
    </FeaturePage>;
  }
  return <main className="scope-main"><section className="scope-page">
    <header className="loc-card scope-hero"><p className="loc-eyebrow">Scope</p><h1>{scope.label}</h1><p>{scopeId}</p></header>
    <section className="loc-card">
      <ScopeEditableBlocks scopeId={scopeId} page="index"/>
      <p className="scope-status">{registryRow?.domain||registryRow?.directory||''}</p>
      <div className="scope-result-links">
        <a href={navigationHref(scopeId,'search',native)}>搜尋</a>
        <a href={navigationHref(scopeId,'statics',native)}>統計</a>
        <a href={navigationHref(scopeId,'culture',native)}>文化</a>
        <a href={navigationHref(scopeId,'governance',native)}>治理</a>
        <a href={navigationHref(scopeId,'governance/manage',native)}>管理</a>
      </div>
    </section>
  </section></main>;
}
