'use client';

import dynamic from 'next/dynamic';
import UiText from '../../i18n/UiText';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {scopeHref} from '../scope-registry';
import {FeaturePage} from '../ui';
import ScopeLink from '../ScopeLink';

const KeywordLibraryPanel=dynamic(()=>import('../../loc/KeywordLibraryPanel'),{
  loading:()=> <p className="scope-status"><UiText id="uiExtra.keywords.settingsLoading"/></p>
});

export default function KeywordSettings(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const authorized=Boolean(account.user&&scopeId!=='loc'&&scopeId!=='lrunes'&&!scope?.aggregateChildren&&account.canManageScopeSync(scopeId));
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <h2><UiText id="uiExtra.keywords.settingsTitle"/></h2>
      <p className="scope-status"><UiText id="uiExtra.keywords.settingsGuide"/></p>
      <ScopeLink className="loc-button" href={scopeHref(scopeId,'statics')}><UiText id="uiExtra.keywords.backToStatistics"/></ScopeLink>
    </section>
    {account.loading||account.permissionLoading
      ?<p className="scope-status"><UiText id="uiExtra.keywords.verifyingAccess"/></p>
      :authorized?<KeywordLibraryPanel scopeId={scopeId}/>
      :<section className="loc-card scope-feature-card"><p className="scope-status"><UiText id="uiExtra.keywords.accessDenied"/></p></section>}
  </FeaturePage>;
}
