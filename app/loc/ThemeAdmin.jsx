'use client';
import {useEffect,useState} from 'react';
import {fetchThemeStylesV2,updateThemeStyleV2} from '../migration-bridges/theme-admin-neon.v2';
import {useNeonAccount} from './use-neon-account';
const COLOR_FIELDS=[['background_color','背景色'],['panel_background_color','文字框背景色'],['text_color','文字色']];
export default function ThemeAdmin(){
  const account=useNeonAccount();
  const [allowed,setAllowed]=useState(false),[rows,setRows]=useState([]),[drafts,setDrafts]=useState({}),[status,setStatus]=useState('');
  const load=async()=>{
    try{
      const next=await fetchThemeStylesV2();setRows(Array.isArray(next)?next:[]);
      setDrafts(Object.fromEntries((Array.isArray(next)?next:[]).map(item=>[item.style_key,{name_zh:item.name_zh||'',background_color:item.background_color||'#ffffff',panel_background_color:item.panel_background_color||'#ffffff',text_color:item.text_color||'#202020'}])));
      setStatus('');
    }catch(error){setStatus(String(error?.message||error))}
  };
  useEffect(()=>{
    let active=true;
    if(!account.user||account.permissionLoading){setAllowed(false);return()=>{active=false};}
    account.canManageGlobal().then(value=>{if(active)setAllowed(Boolean(value))}).catch(()=>{if(active)setAllowed(false)});
    return()=>{active=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal]);
  useEffect(()=>{if(!account.loading&&!account.permissionLoading&&account.user&&allowed)load();},[account.loading,account.permissionLoading,account.user?.id,allowed]);
  if(account.loading||account.permissionLoading)return <p>正在確認 Neon 全域管理權限…</p>;
  if(!account.user)return <p>登入後才能管理全站風格。</p>;
  if(!allowed)return <p>此 Neon 身份沒有 admin 權限。</p>;
  const change=(styleKey,field,value)=>setDrafts(current=>({...current,[styleKey]:{...current[styleKey],[field]:value}}));
  const save=async row=>{
    try{
      if(!await account.canManageGlobal())throw new Error('Neon 全域管理權限已失效，已拒絕寫入。');
      await updateThemeStyleV2(row.style_key,drafts[row.style_key]||{});
      setStatus((drafts[row.style_key]?.name_zh||row.name_zh)+'已更新');await load();
    }catch(error){setStatus(String(error?.message||error))}
  };
  return <div className="loc-theme-admin">
    <p className="loc-subtitle">八組主題只設定名稱、背景色、文字框背景色與文字色。</p>
    {rows.map(row=><section className="loc-theme-admin-row" key={row.style_key}>
      <label>主題名稱<input value={drafts[row.style_key]?.name_zh??row.name_zh} onChange={event=>change(row.style_key,'name_zh',event.target.value)} /></label>
      {COLOR_FIELDS.map(([field,label])=><label key={field}>{label}
        <input type="color" value={drafts[row.style_key]?.[field]||'#ffffff'} onChange={event=>change(row.style_key,field,event.target.value)} />
        <input type="text" value={drafts[row.style_key]?.[field]||''} pattern="^#[0-9a-fA-F]{6}$" aria-label={label+' HEX'} onChange={event=>change(row.style_key,field,event.target.value)} />
      </label>)}
      <button type="button" className="loc-button" onClick={()=>save(row)}>儲存</button>
    </section>)}
    {status&&<p role="status" className="loc-status">{status}</p>}
  </div>;
}
