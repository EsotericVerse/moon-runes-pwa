'use client';

import {useEffect,useMemo,useState} from 'react';
import {UI_COPY} from '../i18n/ui-copy';
import {applyThemeV2,getThemeSlotV2,THEME_SLOTS_V2} from './theme-registry.v2';

const AUTO_THEME_ID='auto';
const DAY_THEME_ID='theme-7';
const NIGHT_THEME_ID='theme-1';
const AUTHOR_THEME_ID='theme-2';
const LUNARUNES_THEME_ID='theme-5';
const THEME_TIME_ZONE='Asia/Taipei';

const SCOPE_THEME_POLICY=Object.freeze({
  loc:Object.freeze({mode:'auto'}),
  lo3rwang:Object.freeze({mode:'fixed',themeId:AUTHOR_THEME_ID}),
  lunarunes:Object.freeze({mode:'fixed',themeId:LUNARUNES_THEME_ID})
});

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
  return SCOPE_THEME_POLICY[String(scopeId||'').trim()]||SCOPE_THEME_POLICY.loc;
}

export default function ThemeSelectV2({scopeId='loc',themeOverrides=null}){
  const policy=scopeThemePolicy(scopeId);
  const fixedThemeId=policy.mode==='fixed'?policy.themeId:'';
  const [themeId,setThemeId]=useState(AUTO_THEME_ID);
  const [now,setNow]=useState(()=>new Date());
  const effectiveThemeId=fixedThemeId||(themeId===AUTO_THEME_ID?automaticThemeId(now):themeId);
  const slot=useMemo(()=>getThemeSlotV2(effectiveThemeId,themeOverrides),[effectiveThemeId,themeOverrides]);

  useEffect(()=>{
    const root=document.documentElement;
    if(!themeOverrides&&root.dataset.themeId===slot.id)return;
    applyThemeV2(slot);
  },[slot,scopeId,themeOverrides]);

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

  return <label className="scope-v2-theme-control">
    <span>{UI_COPY.common.theme}</span>
    <select value={themeId} onChange={event=>setThemeId(event.target.value)} aria-label={UI_COPY.common.theme}>
      <option value={AUTO_THEME_ID}>{UI_COPY.common.autoTheme}</option>
      {THEME_SLOTS_V2.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
