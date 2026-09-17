import { redirect } from 'next/navigation';
import AdminLogin from '../AdminLogin';
import { getServerManagementSession } from '../../lib/server-management-auth';

export const metadata={title:'管理驗證｜LOC 月典'};
export const dynamic='force-dynamic';

export default async function AdminLoginPage(){
  const session=await getServerManagementSession();
  if(session) redirect('/admin');

  return <main className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Admin Login</p>
      <h1>管理驗證</h1>
      <p className="loc-subtitle">此頁只提供登入；治理資料與寫入功能不在未授權狀態下輸出。</p>
    </header>
    <div className="loc-grid two"><AdminLogin/></div>
  </main>;
}
