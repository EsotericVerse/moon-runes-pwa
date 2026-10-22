'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import {useAccount} from './use-account';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import PanelLoading from './PanelLoading';
import SectionBanner from './SectionBanner';

const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:PanelLoading});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:PanelLoading});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:PanelLoading});

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
  return <FeaturePage featureId="manage">

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
      <SectionBanner id={section}/>
      {section==='settings'?<ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/>:null}
      {section==='publisher'?<ManagementArticlePublisher key={routeScopeId+'-publisher'} scopeId={routeScopeId}/>:null}
      {section==='import'?<ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/>:null}
    </div>
  </FeaturePage>;
}
