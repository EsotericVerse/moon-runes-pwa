'use client';

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useAccount} from './use-account';
import {selectScopeRegistry} from './scope-data';
import ScopeLink from '../modular/ScopeLink';

// Only the selected management tab loads its tools and dependencies.
const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:()=>null});
const RuneManagementPanel=dynamic(()=>import('./RuneManagementPanel'),{loading:()=>null});
const ScopeGroupManagement=dynamic(()=>import('./ScopeGroupManagement'),{loading:()=>null});

export default function GovernanceManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const [section,setSection]=useState('');
  const [scopeId,setScopeId]=useState('');
  const [registry,setRegistry]=useState([]);
  const canManageGlobal=account.canManageGlobalSync();
  const canManageRunes=account.canManageScopeSync('lrunes');
  const managedScopes=useMemo(()=>registry.filter(row=>row.scope_id&&row.scope_id!=='admin'&&account.canManageScopeSync(row.scope_id)),[registry,account]);
  const canManageHere=account.canManageScopeSync(routeScopeId);
  const selectedScope=managedScopes.find(row=>row.scope_id===scopeId)
    ||managedScopes.find(row=>row.scope_id===routeScopeId)||managedScopes[0];
  const showGlobal=routeScopeId==='loc'&&canManageGlobal;
  const showRunes=routeScopeId==='lrunes'&&canManageRunes;
  const fallbackSection=showRunes?'runes':showGlobal?'global':'content';
  const activeSection=(section==='global'&&showGlobal)||(section==='runes'&&showRunes)||
    (section==='content'&&canManageHere)?section:fallbackSection;
  // No registry read for Rune management or global administration.
  useEffect(()=>{
    if(!account.user||activeSection!=='content')return;
    let active=true;
    selectScopeRegistry().then(rows=>{if(active)setRegistry(rows||[]);}).catch(()=>{});
    return()=>{active=false};
  },[account.user?.id,activeSection]);
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><ScopeLink className="loc-button primary" href="/settings/?section=account">請先登入</ScopeLink></section>;
  if(!canManageHere)return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h2>治理管理選單</h2><div className="scope-tabs" role="tablist" aria-label="治理管理分頁">
      {showGlobal?<button type="button" role="tab" aria-selected={activeSection==='global'} onClick={()=>setSection('global')}>跨網域／人員與群組</button>:null}
      {showRunes?<button type="button" role="tab" aria-selected={activeSection==='runes'} onClick={()=>setSection('runes')}>月之符文管理</button>:null}
      {canManageHere?<button type="button" role="tab" aria-selected={activeSection==='content'} onClick={()=>setSection('content')}>Scope 內容管理</button>:null}
    </div></section>
    {activeSection==='global'&&showGlobal?<section className="loc-card"><h3>系統管理</h3><p>跨網域人員、群組及系統設定使用獨立 Admin 管理介面。</p><ScopeLink className="loc-button primary" href="/admin/">進入全域系統管理</ScopeLink><ScopeGroupManagement scopeId="loc"/></section>:null}
    {activeSection==='runes'&&showRunes?<RuneManagementPanel/>:null}
    {activeSection==='content'&&canManageHere?<section className="loc-card"><h3>網站內容管理</h3>{selectedScope?<><label htmlFor="governance-scope">管理網站／Scope</label><select id="governance-scope" className="scope-select" value={selectedScope.scope_id} onChange={e=>setScopeId(e.target.value)}>{managedScopes.map(row=><option key={row.scope_id} value={row.scope_id}>{row.display_name||row.scope_id}</option>)}</select><ManagementArticlePublisher key={selectedScope.scope_id} scopeId={selectedScope.scope_id}/></>:<p>沒有可管理的網站 Scope。</p>}</section>:null}
  </section></main>;
}
