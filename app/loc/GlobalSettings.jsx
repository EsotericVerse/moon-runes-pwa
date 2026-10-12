'use client';

import {useEffect,useMemo,useState} from 'react';
import Select from 'react-select';
import {Capacitor} from '@capacitor/core';
import {useNavigationPreferences} from './use-navigation-preferences';
import DailyLogClient from '../daily/log/DailyLogClient';
import RuneSQLiteTransfer from '../lrunes/RuneSQLiteTransfer';
import PrivateLocalFiles from './PrivateLocalFiles';
import ManagementImportPanel from './ManagementImportPanel';
import ManagementArticlePublisher from './ManagementArticlePublisher';
import ScopeSettingsPanel from './ScopeSettingsPanel';
import ScopeGroupManagement from './ScopeGroupManagement';
import {settingsRunePolicy} from '../lrunes/settings-rune-policy.mjs';
import {selectScopeRegistry} from './scope-data';
import {putSetting} from './user-storage';
import {DEFAULT_FAVORITES,FAVORITES_SETTING_KEY,HOME_SETTING_KEY,homeScopeForAccount,serializeFavorites,validScopeId} from '../modular/navigation-preferences.mjs';
import {navigationHref} from '../modular/nav-destinations.mjs';
import {FOLDERS_SETTING_KEY,MAX_FOLDERS,cleanFolderName,normalizeFavoriteFolders,serializeFavoriteFolders} from '../modular/favorite-folders.mjs';
import {MOBILE_HOME_ID,MOBILE_HOME_STORAGE_KEY,mobileFavoriteEnabled,mobileHomepageChoice} from '../modular/mobile-home-preference.mjs';

const DEFAULT_CHOICES=[
  {id:'lrunes',label:'月之符文'},
  {id:'lo3rwang',label:'作者首頁'},
  {id:'loc',label:'月典首頁'}
];

