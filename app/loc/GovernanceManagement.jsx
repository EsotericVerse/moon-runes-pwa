'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import {useAccount} from './use-account';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';

// Only scope's own content-management tools load here. Nothing admin-level
// (domain/directory/database/system members) belongs on this page — that is
// entirely /admin/'s job, kept on a separate page by design.
//
// This page manages exactly the one Scope its own route/directory belongs
// to (routeScopeId) — never a different Scope picked from a dropdown. To
// manage another Scope, go to that Scope's own 治理管理 entry point.
//
// One section renders at a time, same pattern as /admin/'s AdminHomeView:
// a react-select switcher picks the section, and each panel component is
// next/dynamic, so only the selected section's chunk downloads/mounts —
// not three <details> all open and all mounted at once.
const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:()=>null});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:()=>null});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:()=>null});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'settings',label:'Scope 設定'},
  {value:'publisher',label:'發表文章'},
  {value:'import',label:'資料匯入'}
]);
const selectProps={
  unstyled:true,isSearchable:false,
  className:'loc-settings-select',classNamePrefix:'loc-settings-select'
};

export default function GovernanceManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const canManageHere=account.canManageScopeSync(routeScopeId);
  const [section,setSection]=useState('settings');
  const selectedOption=MANAGEMENT_OPTIONS.find(option=>option.value===section)||MANAGEMENT_OPTIONS[0];
  if(!account.user)return <section className="loc-card"><h2>治理管理</h2><ScopeLink className="loc-button primary" href="/settings/?section=account">請先登入</ScopeLink></section>;
  if(!canManageHere)return <section className="loc-card"><p>目前帳號沒有治理管理權限。</p></section>;
  // Follows the same FeaturePage template as the four major feature pages
  // and as /admin/'s AdminHomeView (own featureId, "manage" -- distinct from
  // /admin's "admin", never shared: this page is always reached per-Scope,
  // never under scopeId==='loc' -- see Governance.jsx's manageHref, which
  // sends `loc` itself to /admin instead). The section-select used to live
  // inside the hero header (admin-hero-row/admin-main-select nested in a
  // "loc-hero" box); .loc-hero has overflow:hidden for its decorative corner
  // glow, which silently clipped the react-select dropdown with nowhere to
  // escape to. It now lives in FeaturePage's children, outside the hero.
  return <FeaturePage featureId="manage">
    {/* scope-management-page only supplies the --management-min CSS
        variable that .scope-management-fields (used by ScopeSettingsPanel
        etc.) reads; kept here, scoped to just this content, now that the
        hero above no longer carries that class. */}
    <div className="scope-management-page">
      <div className="admin-main-select">
        <Select {...selectProps}
          inputId="governance-management-select"
          instanceId="governance-management-select"
          aria-label="Scope 管理功能"
          options={MANAGEMENT_OPTIONS}
          value={selectedOption}
          onChange={option=>setSection(option?.value||'settings')}
        />
      </div>
      {section==='settings'?<ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/>:null}
      {section==='publisher'?<ManagementArticlePublisher key={routeScopeId+'-publisher'} scopeId={routeScopeId}/>:null}
      {section==='import'?<ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/>:null}
    </div>
  </FeaturePage>;
}
