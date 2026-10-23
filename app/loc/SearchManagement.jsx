'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useAccount} from './use-account';

const ManagementSearchWorkspace=dynamic(
  ()=>import('../modular/features/Search'),
  {loading:()=> <p className="scope-status" role="status">載入管理搜尋…</p>}
);
const ScopeEditableBlocks=dynamic(()=>import('./ScopeEditableBlocks'),{loading:()=>null});
const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:()=>null});
const SunoImportPanel=dynamic(()=>import('./SunoImportPanel'),{loading:()=>null});

const SECTIONS=Object.freeze([
  {value:'search',label:'管理搜尋'},
  {value:'suggestions',label:'建議搜尋的編輯'},
  {value:'publish',label:'單獨的文章發表與 Suno 寫入'}
]);

export default function SearchManagement(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const [section,setSection]=useState('search');
  const ready=!account.loading&&!account.permissionLoading;
  const isContentScope=Boolean(scopeId&&scopeId!=='loc'&&scopeId!=='admin'&&!scope?.aggregateChildren);
  const permitted=ready&&Boolean(account.user)&&isContentScope&&account.canManageScopeSync(scopeId);
  const currentSection=SECTIONS.find(option=>option.value===section)||SECTIONS[0];

  // featureId="search" shares the Scope's existing, database-backed Search Hero.
  // Neither its image nor any of its text is replicated or overridden here.
  if(!ready)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card">
      <p>請先登入，才能使用管理搜尋。</p>
      <ScopeLink className="loc-button primary" href="/settings/?section=account">前往登入</ScopeLink>
    </section>
  </FeaturePage>;
  if(!permitted)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="alert">沒有此 Scope 的管理權限。</section>
  </FeaturePage>;

  return <FeaturePage featureId="search">
    <p className="scope-status">進階管理模式</p>
    <div className="scope-stat-controls scope-stat-workspace-switch">
      <label htmlFor="management-search-section">管理搜尋功能</label>
      <Select inputId="management-search-section" instanceId="management-search-section"
        className="loc-settings-select" classNamePrefix="loc-settings-select"
        unstyled isSearchable={false} options={SECTIONS} value={currentSection}
        onChange={option=>setSection(option?.value||'search')}
        aria-label="管理搜尋功能"/>
    </div>
    {section==='search'?<ManagementSearchWorkspace managementMode/>:null}
    {section==='suggestions'?<section className="loc-card">
      <ScopeEditableBlocks scopeId={scopeId} page="search" orders={[1]}
        className="scope-search-reference-grid"
        slotClassName="scope-search-reference-block"
        editSlotClassName="scope-search-reference-block"
        headingLevel={2} allowEditing allowDelete={false}
        allowInlineChildAdd explicitEditButton/>
    </section>:null}
    {section==='publish'?<div className="scope-management-imports">
      <ManagementArticlePublisher scopeId={scopeId}/>
      <SunoImportPanel scopeId={scopeId}/>
    </div>:null}
  </FeaturePage>;
}
