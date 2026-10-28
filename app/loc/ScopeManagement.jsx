'use client';

import {useEffect} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import {FeaturePage} from '../modular/ui';
import ManagementSectionNav,{useManagementSection} from '../modular/ManagementSectionNav';
import PanelLoading from './PanelLoading';
import {recoverChunkOnce} from './chunk-recovery.mjs';

const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:PanelLoading});
const TraceManagementPanel=dynamic(()=>import('./TraceManagement'),{loading:PanelLoading});
const PlaceManagement=dynamic(()=>import('./PlaceManagement').catch(recoverChunkOnce),{loading:PanelLoading});

const MANAGEMENT_OPTIONS=Object.freeze([
  {value:'placeManage',label:'地點管理',shortLabel:'地點管理',description:'空間定錨、Google Timeline 地點整理、糾紛點與補充資料。'},
  {value:'traceMap',label:'痕跡圖管理',shortLabel:'痕跡圖',description:'從已有地點自動完成選點，組合有序 Frame。'},
  {value:'settings',label:'主題',shortLabel:'主題',description:''}
]);

export default function ScopeManagement({scopeId:routeScopeId='loc'}){
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const isLoc=routeScopeId==='loc';
  const canManageHere=Boolean(editDock?.active&&editDock.scopeId===routeScopeId)&&
    (isLoc?account.canManageGroupSync('loc'):account.canManageScopeSync(routeScopeId));
  const options=isLoc?MANAGEMENT_OPTIONS.slice(0,2):MANAGEMENT_OPTIONS;
  // Links saved before the two panels moved to Article Control still open the
  // same Scope's panel instead of silently falling back to Trace Management.
  const requestedSection=searchParams?.get('section');
  useEffect(()=>{
    if(isLoc||!['import','others'].includes(requestedSection))return;
    const url=new URL(window.location.href);
    if(/\/manage\/index\.html$/.test(url.pathname))
      url.pathname=url.pathname.replace(/\/manage\/index\.html$/,'/manage/search/index.html');
    else if(/\/manage\/?$/.test(url.pathname))
      url.pathname=url.pathname.replace(/\/manage\/?$/,'/manage/search/');
    else return;
    window.location.replace(url.href);
  },[isLoc,requestedSection]);
  const [section,setSection]=useManagementSection(options,isLoc?'traceMap':'',{traceAnchor:isLoc?'traceMap':'placeManage'});
  const selectedOption=options.find(option=>option.value===section)||options[0];
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
      </div>
    </div>
    </div>
  </FeaturePage>;
}
