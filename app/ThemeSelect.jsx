'use client';

import { useEffect, useState } from 'react';

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
  const [mode,setMode]=useState('auto');

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE_KEY);
    const initial=saved==='light'||saved==='dark'||saved==='auto'?saved:'auto';
    setMode(initial);
    applyTheme(initial);
  },[]);

  useEffect(()=>{
    if(mode!=='auto') return undefined;
    const timer=window.setInterval(()=>applyTheme('auto'),60000);
    return ()=>window.clearInterval(timer);
  },[mode]);

  function handleChange(event){
    const next=event.target.value;
    setMode(next);
    localStorage.setItem(STORAGE_KEY,next);
    applyTheme(next);
  }

  return <label className="loc-theme-control">
    <span>主題</span>
    <select value={mode} onChange={handleChange} aria-label="主題">
      <option value="auto">隨時間</option>
      <option value="light">永日</option>
      <option value="dark">永夜</option>
    </select>
  </label>;
}
