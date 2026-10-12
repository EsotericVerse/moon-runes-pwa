'use client';

import {useEffect,useMemo,useState} from 'react';
import Select from 'react-select';
import {Capacitor} from '@capacitor/core';
import {useNavigationPreferences} from './use-navigation-preferences';
import PrivateLocalFiles from './PrivateLocalFiles';
import ManagementImportPanel from './ManagementImportPanel';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ScopeSettingsPanel from './ScopeSettingsPanel';
import ScopeGroupManagement from './ScopeGroupManagement';
import {selectScopeRegistry} from './scope-data';
import {putSetting} from './user-storage';
import {
  DEFAULT_FAVORITES,HOME_SETTING_KEY,homeScopeForAccount,validScopeId
} from '../modular/navigation-preferences.mjs';
import {
  MOBILE_HOME_ID,MOBILE_HOME_STORAGE_KEY,
  mobileFavoriteEnabled,mobileHomepageChoice
} from '../modular/mobile-home-preference.mjs';

const BASE_CHOICES=[
  {id:'lrunes',label:'月之符文'},
  {id:'lo3rwang',label:'作者首頁'},
  {id:'loc',label:'月典首頁'}
];
const option=(value,label)=>({value,label});
const selectProps={
  unstyled:true,isSearchable:false,
  className:'loc-settings-select',classNamePrefix:'loc-settings-select'
};

