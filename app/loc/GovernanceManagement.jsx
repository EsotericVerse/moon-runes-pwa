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
const ScopeOthersSources=dynamic(()=>import('./ScopeOthersSources'),{loading:PanelLoading});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'import',label:'匯入',shortLabel:'匯入',description:'匯入檔案、檢查資料並管理匯入結果。'},
  {value:'others',label:'自訂分類',shortLabel:'分類',description:''},
  {value:'governance',label:'編輯治理頁面',shortLabel:'治理',description:''},
  {value:'settings',label:'主題',shortLabel:'主題',description:''}
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
  // Keep the existing management menu and its Governance entry as a deep link,
  // but edit the original governance blocks only in Search's advanced workspace.
  const governanceSearchHref=navigationHref(routeScopeId,'governance/manage/search',native);
  const governanceEditHref=governanceSearchHref+(governanceSearchHref.includes('?')?'&':'?')+'section=governance&edit=1';
  useEffect(()=>{
    if(isLoc||!account.user||!canManageHere||(!editRequested&&!['governance','others','settings'].includes(section))||account.permissionLoading)return;
    editDock?.begin(routeScopeId);
  },[account.user,account.permissionLoading,canManageHere,editRequested,section,routeScopeId,isLoc,editDock?.begin]);
  if(account.loading||account.permissionLoading)return <FeaturePage featureId="manage">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>請先至設定首頁登入。</p></section></FeaturePage>;
  if(!canManageHere)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>目前帳號沒有治理管理權限。</p></section></FeaturePage>;
  if(isLoc)return <FeaturePage featureId="manage">
    <section className="loc-card scope-feature-card">
      <div className="scope-stat-controls">
        <ScopeLink className="loc-button" native={native} href={navigationHref('loc','culture/manage',native)+'?edit=1'}>來源管理</ScopeLink>
        <ScopeLink className="loc-button" native={native} href={navigationHref('loc','statics/manage',native)+'?edit=1'}>關鍵詞管理</ScopeLink>
        <ScopeLink className="loc-button" native={native} href={governanceEditHref}>編輯治理頁面</ScopeLink>
      </div>
    </section>
  </FeaturePage>;
  return <FeaturePage featureId="manage">

    <div className="scope-management-layout">
    <div className="management-workspace">
      <ManagementSectionNav id="scope-sections" title="管理" panelId="scope-management-panel"
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
        {section==='governance'?<section className="loc-card scope-feature-card">
          <ScopeLink className="loc-button" native={native} href={governanceEditHref}>
            前往搜尋進階編輯 · 治理
          </ScopeLink>
        </section>:null}
      </div>
    </div>
    </div>
  </FeaturePage>;
}
