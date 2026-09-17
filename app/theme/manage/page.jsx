import ScopeThemeManager from './ScopeThemeManager';

export const metadata={title:'分頁管理者｜主題設定｜LOC',robots:{index:false,follow:false}};

export default function ScopeThemeManagePage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Page Manager</p>
      <h1>分頁管理者</h1>
      <p className="loc-subtitle">管理目前分頁層級的共通呈現：主題、時間輪調與簡單自訂色彩。Scope 的建立與系統設定由 Admin 總管理者負責。</p>
    </header>
    <ScopeThemeManager/>
  </main>;
}
