import ScopeThemeManager from './ScopeThemeManager';

export const metadata={title:'Scope Theme 管理｜LOC',robots:{index:false,follow:false}};

export default function ScopeThemeManagePage(){
  return <main className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Theme Manager</p>
      <h1>Scope 主題管理</h1>
      <p className="loc-subtitle">Domain 決定目前 Scope；此頁只修改當前 Scope 的主題模式、輪調與簡單自訂。</p>
    </header>
    <ScopeThemeManager/>
  </main>;
}
