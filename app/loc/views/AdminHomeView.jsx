'use client';

import {useMemo,useState} from 'react';
import Select from 'react-select';
import {SCOPES_V2} from '../../modular-v2/scope-registry.v2';
import {THEME_SLOTS_V2} from '../../modular-v2/theme-registry.v2';
import {useNeonAccount} from '../use-neon-account';

const ADMIN_OPTIONS=Object.freeze([
  {value:'scopes',label:'區域總覽'},
  {value:'themes',label:'預設 Theme'}
]);

function Login({account}){
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Admin</p><h1>系統管理登入</h1></header>
    <section className="loc-card">
      <p>Admin 是獨立管理站，不屬於 Scope。</p>
      <button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>
      {account.error?<p className="scope-v2-status scope-v2-error">{account.error}</p>:null}
    </section>
  </section>;
}

function ScopeOverview(){
  const scopes=Object.values(SCOPES_V2).filter(scope=>scope.id!=='admin');
  return <section className="loc-card">
    <p className="loc-eyebrow">Current Scope Registry</p>
    <h2>區域總覽</h2>
    <div className="scope-v2-list">
      {scopes.map(scope=><article className="scope-v2-inline-card" key={scope.id}>
        <strong>{scope.label}</strong>
        <span>{scope.id} · {scope.scopeType}</span>
      </article>)}
    </div>
  </section>;
}

function ThemeOverview(){
  return <section className="loc-card">
    <p className="loc-eyebrow">Theme Registry</p>
    <h2>預設 Theme</h2>
    <p>RC8 前先確認現有 8 個 Theme 槽位，不在這裡改寫 Theme 定義。</p>
    <div className="scope-v2-list">
      {THEME_SLOTS_V2.map(theme=><article className="scope-v2-inline-card" key={theme.id}>
        <strong>{theme.label}</strong>
        <span>{theme.id} · {theme.scheme}</span>
      </article>)}
    </div>
  </section>;
}

export default function AdminHomeView(){
  const account=useNeonAccount();
  const [section,setSection]=useState('scopes');
  const selected=useMemo(()=>ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0],[section]);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">正在確認 Admin 權限…</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Admin</p><h1>系統管理</h1></header>
    <section className="loc-card"><p>目前登入身份沒有 Admin 權限。</p><button type="button" onClick={account.signOut}>登出</button></section>
  </section>;

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Admin · RC8 Preview</p>
      <h1>系統管理</h1>
      <p>先保持簡單；Scope 的完整管理仍由各 Scope 自己負責。</p>
      <div className="scope-v2-management-select">
        <label htmlFor="admin-management-section">管理項目</label>
        <Select
          inputId="admin-management-section"
          className="scope-v2-react-select"
          classNamePrefix="scope-v2-react-select"
          unstyled
          options={ADMIN_OPTIONS}
          value={selected}
          onChange={option=>option?.value&&setSection(option.value)}
        />
      </div>
      <p><button type="button" onClick={account.signOut}>登出</button></p>
    </header>
    {section==='scopes'?<ScopeOverview/>:<ThemeOverview/>}
  </section>;
}
