'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {translateUiField,UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiLocale,useUiSection} from '../../i18n/ui-locale';
import adminZh from '../../i18n/sections/admin.zh_tw.js';
import adminViewZh from '../../i18n/sections/uiExtra.adminView.zh_tw.js';
registerDefaultSection('admin',adminZh);
registerDefaultSection('uiExtra.adminView',adminViewZh);
import {useState} from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import {scopeHref} from '../../modular/scope-registry';
import ScopeLink from '../../modular/ScopeLink';
import {useAccount} from '../use-account';
// Registry editing and source catalogs are independent admin capabilities.
const AdminSourceCategories=dynamic(()=>import('../SourceCategoryEditor').then(mod=>mod.AdminSourceCategories),{loading:()=>null});

const ADMIN_OPTIONS=Object.freeze([
  {value:'registry',label:'群組人員管理'},
  {value:'sources',label:'群組來源分類'},
  {value:'database',label:'資料庫設定'},
  {value:'themes',label:'主題設定'},
  {value:'blocklist',label:'系統黑名單'},
  {value:'featureHero',label:'功能首頁圖設定'}
]);
const CREATE_OPTIONS=Object.freeze([
  {value:'scope',label:'新增人員'},
  {value:'group',label:'新增群組'}
]);
const selectProps={
  unstyled:true,isSearchable:false,
  className:'loc-settings-select',classNamePrefix:'loc-settings-select'
};

function Login({account}){
  const UI_COPY=useUiCopy();
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{UI_COPY.admin.eyebrow}</p><h1>{UI_COPY.admin.loginTitle}</h1></header>
    <section className="loc-card">
      <ScopeLink className="loc-button primary" href="/settings/">前往設定登入</ScopeLink>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </section>;
}

// Independent admin capabilities are loaded only for the selected workspace.
// Registry（DeploymentTree + 節點編輯／新增面板）已搬到 admin-panels/AdminRegistry.jsx，
// 跟底下其他四個分頁走同一套 dynamic() 按需載入模式——先前它是唯一一個 ~600 行
// 邏輯直接寫死在這個檔案裡、一開啟 /admin 不管先看哪個分頁都會被打包下載的分頁。
const AdminRegistryPanel=dynamic(()=>import('./admin-panels/AdminRegistry'),{loading:()=>null});
const DatabaseTarget=dynamic(()=>import('./admin-panels/DatabaseTarget'),{loading:()=>null});
const ThemeEditor=dynamic(()=>import('./admin-panels/ThemeEditor'),{loading:()=>null});
const AdminEmailBlocklist=dynamic(()=>import('./admin-panels/AdminEmailBlocklist'),{loading:()=>null});
const FeatureHeroImages=dynamic(()=>import('./admin-panels/FeatureHeroImages'),{loading:()=>null});

export default function AdminHomeView(){
  useUiSection('admin');
  useUiSection('uiExtra.adminView');
  const UI_COPY=useUiCopy();
  const {locale}=useUiLocale();
  const account=useAccount();
  const [section,setSection]=useState('registry');
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <section className="loc-view"><section className="loc-card"><p>{UI_COPY.admin.denied}</p><ScopeLink href="/settings/"><UiText id="uiExtra.adminView.accountSettings"/></ScopeLink></section></section>;

  return <section className="loc-view scope-management-page">
    <header className="loc-hero loc-hero-context admin-hero">
      <div className="admin-hero-row"><h1>{UI_COPY.admin.eyebrow}</h1></div>
      <div className="admin-main-select">
        <Select {...selectProps}
          inputId="admin-section-select"
          instanceId="admin-section-select"
          aria-label={translateUiField(locale,'Admin 管理功能')}
          options={ADMIN_OPTIONS}
          value={selectedOption}
          onChange={option=>setSection(option?.value||'registry')}
        />
      </div>
    </header>
    {section==='registry'?<AdminRegistryPanel/>:null}
    {section==='sources'?<AdminSourceCategories/>:null}
    {section==='database'?<DatabaseTarget/>:null}
    {section==='themes'?<ThemeEditor/>:null}
    {section==='blocklist'?<AdminEmailBlocklist/>:null}
    {section==='featureHero'?<FeatureHeroImages/>:null}
  </section>;
}
