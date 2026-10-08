'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useAccount} from './use-account';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {scopeHref} from '../modular/scope-registry';
import ScopeSettingsPanel from './ScopeSettingsPanel';
import ManagementImportPanel from './ManagementImportPanel';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ScopeGroupManagement from './ScopeGroupManagement';

const LOGIN_COPY={
  loc:{eyebrow:'LOC Group Management',title:'LOC Scope Group 管理登入'},
  lrunes:{eyebrow:'LunaRunes Management',title:'LunaRunes 管理登入'},
  lo3rwang:{eyebrow:'Personal Management',title:'lo3rwang 個人管理登入'}
};

function ManagementDisclosure({label,children}){
  return <details className="loc-card scope-management-disclosure">
    <summary>{label}</summary>
    <div className="scope-management-disclosure-body">{children}</div>
  </details>;
}

function LoginScreen({scopeId,account}){
  const copy=LOGIN_COPY[scopeId]||LOGIN_COPY.lo3rwang;
  const callbackURL=scopeId==='loc'?scopeHref('admin'):scopeHref(scopeId,'governance/manage');
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1></header>
    <section className="loc-card">
      <button className="loc-button primary" type="button" onClick={()=>account.signIn(callbackURL)}>使用 Google 登入</button>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

export default function GovernanceManagement(){
  const account=useAccount();
  const {scopeId,scope}=useScopeRuntime();
  const canManage=scope?.aggregateChildren?account.canManageGlobalSync():account.canManageScopeSync(scopeId);

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
      <div className="scope-preview-links">
        {scopeId==='loc'?<a className="loc-button" href={scopeHref('admin')}>前往 Admin 系統設定</a>:<a className="loc-button" href={scopeHref(scopeId)}>返回 Scope</a>}
        <button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button>
      </div>
    </header>

    {scope?.aggregateChildren?<ManagementDisclosure label="Scope Group 管理"><ScopeGroupManagement scopeId={scopeId}/></ManagementDisclosure>:<>
      <ManagementDisclosure label="Scope 設定"><ScopeSettingsPanel scopeId={scopeId}/></ManagementDisclosure>
      <ManagementDisclosure label="發表文章"><ManagementArticlePublisher scopeId={scopeId}/></ManagementDisclosure>
      <ManagementDisclosure label="資料匯入"><ManagementImportPanel scopeId={scopeId}/></ManagementDisclosure>
    </>}
  </section>;
}
