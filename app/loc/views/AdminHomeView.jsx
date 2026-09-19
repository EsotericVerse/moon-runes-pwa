import GovernanceManagement from '../GovernanceManagement';
import { PageComposition } from '../../PageComposition';
import {useScopeRuntimeV2} from '../../modular-v2/use-scope-runtime.v2';

export default function AdminHomeView(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const isGlobal=typeof window!=='undefined'&&window.location.pathname.endsWith('/global-manage');
  return <PageComposition
    eyebrow={isGlobal?'Global Governance Admin':'Scope Governance Admin'}
    title={isGlobal?'全域管理者':'首頁管理者'}
    subtitle={isGlobal?'最高權限：管理全站 Scope、權限、公開設定與治理政策。':`${scope.label} Scope 管理者首頁：只管理本 Scope 的內容、狀態與授權。`}
    sections={[{
      id:'management',
      eyebrow:'Governance Management',
      title:isGlobal?'全域管理功能':'Scope 管理功能',
      content:<div className="loc-grid two"><GovernanceManagement/></div>
    }]}
  />;
}
