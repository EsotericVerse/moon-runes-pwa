import GovernanceManagement from '../loc/GovernanceManagement';

export const metadata={
  title:'Admin｜LOC 月典',
  robots:{index:false,follow:false}
};

export default function AdminPage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Admin</p>
      <h1>全站管理</h1>
      <div className="links">
        <a href="/admin/routes">Route / Page Registry</a>
      </div>
    </header>
    <GovernanceManagement/>
  </main>;
}
