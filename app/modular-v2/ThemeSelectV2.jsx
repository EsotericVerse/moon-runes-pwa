'use client';

import {useEffect,useMemo,useState} from 'react';
import {getScopeThemeDefault} from '../loc/scope-public-settings';
import {useNeonSetting} from '../loc/use-neon-setting';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import {
  SCOPE_THEME_SETTINGS_KEY_V2,
  THEME_SLOTS_V2,
  applyThemeV2,
  getThemeSlotV2,
  scopeThemeSettingsV2,
  themeForHourV2
} from './theme-registry.v2';

export default function ThemeSelectV2(){
  const {scopeId}=useScopeRuntimeV2();
  const [managed,setManaged]=useState(null);
  const {value:storedSettings,setValue:setStoredSettings}=useNeonSetting(SCOPE_THEME_SETTINGS_KEY_V2,{});
  const setting=scopeThemeSettingsV2(scopeId,storedSettings||{},managed);

  useEffect(()=>{
    let live=true;
    getScopeThemeDefault(scopeId).then(value=>live&&setManaged(value)).catch(()=>live&&setManaged(null));
    return()=>{live=false};
  },[scopeId]);

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
    setStoredSettings(current=>{
      const base=current&&typeof current==='object'?current:{};
      const now=scopeThemeSettingsV2(scopeId,base,managed);
      if(value==='time')return {...base,[scopeId]:{...now,mode:'time'}};
      if(value==='custom')return {...base,[scopeId]:{...now,mode:'custom'}};
      return {...base,[scopeId]:{...now,mode:'fixed',theme:value}};
    });
  }

  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={selected} onChange={change} aria-label="主題">
      <option value="time">隨時間</option>
      {THEME_SLOTS_V2.filter(slot=>slot.enabled).map(slot=><option value={slot.id} key={slot.id}>{slot.label}</option>)}
      <option value="custom">自訂</option>
    </select>
  </label>;
}
