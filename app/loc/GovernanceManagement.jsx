'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useEffect,useMemo,useState} from 'react';
import {useAccount} from './use-account';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {getScope,scopeHref} from '../modular/scope-registry';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ManagementImportPanel from './ManagementImportPanel';
import ManagementDataPanel from './ManagementDataPanel';
import RuneManagementPanel from './RuneManagementPanel';
import ScopeGroupManagement from './ScopeGroupManagement';
import KeywordLibraryPanel from './KeywordLibraryPanel';
import CultureTimelineEditor from '../modular/features/CultureTimelineEditor';

const LOGIN_COPY={
  loc:{eyebrow:'LOC Group Management',title:'LOC Scope Group 管理登入',description:'管理 LOC Scope Group 的聚合呈現；系統級設定仍在 Admin。'},
  lrunes:{eyebrow:'LunaRunes Management',title:'LunaRunes 管理登入',description:'管理符號式語言的作品、時期、風格標籤、關鍵詞與每日符文。'},
  lo3rwang:{eyebrow:'Personal Management',title:'lo3rwang 個人管理登入',description:'管理個人作品、來源、時期、風格標籤與匯入。'}
};

function LoginScreen({scopeId,account}){
  const copy=LOGIN_COPY[scopeId]||LOGIN_COPY.lo3rwang;
  const callbackURL=scopeId==='loc'?scopeHref('admin'):scopeHref(scopeId,'governance/manage');
  const [email,setEmail]=useState('');
  const [status,setStatus]=useState('');
  const submit=async event=>{
    event.preventDefault();
    setStatus('');
    const result=await account.signIn(email,callbackURL);
    if(result)setStatus('登入連結已寄出，請到信箱開啟後回到這個管理頁。');
  };
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <section className="loc-card">
      <p>登入後才會顯示管理工作頁；公開頁不提供寫入功能。</p>
      <form className="scope-management-fields" onSubmit={submit}>
        <label><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
        <button className="loc-button primary" type="submit">寄送登入連結</button>
      </form>
      {status?<p className="scope-status" role="status">{status}</p>:null}
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

function LivePreview({scopeId}){
  const home=scopeHref(scopeId);
  const governance=scopeHref(scopeId,'governance');
  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">Live Preview</p><h2>所見即所得預覽</h2>
    <p>直接預覽公開首頁；內容資料與時間資料都在同一管理工作區修改，系統級 mapping 不混入這裡。</p>
    <div className="scope-preview-links">
      <a className="loc-button" href={home} target="_blank" rel="noreferrer">開啟首頁</a>
      <a className="loc-button" href={governance} target="_blank" rel="noreferrer">開啟治理頁</a>
    </div>
    <div className="scope-management-preview"><iframe src={home} title={getScope(scopeId).label+' 公開首頁預覽'} loading="lazy"/></div>
  </section>;
}

function sectionOptions(scopeId,scope){
  if(scope?.aggregateChildren)return [{value:'preview',label:'公開預覽'},{value:'group',label:'Scope Group'}];
  const options=[
    {value:'import',label:UI_COPY.management.import},
    {value:'data',label:UI_COPY.management.data},
    {value:'article',label:UI_COPY.management.article},
    {value:'period',label:UI_COPY.management.period},
    {value:'preview',label:'公開預覽'}
  ];
  if(scopeId!=='lrunes')options.push({value:'keywords',label:'關鍵詞庫'});
  if(scopeId==='lrunes')options.push({value:'daily',label:'每日符文管理'});
  return options;
}

export default function GovernanceManagement(){
  const account=useAccount();
  const {scopeId,scope}=useScopeRuntime();
  const options=useMemo(()=>sectionOptions(scopeId,scope),[scopeId,scope?.aggregateChildren]);
  const [section,setSection]=useState(scope?.aggregateChildren?'preview':'import');
  const canManage=scope?.aggregateChildren?account.canManageGlobalSync():account.canManageScopeSync(scopeId);

  useEffect(()=>{
    setSection(scope?.aggregateChildren?'preview':'import');
  },[scopeId,scope?.aggregateChildren]);
  useEffect(()=>{
    if(!options.some(option=>option.value===section))setSection(options[0]?.value||'preview');
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
      <div className="scope-management-select">
        <label htmlFor="scope-management-section">{UI_COPY.management.item}</label>
        <select id="scope-management-section" className="scope-select" value={section} onChange={event=>setSection(event.target.value)}>
          {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="scope-preview-links">
        {scopeId==='loc'?<a className="loc-button" href={scopeHref('admin')}>前往 Admin 系統設定</a>:null}
        <button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button>
      </div>
    </header>

    {section==='preview'?<LivePreview scopeId={scopeId}/>:null}
    {section==='group'&&scope?.aggregateChildren?<ScopeGroupManagement scopeId={scopeId}/>:null}
    {section==='data'&&!scope?.aggregateChildren?<ManagementDataPanel scopeId={scopeId}/>:null}
    {section==='article'&&!scope?.aggregateChildren?<ManagementArticlePublisher scopeId={scopeId}/>:null}
    {section==='import'&&!scope?.aggregateChildren?<ManagementImportPanel scopeId={scopeId}/>:null}
    {section==='period'&&!scope?.aggregateChildren?<CultureTimelineEditor scopeId={scopeId}/>:null}
    {section==='keywords'&&!scope?.aggregateChildren&&scopeId!=='lrunes'?<KeywordLibraryPanel scopeId={scopeId}/>:null}
    {section==='daily'&&scopeId==='lrunes'?<RuneManagementPanel/>:null}
  </section>;
}
