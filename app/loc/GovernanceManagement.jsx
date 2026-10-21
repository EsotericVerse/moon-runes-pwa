'use client';

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useAccount} from './use-account';
import {selectScopeRegistry} from './scope-data';
import ScopeLink from '../modular/ScopeLink';

// Only scope's own content-management tools load here. Nothing admin-level
// (domain/directory/database/system members) belongs on this page — that is
// entirely /admin/'s job, kept on a separate page by design.
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
  const [scopeId,setScopeId]=useState('');
  const [registry,setRegistry]=useState([]);
  const managedScopes=useMemo(()=>registry.filter(row=>row.scope_id&&row.scope_id!=='admin'&&account.canManageScopeSync(row.scope_id)),[registry,account]);
  const canManageHere=account.canManageScopeSync(routeScopeId);
  const selectedScope=managedScopes.find(row=>row.scope_id===scopeId)
    ||managedScopes.find(row=>row.scope_id===routeScopeId)||managedScopes[0];
  useEffect(()=>{
    if(!account.user||!canManageHere)return;
    let active=true;
    selectScopeRegistry().then(rows=>{if(active)setRegistry(rows||[]);}).catch(()=>{});
    return()=>{active=false};
  },[account.user?.id,canManageHere]);
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><ScopeLink className="loc-button primary" href="/settings/?section=account">請先登入</ScopeLink></section>;
  if(!canManageHere)return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h2>Scope 內容管理</h2>
      {selectedScope?<><label htmlFor="governance-scope">管理網站／Scope</label><select id="governance-scope" className="scope-select" value={selectedScope.scope_id} onChange={e=>setScopeId(e.target.value)}>{managedScopes.map(row=><option key={row.scope_id} value={row.scope_id}>{row.display_name||row.scope_id}</option>)}</select>
      <ManagementDisclosure label="Scope 設定"><ScopeSettingsPanel key={selectedScope.scope_id+'-settings'} scopeId={selectedScope.scope_id}/></ManagementDisclosure>
      <ManagementDisclosure label="發表文章"><ManagementArticlePublisher key={selectedScope.scope_id+'-publisher'} scopeId={selectedScope.scope_id}/></ManagementDisclosure>
      <ManagementDisclosure label="資料匯入"><ManagementImportPanel key={selectedScope.scope_id+'-import'} scopeId={selectedScope.scope_id}/></ManagementDisclosure>
      </>:<p>沒有可管理的網站 Scope。</p>}</section>
  </section></main>;
}
