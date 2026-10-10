'use client';

import {useEffect,useMemo,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {useNavigationPreferences} from './use-navigation-preferences';
import {selectScopeRegistry} from './scope-data';
import {putSetting} from './user-storage';
import {DEFAULT_FAVORITES,FAVORITES_SETTING_KEY,HOME_SETTING_KEY,homeScopeForAccount,serializeFavorites,validScopeId} from '../modular/navigation-preferences.mjs';
import {navigationHref} from '../modular/nav-destinations.mjs';
import {FOLDERS_SETTING_KEY,MAX_FOLDERS,cleanFolderName,normalizeFavoriteFolders,serializeFavoriteFolders} from '../modular/favorite-folders.mjs';

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
  const [favorites,setFavorites]=useState([...DEFAULT_FAVORITES]);
  const [folders,setFolders]=useState([]);
  const [newFolderName,setNewFolderName]=useState('');
  const [busy,setBusy]=useState('');
  const [status,setStatus]=useState('');
  const identity=account.user?.id||account.user?.email||'';

  useEffect(()=>{setNative(Capacitor.isNativePlatform());},[]);
  useEffect(()=>{
    let alive=true;
    selectScopeRegistry().then(rows=>{if(alive)setRegistry(rows||[]);})
      .catch(error=>{if(alive)setRegistryError(String(error?.message||error));})
      .finally(()=>{if(alive)setRegistryLoading(false);});
    return()=>{alive=false};
  },[]);
  useEffect(()=>{
    if(prefs.loading)return;
    setHome(validScopeId(prefs.home)||'loc');
    setFavorites([...prefs.favorites]);
    setFolders(prefs.folders.map(folder=>({...folder,scopes:[...folder.scopes]})));
  },[prefs.home,prefs.favorites.join(','),prefs.loading,identity]);

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
    return choices.filter(item=>item.id==='loc'||(
      account.user&&(account.canManageGlobalSync()||assigned.has(item.id))
    ));
  },[choices,account.user,account.authorizer,account.canManageGlobalSync]);
  const effectiveHome=homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));

  function broadcast(next){
    window.dispatchEvent(new CustomEvent('loc-navigation-changed',{detail:next}));
  }
  async function saveHome(event){
    event.preventDefault();
    if(!account.user)return;
    setBusy('home');setStatus('');
    try{
      const chosen=homeScopeForAccount(home,account,allowedHomes.map(item=>item.id));
      await putSetting(HOME_SETTING_KEY,chosen);
      setHome(chosen);
      broadcast({home:chosen});
      setStatus('預設首頁已儲存。');
    }catch(error){setStatus('首頁設定失敗：'+String(error?.message||error));}
    finally{setBusy('');}
  }
  function addFolder(){
    const name=cleanFolderName(newFolderName);
    if(!name||folders.length>=MAX_FOLDERS)return;
    const id='f'+(globalThis.crypto?.randomUUID?.().replace(/-/g,'').slice(0,20)
      ||(Date.now().toString(36)+Math.random().toString(36).slice(2,9)));
    setFolders(current=>[...current,{id,label:name,scopes:[]}]);
    setNewFolderName('');
  }
  function changeFolderForScope(scopeId,folderId){
    setFolders(current=>current.map(folder=>({
      ...folder,
      scopes:folder.id===folderId
        ?[...new Set([...folder.scopes,scopeId])]
        :folder.scopes.filter(id=>id!==scopeId)
    })));
  }
  async function saveFavorites(event){
    event.preventDefault();
    if(!account.user)return;
    setBusy('favorites');setStatus('');
    try{
      const visibleIds=new Set(choices.map(item=>item.id));
      const selected=favorites.filter(id=>visibleIds.has(id)&&id!=='admin');
      const serialized=serializeFavorites([...new Set([...selected,'loc'])]);
      const cleanFolders=normalizeFavoriteFolders(folders.map(folder=>({
        ...folder,scopes:folder.scopes.filter(id=>selected.includes(id)&&id!=='loc')
      })));
      if(cleanFolders.length!==folders.length){
        setStatus('目錄名稱不得為空白，請修正後再儲存。');return;
      }
      // Saving two scalar text settings; no JSONB, no extra relational tables.
      await putSetting(FOLDERS_SETTING_KEY,serializeFavoriteFolders(cleanFolders));
      await putSetting(FAVORITES_SETTING_KEY,serialized);
      setFavorites(selected);
      setFolders(cleanFolders);
      broadcast({favorites:serialized,folders:serializeFavoriteFolders(cleanFolders)});
      setStatus('我的最愛與目錄已儲存。');
    }catch(error){setStatus('我的最愛儲存失敗：'+String(error?.message||error));}
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

  return <main className="scope-main">
    <section className="scope-page">
      <header className="loc-hero"><p className="loc-eyebrow">Global Settings</p><h1>設定</h1><p>所有 Scope 共用的使用者設定。</p></header>
      <div className="scope-content scope-settings-options">
        <section className="loc-card">
          <h2>設定首頁</h2>
          <p className="scope-settings-note">預設為 LOC。可設定有權使用的 Scope 或 Scope Group；不影響權限。</p>
          <form onSubmit={saveHome}>
            <label><span>預設首頁</span>
              <select className="scope-select" value={effectiveHome} onChange={event=>setHome(event.target.value)} disabled={checking||!account.user}>
                {allowedHomes.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            {account.user?<button className="loc-button primary" type="submit" disabled={Boolean(busy)||checking}>儲存首頁</button>:<p className="scope-settings-note">登入後可修改；未登入時固定使用 LOC。</p>}
          </form>
        </section>
        <section className="loc-card">
          <h2>我的最愛</h2>
          <p className="scope-settings-note">決定第一列顯示的空間，或將入口收進自訂目錄。右側「回月典首頁」永遠固定。</p>
          {registryError?<p className="scope-status scope-error">{registryError}</p>:null}
          <form onSubmit={saveFavorites}>
            <fieldset disabled={checking||!account.user||Boolean(busy)||registryLoading||Boolean(registryError)}>
              <legend>選擇上方入口</legend>
              {choices.filter(item=>item.id!=='loc').map(item=><div key={item.id} className="scope-favorite-setting-row">
                <label>
                  <input type="checkbox" checked={favorites.includes(item.id)} onChange={event=>setFavorites(current=>
                    event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id)
                  )}/>
                  <span>{item.label}</span>
                </label>
                {favorites.includes(item.id)?<select aria-label={item.label+'所屬目錄'}
                  value={folders.find(folder=>folder.scopes.includes(item.id))?.id||''}
                  onChange={event=>changeFolderForScope(item.id,event.target.value)}>
                  <option value="">第一列直接顯示</option>
                  {folders.map(folder=><option key={folder.id} value={folder.id}>{folder.label||'未命名目錄'}</option>)}
                </select>:null}
              </div>)}
            </fieldset>
            <div className="scope-favorite-folder-editor">
              <strong>自訂目錄</strong>
              {folders.map(folder=><div className="scope-favorite-folder-row" key={folder.id}>
                <input aria-label="目錄名稱" type="text" maxLength={35}
                  value={folder.label} onChange={event=>setFolders(current=>current.map(item=>item.id===folder.id?{...item,label:event.target.value}:item))}/>
                <button type="button" className="loc-button" onClick={()=>setFolders(current=>current.filter(item=>item.id!==folder.id))}>刪除</button>
              </div>)}
              <div className="scope-favorite-folder-row">
                <input aria-label="新目錄名稱" type="text" maxLength={35} placeholder="新目錄名稱"
                  value={newFolderName} onChange={event=>setNewFolderName(event.target.value)}/>
                <button type="button" className="loc-button" onClick={addFolder}
                  disabled={!newFolderName.trim()||folders.length>=MAX_FOLDERS||checking||!account.user}>新增目錄</button>
              </div>
              <p className="scope-settings-note">點第一列的目錄，內容才會展開第二列；刪除目錄後，入口回到第一列。</p>
            </div>
            {account.user?<button className="loc-button primary" type="submit" disabled={checking||Boolean(busy)||registryLoading||Boolean(registryError)}>儲存我的最愛</button>:<p className="scope-settings-note">登入後才能保存我的最愛。</p>}
          </form>
        </section>
        <section className="loc-card">
          <h2>登入</h2>
          {checking?<p>正在確認帳號…</p>:account.user?<div>
            <p>{account.user.email||'已登入'}</p>
            <button type="button" className="loc-button" disabled={Boolean(busy)} onClick={logout}>登出</button>
          </div>:<button type="button" className="loc-button primary" onClick={login}>使用 Google 登入</button>}
          {account.error?<p role="alert" className="scope-status scope-error">{account.error}</p>:null}
        </section>
        <section className="loc-card">
          <h2>每日符文</h2>
          <p className="scope-settings-note">前往原有符韻每日符文紀錄。既有功能與資料表不做搬移。</p>
          <a className="loc-button" href={navigationHref('lrunes','daily/log',native)}>前往每日符文</a>
        </section>
        {status?<p role="status" className="scope-status">{status}</p>:null}
      </div>
    </section>
  </main>;
}
