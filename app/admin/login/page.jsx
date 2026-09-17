import AdminLogin from '../AdminLogin';

export const metadata={
  title:'管理驗證｜LOC 月典',
  robots:{index:false,follow:false}
};

export default function AdminLoginPage(){
  return <main className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Admin Login</p>
      <h1>管理驗證</h1>
      <p className="loc-subtitle">登入頁只啟動 Google 管理驗證；權限與所有資料操作由 Auth Worker 在伺服器端判定。</p>
    </header>
    <div className="loc-grid two"><AdminLogin/></div>
  </main>;
}
