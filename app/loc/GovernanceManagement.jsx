'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useEffect,useMemo,useState} from 'react';
import {useAccount} from './use-account';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {scopeHref} from '../modular/scope-registry';
import ScopeSettingsPanel from './ScopeSettingsPanel';
import ManagementImportPanel from './ManagementImportPanel';
import ScopeGroupManagement from './ScopeGroupManagement';
import KeywordLibraryPanel from './KeywordLibraryPanel';

const LOGIN_COPY={
  loc:{eyebrow:'LOC Group Management',title:'LOC Scope Group 管理登入',description:'登入後管理 LOC Scope Group 結構；個別 Scope 的內容仍回到各自頁面編輯。'},
  lrunes:{eyebrow:'LunaRunes Management',title:'LunaRunes 管理登入',description:'登入後開啟月之符文的 Scope 設定、匯入與特殊管理功能。'},
  lo3rwang:{eyebrow:'Personal Management',title:'lo3rwang 個人管理登入',description:'登入後開啟 Scope 設定、匯入與發表功能；既有內容直接回公開頁面編輯。'}
};

function LoginScreen({scopeId,account}){
  const copy=LOGIN_COPY[scopeId]||LOGIN_COPY.lo3rwang;
  const callbackURL=scopeId==='loc'?scopeHref('admin'):scopeHref(scopeId,'governance/manage');
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <section className="loc-card">
      <button className="loc-button primary" type="button" onClick={()=>account.signIn(callbackURL)}>使用 Google 登入</button>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

function sectionOptions(scopeId,scope){
  if(scope?.aggregateChildren)return [{value:'group',label:'Scope Group'}];
  const options=[
    {value:'settings',label:'雜項設定'},
    {value:'import',label:'資料匯入'}
  ];
  if(scopeId!=='lrunes')options.push({value:'keywords',label:'關鍵詞庫'});
  return options;
}

export default function GovernanceManagement(){
  const account=useAccount();
  const {scopeId,scope}=useScopeRuntime();
  const options=useMemo(()=>sectionOptions(scopeId,scope),[scopeId,scope?.aggregateChildren]);
  const [section,setSection]=useState(scope?.aggregateChildren?'group':'settings');
  const canManage=scope?.aggregateChildren?account.canManageGlobalSync():account.canManageScopeSync(scopeId);

  useEffect(()=>{
    setSection(scope?.aggregateChildren?'group':'settings');
  },[scopeId,scope?.aggregateChildren]);
  useEffect(()=>{
    if(!options.some(option=>option.value===section))setSection(options[0]?.value||'settings');
  },[options,section]);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.management.checking}</div></section>;
  if(!account.user)return <LoginScreen scopeId={scopeId} account={account}/>;
  if(!canManage)return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.management.eyebrow}</p><h1>{scope.label}管理</h1></header>
    <section className="loc-card"><p>{UI_COPY.management.permissionDenied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero loc-hero-context">
      <p className="loc-eyebrow">{UI_COPY.management.eyebrow} · {scopeId}</p>
      <h1>{scope.label}{scopeId==='loc'?' Scope Group':''}管理</h1>
      <p>{account.user.email||account.user.name||''}</p>
      {!scope?.aggregateChildren?<div className="scope-management-select">
        <label htmlFor="scope-management-section">管理選單</label>
        <select id="scope-management-section" className="scope-select" value={section} onChange={event=>setSection(event.target.value)}>
          {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>:null}
      <div className="scope-preview-links">
        {scopeId==='loc'?<a className="loc-button" href={scopeHref('admin')}>前往 Admin 系統設定</a>:<a className="loc-button" href={scopeHref(scopeId)}>返回 Scope</a>}
        <button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button>
      </div>
    </header>

    {section==='group'&&scope?.aggregateChildren?<ScopeGroupManagement scopeId={scopeId}/>:null}
    {section==='settings'&&!scope?.aggregateChildren?<ScopeSettingsPanel scopeId={scopeId}/>:null}
    {section==='import'&&!scope?.aggregateChildren?<ManagementImportPanel scopeId={scopeId}/>:null}
    {section==='keywords'&&!scope?.aggregateChildren&&scopeId!=='lrunes'?<KeywordLibraryPanel scopeId={scopeId}/>:null}
  </section>;
}
