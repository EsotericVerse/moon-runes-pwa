'use client';

import {useEffect,useMemo,useState} from 'react';
import {UI_COPY} from '../i18n/ui-copy';
import {applyTheme,getThemeSlot,THEME_SLOTS} from './theme-registry';
import {getScope} from './scope-registry';

const AUTO_THEME_ID='auto';
const DAY_THEME_ID='theme-7';
const NIGHT_THEME_ID='theme-1';
const THEME_TIME_ZONE='Asia/Taipei';


function taipeiHour(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:THEME_TIME_ZONE,
      hour:'2-digit',
      hourCycle:'h23'
    }).formatToParts(date);
    return Number(parts.find(part=>part.type==='hour')?.value);
  }catch{
    return date.getHours();
  }
}

function automaticThemeId(date=new Date()){
  const hour=taipeiHour(date);
  return hour>=6&&hour<18?DAY_THEME_ID:NIGHT_THEME_ID;
}

function scopeThemePolicy(scopeId='loc'){
  return getScope(String(scopeId||'').trim()).theme||{mode:'auto'};
}

export default function ThemeSelect({scopeId='loc'}){
  const policy=scopeThemePolicy(scopeId);
  const fixedThemeId=policy.mode==='fixed'?policy.themeId:'';
  const [themeId,setThemeId]=useState(AUTO_THEME_ID);
  const [now,setNow]=useState(()=>new Date());
  const effectiveThemeId=fixedThemeId||(themeId===AUTO_THEME_ID?automaticThemeId(now):themeId);
  const slot=useMemo(()=>getThemeSlot(effectiveThemeId),[effectiveThemeId]);

  useEffect(()=>{
    const root=document.documentElement;
    if(root.dataset.themeId===slot.id)return;
    applyTheme(slot);
  },[slot,scopeId]);

  useEffect(()=>{
    if(fixedThemeId||themeId!==AUTO_THEME_ID)return undefined;
    setNow(new Date());
    const timer=window.setInterval(()=>setNow(new Date()),30_000);
    return ()=>window.clearInterval(timer);
  },[fixedThemeId,themeId]);

  useEffect(()=>{
    if(!fixedThemeId)setThemeId(AUTO_THEME_ID);
  },[scopeId,fixedThemeId]);

  if(fixedThemeId)return null;

  return <label className="scope-theme-control">
    <span>{UI_COPY.common.theme}</span>
    <select value={themeId} onChange={event=>setThemeId(event.target.value)} aria-label={UI_COPY.common.theme}>
      <option value={AUTO_THEME_ID}>{UI_COPY.common.autoTheme}</option>
      {THEME_SLOTS.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
