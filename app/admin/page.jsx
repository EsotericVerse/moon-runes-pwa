import GovernanceManagement from '../loc/GovernanceManagement';

export const metadata={
  title:'平台管理｜LOC 月典',
  robots:{index:false,follow:false}
};

export default function AdminPage(){
  return <main className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Platform Admin</p>
      <h1>平台管理</h1>
      <p className="loc-subtitle">Next.js 提供管理介面；實際資料讀寫由 Auth Worker 與 State Worker 逐次驗權。此靜態頁本身不含私有資料或憑證。</p>
    </header>
    <GovernanceManagement/>
  </main>;
}
