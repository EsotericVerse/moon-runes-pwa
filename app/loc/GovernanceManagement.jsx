'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useEffect,useMemo,useState} from 'react';
import {useNeonAccount} from './use-neon-account';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {getScope,scopeHref} from '../modular/scope-registry';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ManagementImportPanel from './ManagementImportPanel';
import ManagementDataPanel from './ManagementDataPanel';
import ScopeGroupManagement from './ScopeGroupManagement';
import CultureTimelineEditor from '../modular/features/CultureTimelineEditor';

function LoginScreen({scope,account}){
  const group=Boolean(scope.aggregateChildren);
  const copy=group
    ?{eyebrow:'Scope Group Management',title:scope.label+' Scope Group 管理登入',description:'管理聚合 Scope 的公開呈現；系統級設定仍在 Admin。'}
    :{eyebrow:'Scope Management',title:scope.label+' 管理登入',description:'管理此 Scope 的作品、時期、風格標籤與匯入。'};
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></header>
    <section className="loc-card">
      <p>登入後才會顯示管理工作頁；公開頁不提供寫入功能。</p>
      <button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button>
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
    <div className="scope-management-preview"><iframe src={home} title={getScope(scopeId).label+' 公開首頁預覽'}/></div>
  </section>;
}

function sectionOptions(scope,extraSections=[]){
  if(scope.aggregateChildren)return [{value:'preview',label:'公開預覽'},{value:'group',label:'Scope Group'},...extraSections];
  const options=[
    {value:'preview',label:'公開預覽'},
    {value:'data',label:UI_COPY.management.data},
    {value:'article',label:UI_COPY.management.article},
    {value:'import',label:UI_COPY.management.import},
    {value:'period',label:UI_COPY.management.period}
  ];
  return options;
}

export default function GovernanceManagement({extraSections=[]}){
  const account=useNeonAccount();
  const {scopeId}=useScopeRuntime();
  const scope=getScope(scopeId);
  const options=useMemo(()=>sectionOptions(scope,extraSections),[scope.id,scope.aggregateChildren,extraSections]);
  const [section,setSection]=useState('preview');
  const canManage=scope.aggregateChildren?account.canManageGlobalSync():account.canManageScopeSync(scopeId);

  useEffect(()=>{
    if(!options.some(option=>option.value===section))setSection(options[0]?.value||'preview');
  },[scopeId,options,section]);

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.management.checking}</div></section>;
  if(!account.user)return <LoginScreen scope={scope} account={account}/>;
  if(!canManage)return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.management.eyebrow}</p><h1>{scope.label}管理</h1></header>
    <section className="loc-card"><p>{UI_COPY.management.permissionDenied}</p><button type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button></section>
  </section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero">
      <p className="loc-eyebrow">{UI_COPY.management.eyebrow} · {scopeId}</p>
      <h1>{scope.label}{scope.aggregateChildren?' Scope Group':''}管理</h1>
      <p>{account.user.email||account.user.name||''}</p>
      <div className="scope-management-select">
        <label htmlFor="scope-management-section">{UI_COPY.management.item}</label>
        <select id="scope-management-section" className="scope-select" value={section} onChange={event=>setSection(event.target.value)}>
          {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="scope-preview-links">
        {scope.aggregateChildren?<a className="loc-button" href={scopeHref('admin')}>前往 Admin 系統設定</a>:null}
        <button className="loc-button" type="button" onClick={account.signOut}>{UI_COPY.management.signOut}</button>
      </div>
    </header>

    {section==='preview'?<LivePreview scopeId={scopeId}/>:null}
    {section==='group'&&scope.aggregateChildren?<ScopeGroupManagement/>:null}
    {section==='data'&&!scope.aggregateChildren?<ManagementDataPanel scopeId={scopeId}/>:null}
    {section==='article'&&!scope.aggregateChildren?<ManagementArticlePublisher scopeId={scopeId}/>:null}
    {section==='import'&&!scope.aggregateChildren?<ManagementImportPanel scopeId={scopeId}/>:null}
    {section==='period'&&!scope.aggregateChildren?<CultureTimelineEditor scopeId={scopeId}/>:null}
    {extraSections.map(item=>{const ExtraView=item.render;return section===item.value&&ExtraView?<ExtraView key={item.value}/>:null;})}
  </section>;
}
