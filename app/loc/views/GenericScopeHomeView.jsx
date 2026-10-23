'use client';

import {FeaturePage} from '../../modular/ui';
import UiText,{useUiText} from '../../i18n/UiText';
import {navigationHref} from '../../modular/scope-registry.js';
import useNativeNavigation from '../../modular/use-native-navigation';
import {useScopeRuntime} from '../../modular/use-scope-runtime';
import ScopeLink from '../../modular/ScopeLink';
import dynamic from 'next/dynamic';
import {registerDefaultSection} from '../../i18n/ui-copy';
import {useUiSection} from '../../i18n/ui-locale';
import genericScopeZh from '../../i18n/sections/uiExtra.genericScope.zh_tw.js';
registerDefaultSection('uiExtra.genericScope',genericScopeZh);
// Only one of these mutually exclusive home capabilities is needed per Scope.
// Scope Groups must not load the editing implementation.
const ScopeGroupOverview=dynamic(()=>import('../ScopeGroupOverview'),{loading:()=>null});
const ScopeEditableBlocks=dynamic(()=>import('../ScopeEditableBlocks'),{loading:()=>null});

export default function GenericScopeHomeView(){
  useUiSection('uiExtra.genericScope');
  const t=useUiText();
  const native=useNativeNavigation();
  const {scopeId,scope,registryRow}=useScopeRuntime();
  // Local has no server-backed loc_blocks; its home is the entry to the
  // existing device-local features, not a cloud BlockNote editing surface.
  if(scopeId==='local')return <main className="scope-main"><section className="scope-page">
    <header className="loc-card scope-hero"><p className="loc-eyebrow">Local Scope</p><h1>本機資料</h1></header>
    <section className="loc-card">
      <p className="scope-status">本機匯入的資料只儲存在目前裝置，可從下方功能進行查詢與分析。</p>
      <div className="scope-result-links">
        <ScopeLink href={navigationHref('local','culture',native)} native={native}><UiText id="features.culture.title"/></ScopeLink>
        <ScopeLink href={navigationHref('local','statics',native)} native={native}><UiText id="features.statics.title"/></ScopeLink>
        <ScopeLink href={navigationHref('local','search',native)} native={native}><UiText id="nav.search"/></ScopeLink>
        <ScopeLink href={navigationHref('local','settings',native)} native={native}><UiText id="common.settings"/></ScopeLink>
      </div>
    </section>
  </section></main>;
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
      <ScopeEditableBlocks scopeId={scopeId} page="index" explicitEditButton/>
      <p className="scope-status">{registryRow?.domain||registryRow?.directory||''}</p>
      <div className="scope-result-links">
        <ScopeLink href={navigationHref(scopeId,'search',native)} native={native}><UiText id="nav.search"/></ScopeLink>
        <ScopeLink href={navigationHref(scopeId,'statics',native)} native={native}><UiText id="features.statics.title"/></ScopeLink>
        <ScopeLink href={navigationHref(scopeId,'culture',native)} native={native}><UiText id="features.culture.title"/></ScopeLink>
        <ScopeLink href={navigationHref(scopeId,'governance',native)} native={native}><UiText id="features.governance.title"/></ScopeLink>
        <ScopeLink href={navigationHref(scopeId,'governance/manage',native)} native={native}><UiText id="common.management"/></ScopeLink>
      </div>
    </section>
  </section></main>;
}