export default function GlobalSettings(){
  const prefs=useNavigationPreferences();
  const {account}=prefs;
  const [native,setNative]=useState(false);
  const [registry,setRegistry]=useState([]);
  const [home,setHome]=useState('loc');
  const [section,setSection]=useState('home');
  const [requestedScope,setRequestedScope]=useState('');
  const [manageAction,setManageAction]=useState('publish');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');

  useEffect(()=>{
    setNative(Capacitor.isNativePlatform());
    const params=new URLSearchParams(window.location.search);
    const chosen=params.get('section');
    // Historical links can enter the merged UI without a dead-end pane.
    if(chosen==='favorites')setSection('home');
    else if(['home','files','personal','manage','account'].includes(chosen))setSection(chosen);
    const scope=params.get('scope');
    if(scope&&/^[a-z0-9_-]{1,64}$/i.test(scope))setRequestedScope(scope);
  },[]);
  useEffect(()=>{
    let active=true;
    selectScopeRegistry().then(rows=>{if(active)setRegistry(rows||[]);})
      .catch(()=>{if(active)setRegistry([]);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(prefs.loading)return;
    setHome(native?mobileHomepageChoice(window.localStorage):(validScopeId(prefs.home)||'loc'));
  },[native,prefs.home,prefs.loading,account.user?.id]);

  const choices=useMemo(()=>{
    const found=new Map(BASE_CHOICES.map(item=>[item.id,item]));
    for(const row of registry){
      if(!row?.scope_id||row.scope_id==='admin')continue;
      found.set(row.scope_id,{
        id:row.scope_id,
        label:BASE_CHOICES.find(item=>item.id===row.scope_id)?.label||row.display_name||row.scope_id
      });
    }
    return [...found.values()];
  },[registry]);
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
    if(native)items.push({id:MOBILE_HOME_ID,label:'我的手機'});
    return items;
  },[choices,native,account.user,account.authorizer]);
  const actualHome=native?
    (allowedHomes.some(item=>item.id===home)?home:'loc'):
    homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));

  const favoriteItems=useMemo(()=>{
    const ids=native?
      ['lrunes',...(mobileFavoriteEnabled(typeof window==='undefined'?null:window.localStorage)?[MOBILE_HOME_ID]:[]),...prefs.favorites]:
      prefs.favorites;
    const unique=[...new Set(ids)];
    return unique.map(id=>id===MOBILE_HOME_ID?{id,label:'我的手機'}:choices.find(item=>item.id===id))
      .filter(Boolean);
  },[native,prefs.favorites.join(','),choices]);

  const sections=[
    option('home','首頁設定'),
    option('files',native?'本機檔案':'文件匯入'),
    ...(managedScopes.length?[option('personal','個人首頁')]:[]),
    ...(managedScopes.length||canManageGlobal?[option('manage','管理選單')]:[]),
    option('account','帳號')
  ];
  const scopeOptions=managedScopes.map(item=>option(item.id,item.label));
  const manageOptions=[
    ...(managedScopes.length?[option('publish','發表文章')]:[]),
    ...(canManageGlobal?[option('members','成員管理'),option('admin','系統設定')]:[])
  ];
  const activeManage=manageOptions.find(item=>item.value===manageAction)||manageOptions[0];
  const waiting=Boolean(busy)||prefs.loading||account.loading||account.permissionLoading;

  async function saveHome(event){
    event.preventDefault();
    if(waiting||(!native&&!account.user))return;
    setBusy(true);setStatus('');
    try{
      if(native){
        const next=allowedHomes.some(item=>item.id===home)?home:'loc';
        window.localStorage.setItem(MOBILE_HOME_STORAGE_KEY,next);
        window.dispatchEvent(new Event('loc-device-navigation-changed'));
        setHome(next);
      }else{
        const next=homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));
        await putSetting(HOME_SETTING_KEY,next);
        window.dispatchEvent(new CustomEvent('loc-navigation-changed',{detail:{home:next}}));
        setHome(next);
      }
      setStatus('首頁已儲存');
    }catch(error){
      setStatus('儲存失敗：'+String(error?.message||error));
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
    <header className="loc-hero"><h1>設定</h1></header>
    <div className="scope-content scope-settings-options">
      <section className="loc-card loc-settings-switcher">
        <label htmlFor="loc-settings-function">設定功能</label>
        <Select {...selectProps} inputId="loc-settings-function" instanceId="loc-settings-function"
          aria-label="選擇設定功能" options={sections}
          value={sections.find(item=>item.value===section)||sections[0]}
          onChange={item=>{setSection(item?.value||'home');setStatus('');}}/>
      </section>

      {section==='home'?<section className="loc-card">
        <h2>首頁設定</h2>
        <form onSubmit={saveHome} className="scope-stat-controls">
          <label><span>預設首頁</span>
            <select className="scope-select" value={actualHome} onChange={event=>setHome(event.target.value)}
              disabled={waiting&&!native}>
              {allowedHomes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {native||account.user?<button type="submit" className="loc-button primary" disabled={waiting}>儲存</button>:null}
        </form>
        <div className="scope-settings-favorite-preview">
          <strong>我的最愛</strong>
          <div className="scope-settings-favorite-items">
            {favoriteItems.map(item=><span key={item.id} className="scope-settings-favorite-item">{item.label}</span>)}
          </div>
        </div>
      </section>:null}

      {section==='files'?(native?<PrivateLocalFiles/>:<section className="loc-card">
        <h2>文件匯入</h2>
        {account.user?managedScopes.length?<div className="loc-settings-panel-group">
          {scopeOptions.length>1?<label htmlFor="loc-import-scope">Scope</label>:null}
          {scopeOptions.length>1?<Select {...selectProps} inputId="loc-import-scope"
            instanceId="loc-import-scope" options={scopeOptions}
            value={scopeOptions.find(item=>item.value===selectedScope?.id)||null}
            onChange={item=>setRequestedScope(item?.value||'')}/>:null}
          {selectedScope?<ManagementImportPanel key={selectedScope.id} scopeId={selectedScope.id}/>:null}
        </div>:<p>沒有可匯入的空間。</p>:
        <button type="button" className="loc-button primary" onClick={login}>登入</button>}
      </section>):null}

      {section==='personal'&&selectedScope?<section className="loc-card">
        <h2>個人首頁</h2>
        {scopeOptions.length>1?<label htmlFor="loc-personal-scope">首頁</label>:null}
        {scopeOptions.length>1?<Select {...selectProps} inputId="loc-personal-scope"
          instanceId="loc-personal-scope" options={scopeOptions}
          value={scopeOptions.find(item=>item.value===selectedScope.id)||null}
          onChange={item=>setRequestedScope(item?.value||'')}/>:null}
        <ScopeSettingsPanel key={selectedScope.id} scopeId={selectedScope.id}/>
      </section>:null}

      {section==='manage'&&activeManage?<section className="loc-card">
        <h2>管理選單</h2>
        <label htmlFor="loc-manage-action">管理功能</label>
        <Select {...selectProps} inputId="loc-manage-action" instanceId="loc-manage-action"
          options={manageOptions} value={activeManage}
          onChange={item=>setManageAction(item?.value||manageOptions[0].value)}/>
        {activeManage.value==='publish'&&selectedScope?<div className="loc-settings-panel-group">
          {scopeOptions.length>1?<label htmlFor="loc-manage-scope">Scope</label>:null}
          {scopeOptions.length>1?<Select {...selectProps} inputId="loc-manage-scope"
            instanceId="loc-manage-scope" options={scopeOptions}
            value={scopeOptions.find(item=>item.value===selectedScope.id)||null}
            onChange={item=>setRequestedScope(item?.value||'')}/>:null}
          <ManagementArticlePublisher key={selectedScope.id} scopeId={selectedScope.id}/>
        </div>:null}
        {activeManage.value==='members'&&canManageGlobal?<ScopeGroupManagement scopeId="loc"/>:null}
        {activeManage.value==='admin'&&canManageGlobal?<a className="loc-button"
          href="/admin/">開啟系統設定</a>:null}
      </section>:null}

      {section==='account'?<section className="loc-card">
        <h2>帳號</h2>
        {waiting?<p>載入中…</p>:account.user?<div>
          <p>{account.user.email||'已登入'}</p>
          <button type="button" className="loc-button" disabled={busy} onClick={logout}>登出</button>
        </div>:<button type="button" className="loc-button primary" onClick={login}>登入</button>}
        {account.error?<p role="alert" className="scope-status scope-error">{account.error}</p>:null}
      </section>:null}
      {status?<p role="status" className="scope-status">{status}</p>:null}
    </div>
  </section></main>;
}
