'use client';

import dynamic from 'next/dynamic';
import {UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiSection} from '../../i18n/ui-locale';
import {FeaturePage} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
import {useAccount} from '../../loc/use-account';
import {navigationHref} from '../scope-registry';
import useNativeNavigation from '../use-native-navigation';
import ScopeLink from '../ScopeLink';
import governanceZh from '../../i18n/sections/governance.zh_tw.js';
import editBlocksZh from '../../i18n/sections/uiExtra.editBlocks.zh_tw.js';
registerDefaultSection('governance',governanceZh);
registerDefaultSection('uiExtra.editBlocks',editBlocksZh);

// Governance pages share one Scope block capability. The optional editor is
// fetched only when a governance route actually renders its blocks.
const ScopeEditableBlocks=dynamic(()=>import('../../loc/ScopeEditableBlocks'),{loading:()=>null});

const GOVERNANCE_SUBTITLES=Object.freeze({
  loc:'說明月典的使用原則、權利邊界與管理方式。',
  lrunes:'說明月之符文的使用原則、恆定符文、著作權與核心所有權原則。',
  personal:'說明個人作品的來源、版本與著作權原則。'
});

function GovernanceBlocks({scopeId,account,native}){
  const canManage=Boolean(account.user)&&account.canManageScopeSync(scopeId);
  return <>
    {canManage?<nav className="loc-card" aria-label="治理管理入口">
      <ScopeLink className="loc-button primary" href={navigationHref(scopeId,'governance/manage',native)} native={native}>治理管理</ScopeLink>
    </nav>:null}
    <ScopeEditableBlocks
      scopeId={scopeId}
      page="governance"
      className={'loc-grid two governance-grid'+(scopeId==='loc'?' governance-grid-loc':'')}
      headingLevel={2}
      explicitEditButton
    />
  </>;
}

export default function Governance({section=null}){
  useUiSection('governance');
  useUiSection('uiExtra.editBlocks');
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const native=useNativeNavigation();
  const subtitle=section==='law'
    ?UI_COPY.governance.rights
    :(GOVERNANCE_SUBTITLES[scopeId]||GOVERNANCE_SUBTITLES.personal);
  return <FeaturePage featureId="governance" subtitle={subtitle}>
    <GovernanceBlocks scopeId={scopeId} account={account} native={native}/>
  </FeaturePage>;
}
