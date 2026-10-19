'use client';

import dynamic from 'next/dynamic';
import {UI_COPY} from '../../i18n/ui-copy';
import {FeaturePage} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
import {useAccount} from '../../loc/use-account';

// Governance pages share one Scope block capability. The optional editor is
// fetched only when a governance route actually renders its blocks.
const ScopeEditableBlocks=dynamic(()=>import('../../loc/ScopeEditableBlocks'),{loading:()=>null});

const GOVERNANCE_SUBTITLES=Object.freeze({
  loc:'說明月典的使用原則、權利邊界與管理方式。',
  lrunes:'說明月之符文的使用原則、恆定符文、著作權與核心所有權原則。',
  personal:'說明個人作品的來源、版本與著作權原則。'
});

function GovernanceBlocks({scopeId,account}){
  const canManage=scopeId==='loc'&&(
    account.canManageGlobalSync()||
    account.canManageScopeSync('loc')||
    account.canManageScopeSync('lrunes')
  );
  return <>
    {canManage?<nav className="loc-card" aria-label="治理管理入口">
      <a className="loc-button primary" href="/governance/manage/">管理選單</a>
    </nav>:null}
    <ScopeEditableBlocks
      scopeId={scopeId}
      page="governance"
      className={'loc-grid two governance-grid'+(scopeId==='loc'?' governance-grid-loc':'')}
      headingLevel={2}
    />
  </>;
}

export default function Governance({section=null}){
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const subtitle=section==='law'
    ?UI_COPY.governance.rights
    :(GOVERNANCE_SUBTITLES[scopeId]||GOVERNANCE_SUBTITLES.personal);
  return <FeaturePage featureId="governance" subtitle={subtitle}>
    <GovernanceBlocks scopeId={scopeId} account={account}/>
  </FeaturePage>;
}
