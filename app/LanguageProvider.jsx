'use client';

import {createContext,useContext,useEffect,useMemo} from 'react';
import {useNeonSetting} from './loc/use-neon-setting';

const STORAGE_KEY='loc-language';
const LanguageContext=createContext({locale:'zh-Hant',setLocale:()=>{},toggleLocale:()=>{}});

export function LanguageProvider({children}){
  const {value:storedLocale,setValue:setStoredLocale}=useNeonSetting(STORAGE_KEY,'zh-Hant');
  const locale=storedLocale==='en'?'en':'zh-Hant';

  useEffect(()=>{document.documentElement.lang=locale},[locale]);

  const value=useMemo(()=>({
    locale,
    setLocale:next=>setStoredLocale(next==='en'?'en':'zh-Hant'),
    toggleLocale:()=>setStoredLocale(current=>current==='zh-Hant'?'en':'zh-Hant')
  }),[locale,setStoredLocale]);

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
