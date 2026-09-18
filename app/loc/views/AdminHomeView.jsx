import GovernanceManagement from '../GovernanceManagement';
import { PageComposition } from '../../PageComposition';

export default function AdminHomeView(){
  return <PageComposition
    eyebrow="Admin"
    title="治理管理"
    subtitle="管理 Scope、時期、資料納入、修正標記與授權寫入。"
    sections={[{
      id:'management',
      eyebrow:'Governance Management',
      title:'管理功能',
      content:<div className="loc-grid two"><GovernanceManagement/></div>
    }]}
  />;
}
