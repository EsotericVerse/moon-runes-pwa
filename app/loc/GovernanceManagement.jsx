'use client';

import {useEffect,useMemo,useState} from 'react';
import Select from 'react-select';
import {useNeonAccount} from './use-neon-account';
import {useScopeRuntimeV2} from '../modular-v2/use-scope-runtime.v2';
import {getScopeV2} from '../modular-v2/scope-registry.v2';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ManagementImportPanel from './ManagementImportPanel';
import RuneManagementPanel from './RuneManagementPanel';
import CultureTimelineEditor from '../modular-v2/features/CultureTimelineEditor';
import StyleKeywordSettingsV2 from '../modular-v2/features/StyleKeywordSettingsV2';

const LOGIN_COPY={
  loc:{
    eyebrow:'LOC Management',
    title:'LOC 管理登入',
    description:'LOC 的系統管理入口位於 admin.lo3rwang.cc；Scope 內容管理請由各 Scope 的治理頁進入。'
  },
  lunarunes:{
    eyebrow:'LunaRunes Management',
    title:'LunaRunes 管理登入',
    description:'管理符號式語言的作品、時期與每日符文。'
  },
  lo3rwang:{
    eyebrow:'Personal Management',
    title:'lo3rwang 個人管理登入',
    description:'管理個人作品、來源、時期、匯入與風格關鍵詞。'
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
  </div>;
}

function PeriodSettings({scopeId}){
  if(scopeId==='loc')return null;
  return <CultureTimelineEditor scopeId={scopeId}/>;
}

function ClassificationSettings({scopeId}){
  if(scopeId==='lo3rwang')return <StyleKeywordSettingsV2/>;
  return null;
}

function sectionOptions(scopeId){
  if(scopeId==='loc')return [];
  const options=[
    {value:'workspace',label:'文章與匯入'},
    {value:'period',label:'時期設定'}
  ];
  if(scopeId==='lo3rwang')options.push({value:'classification',label:'關鍵詞／風格分類'});
  if(scopeId==='lunarunes')options.push({value:'daily',label:'每日符文管理'});
  return options;
}

export default function GovernanceManagement(){
  const account=useNeonAccount();
  const {scopeId}=useScopeRuntimeV2();
  const scope=getScopeV2(scopeId);
  const options=useMemo(()=>sectionOptions(scopeId),[scopeId]);
  const [section,setSection]=useState('workspace');
  const canManage=account.canManageScopeSync(scopeId);

  useEffect(()=>{
    if(!options.some(option=>option.value===section))setSection(options[0]?.value||'workspace');
  },[scopeId,options,section]);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">正在確認登入與管理權限…</div></section>;
  if(!account.user)return <LoginScreen scopeId={scopeId} account={account}/>;

  if(scopeId==='loc')return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">LOC Management</p>
      <h1>LOC 系統管理</h1>
      <p>LOC 的系統管理已集中到獨立管理站。</p>
    </header>
    <section className="loc-card">
      <a className="loc-button primary" href={getScopeV2('admin').primary.href}>前往 admin.lo3rwang.cc</a>
      <button className="loc-button" type="button" onClick={account.signOut}>登出</button>
    </section>
  </section>;

  if(!canManage)return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Management</p><h1>{scope.label}管理</h1></header>
    <section className="loc-card"><p>目前登入身份沒有此區域的管理權限。</p><button type="button" onClick={account.signOut}>登出</button></section>
  </section>;

  const selected=options.find(option=>option.value===section)||options[0]||null;

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Management · {scopeId}</p>
      <h1>{scope.label}管理</h1>
      <p>{account.user.email||account.user.name||''}</p>
      <div className="scope-v2-management-select">
        <label htmlFor="scope-management-section">管理項目</label>
        <Select
          inputId="scope-management-section"
          className="scope-v2-react-select"
          classNamePrefix="scope-v2-react-select"
          unstyled
          isSearchable
          options={options}
          value={selected}
          noOptionsMessage={()=>"沒有符合的管理項目"}
          onChange={option=>option?.value&&setSection(option.value)}
        />
      </div>
      <p><button type="button" onClick={account.signOut}>登出</button></p>
    </header>

    {section==='workspace'?<Workspace scopeId={scopeId}/>:null}
    {section==='period'?<PeriodSettings scopeId={scopeId}/>:null}
    {section==='classification'?<ClassificationSettings scopeId={scopeId}/>:null}
    {section==='daily'&&scopeId==='lunarunes'?<RuneManagementPanel/>:null}
  </section>;
}