export default function GlobalSettings(){
  const prefs=useNavigationPreferences();
  const {account}=prefs;
  const [registry,setRegistry]=useState([]);
  const [native,setNative]=useState(false);
  const [registryError,setRegistryError]=useState('');
  const [registryLoading,setRegistryLoading]=useState(true);
  const [home,setHome]=useState('loc');
  const [myPhoneFavorite,setMyPhoneFavorite]=useState(true);
  const [section,setSection]=useState('daily');
  const [managedScope,setManagedScope]=useState('');
  const [managementAction,setManagementAction]=useState('profile');
  const [favorites,setFavorites]=useState([...DEFAULT_FAVORITES]);
  const [folders,setFolders]=useState([]);
  const [newFolderName,setNewFolderName]=useState('');
  const [busy,setBusy]=useState('');
  const [status,setStatus]=useState('');
  const identity=account.user?.id||account.user?.email||'';
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const tab=params.get('section');
    if(['daily','files','home','favorites','manage','account'].includes(tab))setSection(tab);
    const requested=params.get('scope');
    if(requested&&/^[a-z0-9_-]{1,64}$/i.test(requested))setManagedScope(requested);
  },[]);

  useEffect(()=>{
    const actual=Capacitor.isNativePlatform();
    setNative(actual);
    if(actual){
      setMyPhoneFavorite(mobileFavoriteEnabled(window.localStorage));
      setHome(mobileHomepageChoice(window.localStorage));
    }
  },[]);
  useEffect(()=>{
    let alive=true;
    selectScopeRegistry().then(rows=>{if(alive)setRegistry(rows||[]);})
      .catch(error=>{if(alive)setRegistryError(String(error?.message||error));})
      .finally(()=>{if(alive)setRegistryLoading(false);});
    return()=>{alive=false};
  },[]);
  useEffect(()=>{
    if(prefs.loading)return;
    setHome(native?mobileHomepageChoice(window.localStorage):(validScopeId(prefs.home)||'loc'));
    setFavorites([...prefs.favorites]);
    setFolders(prefs.folders.map(folder=>({...folder,scopes:[...folder.scopes]})));
  },[prefs.home,prefs.favorites.join(','),prefs.loading,identity,native]);

  const choices=useMemo(()=>{
    const mapped=new Map(DEFAULT_CHOICES.map(item=>[item.id,item]));
    for(const row of registry){
      if(row.scope_id==='admin')continue;
      mapped.set(row.scope_id,{
        id:row.scope_id,
        label:DEFAULT_CHOICES.find(item=>item.id===row.scope_id)?.label||row.display_name||row.scope_id
      });
    }
    return [...mapped.values()];
  },[registry]);
  const allowedHomes=useMemo(()=>{
    const assigned=new Set(account.authorizer?.scopeIds||[]);
    const visible=choices.filter(item=>item.id==='loc'||(native&&item.id==='lrunes')||(
      account.user&&(account.canManageGlobalSync()||assigned.has(item.id))
    ));
    if(native)visible.push({id:MOBILE_HOME_ID,label:'我的手機（本機）'});
    return visible;
  },[choices,account.user,account.authorizer,account.canManageGlobalSync,native]);
  const effectiveHome=native&&home===MOBILE_HOME_ID?MOBILE_HOME_ID:homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));

  function broadcast(next){
    window.dispatchEvent(new CustomEvent('loc-navigation-changed',{detail:next}));
  }
  async function saveHome(event){
    event.preventDefault();
    if(!account.user&&!native)return;
    setBusy('home');setStatus('');
    try{
      if(native){
        const requested=allowedHomes.some(item=>item.id===home)?home:'loc';
        window.localStorage.setItem(MOBILE_HOME_STORAGE_KEY,requested);
        window.dispatchEvent(new Event('loc-device-navigation-changed'));
        setHome(requested);
        setStatus('手機預設首頁已保存於此裝置，不會修改網站首頁設定。');
        return;
      }
      const chosen=homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));
      await putSetting(HOME_SETTING_KEY,chosen);
      setHome(chosen);
      broadcast({home:chosen});
      setStatus('預設首頁已儲存。');
    }catch(error){setStatus('首頁設定失敗：'+String(error?.message||error));}
    finally{setBusy('');}
  }
  async function logout(){
    setBusy('logout');setStatus('');
    try{await account.signOut();window.location.reload();}
    catch(error){setStatus('登出失敗：'+String(error?.message||error));setBusy('');}
  }
  function login(){
    // Keep the OAuth callback on the current origin so the Supabase session
    // lands in the same origin's authenticated storage.
    account.signIn(new URL('/settings/',window.location.href).href);
  }
  const checking=account.loading||account.permissionLoading||prefs.loading;
  const runePolicy=settingsRunePolicy({
    native,
    authenticated:Boolean(account.user),
    scopeManager:Boolean(account.user)&&account.canManageScopeSync('lrunes'),
    loading:checking
  });
  const manageScopes=useMemo(()=>{
    if(native||!account.user)return [];
    return choices.filter(item=>account.canManageScopeSync(item.id));
  },[choices,account.user,account.authorizer,native]);
  const manageable=manageScopes.some(item=>item.id===managedScope)?managedScope:(manageScopes[0]?.id||'');
  const canManageSelected=Boolean(manageable)&&account.canManageScopeSync(manageable);
  const sectionOptions=[
    {value:'daily',label:'每日符文紀錄'},
    {value:'files',label:'文件匯入／匯出'},
    {value:'home',label:'首頁設定'},
    {value:'favorites',label:'我的最愛（展示）'},
    ...(!native&&(manageScopes.length||account.canManageGlobalSync())?[{value:'manage',label:'管理功能'}]:[]),
    {value:'account',label:'帳號'}
  ];
  return <main className="scope-main">
    <section className="scope-page">
      <header className="loc-hero">
        <p className="loc-eyebrow">Global Settings</p>
        <h1>設定</h1>
        <p>選擇功能後，只顯示對應設定與操作。</p>
      </header>
      <div className="scope-content scope-settings-options">
        <section className="loc-card loc-settings-switcher">
          <label htmlFor="loc-settings-function">設定功能</label>
          <Select inputId="loc-settings-function" instanceId="loc-settings-function"
            unstyled classNamePrefix="loc-settings-select"
            className="loc-settings-select" isSearchable={false}
            options={sectionOptions}
            value={sectionOptions.find(item=>item.value===section)||sectionOptions[0]}
            onChange={option=>{setSection(option?.value||'daily');setStatus('');}}
            aria-label="選擇設定功能"/>
        </section>

        {section==='files'?(native?<PrivateLocalFiles/>:<section className="loc-card">
          <h2>文件匯入／匯出</h2>
          <p className="scope-settings-note">網站匯入使用 Supabase，必須具備對應 Scope 的管理權限；不再使用獨立的瀏覽器本機測試工作區。一般作品匯出功能尚未提供。</p>
          {!account.user?<p>請先登入，再使用你有權管理的資料匯入。</p>:
            manageScopes.length?<div>
              <label htmlFor="loc-import-scope">匯入目標 Scope</label>
              <Select inputId="loc-import-scope" instanceId="loc-import-scope"
                unstyled classNamePrefix="loc-settings-select" className="loc-settings-select"
                isSearchable={false}
                options={manageScopes.map(item=>({value:item.id,label:item.label}))}
                value={manageScopes.map(item=>({value:item.id,label:item.label})).find(o=>o.value===manageable)||null}
                onChange={option=>setManagedScope(option?.value||'')}/>
              {canManageSelected?<ManagementImportPanel key={manageable} scopeId={manageable}/>:null}
            </div>:<p>目前帳號沒有可寫入的 Scope；不會開啟雲端匯入。</p>}
        </section>):null}

        {section==='daily'?<section className="scope-settings-daily-test" aria-labelledby="settings-daily-calendar-title">
          <h2 id="settings-daily-calendar-title">每日符文行事曆</h2>
          <p className="scope-settings-note">每日符文紀錄與日曆。匯入／匯出請至完整每日符文紀錄。</p>
          <DailyLogClient embedded/>
          {native&&runePolicy.canImport?<RuneSQLiteTransfer
            canManage={runePolicy.canImport}
            onImported={()=>window.dispatchEvent(new CustomEvent('loc-rune-local-changed'))}
          />:null}
          {(native||account.user)&&!checking?<p className="scope-settings-note">
            <a className="loc-button" href={navigationHref('lrunes','daily/log',native)}>開啟完整每日符文紀錄（含匯入／匯出）</a>
          </p>:null}
        </section>:null}

        {section==='home'?<section className="loc-card">
          <h2>設定首頁</h2>
          <p className="scope-settings-note">網站保留原有 Scope 首頁設定；iOS 可獨立設定「我的手機」，僅儲存在裝置。</p>
          <form onSubmit={saveHome}>
            <label><span>預設首頁</span>
              <select className="scope-select" value={effectiveHome} onChange={event=>setHome(event.target.value)} disabled={checking&&!!account.user}>
                {allowedHomes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            {account.user||native?<button className="loc-button primary" type="submit" disabled={Boolean(busy)||checking}>儲存首頁</button>:<p className="scope-settings-note">網站登入後可修改首頁。</p>}
          </form>
        </section>:null}

        {section==='favorites'?<section className="loc-card">
          <h2>我的最愛</h2>
          <p className="scope-settings-note">此區暫時只展示，不開放修改、移除或重新編排。iOS 的「月之符文」為固定核心入口，不能從我的最愛移除。</p>
          <div className="scope-favorite-setting-row"><strong>月之符文</strong><span>固定保留</span></div>
          {native&&myPhoneFavorite?<div className="scope-favorite-setting-row"><strong>我的手機</strong><span>App 專屬</span></div>:null}
          {favorites.filter(id=>id!=='lrunes').map(id=>{
            const item=choices.find(option=>option.id===id);
            return item?<div className="scope-favorite-setting-row" key={id}>
              <span>{item.label}</span><span>{folders.find(folder=>folder.scopes.includes(id))?.label||'第一列'}</span>
            </div>:null;
          })}
          {folders.length?<p className="scope-settings-note">現有目錄：{folders.map(folder=>folder.label).join('、')}</p>:null}
          <p className="scope-settings-note">新增、刪除與目錄管理暫不啟用。</p>
        </section>:null}

        {section==='manage'&&!native&&(manageScopes.length||account.canManageGlobalSync())?<section className="loc-card">
          <h2>管理功能</h2>
          <p className="scope-settings-note">管理已從治理頁移至設定；功能權限維持原規則，不因顯示選單而開放寫入。</p>
          {manageScopes.length?<div>
            <label htmlFor="loc-manage-scope">管理 Scope</label>
            <Select inputId="loc-manage-scope" instanceId="loc-manage-scope" isSearchable={false}
              unstyled classNamePrefix="loc-settings-select" className="loc-settings-select"
              options={manageScopes.map(item=>({value:item.id,label:item.label}))}
              value={manageScopes.map(item=>({value:item.id,label:item.label})).find(o=>o.value===manageable)||null}
              onChange={option=>setManagedScope(option?.value||'')}/>
            <label htmlFor="loc-manage-action">管理項目</label>
            <Select inputId="loc-manage-action" instanceId="loc-manage-action"
              unstyled classNamePrefix="loc-settings-select" className="loc-settings-select"
              isSearchable={false}
              options={[{value:'profile',label:'個人設定'},{value:'publish',label:'發表文章'},{value:'import',label:'資料匯入'}]}
              value={[{value:'profile',label:'個人設定'},{value:'publish',label:'發表文章'},{value:'import',label:'資料匯入'}].find(o=>o.value===managementAction)}
              onChange={option=>setManagementAction(option?.value||'profile')}/>
            {canManageSelected&&managementAction==='profile'?<ScopeSettingsPanel key={manageable} scopeId={manageable}/>:null}
            {canManageSelected&&managementAction==='publish'?<ManagementArticlePublisher key={manageable} scopeId={manageable}/>:null}
            {canManageSelected&&managementAction==='import'?<ManagementImportPanel key={manageable} scopeId={manageable}/>:null}
          </div>:null}
          {account.canManageGlobalSync()?<div className="loc-settings-panel-group">
            <ScopeGroupManagement scopeId="loc"/>
            <a className="loc-button" href={native?'/admin/index.html':'/admin/'}>Admin 系統設定</a>
          </div>:null}
        </section>:null}

        {section==='account'?<section className="loc-card">
          <h2>登入</h2>
          {checking?<p>正在確認帳號…</p>:account.user?<div>
            <p>{account.user.email||'已登入'}</p>
            <button type="button" className="loc-button" disabled={Boolean(busy)} onClick={logout}>登出</button>
          </div>:<button type="button" className="loc-button primary" onClick={login}>使用 Google 登入</button>}
          {account.error?<p role="alert" className="scope-status scope-error">{account.error}</p>:null}
        </section>:null}
        {status?<p role="status" className="scope-status">{status}</p>:null}
      </div>
    </section>
  </main>;
}
