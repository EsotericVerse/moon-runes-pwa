'use client';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection} from '../i18n/ui-copy';
import {useUiSection} from '../i18n/ui-locale';
import globalSettingsZh from '../i18n/sections/uiExtra.globalSettings.zh_tw.js';
registerDefaultSection('uiExtra.globalSettings',globalSettingsZh);

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import Select from 'react-select';
import dynamic from 'next/dynamic';
import {Capacitor} from '@capacitor/core';
import {useNavigationPreferences} from './use-navigation-preferences';
import {FeaturePage} from '../modular/ui';
import ManagementSectionNav from '../modular/ManagementSectionNav';
import PanelLoading from './PanelLoading';
// The home/account Settings screens never download import or management editors.
const PrivateLocalFiles=dynamic(()=>import('./PrivateLocalFiles'),{loading:PanelLoading});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:PanelLoading});
// 每日符文紀錄：沿用既有的獨立頁面元件（/daily/log/），同一份邏輯透過它自己
// 既有的 embedded 模式嵌入這裡，不複製任何讀寫邏輯。
const DailyLogClient=dynamic(()=>import('../daily/log/DailyLogClient'),{loading:PanelLoading});
import {selectScopeRegistry} from './scope-data';
import {putSetting} from './user-storage';
import {NavigationPreferences} from '../modular/navigation-preferences';
const {account:accountNavigation,device:deviceNavigation}=NavigationPreferences;

const option=(value,label,description)=>({value,label,description});
const selectProps={
  unstyled:true,isSearchable:false,
  className:'loc-settings-select',classNamePrefix:'loc-settings-select'
};

// A saved article/media, not a file chooser selection or the seeded Scope
// config row, establishes when local data can feed the four features.
function LocalImportStatus(){
  const query=useQuery({
    queryKey:['local-scope-content-ready'],
    queryFn:async()=>{
      const {hasLocalScopeContent}=await import('./providers/local-sqlite.mjs');
      return hasLocalScopeContent();
    },
    staleTime:30_000
  });
  return <p className="scope-status" role="status">
    {query.isPending?'正在確認本機資料…':query.error?'無法確認本機資料：'+String(query.error?.message||query.error)
      :query.data?'已儲存本機文章／媒體，可以透過下方首頁、文化、統計、搜尋使用本機資料。'
      :'尚未匯入本機文章／媒體，四大功能仍維持原本資料來源。'}
  </p>;
}

