import ScopeManagementV2 from '../../modular-v2/ScopeManagementV2';
import { PageComposition } from '../../PageComposition';

export default function AdminHomeView(){
  return <PageComposition
    eyebrow="Admin Governance"
    title="Scope 與權限管理"
    subtitle="只管理 Scope 結構與網站權限。"
    sections={[{
      id:'scope-tree',
      eyebrow:'Scope Tree · Permissions',
      title:'Scope 階層與權限',
      content:<ScopeManagementV2/>
    }]}
  />;
}
