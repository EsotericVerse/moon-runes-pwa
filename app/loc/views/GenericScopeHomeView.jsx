'use client';

import {FeaturePage} from '../../modular/ui';
import {featureHref,scopeHref} from '../../modular/scope-registry';
import {useScopeRuntime} from '../../modular/use-scope-runtime';
import ScopeGroupOverview from '../ScopeGroupOverview';
import ScopeEditableBlocks from '../ScopeEditableBlocks';

export default function GenericScopeHomeView(){
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
      <ScopeEditableBlocks scopeId={scopeId} page="home"/>
      <p className="scope-status">{registryRow?.domain||registryRow?.directory||''}</p>
      <div className="scope-result-links">
        <a href={featureHref(scopeId,'search')}>搜尋</a>
        <a href={featureHref(scopeId,'statics')}>統計</a>
        <a href={featureHref(scopeId,'culture')}>文化</a>
        <a href={featureHref(scopeId,'governance')}>治理</a>
        <a href={scopeHref(scopeId,'governance/manage')}>管理</a>
      </div>
    </section>
  </section></main>;
}
