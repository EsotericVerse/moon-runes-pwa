'use client';

import {useState} from 'react';
import {useAccount} from './use-account';
import GlobalSettings from './GlobalSettings';
import AdminHomeView from './views/AdminHomeView';
import RuneManagementPanel from './RuneManagementPanel';

export default function GovernanceManagement(){
  const account=useAccount();
  const [section,setSection]=useState('');
  const canManageGlobal=account.canManageGlobalSync();
  const canManageRunes=account.canManageScopeSync('lrunes');
  const canManageLoc=account.canManageScopeSync('loc');
  const activeSection=(section==='global'&&canManageGlobal)||(section==='runes'&&canManageRunes)||(section==='content'&&(canManageLoc||canManageGlobal))?section:canManageGlobal?'global':canManageRunes?'runes':'content';
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><a className="loc-button primary" href="/settings/?section=account">請先登入</a></section>;
  if(!canManageGlobal&&!canManageRunes&&!canManageLoc)return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h2>治理管理選單</h2><div className="scope-tabs" role="tablist" aria-label="治理管理分頁">
      {canManageGlobal?<button type="button" role="tab" aria-selected={activeSection==='global'} onClick={()=>setSection('global')}>跨網域／人員與群組</button>:null}
      {canManageRunes?<button type="button" role="tab" aria-selected={activeSection==='runes'} onClick={()=>setSection('runes')}>月之符文管理</button>:null}
      {(canManageLoc||canManageGlobal)?<button type="button" role="tab" aria-selected={activeSection==='content'} onClick={()=>setSection('content')}>Scope 內容管理</button>:null}
    </div></section>
    {activeSection==='global'&&canManageGlobal?<AdminHomeView/>:null}
    {activeSection==='runes'&&canManageRunes?<RuneManagementPanel/>:null}
    {activeSection==='content'?<GlobalSettings initialSection="manage"/>:null}
  </section></main>;
}
