'use client';
import {useEffect,useMemo,useState} from 'react';
import {getScopeThemeDefault} from '../loc/scope-public-settings';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import {applyThemeV2,getThemeSlotV2,THEME_SLOTS_V2} from './theme-registry.v2';

const DEFAULT_THEME_ID='theme-7';

export default function ThemeSelectV2(){
  const {scopeId}=useScopeRuntimeV2();
  const [themeId,setThemeId]=useState(DEFAULT_THEME_ID);

  useEffect(()=>{
    let live=true;
    getScopeThemeDefault(scopeId)
      .then(scopeDefault=>{
        if(!live)return;
        const defaultTheme=/^theme-[1-8]$/.test(String(scopeDefault?.default_theme_id||''))?scopeDefault.default_theme_id:DEFAULT_THEME_ID;
        setThemeId(defaultTheme);
      })
      .catch(()=>{
        if(!live)return;
        setThemeId(DEFAULT_THEME_ID);
      });
    return()=>{live=false};
  },[scopeId]);

  const slot=useMemo(()=>getThemeSlotV2(themeId),[themeId]);
  useEffect(()=>{applyThemeV2(slot)},[slot]);

  const change=event=>{
    const nextThemeId=event.target.value;
    setThemeId(nextThemeId);
  };

  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={themeId} onChange={change} aria-label="主題">
      {THEME_SLOTS_V2.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
