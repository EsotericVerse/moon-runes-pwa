import GovernanceManagement from '../GovernanceManagement';
import { PageComposition } from '../../PageComposition';

export default function AdminHomeView(){
  return <PageComposition
    eyebrow="Admin Governance"
    title="治理管理"
    subtitle="管理 Scope、權限、公開設定與治理操作。"
    sections={[{
      id:'management',
      eyebrow:'Governance Management',
      title:'管理功能',
      content:<div className="loc-grid two"><GovernanceManagement/></div>
    }]}
  />;
}
