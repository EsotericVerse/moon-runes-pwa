'use client';
import {useEffect,useMemo,useState} from 'react';
import {applyThemeV2,getThemeSlotV2,THEME_SLOTS_V2} from './theme-registry.v2';

const DEFAULT_THEME_ID='theme-7';

export default function ThemeSelectV2(){
  const [themeId,setThemeId]=useState(DEFAULT_THEME_ID);
  const slot=useMemo(()=>getThemeSlotV2(themeId),[themeId]);
  useEffect(()=>{applyThemeV2(slot)},[slot]);

  return <label className="scope-v2-theme-control">
    <span>主題</span>
    <select value={themeId} onChange={event=>setThemeId(event.target.value)} aria-label="主題">
      {THEME_SLOTS_V2.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
