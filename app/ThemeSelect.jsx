'use client';

import {useEffect,useMemo,useState} from 'react';
import {useCurrentScope} from './use-current-scope';
import {useNeonSetting} from './loc/use-neon-setting';
import {getScopeThemeDefault} from './loc/scope-public-settings';
import {
  DEFAULT_SCOPE_THEME_SETTINGS,
  SCOPE_THEME_SETTINGS_KEY,
  THEME_REGISTRY_SETTING_KEY,
  THEME_TOKEN_KEYS,
  mergeThemeSlots,
  scopeThemeSettings,
  themeForHour
} from './theme-registry';

function clearThemeTokens(){
  THEME_TOKEN_KEYS.forEach(key=>document.documentElement.style.removeProperty(key));
}
function applyTheme(slot,custom={}){
  if(!slot)return;
  const root=document.documentElement;
  clearThemeTokens();
  root.dataset.theme=slot.scheme==='light'?'light':'dark';
  Object.entries({...slot.tokens,...custom}).forEach(([key,value])=>{if(value)root.style.setProperty(key,value);});
}

export default function ThemeSelect(){
  const {scope}=useCurrentScope();
  const [managedDefault,setManagedDefault]=useState(null);
  const {value:registryOverrides}=useNeonSetting(THEME_REGISTRY_SETTING_KEY,{});
  const {value:storedSettings,setValue:setStoredSettings}=useNeonSetting(SCOPE_THEME_SETTINGS_KEY,{});
  const slots=useMemo(()=>mergeThemeSlots(registryOverrides||{}),[registryOverrides]);
  const settings=scopeThemeSettings(scope,storedSettings||{},managedDefault);


  useEffect(()=>{
    let live=true;
    getScopeThemeDefault(scope).then(value=>{if(live)setManagedDefault(value)}).catch(()=>{if(live)setManagedDefault(null)});
    return()=>{live=false};
  },[scope]);

  useEffect(()=>{
    const enabled=slots.filter(slot=>slot.enabled);
    const id=settings.mode==='time'?themeForHour(settings.schedule):settings.theme;
    const slot=enabled.find(item=>item.id===id)||enabled[0];
    applyTheme(slot,settings.mode==='custom'?settings.custom:{});
    if(settings.mode!=='time')return undefined;
    const sync=()=>{
      const next=enabled.find(item=>item.id===themeForHour(settings.schedule))||enabled[0];
      applyTheme(next,{});
    };
    const timer=window.setInterval(sync,60000);
    document.addEventListener('visibilitychange',sync);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
  },[slots,settings.mode,settings.theme,settings.custom,settings.schedule]);

  const selected=settings.mode==='time'?'time':settings.mode==='custom'?'custom':settings.theme;
  function change(event){
    const next=event.target.value;
    setStoredSettings(current=>{
      const base=current&&typeof current==='object'?current:{};
      const now=scopeThemeSettings(scope,base);
      if(next==='time')return {...base,[scope]:{...now,mode:'time'}};
      if(next==='custom')return {...base,[scope]:{...now,mode:'custom'}};
      return {...base,[scope]:{...now,mode:'fixed',theme:next}};
    });
  }

  return <label className="loc-theme-control">
    <span>主題</span>
    <select value={selected} onChange={change} aria-label="主題">
      <option value="time">隨時間</option>
      {slots.filter(slot=>slot.enabled).map(slot=><option value={slot.id} key={slot.id}>{slot.label}</option>)}
      <option value="custom">自訂</option>
    </select>
  </label>;
}
