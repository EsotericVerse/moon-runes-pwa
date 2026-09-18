'use client';

import {useEffect,useMemo,useState} from 'react';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import {THEME_SLOTS_V2,THEME_STORAGE_KEY_V2,applyThemeV2,getThemeSlotV2,themeForHourV2} from './theme-registry.v2';

function readStored(){
  if(typeof window==='undefined')return {};
  try{return JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY_V2)||'{}')||{};}catch{return {};}
}

export default function ThemeSelectV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const [stored,setStored]=useState({});
  useEffect(()=>setStored(readStored()),[]);
  const setting=stored[scopeId]||scope.theme;
  const selected=setting.mode==='time'?'time':setting.mode==='custom'?'custom':setting.theme;

  const active=useMemo(()=>{
    const id=setting.mode==='time'?themeForHourV2(setting.schedule):setting.theme;
    return {slot:getThemeSlotV2(id),custom:setting.mode==='custom'?setting.custom:{}};
  },[setting]);

  useEffect(()=>{
    applyThemeV2(active.slot,active.custom);
    if(setting.mode!=='time')return undefined;
    const timer=window.setInterval(()=>applyThemeV2(getThemeSlotV2(themeForHourV2(setting.schedule))),60000);
    return()=>window.clearInterval(timer);
  },[active,setting.mode,setting.schedule]);

  function change(event){
    const value=event.target.value;
    const next={...stored};
    if(value==='time')next[scopeId]={...scope.theme,mode:'time'};
    else if(value==='custom')next[scopeId]={...scope.theme,mode:'custom'};
    else next[scopeId]={...scope.theme,mode:'fixed',theme:value};
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
