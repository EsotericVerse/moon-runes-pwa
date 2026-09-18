import ThemeRegistryManager from './ThemeRegistryManager';

export const metadata={
  title:'Theme Registry｜Admin｜LOC 月典',
  robots:{index:false,follow:false}
};

export default function AdminThemesPage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Admin · Theme Registry</p>
      <h1>主題設定</h1>
      <p className="loc-subtitle">同一套網站骨架，依 Scope 指定不同預設主題。固定 8 個可編輯槽位，不建立八套網站。</p>
      <div className="links"><a href="/admin">回全站管理</a><a href="/admin/modules">使用中模組</a></div>
    </header>
    <ThemeRegistryManager/>
  </main>;
}
