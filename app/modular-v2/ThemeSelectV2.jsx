'use client';
import {useEffect,useMemo,useState} from 'react';
import {getScopeThemeDefault,updateScopeThemeDefault} from '../loc/scope-public-settings';
import {fetchThemeStylesV2} from '../migration-bridges/theme-admin-neon.v2';
import {useNeonAccount} from '../loc/use-neon-account';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import {applyThemeV2,getThemeSlotV2,THEME_SLOTS_V2} from './theme-registry.v2';
export default function ThemeSelectV2(){
  const {scopeId}=useScopeRuntimeV2(),account=useNeonAccount();
  const [themeId,setThemeId]=useState('theme-7'),[styles,setStyles]=useState([]),[canEdit,setCanEdit]=useState(false),[status,setStatus]=useState('');
  useEffect(()=>{
    let live=true;
    Promise.all([getScopeThemeDefault(scopeId),fetchThemeStylesV2()]).then(([value,rows])=>{
      if(!live)return;
      if(value?.default_theme_id)setThemeId(value.default_theme_id);
      setStyles(Array.isArray(rows)?rows:[]);
    }).catch(()=>{if(live)setStyles([])});
    return()=>{live=false};
  },[scopeId]);
  useEffect(()=>{
    let live=true;
    if(!account.user||account.permissionLoading){setCanEdit(false);return()=>{live=false};}
    account.canManageGlobal().then(value=>{if(live)setCanEdit(Boolean(value))}).catch(()=>{if(live)setCanEdit(false)});
    return()=>{live=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal]);
  const slot=useMemo(()=>getThemeSlotV2(themeId,styles),[themeId,styles]);
  useEffect(()=>{applyThemeV2(slot)},[slot]);
  const change=async event=>{
    const nextThemeId=event.target.value;
    setThemeId(nextThemeId);
    setStatus('');
    if(!canEdit)return;
    try{
      const row=await updateScopeThemeDefault(scopeId,nextThemeId);
      setThemeId(row.default_theme_id);setStatus('Scope 預設主題已更新');
    }catch(error){setStatus(String(error?.message||error))}
  };
  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={themeId} onChange={change} aria-label="主題">
      {THEME_SLOTS_V2.map(item=><option value={item.id} key={item.id}>{styles.find(row=>'theme-'+row.rotation_order===item.id)?.name_zh||item.label}</option>)}
    </select>
    {status&&<small role="status">{status}</small>}
  </label>;
}
