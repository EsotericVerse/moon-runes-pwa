'use client';

import dynamic from 'next/dynamic';
import {useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import UiText from '../../i18n/UiText';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {useEditDock} from '../edit-dock';
import {FeaturePage} from '../ui';
import {registerDefaultSection} from '../../i18n/ui-copy';
import {useUiSection} from '../../i18n/ui-locale';
import keywordsZh from '../../i18n/sections/uiExtra.keywords.zh_tw.js';
registerDefaultSection('uiExtra.keywords',keywordsZh);

const KeywordLibraryPanel=dynamic(()=>import('../../loc/KeywordLibraryPanel'),{
  loading:()=> <p className="scope-status"><UiText id="uiExtra.keywords.settingsLoading"/></p>
});

export default function KeywordSettings(){
  useUiSection('uiExtra.keywords');
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const editDock=useEditDock();
  const params=useSearchParams();
  const authorized=Boolean(account.user&&scopeId!=='loc'&&scopeId!=='lrunes'&&!scope?.aggregateChildren&&account.canManageScopeSync(scopeId));
  useEffect(()=>{
    if(!authorized||params?.get('edit')!=='1')return;
    if(!editDock?.active||editDock.scopeId!==scopeId)editDock?.begin(scopeId);
  },[authorized,scopeId,params,editDock?.active,editDock?.scopeId,editDock?.begin]);
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <h2><UiText id="uiExtra.keywords.settingsTitle"/></h2>
      <p className="scope-status"><UiText id="uiExtra.keywords.settingsGuide"/></p>
    </section>
    {account.loading||account.permissionLoading
      ?<p className="scope-status"><UiText id="uiExtra.keywords.verifyingAccess"/></p>
      :authorized?<KeywordLibraryPanel scopeId={scopeId}/>
      :<section className="loc-card scope-feature-card"><p className="scope-status"><UiText id="uiExtra.keywords.accessDenied"/></p></section>}
  </FeaturePage>;
}
