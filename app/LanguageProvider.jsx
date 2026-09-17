'use client';

import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {DEFAULT_LOCALE,LANGUAGE_DEFAULT_KEY,LANGUAGE_USER_KEY,normalizeLocale} from './language-registry';

const LanguageContext=createContext({locale:DEFAULT_LOCALE,setLocale:()=>{},toggleLocale:()=>{}});

export function LanguageProvider({children}){
  const [locale,setLocale]=useState(DEFAULT_LOCALE);

  useEffect(()=>{
    const saved=window.localStorage.getItem(LANGUAGE_USER_KEY);
    const governedDefault=window.localStorage.getItem(LANGUAGE_DEFAULT_KEY);
    setLocale(normalizeLocale(saved||governedDefault||DEFAULT_LOCALE));
  },[]);

  useEffect(()=>{
    document.documentElement.lang=locale;
    window.localStorage.setItem(LANGUAGE_USER_KEY,locale);
  },[locale]);

  const value=useMemo(()=>({
    locale,
    setLocale,
    toggleLocale:()=>setLocale(current=>current==='zh-Hant'?'en':'zh-Hant')
  }),[locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){return useContext(LanguageContext)}

export function localize(value,locale=DEFAULT_LOCALE){
  if(value==null)return value;
  if(typeof value==='string'||typeof value==='number')return value;
  if(typeof value==='object'&&!Array.isArray(value)){
    return value[locale]??value['zh-Hant']??value.en??'';
  }
  return value;
}
