'use client';

import {useEffect} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import ManagementSectionNav,{useManagementSection} from '../modular/ManagementSectionNav';
import PanelLoading from './PanelLoading';
import {navigationHref} from '../modular/scope-registry';
import useNativeNavigation from '../modular/use-native-navigation';

const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:PanelLoading});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:PanelLoading});
const ScopeEditableBlocks=dynamic(()=>import('./ScopeEditableBlocks'),{loading:PanelLoading});
const ScopeOthersSources=dynamic(()=>import('./ScopeOthersSources'),{loading:PanelLoading});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'import',label:'匯入',description:'匯入檔案、檢查資料並管理匯入結果。'},
  {value:'others',label:'自訂作品來源',description:'管理此 Scope 專屬的作品來源設定。'},
  {value:'governance',label:'編輯治理頁面',description:'編輯此 Scope 治理頁的既有區塊。'},
  {value:'settings',label:'主題',description:'選擇這個 Scope 使用的主題。'}
]);

export default function GovernanceManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const native=useNativeNavigation();
  const isLoc=routeScopeId==='loc';
  const canManageHere=isLoc?account.canManageGlobalSync():account.canManageScopeSync(routeScopeId);
  const options=MANAGEMENT_OPTIONS;
  const editRequested=searchParams?.get('edit')==='1';
  const [section,setSection]=useManagementSection(options);
  const selectedOption=options.find(option=>option.value===section)||options[0];
  useEffect(()=>{
    if(isLoc||!account.user||!canManageHere||(!editRequested&&!['governance','others'].includes(section))||account.permissionLoading)return;
    editDock?.begin(routeScopeId);
  },[account.user,account.permissionLoading,canManageHere,editRequested,section,routeScopeId,isLoc,editDock?.begin]);
  if(account.loading||account.permissionLoading)return <FeaturePage featureId="manage">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><ScopeLink className="loc-button primary" href="/local/settings/?section=account">請先登入</ScopeLink></section></FeaturePage>;
  if(!canManageHere)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>目前帳號沒有治理管理權限。</p></section></FeaturePage>;
  if(isLoc)return <FeaturePage featureId="manage">
    <section className="loc-card scope-feature-card">
      <p>LOC 編輯管理已按功能分頁，請前往各自的編輯工作區。</p>
      <div className="scope-stat-controls">
        <ScopeLink className="loc-button" native={native} href={navigationHref('loc','culture/manage',native)+'?edit=1'}>來源管理</ScopeLink>
        <ScopeLink className="loc-button" native={native} href={navigationHref('loc','statics/manage',native)+'?edit=1'}>關鍵詞管理</ScopeLink>
        <ScopeLink className="loc-button" native={native} href={navigationHref('admin','',native)+'?section=featureHero&edit=1'}>編輯治理頁面（Admin）</ScopeLink>
      </div>
    </section>
  </FeaturePage>;
  return <FeaturePage featureId="manage">

    <div className="management-workspace">
      <ManagementSectionNav id="scope-sections" title="管理項目" panelId="scope-management-panel"
        items={options} value={section} onChange={next=>{
          if(next===section)return;
          if(editDock?.active)editDock.switchSection(next,setSection);
          else setSection(next);
        }}/>
      <div className="management-workspace-panel" id="scope-management-panel" role="region"
        aria-labelledby={'scope-sections-option-'+selectedOption.value}>
        {section==='settings'?<ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/>:null}
        {section==='import'?<ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/>:null}
        {section==='others'?<ScopeOthersSources key={routeScopeId+'-others'} scopeId={routeScopeId} scopeData={account.scopeDataFor(routeScopeId)}/>:null}
        {section==='governance'?<ScopeEditableBlocks key={routeScopeId+'-governance'}
          scopeId={routeScopeId} page="governance"
          className="loc-grid two governance-grid"
          headingLevel={2} allowDelete
          authorizedByParent startInEditMode explicitEditButton
          onEditorExit={()=>setSection('import')}/>:null}
      </div>
    </div>
  </FeaturePage>;
}