export default function GlobalSettings({initialSection='home',localScopeOnly=false}={}){
  useUiSection('uiExtra.globalSettings');
  const uiT=useUiText();
  const prefs=useNavigationPreferences();
  const {account}=prefs;
  const [native,setNative]=useState(false);
  const [urlResolved,setUrlResolved]=useState(false);
  const [home,setHome]=useState('loc');
  const [section,setSection]=useState(initialSection);
  const [requestedScope,setRequestedScope]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');

  useEffect(()=>{
    const isNative=Capacitor.isNativePlatform();
    setNative(isNative);
    const params=new URLSearchParams(window.location.search);
    const chosen=params.get('section');
    if(chosen==='favorites')setSection('home');
    else if(['home','files','manage','account','dailyRune'].includes(chosen))setSection(chosen);
    const scope=params.get('scopeid');
    if(!localScopeOnly&&scope&&/^[a-z0-9_-]{1,64}$/i.test(scope))setRequestedScope(scope);
    setUrlResolved(true);
  },[localScopeOnly]);
  const registryQuery=useQuery({
    queryKey:['settings-scope-registry'],
    queryFn:selectScopeRegistry,
    enabled:!localScopeOnly&&!native&&urlResolved&&section!=='account',
    staleTime:5*60_000
  });
  const registry=registryQuery.data||[];
  useEffect(()=>{
    if(prefs.loading)return;
    setHome(native?deviceNavigation.mobileHomepageChoice(window.localStorage):(accountNavigation.validScopeId(prefs.home)||'loc'));
  },[native,prefs.home,prefs.loading,account.user?.id]);

  const choices=useMemo(()=>{
    const baseChoices=[{id:'lrunes',label:uiT('nav.lunarunes')},{id:'lo3rwang',label:uiT('uiExtra.globalSettings.authorHome')},{id:'loc',label:uiT('uiExtra.globalSettings.locHome')},{id:'local',label:uiT('uiExtra.globalSettings.localScope')}];
    const found=new Map(baseChoices.map(item=>[item.id,item]));
    for(const row of registry){
      if(!row?.scope_id||row.scope_id==='admin')continue;
      found.set(row.scope_id,{
        id:row.scope_id,
        label:baseChoices.find(item=>item.id===row.scope_id)?.label||row.display_name||row.scope_id
      });
    }
    return [...found.values()];
  },[registry,uiT('common.language')]);
  const managedScopes=useMemo(()=>{
    const cloudManaged=!native&&account.user?choices.filter(item=>item.id!=='local'&&account.canManageScopeSync(item.id)):[];
    const local=choices.find(item=>item.id==='local');
    return local?[...cloudManaged,local]:cloudManaged;
  },[choices,native,account.user,account.authorizer]);
  const canManageGlobal=!native&&Boolean(account.user)&&account.canManageGlobalSync();
  const selectedScope=localScopeOnly?managedScopes.find(item=>item.id==='local')||null
    :managedScopes.find(item=>item.id===requestedScope)||managedScopes[0]||null;
  const allowedHomes=useMemo(()=>{
    const allowed=new Set(account.authorizer?.scopeIds||[]);
    const items=choices.filter(item=>
      item.id==='loc'||(native&&item.id==='lrunes')||
      (account.user&&(account.canManageGlobalSync()||allowed.has(item.id)))
    );
    if(native)items.push({id:deviceNavigation.MOBILE_HOME_ID,label:uiT('uiExtra.globalSettings.myPhone')});
    return items;
  },[choices,native,account.user,account.authorizer]);
  const actualHome=native?
    (allowedHomes.some(item=>item.id===home)?home:'loc'):
    accountNavigation.homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));

  const favoriteItems=useMemo(()=>{
    const ids=native?
      ['lrunes',...(deviceNavigation.mobileFavoriteEnabled(typeof window==='undefined'?null:window.localStorage)?[deviceNavigation.MOBILE_HOME_ID]:[]),...prefs.favorites]:
      prefs.favorites;
    const unique=[...new Set(ids)];
    return unique.map(id=>id===deviceNavigation.MOBILE_HOME_ID?{id,label:uiT('uiExtra.globalSettings.myPhone')}:choices.find(item=>item.id===id))
      .filter(Boolean);
  },[native,prefs.favorites.join(','),choices]);

  const sections=[
    option('home',uiT('uiExtra.globalSettings.homeSettings'),uiT('uiExtra.globalSettings.homeSettingsDescription')),
    ...(native?[option('manage',uiT('uiExtra.globalSettings.manageMenu'),uiT('uiExtra.globalSettings.manageMenuDescription'))]:[]),
    // DailyLogClient 本身的 canViewDetails 也是同一個條件（native 或已登入）；
    // 分頁選項在這裡先同步，未登入、非native時連選項都不出現，不只是內容空白。
    ...(native||account.user?[option('dailyRune',uiT('uiExtra.globalSettings.dailyRune'),uiT('uiExtra.globalSettings.dailyRuneDescription'))]:[]),
    option('files',uiT('uiExtra.globalSettings.documentImport'),uiT('uiExtra.globalSettings.documentImportDescription')),
    option('account',uiT('uiExtra.globalSettings.account'),uiT('uiExtra.globalSettings.accountDescription'))
  ];
  const activeSection=sections.some(item=>item.value===section)?section:'home';
  const scopeOptions=managedScopes.map(item=>option(item.id,item.label));
  const waiting=Boolean(busy)||prefs.loading||account.loading||account.permissionLoading;

  async function saveHome(event){
    event.preventDefault();
    if(waiting||(!native&&!account.user))return;
    setBusy(true);setStatus('');
    try{
      if(native){
        const next=allowedHomes.some(item=>item.id===home)?home:'loc';
        window.localStorage.setItem(deviceNavigation.MOBILE_HOME_STORAGE_KEY,next);
        window.dispatchEvent(new Event('loc-device-navigation-changed'));
        setHome(next);
      }else{
        const next=accountNavigation.homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));
        await putSetting(accountNavigation.HOME_SETTING_KEY,next);
        window.dispatchEvent(new CustomEvent('loc-navigation-changed',{detail:{home:next}}));
        setHome(next);
      }
      setStatus(uiT('uiExtra.globalSettings.savedHome'));
    }catch(error){
      setStatus(uiT('uiExtra.globalSettings.saveFailed',{error:String(error?.message||error)}));
    }finally{setBusy(false);}
  }
  async function logout(){
    setBusy(true);setStatus('');
    try{await account.signOut();window.location.reload();}
    catch(error){setStatus(String(error?.message||error));setBusy(false);}
  }
  function login(){
    account.signIn(new URL('/local/settings/?section=account',window.location.href).href);
  }

  return <FeaturePage featureId="setting">
    <div className="scope-settings-options management-workspace">
      <ManagementSectionNav id="settings-sections" title={uiT('uiExtra.globalSettings.settingsSections')}
        panelId="settings-management-panel" items={sections} value={activeSection}
        onChange={next=>{setSection(next);setStatus('');}}/>
      <div className="management-workspace-panel" id="settings-management-panel" role="region"
        aria-labelledby={'settings-sections-option-'+activeSection}>
      {activeSection==='home'?<section className="loc-card">
        <h2><UiText id="uiExtra.globalSettings.homeSettings"/></h2>
        <form onSubmit={saveHome} className="scope-stat-controls">
          <label><span><UiText id="uiExtra.globalSettings.defaultHome"/></span>
            <select className="scope-select" value={actualHome} onChange={event=>setHome(event.target.value)}
              disabled={waiting&&!native}>
              {allowedHomes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {native||account.user?<button type="submit" className="loc-button primary" disabled={waiting}><UiText id="uiExtra.globalSettings.save"/></button>:null}
        </form>
        <div className="scope-settings-favorite-preview">
          <strong><UiText id="uiExtra.globalSettings.favorites"/></strong>
          <div className="scope-settings-favorite-items">
            {favoriteItems.map(item=><span key={item.id} className="scope-settings-favorite-item">{item.label}</span>)}
          </div>
        </div>
      </section>:null}

      {activeSection==='files'&&(localScopeOnly||!native)?<div className="loc-settings-panel-group">
        {selectedScope&&(selectedScope.id==='local'||account.user)?<>
          {localScopeOnly?<LocalImportStatus/>:null}
          {!localScopeOnly&&scopeOptions.length>1?<Select {...selectProps} aria-label={uiT('uiExtra.globalSettings.importScope')} inputId="loc-import-scope"
            instanceId="loc-import-scope" options={scopeOptions}
            value={scopeOptions.find(item=>item.value===selectedScope?.id)||null}
            onChange={item=>setRequestedScope(item?.value||'')}/>:null}
          <ManagementImportPanel key={selectedScope.id} scopeId={selectedScope.id}/>
        </>:account.user?<p className="loc-card"><UiText id="uiExtra.globalSettings.noImportScopes"/></p>:
          <button type="button" className="loc-button primary" onClick={login}><UiText id="uiExtra.globalSettings.login"/></button>}
      </div>:null}

      {activeSection==='dailyRune'?<DailyLogClient embedded/>:null}

      {/* Device management never mounts website Scope/Article/Admin capabilities. */}
      {native&&activeSection==='manage'?<PrivateLocalFiles/>:null}

      {activeSection==='account'?<section className="loc-card">
        <h2><UiText id="uiExtra.globalSettings.account"/></h2>
        {waiting?<p><UiText id="uiExtra.globalSettings.loading"/></p>:account.user?<div>
          <p>{account.user.email||uiT('uiExtra.globalSettings.signedIn')}</p>
          <button type="button" className="loc-button" disabled={busy} onClick={logout}><UiText id="uiExtra.globalSettings.logout"/></button>
        </div>:<button type="button" className="loc-button primary" onClick={login}><UiText id="uiExtra.globalSettings.login"/></button>}
        {account.error?<p role="alert" className="scope-status scope-error">{account.error}</p>:null}
      </section>:null}
      {status?<p role="status" className="scope-status">{status}</p>:null}
      </div>
    </div>
  </FeaturePage>;
}
