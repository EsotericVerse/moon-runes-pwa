'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {FeaturePage} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
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
  const canEdit=account.canManageScopeSync(scopeId);
  return <FeaturePage featureId="governance" subtitle={subtitle}>
    <View scopeId={scopeId} canEdit={canEdit}/>
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
