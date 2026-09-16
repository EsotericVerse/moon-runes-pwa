'use client';

import {createContext,useContext,useEffect,useMemo,useState} from 'react';

const STORAGE_KEY='loc-language';
const LanguageContext=createContext({locale:'zh-Hant',setLocale:()=>{},toggleLocale:()=>{}});

export function LanguageProvider({children}){
  const [locale,setLocale]=useState('zh-Hant');

  useEffect(()=>{
    const saved=window.localStorage.getItem(STORAGE_KEY);
    if(saved==='en'||saved==='zh-Hant')setLocale(saved);
  },[]);

  useEffect(()=>{
    document.documentElement.lang=locale;
    window.localStorage.setItem(STORAGE_KEY,locale);
  },[locale]);

  const value=useMemo(()=>({
    locale,
    setLocale,
    toggleLocale:()=>setLocale(current=>current==='zh-Hant'?'en':'zh-Hant')
  }),[locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){return useContext(LanguageContext)}

export function localize(value,locale='zh-Hant'){
  if(value==null)return value;
  if(typeof value==='string'||typeof value==='number')return value;
  if(typeof value==='object'&&!Array.isArray(value)){
    return value[locale]??value['zh-Hant']??value.en??'';
  }
  return value;
}
