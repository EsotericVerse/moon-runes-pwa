'use client';

import { useEffect, useState } from 'react';
import { useLocalStore } from './local-store';

export const LOCALE_STORAGE_KEY='loc-locale-v1';
export const DEFAULT_LOCALE='zh-Hant';
export const SUPPORTED_LOCALES=['zh-Hant','en'];

function applyLocale(locale){
  const next=SUPPORTED_LOCALES.includes(locale)?locale:DEFAULT_LOCALE;
  document.documentElement.lang=next;
}

export default function LocaleControl(){
  const {value:locale,setValue:setLocale}=useLocalStore(LOCALE_STORAGE_KEY,DEFAULT_LOCALE);
  const [active,setActive]=useState(DEFAULT_LOCALE);

  useEffect(()=>{
    const next=SUPPORTED_LOCALES.includes(locale)?locale:DEFAULT_LOCALE;
    setActive(next);
    applyLocale(next);
  },[locale]);

  function changeLocale(event){
    const next=SUPPORTED_LOCALES.includes(event.target.value)?event.target.value:DEFAULT_LOCALE;
    setLocale(next);
    setActive(next);
    applyLocale(next);
  }

  return <label className="loc-theme-control">語系
    <select value={active} onChange={changeLocale} aria-label="語系">
      <option value="zh-Hant">繁體中文</option>
      <option value="en">English</option>
    </select>
  </label>;
}
