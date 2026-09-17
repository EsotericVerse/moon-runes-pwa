import { redirect } from 'next/navigation';
import GovernanceManagement from '../loc/GovernanceManagement';
import { getServerManagementSession } from '../lib/server-management-auth';

export const metadata={title:'治理管理｜LOC 月典'};
export const dynamic='force-dynamic';

export default async function AdminPage(){
  const session=await getServerManagementSession();
  if(!session) redirect('/admin/login');

  return <main className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Platform Admin</p>
      <h1>治理管理</h1>
      <p className="loc-subtitle">平台級設定由 Admin 管理；Scope 內低風險治理保留在各自治理頁。</p>
    </header>
    <div className="loc-grid two">
      <GovernanceManagement initialSession={session}/>
    </div>
  </main>;
}
