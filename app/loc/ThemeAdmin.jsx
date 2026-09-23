'use client';

import {useEffect,useState} from 'react';
import {fetchThemeStylesV2,updateThemeStyleV2} from '../migration-bridges/theme-admin-neon.v2';
import {useNeonAccount} from './use-neon-account';

export default function ThemeAdmin(){
  const account=useNeonAccount();
  const [allowed,setAllowed]=useState(false);
  const [rows,setRows]=useState([]);
  const [drafts,setDrafts]=useState({});
  const [status,setStatus]=useState('');

  const load=async()=>{
    try{
      const next=await fetchThemeStylesV2();
      setRows(Array.isArray(next)?next:[]);
      setDrafts(Object.fromEntries((Array.isArray(next)?next:[]).map(item=>[item.style_key,JSON.stringify(item.css_vars||{},null,2)])));
      setStatus('');
    }catch(error){setStatus(String(error?.message||error))}
  };

  useEffect(()=>{
    let active=true;
    if(!account.user||account.permissionLoading){setAllowed(false);return()=>{active=false}};
    account.canManageGlobal().then(value=>{if(active)setAllowed(Boolean(value))}).catch(()=>{if(active)setAllowed(false)});
    return()=>{active=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal]);

  useEffect(()=>{
    if(!account.loading&&!account.permissionLoading&&account.user&&allowed)load();
  },[account.loading,account.permissionLoading,account.user?.id,allowed]);

  if(account.loading||account.permissionLoading)return <p>正在確認 Neon 全域管理權限…</p>;
  if(!account.user)return <p>登入後才能管理全站風格。</p>;
  if(!allowed)return <p>此 Neon 身份沒有 global_admin 權限；Scope 管理權限不會授權全站設定。</p>;

  const save=async row=>{
    try{
      if(!await account.canManageGlobal())throw new Error('Neon 全域管理權限已失效，已拒絕寫入。');
      const css_vars=JSON.parse(drafts[row.style_key]||'{}');
      await updateThemeStyleV2(row.style_key,{css_vars});
      setStatus(row.name_zh+'已更新');
      await load();
    }catch(error){setStatus(String(error?.message||error))}
  };

  return <div className="loc-theme-admin">
    <p className="loc-subtitle">全站風格設定只接受 Neon global_admin 授權。</p>
    {rows.map(row=><section className="loc-theme-admin-row" key={row.style_key}>
      <div><strong>{row.name_zh}</strong><small>{row.style_key}</small></div>
      <textarea value={drafts[row.style_key]??'{}'} onChange={event=>setDrafts(current=>({...current,[row.style_key]:event.target.value}))} rows={6} aria-label={row.name_zh+' CSS variables'} />
      <button type="button" className="loc-button" onClick={()=>save(row)}>儲存 {row.name_zh}</button>
    </section>)}
    {status&&<p role="status" className="loc-status">{status}</p>}
  </div>;
}
