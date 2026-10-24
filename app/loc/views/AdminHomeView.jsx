'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../../i18n/ui-locale';
import adminZh from '../../i18n/sections/admin.zh_tw.js';
import adminViewZh from '../../i18n/sections/uiExtra.adminView.zh_tw.js';
registerDefaultSection('admin',adminZh);
registerDefaultSection('uiExtra.adminView',adminViewZh);
import {useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import dynamic from 'next/dynamic';
import ScopeLink from '../../modular/ScopeLink';
import {useAccount} from '../use-account';
import {useEditDock} from '../../modular/edit-dock';
import {FeaturePage} from '../../modular/ui';
import ManagementSectionNav,{useManagementSection} from '../../modular/ManagementSectionNav';
import PanelLoading from '../PanelLoading';
// Registry editing and source catalogs are independent admin capabilities.

const ADMIN_OPTIONS=Object.freeze([
  {value:'registry',label:'群組與人員',description:'管理群組、人員及所屬關係。'},
  {value:'reserved',label:'保留名稱設定',description:'管理禁止作為 Scope 名稱的系統保留路徑。'},
  {value:'themes',label:'主題與色彩',description:'調整網站主題外觀和色彩。'},
  {value:'featureHero',label:'功能區塊設定',description:'編輯各功能頁的標題、說明與首圖。'},
  {value:'governance',label:'治理頁編輯',description:'維護 LOC 治理頁。'},
  {value:'system',label:'系統連線',description:'管理資料庫連線、ISR Domain 與郵件封鎖名單。'}
]);
function Login({account}){
  const UI_COPY=useUiCopy();
  return <FeaturePage featureId="admin">
    <section className="loc-card scope-feature-card">
      <p>{UI_COPY.admin.loginTitle}</p>
      <ScopeLink className="loc-button primary" href="/local/settings/?section=account">前往設定登入</ScopeLink>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </FeaturePage>;
}

const AdminRegistryPanel=dynamic(()=>import('./admin-panels/AdminRegistry'),{loading:PanelLoading});
const AdminReservedScopeIds=dynamic(()=>import('./admin-panels/AdminReservedScopeIds'),{loading:PanelLoading});
const DatabaseTarget=dynamic(()=>import('./admin-panels/DatabaseTarget'),{loading:PanelLoading});
const IsrDomainTarget=dynamic(()=>import('./admin-panels/IsrDomainTarget'),{loading:PanelLoading});
const ThemeEditor=dynamic(()=>import('./admin-panels/ThemeEditor'),{loading:PanelLoading});
const AdminEmailBlocklist=dynamic(()=>import('./admin-panels/AdminEmailBlocklist'),{loading:PanelLoading});
const FeatureHeroImages=dynamic(()=>import('./admin-panels/FeatureHeroImages'),{loading:PanelLoading});
const ScopeEditableBlocks=dynamic(()=>import('../ScopeEditableBlocks'),{loading:PanelLoading});

export default function AdminHomeView(){
  useUiSection('admin');
  useUiSection('uiExtra.adminView');
  const UI_COPY=useUiCopy();
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const editRequested=searchParams?.get('edit')==='1';
  const canManage=Boolean(account.user&&!account.loading&&!account.permissionLoading&&account.canManageGlobalSync());
  const [section,,hrefFor]=useManagementSection(ADMIN_OPTIONS,'registry');
  const switchSection=next=>{
    if(next===section)return;
    const target=hrefFor(next);
    if(target)editDock?.switchTo(target,{history:'push'});
  };
  // The edit flag only restores UI state; it never grants access.
  // A direct Admin visit without the flag keeps the ordinary bottom nav.
  useEffect(()=>{
    if(editRequested&&canManage)editDock?.begin('loc');
  },[editRequested,canManage,editDock?.begin]);
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <FeaturePage featureId="admin"><section className="loc-card scope-feature-card"><p>{UI_COPY.admin.denied}</p><ScopeLink href="/local/settings/?section=account"><UiText id="uiExtra.adminView.accountSettings"/></ScopeLink></section></FeaturePage>;

  return <FeaturePage featureId="admin">
    <div className="management-workspace">
      <ManagementSectionNav id="admin-sections" title="管理項目" panelId="admin-management-panel"
        items={ADMIN_OPTIONS} value={section} onChange={switchSection}/>
      <div className="management-workspace-panel" id="admin-management-panel" role="region"
        aria-labelledby={'admin-sections-option-'+selectedOption.value}>
        {section==='registry'?<AdminRegistryPanel/>:null}
        {section==='reserved'?<AdminReservedScopeIds/>:null}
        {section==='themes'?<ThemeEditor/>:null}
        {section==='system'?<><DatabaseTarget/><IsrDomainTarget/><AdminEmailBlocklist/></>:null}
        {section==='featureHero'?<FeatureHeroImages/>:null}
        {section==='governance'?<ScopeEditableBlocks key="loc-governance"
          scopeId="loc" page="governance"
          className="loc-grid two governance-grid governance-grid-loc"
          headingLevel={2} allowDelete
          authorizedByParent startInEditMode explicitEditButton/>:null}
      </div>
    </div>
  </FeaturePage>;
}
