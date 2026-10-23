'use client';

import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import ManagementSectionNav from '../modular/ManagementSectionNav';
import PanelLoading from './PanelLoading';

const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:PanelLoading});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:PanelLoading});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:PanelLoading});
const ScopeEditableBlocks=dynamic(()=>import('./ScopeEditableBlocks'),{loading:PanelLoading});
const ScopeOthersSources=dynamic(()=>import('./ScopeOthersSources'),{loading:PanelLoading});
const AdminSourceCategories=dynamic(()=>import('./SourceCategoryEditor').then(mod=>mod.AdminSourceCategories),{loading:PanelLoading});
const LocKeywordManagement=dynamic(()=>import('./LocKeywordManagement'),{loading:PanelLoading});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'settings',label:'Scope 主題',description:'選擇這個 Scope 使用的主題。'},
  {value:'media',label:'新增多媒體',description:'新增一筆圖片、影片或外部媒體資料。'},
  {value:'import',label:'資料匯入',description:'匯入檔案、檢查資料並管理匯入結果。'},
  {value:'others',label:'Others 來源細分',description:'管理此 Scope 專屬的 Others 小分類與來源對應。'},
  {value:'governance',label:'治理頁編輯',description:'編輯此 Scope 治理頁的既有區塊。'}
]);

export default function GovernanceManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const isLoc=routeScopeId==='loc';
  const canManageHere=isLoc?account.canManageGlobalSync():account.canManageScopeSync(routeScopeId);
  const options=isLoc?[
    {value:'sources',label:'來源管理',description:'跨 Scope 統計來源分類'},
    {value:'keywords',label:'關鍵詞管理',description:'LOC 大群組名稱與 Hash'},
    {value:'governance',label:'治理頁編輯',description:'維護 LOC 治理頁'}
  ]:MANAGEMENT_OPTIONS;
  const requestedSection=String(searchParams?.get('section')||'');
  const activeSection=options.some(item=>item.value===requestedSection)
    ?requestedSection:options[0].value;
  const [section,setSection]=useState(activeSection);
  useEffect(()=>setSection(activeSection),[activeSection]);
  const selectedOption=options.find(option=>option.value===section)||options[0];
  useEffect(()=>{
    if(!account.user||!canManageHere||!['governance','others'].includes(section)||account.permissionLoading)return;
    editDock?.begin(routeScopeId);
  },[account.user,account.permissionLoading,canManageHere,section,routeScopeId,editDock?.begin]);
  if(account.loading||account.permissionLoading)return <FeaturePage featureId="manage">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><ScopeLink className="loc-button primary" href="/local/settings/?section=account">請先登入</ScopeLink></section></FeaturePage>;
  if(!canManageHere)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>目前帳號沒有治理管理權限。</p></section></FeaturePage>;
  return <FeaturePage featureId="manage">

    <div className="management-workspace">
      <ManagementSectionNav id="scope-sections" title="管理項目" panelId="scope-management-panel"
        items={options} value={section} onChange={setSection}/>
      <div className="management-workspace-panel" id="scope-management-panel" role="region"
        aria-labelledby={'scope-sections-option-'+selectedOption.value}>
        {isLoc&&section==='sources'?<AdminSourceCategories/>:null}
        {isLoc&&section==='keywords'?<LocKeywordManagement/>:null}
        {section==='settings'?<ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/>:null}
        {section==='media'?<ManagementArticlePublisher key={routeScopeId+'-media'} scopeId={routeScopeId} mode="media"/>:null}
        {section==='import'?<ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/>:null}
        {section==='others'?<ScopeOthersSources key={routeScopeId+'-others'} scopeId={routeScopeId} scopeData={account.scopeDataFor(routeScopeId)}/>:null}
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
