'use client';

import { useEffect } from 'react';
import { useNeonSetting } from './use-neon-setting';

function autoTheme(date=new Date()){
  const hour=date.getHours();
  return hour>=6&&hour<18?'light':'dark';
}

function applyTheme(theme){
  document.documentElement.dataset.theme=theme==='light'||theme==='dark'?theme:autoTheme();
}

export default function ThemeControl(){
  const {value:storedTheme,setValue:setTheme}=useNeonSetting('loc-theme','auto');
  const theme=['light','dark'].includes(storedTheme)?storedTheme:'auto';

  useEffect(()=>{
    applyTheme(theme);
    if(theme!=='auto')return;
    const sync=()=>applyTheme('auto');
    const timer=window.setInterval(sync,60_000);
    document.addEventListener('visibilitychange',sync);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
  },[theme]);

  return <label className="loc-theme-control">顯示
    <select value={theme} onChange={event=>setTheme(event.target.value)} aria-label="顯示模式">
      <option value="auto">自動（日夜）</option>
      <option value="light">白天</option>
      <option value="dark">夜晚</option>
    </select>
  </label>;
}
