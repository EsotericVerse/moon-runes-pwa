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
// The home/account Settings screens never download import or management editors.
const panelLoading=()=>null;
const PrivateLocalFiles=dynamic(()=>import('./PrivateLocalFiles'),{loading:panelLoading});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:panelLoading});
const ScopeSettingsPanel=dynamic(()=>import('./ScopeSettingsPanel'),{loading:panelLoading});
import {selectScopeRegistry} from './scope-data';
import {putSetting} from './user-storage';
import {NavigationPreferences} from '../modular/navigation-preferences';
const {account:accountNavigation,device:deviceNavigation}=NavigationPreferences;

const option=(value,label)=>({value,label});
const selectProps={
  unstyled:true,isSearchable:false,
  className:'loc-settings-select',classNamePrefix:'loc-settings-select'
};

export default function GlobalSettings({initialSection='home'}={}){
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
    // Historical links can enter the merged UI without a dead-end pane.
    if(chosen==='favorites')setSection('home');
    else if(isNative&&chosen==='files')setSection('manage'); // Preserve prior mobile file links.
    else if(['home','files','personal','manage','account'].includes(chosen))setSection(chosen);
    const scope=params.get('scopeid');
    if(scope&&/^[a-z0-9_-]{1,64}$/i.test(scope))setRequestedScope(scope);
    setUrlResolved(true);
  },[]);
  const registryQuery=useQuery({
    queryKey:['settings-scope-registry'],
    queryFn:selectScopeRegistry,
    enabled:!native&&urlResolved&&section!=='account',
    staleTime:5*60_000
  });
  const registry=registryQuery.data||[];
  useEffect(()=>{
    if(prefs.loading)return;
    setHome(native?deviceNavigation.mobileHomepageChoice(window.localStorage):(accountNavigation.validScopeId(prefs.home)||'loc'));
  },[native,prefs.home,prefs.loading,account.user?.id]);

  const choices=useMemo(()=>{
    const baseChoices=[{id:'lrunes',label:uiT('nav.lunarunes')},{id:'lo3rwang',label:uiT('uiExtra.globalSettings.authorHome')},{id:'loc',label:uiT('uiExtra.globalSettings.locHome')}];
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
  const managedScopes=useMemo(()=>
    !native&&account.user?choices.filter(item=>account.canManageScopeSync(item.id)):[],
    [choices,native,account.user,account.authorizer]
  );
  const canManageGlobal=!native&&Boolean(account.user)&&account.canManageGlobalSync();
  const selectedScope=managedScopes.find(item=>item.id===requestedScope)||managedScopes[0]||null;
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
    option('home',uiT('uiExtra.globalSettings.homeSettings')),
    ...(native?[option('manage',uiT('uiExtra.globalSettings.manageMenu'))]
      :[option('files',uiT('uiExtra.globalSettings.documentImport'))]),
    ...(managedScopes.length?[option('personal',uiT('uiExtra.globalSettings.personalHome'))]:[]),
    option('account',uiT('uiExtra.globalSettings.account'))
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
    account.signIn(new URL('/settings/',window.location.href).href);
  }

  return <main className="scope-main"><section className="scope-page">
    <header className="loc-hero"><h1><UiText id="uiExtra.globalSettings.settings"/></h1></header>
    <div className="scope-content scope-settings-options">
      <section className="loc-card loc-settings-switcher">
        <label htmlFor="loc-settings-function"><UiText id="uiExtra.globalSettings.chooseSettings"/></label>
        <Select {...selectProps} inputId="loc-settings-function" instanceId="loc-settings-function"
          aria-label={uiT('uiExtra.globalSettings.chooseSettings')} options={sections}
          value={sections.find(item=>item.value===activeSection)||sections[0]}
          onChange={item=>{setSection(item?.value||'home');setStatus('');}}/>
      </section>

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

      {activeSection==='files'&&!native?<section className="loc-card">
        <h2><UiText id="uiExtra.globalSettings.documentImport"/></h2>
        {account.user?managedScopes.length?<div className="loc-settings-panel-group">
          {scopeOptions.length>1?<label htmlFor="loc-import-scope">Scope</label>:null}
          {scopeOptions.length>1?<Select {...selectProps} inputId="loc-import-scope"
            instanceId="loc-import-scope" options={scopeOptions}
            value={scopeOptions.find(item=>item.value===selectedScope?.id)||null}
            onChange={item=>setRequestedScope(item?.value||'')}/>:null}
          {selectedScope?<ManagementImportPanel key={selectedScope.id} scopeId={selectedScope.id}/>:null}
        </div>:<p><UiText id="uiExtra.globalSettings.noImportScopes"/></p>:
        <button type="button" className="loc-button primary" onClick={login}><UiText id="uiExtra.globalSettings.login"/></button>}
      </section>:null}

      {activeSection==='personal'&&selectedScope?<section className="loc-card">
        <h2><UiText id="uiExtra.globalSettings.personalHome"/></h2>
        {scopeOptions.length>1?<label htmlFor="loc-personal-scope"><UiText id="uiExtra.globalSettings.home"/></label>:null}
        {scopeOptions.length>1?<Select {...selectProps} inputId="loc-personal-scope"
          instanceId="loc-personal-scope" options={scopeOptions}
          value={scopeOptions.find(item=>item.value===selectedScope.id)||null}
          onChange={item=>setRequestedScope(item?.value||'')}/>:null}
        <ScopeSettingsPanel key={selectedScope.id} scopeId={selectedScope.id}/>
      </section>:null}

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
  </section></main>;
}
