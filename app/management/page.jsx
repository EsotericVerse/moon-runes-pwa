import GovernanceManagement from '../loc/GovernanceManagement';

export const metadata={title:'治理管理｜LOC 月典'};

export default function ManagementPage(){
  return <main className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Management</p>
      <h1>治理管理</h1>
      <p className="loc-subtitle">管理 Scope、時期、資料納入、修正標記與授權寫入。</p>
    </header>
    <div className="loc-grid two">
      <GovernanceManagement/>
    </div>
  </main>;
}
