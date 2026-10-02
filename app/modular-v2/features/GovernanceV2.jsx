'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import FeaturePageV2 from '../FeaturePageV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {getScopeV2,scopeHrefV2} from '../scope-registry.v2';
import {useNeonAccount} from '../../loc/use-neon-account';
import LocGovernance,{LOC_GOVERNANCE_SUBTITLE} from '../governance/LocGovernance';
import LunaRunesGovernance,{LUNARUNES_GOVERNANCE_SUBTITLE} from '../governance/LunaRunesGovernance';
import PersonalGovernance,{PERSONAL_GOVERNANCE_SUBTITLE} from '../governance/PersonalGovernance';


function governanceFor(scopeId){
  if(scopeId==='loc')return {View:LocGovernance,subtitle:LOC_GOVERNANCE_SUBTITLE};
  if(scopeId==='lrunes')return {View:LunaRunesGovernance,subtitle:LUNARUNES_GOVERNANCE_SUBTITLE};
  return {View:PersonalGovernance,subtitle:PERSONAL_GOVERNANCE_SUBTITLE};
}

function GovernanceHome(){
  const {scopeId}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const {View,subtitle}=governanceFor(scopeId);
  const adminHref=scopeHrefV2('admin');
  const canEdit=account.canManageScopeSync(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle={subtitle}>
    <View canEdit={canEdit}/>
    {canEdit?(scopeId==='loc'?<section className="loc-card governance-management-cta">
      <h2>{UI_COPY.governance.systemManagement}</h2>
      <p>月典的系統設定集中在獨立管理站，公開治理頁只保留原則與權利說明。</p>
      <a className="loc-button primary" href={adminHref}>{UI_COPY.governance.enterAdmin}</a>
    </section>:<section className="loc-card governance-management-cta">
      <h2>{getScopeV2(scopeId).label}管理</h2>
      <p>時期、分類與其他可調整項目集中在管理頁，需要修改設定時可從這裡進入。</p>
      <a className="loc-button primary" href={scopeHrefV2(scopeId,'governance/manage')}>{UI_COPY.governance.enterManagement}</a>
    </section>):null}
  </FeaturePageV2>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const canEdit=account.canManageScopeSync(scopeId);
  const {View}=governanceFor(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle={UI_COPY.governance.rights}><View canEdit={canEdit}/></FeaturePageV2>;
}

export default function GovernanceV2({section=null}){
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
