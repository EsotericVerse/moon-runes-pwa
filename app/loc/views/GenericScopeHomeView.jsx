'use client';

import {FeaturePage} from '../../modular/ui';
import UiText,{useUiText} from '../../i18n/UiText';
import {navigationHref} from '../../modular/nav-destinations.mjs';
import useNativeNavigation from '../../modular/use-native-navigation';
import {useScopeRuntime} from '../../modular/use-scope-runtime';
import ScopeGroupOverview from '../ScopeGroupOverview';
import ScopeEditableBlocks from '../ScopeEditableBlocks';

export default function GenericScopeHomeView(){
  const t=useUiText();
  const native=useNativeNavigation();
  const {scopeId,scope,registryRow}=useScopeRuntime();
  if(scope?.aggregateChildren){
    return <FeaturePage featureId="governance" subtitle={scope.label}>
      <ScopeGroupOverview
        scopeId={scopeId}
        featureId="governance"
        title={scope.label+' · Scope Group'}
        description={t('uiExtra.genericScope.guide')}
      />
    </FeaturePage>;
  }
  return <main className="scope-main"><section className="scope-page">
    <header className="loc-card scope-hero"><p className="loc-eyebrow">Scope</p><h1>{scope.label}</h1><p>{scopeId}</p></header>
    <section className="loc-card">
      <ScopeEditableBlocks scopeId={scopeId} page="index"/>
      <p className="scope-status">{registryRow?.domain||registryRow?.directory||''}</p>
      <div className="scope-result-links">
        <a href={navigationHref(scopeId,'search',native)}><UiText id="nav.search"/></a>
        <a href={navigationHref(scopeId,'statics',native)}><UiText id="features.statics.title"/></a>
        <a href={navigationHref(scopeId,'culture',native)}><UiText id="features.culture.title"/></a>
        <a href={navigationHref(scopeId,'governance',native)}><UiText id="features.governance.title"/></a>
        <a href={'/settings/?section=manage&scope='+encodeURIComponent(scopeId)}><UiText id="common.management"/></a>
      </div>
    </section>
  </section></main>;
}
