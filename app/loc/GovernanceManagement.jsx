'use client';

import dynamic from 'next/dynamic';
import {useAccount} from './use-account';
import ScopeLink from '../modular/ScopeLink';

// Only scope's own content-management tools load here. Nothing admin-level
// (domain/directory/database/system members) belongs on this page — that is
// entirely /admin/'s job, kept on a separate page by design.
//
// This page manages exactly the one Scope its own route/directory belongs
// to (routeScopeId) — never a different Scope picked from a dropdown. To
// manage another Scope, go to that Scope's own 治理管理 entry point.
const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:()=>null});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:()=>null});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:()=>null});

function ManagementDisclosure({label,children}){
  return <details className="loc-card scope-management-disclosure" open>
    <summary>{label}</summary>
    <div className="scope-management-disclosure-body">{children}</div>
  </details>;
}

export default function GovernanceManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const canManageHere=account.canManageScopeSync(routeScopeId);
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><ScopeLink className="loc-button primary" href="/settings/?section=account">請先登入</ScopeLink></section>;
  if(!canManageHere)return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h2>Scope 內容管理</h2>
      <ManagementDisclosure label="Scope 設定"><ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/></ManagementDisclosure>
      <ManagementDisclosure label="發表文章"><ManagementArticlePublisher key={routeScopeId+'-publisher'} scopeId={routeScopeId}/></ManagementDisclosure>
      <ManagementDisclosure label="資料匯入"><ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/></ManagementDisclosure>
    </section>
  </section></main>;
}
