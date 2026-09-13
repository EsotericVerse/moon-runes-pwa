'use client';

import { useEffect, useState } from 'react';

function autoTheme(date=new Date()){
  const hour=date.getHours();
  return hour>=6&&hour<18?'light':'dark';
}

function applyTheme(theme){
  document.documentElement.dataset.theme=theme==='light'||theme==='dark'?theme:autoTheme();
}

export default function ThemeControl(){
  const [theme,setTheme]=useState('system');

  useEffect(()=>{
    const saved=window.localStorage.getItem('loc-theme');
    const next=saved==='light'||saved==='dark'?saved:'system';
    setTheme(next);
    applyTheme(next);
    if(next!=='system')return;
    const sync=()=>applyTheme('system');
    const timer=window.setInterval(sync,60_000);
    document.addEventListener('visibilitychange',sync);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
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
      <option value="system">自動（日夜）</option>
      <option value="light">白天</option>
      <option value="dark">夜晚</option>
    </select>
  </label>;
}
