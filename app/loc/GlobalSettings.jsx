'use client';

import {useEffect,useMemo,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {useNavigationPreferences} from './use-navigation-preferences';
import {selectScopeRegistry} from './scope-data';
import {putSetting} from './user-storage';
import {DEFAULT_FAVORITES,FAVORITES_SETTING_KEY,HOME_SETTING_KEY,homeScopeForAccount,serializeFavorites,validScopeId} from '../modular/navigation-preferences.mjs';
import {navigationHref} from '../modular/nav-destinations.mjs';

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
  async function saveFavorites(event){
    event.preventDefault();
    if(!account.user)return;
    setBusy('favorites');setStatus('');
    try{
      const visibleIds=new Set(choices.map(item=>item.id));
      const selected=favorites.filter(id=>visibleIds.has(id));
      const serialized=serializeFavorites(selected);
      await putSetting(FAVORITES_SETTING_KEY,serialized);
      setFavorites(selected);
      broadcast({favorites:serialized});
      setStatus('我的最愛已儲存。');
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
          <p className="scope-settings-note">決定上方 NAV 顯示的 Scope／Scope Group，首次使用先列出月之符文、作者首頁與月典首頁。</p>
          {registryError?<p className="scope-status scope-error">{registryError}</p>:null}
          <form onSubmit={saveFavorites}>
            <fieldset disabled={checking||!account.user||Boolean(busy)||registryLoading||Boolean(registryError)}>
              <legend>選擇上方入口</legend>
              {choices.map(item=><label key={item.id}>
                <input type="checkbox" checked={favorites.includes(item.id)} onChange={event=>setFavorites(current=>
                  event.target.checked?[...current,item.id]:current.filter(id=>id!==item.id)
                )}/>
                <span>{item.label}</span>
              </label>)}
            </fieldset>
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
