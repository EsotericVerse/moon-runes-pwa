'use client';
import {registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../../i18n/ui-locale';
import adminZh from '../../i18n/sections/admin.zh_tw.js';
import adminViewZh from '../../i18n/sections/uiExtra.adminView.zh_tw.js';
registerDefaultSection('admin',adminZh);
registerDefaultSection('uiExtra.adminView',adminViewZh);
import {useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import dynamic from 'next/dynamic';
import {useAccount} from '../use-account';
import {useEditDock} from '../../modular/edit-dock';
import {FeaturePage} from '../../modular/ui';
import ManagementSectionNav,{useManagementSection} from '../../modular/ManagementSectionNav';
import PanelLoading from '../PanelLoading';
// Registry editing and source catalogs are independent admin capabilities.

const ADMIN_OPTIONS=Object.freeze([
  {value:'database',label:'資料庫設定',shortLabel:'資料庫',description:'管理資料庫連線與備援。'},
  {value:'registry',label:'人員',shortLabel:'人員',description:'系統人員、Email、Table 對應及群組部署。'},
  {value:'reserved',label:'保留名稱',shortLabel:'保留名稱',description:'保留 ID 與路由名稱設定。'},
  {value:'blocklist',label:'系統黑名單',shortLabel:'黑名單',description:'管理系統層級 Email 黑名單。'},
  {value:'isr',label:'ISR 設定',shortLabel:'ISR',description:'管理 ISR 網域與手動選用的平台。'},
  {value:'featureHero',label:'功能區塊設定',shortLabel:'區塊',description:'編輯功能頁 Hero 與展示資源。'},
  {value:'themes',label:'主題顏色設定',shortLabel:'配色',description:'調整網站主題和色彩。'}
]);
function Login({account}){
  return <FeaturePage featureId="admin">
    <section className="loc-card scope-feature-card">
      <p>請先至設定首頁登入。</p>
      {account.error?<p className="scope-status scope-error">{account.error}</p>:null}
    </section>
  </FeaturePage>;
}

const DatabaseTarget=dynamic(()=>import('./admin-panels/DatabaseTarget'),{loading:PanelLoading});
const IsrDomainTarget=dynamic(()=>import('./admin-panels/IsrDomainTarget'),{loading:PanelLoading});
const ThemeEditor=dynamic(()=>import('./admin-panels/ThemeEditor'),{loading:PanelLoading});
const AdminEmailBlocklist=dynamic(()=>import('./admin-panels/AdminEmailBlocklist'),{loading:PanelLoading});
const FeatureHeroImages=dynamic(()=>import('./admin-panels/FeatureHeroImages'),{loading:PanelLoading});
const AdminRegistry=dynamic(()=>import('./admin-panels/AdminRegistry'),{loading:PanelLoading});
const AdminReservedScopeIds=dynamic(()=>import('./admin-panels/AdminReservedScopeIds'),{loading:PanelLoading});

export default function AdminHomeView(){
  useUiSection('admin');
  useUiSection('uiExtra.adminView');
  const UI_COPY=useUiCopy();
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const editRequested=searchParams?.get('edit')==='1';
  const canManage=Boolean(account.user&&!account.loading&&!account.permissionLoading&&account.canManageGlobalSync());
  const [section,setSection]=useManagementSection(ADMIN_OPTIONS,'database',{
    system:'database',traceAnchor:'database',traceMap:'database'
  });
  const switchSection=next=>{
    if(next===section)return;
    // No Next.js navigation: update the right-hand panel immediately in React.
    // The EditDock still guards unsaved drafts before applying the selection.
    if(editDock?.active)editDock.switchSection(next,setSection);
    else setSection(next);
  };
  // The edit flag only restores UI state; it never grants access.
  // A direct Admin visit without the flag keeps the ordinary bottom nav.
  useEffect(()=>{
    if(editRequested&&canManage)editDock?.begin('loc');
  },[editRequested,canManage,editDock?.begin]);
  const selectedOption=ADMIN_OPTIONS.find(option=>option.value===section)||ADMIN_OPTIONS[0];

  if(account.loading||account.permissionLoading)return <section className="loc-view"><div className="loc-card">{UI_COPY.admin.checking}</div></section>;
  if(!account.user)return <Login account={account}/>;
  if(!account.canManageGlobalSync())return <FeaturePage featureId="admin"><section className="loc-card scope-feature-card"><p>{UI_COPY.admin.denied}</p></section></FeaturePage>;

  return <FeaturePage featureId="admin">
    <div className="management-workspace">
      <ManagementSectionNav id="admin-sections" title="系統管理" panelId="admin-management-panel"
        items={ADMIN_OPTIONS} value={section} onChange={switchSection}/>
      <div className="management-workspace-panel" id="admin-management-panel" role="region"
        aria-labelledby={'admin-sections-option-'+selectedOption.value}>
        {section==='themes'?<ThemeEditor/>:null}
        {section==='database'?<DatabaseTarget/>:null}
        {section==='registry'?<AdminRegistry/>:null}
        {section==='reserved'?<AdminReservedScopeIds/>:null}
        {section==='blocklist'?<AdminEmailBlocklist/>:null}
        {section==='isr'?<IsrDomainTarget/>:null}
        {section==='featureHero'?<FeatureHeroImages/>:null}

      </div>
    </div>
  </FeaturePage>;
}
