'use client';

import { useEffect, useMemo, useState } from 'react';
import {DEFAULT_SCOPE_THEME,SCOPE_THEME_DEFAULTS_KEY,THEME_REGISTRY_OVERRIDE_KEY,THEME_STORAGE_KEY,detectThemeScope,mergeThemeSlots} from './theme-registry';

function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}

function clearThemeTokens(){
  const root=document.documentElement;
  ['--loc-accent','--loc-gold'].forEach(key=>root.style.removeProperty(key));
}

function applyThemeSlot(slot){
  const root=document.documentElement;
  clearThemeTokens();
  root.dataset.theme=slot.scheme==='light'?'light':'dark';
  Object.entries(slot.tokens||{}).forEach(([key,value])=>{if(value)root.style.setProperty(key,value);});
}

export default function ThemeSelect(){
  const [selected,setSelected]=useState('');
  const [registryVersion,setRegistryVersion]=useState(0);
  const slots=useMemo(()=>{
    if(typeof window==='undefined')return mergeThemeSlots({});
    return mergeThemeSlots(readJson(THEME_REGISTRY_OVERRIDE_KEY,{}));
  },[registryVersion]);

  useEffect(()=>{
    const scope=detectThemeScope(window.location.pathname,window.location.hostname);
    const defaults=readJson(SCOPE_THEME_DEFAULTS_KEY,DEFAULT_SCOPE_THEME);
    const saved=localStorage.getItem(THEME_STORAGE_KEY);
    const enabled=slots.filter(slot=>slot.enabled);
    const initial=enabled.some(slot=>slot.id===saved)?saved:(defaults[scope]||enabled[0]?.id||'theme-2');
    setSelected(initial);
    const slot=enabled.find(item=>item.id===initial)||enabled[0];
    if(slot)applyThemeSlot(slot);
  },[slots]);

  useEffect(()=>{
    const refresh=()=>setRegistryVersion(value=>value+1);
    window.addEventListener('loc-theme-registry-change',refresh);
    window.addEventListener('storage',refresh);
    return ()=>{window.removeEventListener('loc-theme-registry-change',refresh);window.removeEventListener('storage',refresh);};
  },[]);

  function handleChange(event){
    const next=event.target.value;
    setSelected(next);
    localStorage.setItem(THEME_STORAGE_KEY,next);
    const slot=slots.find(item=>item.id===next);
    if(slot)applyThemeSlot(slot);
  }

  return <label className="loc-theme-control">
    <span>主題</span>
    <select value={selected} onChange={handleChange} aria-label="主題">
      {slots.filter(slot=>slot.enabled).map(slot=><option value={slot.id} key={slot.id}>{slot.label}</option>)}
    </select>
  </label>;
}
