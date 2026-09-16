import packageInfo from '../../package.json';
import { SCOPE_REGISTRY } from '../scope-registry';

export const metadata={title:'系統最高管理者設定',description:'系統最高管理者唯讀設定與系統資訊。'};

const libraries=Object.entries(packageInfo.dependencies||{});
const scopes=Object.values(SCOPE_REGISTRY);

export default function AdminPage(){
  return <main className="loc-next-main">
    <header className="loc-hero"><p className="loc-eyebrow">System Administration</p><h1>系統最高管理者設定</h1><p className="loc-subtitle">目前僅供展示，不提供新增、修改或刪除。</p></header>
    <section className="loc-card"><h2>最高管理者信箱</h2><p>目前由系統設定提供；此頁唯讀。</p></section>
    <section className="loc-card"><h2>目前 Scope</h2><div className="loc-rule-list">{scopes.map(scope=><p key={scope.id}><strong>{scope.zhName}</strong> · {scope.enName}<br/><span>{scope.host}</span></p>)}</div></section>
    <section className="loc-card"><h2>Library</h2><div className="loc-rule-list">{libraries.map(([name,version])=><p key={name}><strong>{name}</strong> <span>{version}</span> <button type="button" disabled aria-disabled="true">更新</button></p>)}</div></section>
  </main>;
}
