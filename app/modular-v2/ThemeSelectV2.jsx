'use client';

import {useEffect,useMemo,useState} from 'react';
import {applyThemeV2,getThemeSlotV2,THEME_SLOTS_V2} from './theme-registry.v2';

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

export default function ThemeSelectV2(){
  const [themeId,setThemeId]=useState(AUTO_THEME_ID);
  const [now,setNow]=useState(()=>new Date());
  const effectiveThemeId=themeId===AUTO_THEME_ID?automaticThemeId(now):themeId;
  const slot=useMemo(()=>getThemeSlotV2(effectiveThemeId),[effectiveThemeId]);

  useEffect(()=>{
    applyThemeV2(slot);
  },[slot]);

  useEffect(()=>{
    if(themeId!==AUTO_THEME_ID)return undefined;
    const timer=window.setInterval(()=>setNow(new Date()),30_000);
    return ()=>window.clearInterval(timer);
  },[themeId]);

  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={themeId} onChange={event=>setThemeId(event.target.value)} aria-label="主題">
      <option value={AUTO_THEME_ID}>自動（日／夜）</option>
      {THEME_SLOTS_V2.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
