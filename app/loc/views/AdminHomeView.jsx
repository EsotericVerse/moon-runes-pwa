'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../../i18n/ui-locale';
import adminZh from '../../i18n/sections/admin.zh_tw.js';
import adminViewZh from '../../i18n/sections/uiExtra.adminView.zh_tw.js';
registerDefaultSection('admin',adminZh);
registerDefaultSection('uiExtra.adminView',adminViewZh);
import {useState} from 'react';
import dynamic from 'next/dynamic';
import ScopeLink from '../../modular/ScopeLink';
import {useAccount} from '../use-account';
import {FeaturePage} from '../../modular/ui';
import ManagementSectionNav from '../../modular/ManagementSectionNav';
import PanelLoading from '../PanelLoading';
// Registry editing and source catalogs are independent admin capabilities.
const AdminSourceCategories=dynamic(()=>import('../SourceCategoryEditor').then(mod=>mod.AdminSourceCategories),{loading:PanelLoading});

const ADMIN_OPTIONS=Object.freeze([
  {value:'registry',label:'群組與人員',description:'管理群組、人員及所屬關係。'},
  {value:'sources',label:'統計來源分類',description:'整理統計資料使用的來源名稱與分類。'},
  {value:'themes',label:'主題與色彩',description:'調整網站主題外觀和色彩。'},
  {value:'featureHero',label:'功能區塊',description:'編輯各功能頁的標題、說明與首圖。'},
  {value:'system',label:'系統連線',description:'設定資料庫連線與郵件封鎖名單。'}
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
const DatabaseTarget=dynamic(()=>import('./admin-panels/DatabaseTarget'),{loading:PanelLoading});
const ThemeEditor=dynamic(()=>import('./admin-panels/ThemeEditor'),{loading:PanelLoading});
const AdminEmailBlocklist=dynamic(()=>import('./admin-panels/AdminEmailBlocklist'),{loading:PanelLoading});
const FeatureHeroImages=dynamic(()=>import('./admin-panels/FeatureHeroImages'),{loading:PanelLoading});

export default function AdminHomeView(){
  useUiSection('admin');
  useUiSection('uiExtra.adminView');
  const UI_COPY=useUiCopy();
  const account=useAccount();
  const [section,setSection]=useState('registry');
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <FeaturePage featureId="admin"><section className="loc-card scope-feature-card"><p>{UI_COPY.admin.denied}</p><ScopeLink href="/local/settings/?section=account"><UiText id="uiExtra.adminView.accountSettings"/></ScopeLink></section></FeaturePage>;

  return <FeaturePage featureId="admin">
    <div className="management-workspace">
      <ManagementSectionNav id="admin-sections" title="管理項目" panelId="admin-management-panel"
        items={ADMIN_OPTIONS} value={section} onChange={setSection}/>
      <div className="management-workspace-panel" id="admin-management-panel" role="region"
        aria-labelledby={'admin-sections-option-'+selectedOption.value}>
        {section==='registry'?<AdminRegistryPanel/>:null}
        {section==='sources'?<AdminSourceCategories/>:null}
        {section==='themes'?<ThemeEditor/>:null}
        {section==='system'?<><DatabaseTarget/><AdminEmailBlocklist/></>:null}
        {section==='featureHero'?<FeatureHeroImages/>:null}
      </div>
    </div>
  </FeaturePage>;
}
