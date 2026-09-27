'use client';
import {useEffect,useMemo,useState} from 'react';
import {fetchThemeStylesV2} from '../migration-bridges/theme-admin-neon.v2';
import {getScopeThemeDefault} from '../loc/scope-public-settings';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import {applyThemeV2,getThemeSlotV2,THEME_SLOTS_V2} from './theme-registry.v2';

const DEFAULT_THEME_ID='theme-7';
const storageKey=scopeId=>`loc-theme:${String(scopeId||'loc')}`;

export default function ThemeSelectV2(){
  const {scopeId}=useScopeRuntimeV2();
  const [themeId,setThemeId]=useState(DEFAULT_THEME_ID),[styles,setStyles]=useState([]);

  useEffect(()=>{
    let live=true;
    const saved=typeof window!=='undefined'?window.localStorage.getItem(storageKey(scopeId)):'';
    Promise.all([getScopeThemeDefault(scopeId),fetchThemeStylesV2()])
      .then(([scopeDefault,rows])=>{
        if(!live)return;
        const savedTheme=/^theme-[1-8]$/.test(String(saved||''))?saved:'';
        const defaultTheme=/^theme-[1-8]$/.test(String(scopeDefault?.default_theme_id||''))?scopeDefault.default_theme_id:DEFAULT_THEME_ID;
        setThemeId(savedTheme||defaultTheme);
        setStyles(Array.isArray(rows)?rows:[]);
      })
      .catch(()=>{
        if(!live)return;
        setThemeId(/^theme-[1-8]$/.test(String(saved||''))?saved:DEFAULT_THEME_ID);
        setStyles([]);
      });
    return()=>{live=false};
  },[scopeId]);

  const slot=useMemo(()=>getThemeSlotV2(themeId,styles),[themeId,styles]);
  useEffect(()=>{applyThemeV2(slot)},[slot]);

  const change=event=>{
    const nextThemeId=event.target.value;
    setThemeId(nextThemeId);
    if(typeof window!=='undefined')window.localStorage.setItem(storageKey(scopeId),nextThemeId);
  };

  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={themeId} onChange={change} aria-label="主題">
      {THEME_SLOTS_V2.map(item=><option value={item.id} key={item.id}>{styles.find(row=>'theme-'+row.rotation_order===item.id)?.name_zh||item.label}</option>)}
    </select>
  </label>;
}
