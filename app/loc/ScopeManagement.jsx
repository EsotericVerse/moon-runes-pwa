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
const TraceManagementPanel=dynamic(()=>import('./TraceManagement'),{loading:PanelLoading});
const PlaceManagement=dynamic(()=>import('./PlaceManagement'),{loading:PanelLoading});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'placeManage',label:'地點管理',shortLabel:'地點管理',description:'名稱合併、勾選儲存、別名、編輯和快速補打卡。'},
  {value:'traceMap',label:'痕跡圖管理',shortLabel:'痕跡圖',description:'以自動完成選取既有地點並組合 Frame。'},

  {value:'import',label:'匯入',shortLabel:'匯入',description:'匯入檔案、檢查資料並管理匯入結果。'},
  {value:'others',label:'個人分類',shortLabel:'個人分類',description:''},
  {value:'settings',label:'主題',shortLabel:'主題',description:''}
]);

export default function ScopeManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const native=useNativeNavigation();
  const isLoc=routeScopeId==='loc';
  const canManageHere=isLoc?account.canManageGroupSync('loc'):account.canManageScopeSync(routeScopeId);
  const options=isLoc?MANAGEMENT_OPTIONS.slice(0,2):MANAGEMENT_OPTIONS;
  const editRequested=searchParams?.get('edit')==='1';
  const [section,setSection]=useManagementSection(options,isLoc?'traceMap':'');
  const selectedOption=options.find(option=>option.value===section)||options[0];
  useEffect(()=>{
    if(!account.user||!canManageHere||(!editRequested&&!['others','settings','placeManage','traceMap'].includes(section))||account.permissionLoading)return;
    editDock?.begin(routeScopeId);
  },[account.user,account.permissionLoading,canManageHere,editRequested,section,routeScopeId,isLoc,editDock?.begin]);
  if(account.loading||account.permissionLoading)return <FeaturePage featureId="manage">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>請先至設定首頁登入。</p></section></FeaturePage>;
  if(!canManageHere)return <FeaturePage featureId="manage"><section className="loc-card scope-feature-card"><p>目前帳號沒有此 Scope 的管理權限。</p></section></FeaturePage>;
  return <FeaturePage featureId={isLoc?'trace':'manage'}>

    <div className={section==='placeManage'?'scope-management-layout scope-management-layout--anchor':'scope-management-layout'}>
    <div className="management-workspace">
      <ManagementSectionNav id="scope-sections" title="管理" panelId="scope-management-panel"
        items={options} value={section} onChange={next=>{
          if(next===section)return;
          if(editDock?.active)editDock.switchSection(next,setSection);
          else setSection(next);
        }}/>
      <div className="management-workspace-panel" id="scope-management-panel" role="region"
        aria-labelledby={'scope-sections-option-'+selectedOption.value}>
        {section==='placeManage'?<PlaceManagement scopeId={routeScopeId}/>:null}
        {section==='traceMap'?<TraceManagementPanel scopeId={routeScopeId} mode="map"/>:null}
        {section==='settings'?<ScopeSettingsPanel key={routeScopeId+'-settings'} scopeId={routeScopeId}/>:null}
        {section==='import'?<ManagementImportPanel key={routeScopeId+'-import'} scopeId={routeScopeId}/>:null}
        {section==='others'?<ScopeOthersSources key={routeScopeId+'-others'} scopeId={routeScopeId} scopeData={account.scopeDataFor(routeScopeId)}/>:null}
      </div>
    </div>
    </div>
  </FeaturePage>;
}
