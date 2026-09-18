'use client';

import { useEffect } from 'react';
import { useNeonSetting } from './loc/use-neon-setting';

const STORAGE_KEY='loc-theme';

function themeForMode(mode){
  if(mode==='light'||mode==='dark') return mode;
  const hour=new Date().getHours();
  return hour>=6&&hour<18?'light':'dark';
}

function applyTheme(mode){
  document.documentElement.dataset.theme=themeForMode(mode);
}

export default function ThemeSelect(){
  const {value:mode,setValue:setMode}=useNeonSetting(STORAGE_KEY,'auto');
  const safeMode=['auto','light','dark'].includes(mode)?mode:'auto';

  useEffect(()=>{applyTheme(safeMode)},[safeMode]);
  useEffect(()=>{
    if(safeMode!=='auto')return undefined;
    const timer=window.setInterval(()=>applyTheme('auto'),60000);
    return()=>window.clearInterval(timer);
  },[safeMode]);

  return <label className="loc-theme-control">
    <span>主題</span>
    <select value={safeMode} onChange={event=>setMode(event.target.value)} aria-label="主題">
      <option value="auto">隨時間</option>
      <option value="light">永日</option>
      <option value="dark">永夜</option>
    </select>
  </label>;
}
