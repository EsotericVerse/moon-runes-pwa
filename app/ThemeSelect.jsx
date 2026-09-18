'use client';

import {useEffect,useMemo,useState} from 'react';
import {SCOPE_THEME_SETTINGS_KEY,THEME_REGISTRY_OVERRIDE_KEY,THEME_TOKEN_KEYS,detectThemeScope,mergeThemeSlots,scopeThemeSettings,themeForHour} from './theme-registry';

function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
function clearThemeTokens(){THEME_TOKEN_KEYS.forEach(key=>document.documentElement.style.removeProperty(key));}
function applyTheme(slot,custom={}){
  if(!slot)return;
  const root=document.documentElement;
  clearThemeTokens();
  root.dataset.theme=slot.scheme==='light'?'light':'dark';
  Object.entries({...slot.tokens,...custom}).forEach(([key,value])=>{if(value)root.style.setProperty(key,value);});
}

export default function ThemeSelect(){
  const [scope,setScope]=useState('loc');
  const [selected,setSelected]=useState('');
  const [mode,setMode]=useState('fixed');
  const [version,setVersion]=useState(0);
  const slots=useMemo(()=>typeof window==='undefined'?mergeThemeSlots({}):mergeThemeSlots(readJson(THEME_REGISTRY_OVERRIDE_KEY,{})),[version]);

  useEffect(()=>{
    const currentScope=detectThemeScope(window.location.pathname,window.location.hostname);
    setScope(currentScope);
    const settings=scopeThemeSettings(currentScope,readJson(SCOPE_THEME_SETTINGS_KEY,{}));
    const enabled=slots.filter(slot=>slot.enabled);
    const themeId=settings.mode==='time'?themeForHour(settings.schedule):settings.theme;
    const slot=enabled.find(item=>item.id===themeId)||enabled[0];
    setMode(settings.mode);
    setSelected(slot?.id||'');
    applyTheme(slot,settings.mode==='custom'?settings.custom:{});
    if(settings.mode!=='time')return undefined;
    const timer=window.setInterval(()=>{
      const nextId=themeForHour(settings.schedule);
      const next=enabled.find(item=>item.id===nextId)||enabled[0];
      setSelected(next?.id||'');
      applyTheme(next,{});
    },60000);
    return ()=>window.clearInterval(timer);
  },[slots]);

  useEffect(()=>{
    const refresh=()=>setVersion(value=>value+1);
    window.addEventListener('loc-theme-registry-change',refresh);
    window.addEventListener('loc-scope-theme-change',refresh);
    window.addEventListener('storage',refresh);
    return ()=>{window.removeEventListener('loc-theme-registry-change',refresh);window.removeEventListener('loc-scope-theme-change',refresh);window.removeEventListener('storage',refresh);};
  },[]);

  function handleChange(event){
    const next=event.target.value;
    const stored=readJson(SCOPE_THEME_SETTINGS_KEY,{});
    const current=scopeThemeSettings(scope,stored);
    const updated={...stored,[scope]:{...current,mode:'fixed',theme:next}};
    localStorage.setItem(SCOPE_THEME_SETTINGS_KEY,JSON.stringify(updated));
    setMode('fixed');setSelected(next);
    applyTheme(slots.find(item=>item.id===next),{});
    window.dispatchEvent(new Event('loc-scope-theme-change'));
  }

  return <label className="loc-theme-control">
    <span>主題{mode==='time'?'・隨時間':mode==='custom'?'・自訂':''}</span>
    <select value={selected} onChange={handleChange} aria-label="主題">
      {slots.filter(slot=>slot.enabled).map(slot=><option value={slot.id} key={slot.id}>{slot.label}</option>)}
    </select>
  </label>;
}
