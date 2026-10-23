'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useAccount} from './use-account';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import ManagementSectionNav from '../modular/ManagementSectionNav';
import PanelLoading from './PanelLoading';

const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:PanelLoading});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:PanelLoading});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:PanelLoading});
const ScopeEditableBlocks=dynamic(()=>import('./ScopeEditableBlocks'),{loading:PanelLoading});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'settings',label:'Scope 主題',description:'選擇這個 Scope 使用的主題。'},
  {value:'media',label:'新增多媒體',description:'新增一筆圖片、影片或外部媒體資料。'},
  {value:'import',label:'資料匯入',description:'匯入檔案、檢查資料並管理匯入結果。'},
  {value:'governance',label:'治理頁編輯',description:'編輯此 Scope 治理頁的既有區塊。'}
]);

export default function GovernanceManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const canManageHere=account.canManageScopeSync(routeScopeId);
  const [section,setSection]=useState('settings');
  const selectedOption=MANAGEMENT_OPTIONS.find(option=>option.value===section)||MANAGEMENT_OPTIONS[0];
  if(!account.user)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><ScopeLink className="loc-button primary" href="/local/settings/?section=account">請先登入</ScopeLink></section></FeaturePage>;
  if(!canManageHere)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>目前帳號沒有治理管理權限。</p></section></FeaturePage>;
  return <FeaturePage featureId="manage">

    <div className="management-workspace">
      <ManagementSectionNav id="scope-sections" title="管理項目" panelId="scope-management-panel"
        items={MANAGEMENT_OPTIONS} value={section} onChange={setSection}/>
      <div className="management-workspace-panel" id="scope-management-panel" role="region"
        aria-labelledby={'scope-sections-option-'+selectedOption.value}>
        {section==='settings'?<ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/>:null}
        {section==='media'?<ManagementArticlePublisher key={routeScopeId+'-media'} scopeId={routeScopeId} mode="media"/>:null}
        {section==='import'?<ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/>:null}
        {section==='governance'?<ScopeEditableBlocks key={routeScopeId+'-governance'}
          scopeId={routeScopeId} page="governance"
          className={'loc-grid two governance-grid'+(routeScopeId==='loc'?' governance-grid-loc':'')}
          headingLevel={2} allowDelete
          authorizedByParent startInEditMode explicitEditButton
          onEditorExit={()=>setSection('settings')}/>:null}
      </div>
    </div>
  </FeaturePage>;
}
