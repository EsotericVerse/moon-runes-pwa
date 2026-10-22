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
import {FeaturePage} from '../../modular/ui';
import PanelLoading from '../PanelLoading';
// Registry editing and source catalogs are independent admin capabilities.
const AdminSourceCategories=dynamic(()=>import('../SourceCategoryEditor').then(mod=>mod.AdminSourceCategories),{loading:PanelLoading});

const ADMIN_OPTIONS=Object.freeze([
  {value:'registry',label:'群組人員管理'},
  {value:'sources',label:'來源設定'},
  {value:'themes',label:'主題顏色設定'},
  {value:'featureHero',label:'功能區塊設定'},
  {value:'system',label:'系統設定'}
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

const AdminRegistryPanel=dynamic(()=>import('./admin-panels/AdminRegistry'),{loading:PanelLoading});
const DatabaseTarget=dynamic(()=>import('./admin-panels/DatabaseTarget'),{loading:PanelLoading});
const ThemeEditor=dynamic(()=>import('./admin-panels/ThemeEditor'),{loading:PanelLoading});
const AdminEmailBlocklist=dynamic(()=>import('./admin-panels/AdminEmailBlocklist'),{loading:PanelLoading});
const FeatureHeroImages=dynamic(()=>import('./admin-panels/FeatureHeroImages'),{loading:PanelLoading});

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

  return <FeaturePage featureId="admin">
    {/* scope-management-page supplies the --management-min CSS variable that
        .scope-management-fields (used throughout the admin panels) reads,
        and lays itself out as a grid with --scope-gap between its own direct
        children (the section-select and each panel) so they don't touch. */}
    <div className="scope-management-page">
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
      {section==='registry'?<AdminRegistryPanel/>:null}
      {section==='sources'?<AdminSourceCategories/>:null}
      {section==='themes'?<ThemeEditor/>:null}
      {section==='system'?<><DatabaseTarget/><AdminEmailBlocklist/></>:null}
      {section==='featureHero'?<FeatureHeroImages/>:null}
    </div>
  </FeaturePage>;
}
