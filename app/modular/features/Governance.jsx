'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {FeaturePage} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
import {getScope,scopeHref} from '../scope-registry';
import {useAccount} from '../../loc/use-account';
import LocGovernance,{LOC_GOVERNANCE_SUBTITLE} from '../governance/LocGovernance';
import LunaRunesGovernance,{LUNARUNES_GOVERNANCE_SUBTITLE} from '../governance/LunaRunesGovernance';
import PersonalGovernance,{PERSONAL_GOVERNANCE_SUBTITLE} from '../governance/PersonalGovernance';


function governanceFor(scopeId){
  if(scopeId==='loc')return {View:LocGovernance,subtitle:LOC_GOVERNANCE_SUBTITLE};
  if(scopeId==='lrunes')return {View:LunaRunesGovernance,subtitle:LUNARUNES_GOVERNANCE_SUBTITLE};
  return {View:PersonalGovernance,subtitle:PERSONAL_GOVERNANCE_SUBTITLE};
}

function GovernanceHome(){
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const {View,subtitle}=governanceFor(scopeId);
  const adminHref=scopeHref('admin');
  const canEdit=account.canManageScopeSync(scopeId);
  return <FeaturePage featureId="governance" subtitle={subtitle}>
    <View canEdit={canEdit}/>
    {canEdit?<section className="loc-card governance-management-cta">
      <h2>{scopeId==='loc'?'LOC Scope Group 管理':getScope(scopeId).label+'管理'}</h2>
      <p>{scopeId==='loc'?'Scope Group 的公開呈現與成員檢視在 Manage；系統級 mapping 與權限仍在 Admin。':'時期、風格標籤、作品與其他可調整項目集中在此 Scope 的 Manage。'}</p>
      <div className="scope-preview-links">
        <a className="loc-button primary" href={scopeHref(scopeId,'governance/manage')}>{UI_COPY.governance.enterManagement}</a>
        {scopeId==='loc'?<a className="loc-button" href={adminHref}>{UI_COPY.governance.enterAdmin}</a>:null}
      </div>
    </section>:null}
  </FeaturePage>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const canEdit=account.canManageScopeSync(scopeId);
  const {View}=governanceFor(scopeId);
  return <FeaturePage featureId="governance" subtitle={UI_COPY.governance.rights}><View canEdit={canEdit}/></FeaturePage>;
}

export default function Governance({section=null}){
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
