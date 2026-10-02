'use client';

import {UI_COPY} from '../i18n/ui-copy';

import {useEffect,useMemo,useState} from 'react';
import {useNeonAccount} from './use-neon-account';
import {useScopeRuntimeV2} from '../modular-v2/use-scope-runtime.v2';
import {getScopeV2} from '../modular-v2/scope-registry.v2';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ManagementImportPanel from './ManagementImportPanel';
import ManagementDataPanel from './ManagementDataPanel';
import RuneManagementPanel from './RuneManagementPanel';
import CultureTimelineEditor from '../modular-v2/features/CultureTimelineEditor';

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
    description:'管理個人作品、來源、時期與匯入。'
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

function ArticleSettings({scopeId}){
  return <ManagementArticlePublisher scopeId={scopeId}/>;
}

function ImportSettings({scopeId}){
  return <ManagementImportPanel scopeId={scopeId}/>;
}

function KeywordSettings(){
  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">Keywords</p>
    <h2>關鍵詞管理</h2>
    <p>Current Neon 尚未配置獨立的關鍵詞 SSOT；舊 Style 關鍵詞表已退役。</p>
    <p>此入口先固定在管理選單中，但不會把關鍵詞偷寫入 Meta Tag、時期 Style Tag、符文 Canon 或其他不相干欄位。待既有資料結構確定後，這裡直接承接新增、編輯與命名。</p>
  </section>;
}

function PeriodSettings({scopeId}){
  if(scopeId==='loc')return null;
  return <CultureTimelineEditor scopeId={scopeId}/>;
}

function sectionOptions(scopeId){
  if(scopeId==='loc')return [];
  const options=[
    {value:'data',label:UI_COPY.management.data},
    {value:'article',label:UI_COPY.management.article},
    {value:'import',label:UI_COPY.management.import},
    {value:'period',label:UI_COPY.management.period},
    {value:'keywords',label:UI_COPY.management.keywords}
  ];
  if(scopeId==='lunarunes')options.push({value:'daily',label:'每日符文管理'});
  return options;
}

export default function GovernanceManagement(){
  const account=useNeonAccount();
  const {scopeId}=useScopeRuntimeV2();
  const scope=getScopeV2(scopeId);
  const options=useMemo(()=>sectionOptions(scopeId),[scopeId]);
  const [section,setSection]=useState('data');
  const canManage=account.canManageScopeSync(scopeId);

  useEffect(()=>{
    if(!options.some(option=>option.value===section))setSection(options[0]?.value||'data');
  },[scopeId,options,section]);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.management.checking}</div></section>;
  if(!account.user)return <LoginScreen scopeId={scopeId} account={account}/>;

  if(scopeId==='loc')return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">{UI_COPY.management.eyebrow}</p>
      <h1>{UI_COPY.management.locTitle}</h1>
      <p>{UI_COPY.management.locDescription}</p>
    </header>
    <section className="loc-card">
      <a className="loc-button primary" href={getScopeV2('admin').primary.href}>{UI_COPY.management.locAdminLink}</a>
      <button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button>
    </section>
  </section>;

  if(!canManage)return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.management.eyebrow}</p><h1>{scope.label}管理</h1></header>
    <section className="loc-card"><p>{UI_COPY.management.permissionDenied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">{UI_COPY.management.eyebrow} · {scopeId}</p>
      <h1>{scope.label}管理</h1>
      <p>{account.user.email||account.user.name||''}</p>
      <div className="scope-v2-management-select">
        <label htmlFor="scope-management-section">{UI_COPY.management.item}</label>
        <select id="scope-management-section" className="scope-v2-select" value={section} onChange={event=>setSection(event.target.value)}>
          {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></p>
    </header>

    {section==='data'?<ManagementDataPanel scopeId={scopeId}/>:null}
    {section==='article'?<ArticleSettings scopeId={scopeId}/>:null}
    {section==='import'?<ImportSettings scopeId={scopeId}/>:null}
    {section==='period'?<PeriodSettings scopeId={scopeId}/>:null}
    {section==='keywords'?<KeywordSettings/>:null}
    {section==='daily'&&scopeId==='lunarunes'?<RuneManagementPanel/>:null}
  </section>;
}
