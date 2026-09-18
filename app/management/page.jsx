import {PageFrame} from '../PageComposition';
import GovernanceManagement from '../loc/GovernanceManagement';

export const metadata={title:'治理管理｜LOC 月典'};

export default function ManagementPage(){
  return <PageFrame
    eyebrow="Management"
    title="治理管理"
    subtitle="管理 Scope、時期、資料納入、修正標記與授權寫入。"
  >
    <div className="loc-grid two">
      <GovernanceManagement/>
    </div>
  </PageFrame>;
}
