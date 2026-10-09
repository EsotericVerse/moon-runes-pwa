'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {FeaturePage} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
import {scopeHref} from '../scope-registry';
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
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const {View,subtitle}=governanceFor(scopeId);
  const adminHref=scopeHref('admin');
  const manageHref=scopeId==='loc'?adminHref:scopeHref(scopeId,'governance/manage');
  const canEdit=account.canManageScopeSync(scopeId);
  return <FeaturePage featureId="governance" subtitle={subtitle}>
    <View scopeId={scopeId} canEdit={canEdit}/>
    <section className="loc-card governance-management-cta">
      <h2>{scopeId==='loc'?'LOC 系統管理':String(scope?.label||scopeId)+'管理'}</h2>
      <div className="scope-preview-links">
        <a className="loc-button primary" href={manageHref}>{UI_COPY.governance.enterManagement}</a>
      </div>
    </section>
  </FeaturePage>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const canEdit=account.canManageScopeSync(scopeId);
  const {View}=governanceFor(scopeId);
  return <FeaturePage featureId="governance" subtitle={UI_COPY.governance.rights}><View scopeId={scopeId} canEdit={canEdit}/></FeaturePage>;
}

export default function Governance({section=null}){
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
