'use client';

import {useEffect,useMemo,useState} from 'react';
import {getScopeThemeDefault} from '../loc/scope-public-settings';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import {THEME_SLOTS_V2,THEME_STORAGE_KEY_V2,applyThemeV2,getThemeSlotV2,themeForHourV2} from './theme-registry.v2';

function readStored(){
  if(typeof window==='undefined')return {};
  try{return JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY_V2)||'{}')||{};}catch{return {};}
}
function mergeSetting(scopeTheme,managed,local){
  const base=managed?{...scopeTheme,...managed,custom:{...scopeTheme.custom,...(managed.custom||{})},schedule:managed.schedule||scopeTheme.schedule}:scopeTheme;
  return local?{...base,...local,custom:{...base.custom,...(local.custom||{})},schedule:local.schedule||base.schedule}:base;
}

export default function ThemeSelectV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const [stored,setStored]=useState({});
  const [managed,setManaged]=useState(null);

  useEffect(()=>setStored(readStored()),[]);
  useEffect(()=>{
    let live=true;
    getScopeThemeDefault(scopeId).then(value=>live&&setManaged(value)).catch(()=>live&&setManaged(null));
    return()=>{live=false};
  },[scopeId]);

  const setting=mergeSetting(scope.theme,managed,stored[scopeId]);
  const selected=setting.mode==='time'?'time':setting.mode==='custom'?'custom':setting.theme;
  const active=useMemo(()=>{
    const id=setting.mode==='time'?themeForHourV2(setting.schedule):setting.theme;
    return {slot:getThemeSlotV2(id),custom:setting.mode==='custom'?setting.custom:{}};
  },[setting.mode,setting.theme,setting.custom,setting.schedule]);

  useEffect(()=>{
    applyThemeV2(active.slot,active.custom);
    if(setting.mode!=='time')return undefined;
    const sync=()=>applyThemeV2(getThemeSlotV2(themeForHourV2(setting.schedule)));
    const timer=window.setInterval(sync,60000);
    document.addEventListener('visibilitychange',sync);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
  },[active,setting.mode,setting.schedule]);

  function change(event){
    const value=event.target.value;
    const next={...stored};
    const base=mergeSetting(scope.theme,managed,null);
    if(value==='time')next[scopeId]={...base,mode:'time'};
    else if(value==='custom')next[scopeId]={...base,mode:'custom'};
    else next[scopeId]={...base,mode:'fixed',theme:value};
    setStored(next);
    window.localStorage.setItem(THEME_STORAGE_KEY_V2,JSON.stringify(next));
  }

  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={selected} onChange={change} aria-label="主題">
      <option value="time">隨時間</option>
      {THEME_SLOTS_V2.map(slot=><option value={slot.id} key={slot.id}>{slot.label}</option>)}
      <option value="custom">自訂</option>
    </select>
  </label>;
}
