'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useAccount} from './use-account';
import {useEffect,useMemo} from 'react';
import {selectScopeRegistry} from './scope-data';

// Only the selected management tab loads its tools and dependencies.
const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:()=>null});
const RuneManagementPanel=dynamic(()=>import('./RuneManagementPanel'),{loading:()=>null});

export default function GovernanceManagement(){
  const account=useAccount();
  const [section,setSection]=useState('');
  const [scopeId,setScopeId]=useState('');
  const [registry,setRegistry]=useState([]);
  useEffect(()=>{let active=true;selectScopeRegistry().then(rows=>{if(active)setRegistry(rows||[]);}).catch(()=>{});return()=>{active=false};},[]);
  const canManageGlobal=account.canManageGlobalSync();
  const canManageRunes=account.canManageScopeSync('lrunes');
  const canManageLoc=account.canManageScopeSync('loc');
  const managedScopes=useMemo(()=>registry.filter(row=>row.scope_id&&row.scope_id!=='admin'&&account.canManageScopeSync(row.scope_id)),[registry,account]);
  const selectedScope=managedScopes.find(row=>row.scope_id===scopeId)||managedScopes[0];
  const activeSection=(section==='global'&&canManageGlobal)||(section==='runes'&&canManageRunes)||(section==='content'&&(canManageLoc||canManageGlobal))?section:canManageGlobal?'global':canManageRunes?'runes':'content';
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><a className="loc-button primary" href="/settings/?section=account">請先登入</a></section>;
  if(!canManageGlobal&&!canManageRunes&&!canManageLoc)return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h2>治理管理選單</h2><div className="scope-tabs" role="tablist" aria-label="治理管理分頁">
      {canManageGlobal?<button type="button" role="tab" aria-selected={activeSection==='global'} onClick={()=>setSection('global')}>跨網域／人員與群組</button>:null}
      {canManageRunes?<button type="button" role="tab" aria-selected={activeSection==='runes'} onClick={()=>setSection('runes')}>月之符文管理</button>:null}
      {(canManageLoc||canManageGlobal)?<button type="button" role="tab" aria-selected={activeSection==='content'} onClick={()=>setSection('content')}>Scope 內容管理</button>:null}
    </div></section>
    {activeSection==='global'&&canManageGlobal?<section className="loc-card"><h3>系統管理</h3><p>跨網域人員、群組及系統設定使用獨立 Admin 管理介面。</p><a className="loc-button primary" href="/admin/">進入全域系統管理</a></section>:null}
    {activeSection==='runes'&&canManageRunes?<RuneManagementPanel/>:null}
    {activeSection==='content'?<section className="loc-card"><h3>網站內容管理</h3>{selectedScope?<><label htmlFor="governance-scope">管理網站／Scope</label><select id="governance-scope" className="scope-select" value={selectedScope.scope_id} onChange={e=>setScopeId(e.target.value)}>{managedScopes.map(row=><option key={row.scope_id} value={row.scope_id}>{row.display_name||row.scope_id}</option>)}</select><ManagementArticlePublisher key={selectedScope.scope_id} scopeId={selectedScope.scope_id}/></>:<p>沒有可管理的網站 Scope。</p>}</section>:null}
  </section></main>;
}
