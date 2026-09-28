'use client';

import {useState} from 'react';
import {useNeonAccount} from './use-neon-account';
import {useScopeRuntimeV2} from '../modular-v2/use-scope-runtime.v2';
import {getScopeV2} from '../modular-v2/scope-registry.v2';
import ScopeBasicSettings from './ScopeBasicSettings';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ManagementImportPanel from './ManagementImportPanel';
import RuneManagementPanel from './RuneManagementPanel';
import CultureTimelineEditor from '../modular-v2/features/CultureTimelineEditor';
import KeywordSettingsV2 from '../modular-v2/features/KeywordSettingsV2';
import SourceSettingsV2 from '../modular-v2/features/SourceSettingsV2';

const LOGIN_COPY={
  loc:{
    eyebrow:'LOC Management',
    title:'LOC 管理登入',
    description:'管理 LOC 框架、治理與全域設定。LOC 採自己的 Copyleft／GPL 治理，不代表其他內容必須相同。'
  },
  lunarunes:{
    eyebrow:'LunaRunes Management',
    title:'LunaRunes 管理登入',
    description:'管理符號式語言、Canon、每日符文、數位資產與 LunaRunes 設定。'
  },
  lo3rwang:{
    eyebrow:'Personal Management',
    title:'lo3rwang 個人管理登入',
    description:'管理個人作品、來源、時期、匯入與發表內容。'
  }
};

function LoginScreen({scopeId,account}){
  const copy=LOGIN_COPY[scopeId]||LOGIN_COPY.lo3rwang;
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
    </header>
    <section className="loc-card">
      <p>登入後才會顯示管理工作頁；公開頁不提供寫入功能。</p>
      <button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>
      {account.error?<p className="scope-v2-status scope-v2-error">{account.error}</p>:null}
    </section>
  </section>;
}

function Workspace({scopeId}){
  return <div className="scope-v2-list">
    <ManagementArticlePublisher scopeId={scopeId}/>
    <ManagementImportPanel scopeId={scopeId}/>
    <ScopeBasicSettings scopeId={scopeId}/>
  </div>;
}

function Structure({scopeId}){
  return <div className="scope-v2-list">
    {scopeId!=='loc'?<CultureTimelineEditor scopeId={scopeId}/>:null}
    <SourceSettingsV2 scopeId={scopeId}/>
  </div>;
}

function KeywordStructure({scopeId}){
  if(scopeId==='loc')return null;
  return <div className="scope-v2-list">
    <KeywordSettingsV2 scopeId={scopeId}/>
  </div>;
}

export default function GovernanceManagement(){
  const account=useNeonAccount();
  const {scopeId}=useScopeRuntimeV2();
  const scope=getScopeV2(scopeId);
  const [section,setSection]=useState('workspace');
  const canManage=account.canManageScopeSync(scopeId);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">正在確認登入與管理權限…</div></section>;
  if(!account.user)return <LoginScreen scopeId={scopeId} account={account}/>;

  if(!canManage)return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Management</p><h1>{scope.label}管理</h1></header>
    <section className="loc-card"><p>目前登入身份沒有此區域的管理權限。</p><button type="button" onClick={account.signOut}>登出</button></section>
  </section>;

  const sections=[
    ['workspace','工作區'],
    ['structure',scopeId==='loc'?'來源':'時期與來源'],
    ...(scopeId!=='loc'?[['keywords','關鍵詞設定']]:[]),
    ...(scopeId==='lunarunes'?[['daily','每日符文']]:[]),
  ];

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Management · {scopeId}</p>
      <h1>{scope.label}管理</h1>
      <p>{account.user.email||account.user.name||''}</p>
      <nav className="scope-v2-local-menu" aria-label="管理功能選單">
        {sections.map(([id,label])=><button key={id} type="button" aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}
        <button type="button" onClick={account.signOut}>登出</button>
      </nav>
    </header>

    {section==='workspace'?<Workspace scopeId={scopeId}/>:null}
    {section==='structure'?<Structure scopeId={scopeId}/>:null}
    {section==='keywords'?<KeywordStructure scopeId={scopeId}/>:null}
    {section==='daily'&&scopeId==='lunarunes'?<RuneManagementPanel/>:null}
  </section>;
}
