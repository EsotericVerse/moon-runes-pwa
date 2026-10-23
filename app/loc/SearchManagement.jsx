'use client';

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import {useQuery} from '@tanstack/react-query';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {selectScopeRegistry} from './scope-data';
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
  const {scopeId}=useScopeRuntime();
  const account=useAccount();
  const [section,setSection]=useState('search');
  const [suggestionScope,setSuggestionScope]=useState('');
  const [publishScope,setPublishScope]=useState('');
  const ready=!account.loading&&!account.permissionLoading;
  const isAdmin=ready&&account.canManageGlobalSync();
  const permitted=ready&&Boolean(account.user)&&(
    scopeId==='loc' ? isAdmin||account.scopes.length>0
      :account.canManageScopeSync(scopeId)
  );
  const registry=useQuery({
    queryKey:['management-search-scope-options'],
    queryFn:()=>selectScopeRegistry({scopeKind:'scope'}),
    enabled:permitted&&scopeId==='loc'&&section!=='search',
    staleTime:5*60_000
  });
  const managedScopes=useMemo(()=>{
    if(scopeId!=='loc')return [{value:scopeId,label:scopeId}];
    return (registry.data||[]).filter(row=>row.active&&
      (isAdmin||account.canManageScopeSync(row.scope_id)))
      .map(row=>({value:row.scope_id,
        label:`${String(row.display_name||row.scope_id)}(${row.scope_id})`}));
  },[scopeId,registry.data,isAdmin,account.authorizer]);
  const suggestionOptions=useMemo(()=>isAdmin&&scopeId==='loc'
    ?[{value:'loc',label:'LOC(loc)'},...managedScopes]
    :managedScopes,[isAdmin,scopeId,managedScopes]);
  const activeSuggestionScope=scopeId==='loc'
    ?(suggestionOptions.find(option=>option.value===suggestionScope)?.value||
      (suggestionOptions.length===1?suggestionOptions[0].value:''))
    :scopeId;
  const activePublishScope=scopeId==='loc'
    ?(managedScopes.find(option=>option.value===publishScope)?.value||
      (managedScopes.length===1?managedScopes[0].value:''))
    :scopeId;
  const currentSection=SECTIONS.find(option=>option.value===section)||SECTIONS[0];

  if(!ready)return <FeaturePage featureId="manage" titleOverride="管理搜尋頁面">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="manage" titleOverride="管理搜尋頁面">
    <section className="loc-card scope-feature-card">
      <p>請先登入，才能使用管理搜尋頁面。</p>
      <ScopeLink className="loc-button primary" href="/settings/?section=account">前往登入</ScopeLink>
    </section>
  </FeaturePage>;
  if(!permitted)return <FeaturePage featureId="manage" titleOverride="管理搜尋頁面">
    <section className="loc-card scope-feature-card" role="alert">沒有此 Scope 的管理權限。</section>
  </FeaturePage>;

  return <FeaturePage featureId="manage" titleOverride="管理搜尋頁面">
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
      {scopeId==='loc'?<div className="scope-stat-controls scope-stat-workspace-switch">
        <label htmlFor="management-suggestion-scope">編輯 Scope</label>
        <Select inputId="management-suggestion-scope" instanceId="management-suggestion-scope"
          className="loc-settings-select" classNamePrefix="loc-settings-select"
          unstyled isSearchable={false} options={suggestionOptions}
          value={suggestionOptions.find(item=>item.value===activeSuggestionScope)||null}
          onChange={option=>setSuggestionScope(option?.value||'')}
          placeholder="選擇 Scope"/>
      </div>:null}
      {activeSuggestionScope?<ScopeEditableBlocks key={activeSuggestionScope}
        scopeId={activeSuggestionScope} page="search" orders={[1]}
        className="scope-search-reference-grid"
        slotClassName="scope-search-reference-block"
        editSlotClassName="scope-search-reference-block"
        headingLevel={2} allowEditing allowDelete={false}
        allowInlineChildAdd explicitEditButton/>:null}
    </section>:null}
    {section==='publish'?<div className="scope-management-imports">
      {scopeId==='loc'?<section className="loc-card">
        <label htmlFor="management-publish-scope">發表到 Scope</label>
        <Select inputId="management-publish-scope" instanceId="management-publish-scope"
          className="loc-settings-select" classNamePrefix="loc-settings-select"
          unstyled isSearchable={false} options={managedScopes}
          value={managedScopes.find(item=>item.value===activePublishScope)||null}
          onChange={option=>setPublishScope(option?.value||'')}
          placeholder="選擇 Scope"/>
      </section>:null}
      {activePublishScope?<div key={activePublishScope}>
        <ManagementArticlePublisher scopeId={activePublishScope}/>
        <SunoImportPanel scopeId={activePublishScope}/>
      </div>:null}
    </div>:null}
  </FeaturePage>;
}
