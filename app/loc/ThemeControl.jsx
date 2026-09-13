'use client';

import { useEffect, useState } from 'react';

function applyTheme(theme){
  const root=document.documentElement;
  if(theme==='light'||theme==='dark')root.dataset.theme=theme;
  else delete root.dataset.theme;
}

export default function ThemeControl(){
  const [theme,setTheme]=useState('system');

  useEffect(()=>{
    const saved=window.localStorage.getItem('loc-theme');
    const next=saved==='light'||saved==='dark'?saved:'system';
    setTheme(next);
    applyTheme(next);
  },[]);

  function changeTheme(event){
    const next=event.target.value;
    setTheme(next);
    if(next==='system')window.localStorage.removeItem('loc-theme');
    else window.localStorage.setItem('loc-theme',next);
    applyTheme(next);
  }

  return <label className="loc-theme-control">顯示
    <select value={theme} onChange={changeTheme} aria-label="顯示模式">
      <option value="system">自動</option>
      <option value="light">白天</option>
      <option value="dark">夜晚</option>
    </select>
  </label>;
}
