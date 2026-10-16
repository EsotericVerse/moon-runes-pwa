'use client';

import {useState} from 'react';
import {useAccount} from './use-account';
import GlobalSettings from './GlobalSettings';
import AdminHomeView from './views/AdminHomeView';
import RuneManagementPanel from './RuneManagementPanel';

export default function GovernanceManagement(){
  const account=useAccount();
  const [section,setSection]=useState('global');
  const canManageGlobal=account.canManageGlobalSync();
  const canManageRunes=account.canManageScopeSync('lrunes');
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><a className="loc-button primary" href="/settings/?section=account">請先登入</a></section>;
  if(!canManageGlobal&&!canManageRunes&&!account.canManageScopeSync('loc'))return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  return <main className="scope-main"><section className="scope-page">
    <section className="loc-card"><h2>治理管理選單</h2><div className="scope-tabs">
      {canManageGlobal?<button type="button" onClick={()=>setSection('global')}>跨網域／人員與群組</button>:null}
      {canManageRunes?<button type="button" onClick={()=>setSection('runes')}>月之符文管理</button>:null}
      <button type="button" onClick={()=>setSection('content')}>Scope 內容管理</button>
    </div></section>
    {section==='global'&&canManageGlobal?<AdminHomeView/>:null}
    {section==='runes'&&canManageRunes?<RuneManagementPanel/>:null}
    {section==='content'?<GlobalSettings initialSection="manage"/>:null}
  </section></main>;
}
