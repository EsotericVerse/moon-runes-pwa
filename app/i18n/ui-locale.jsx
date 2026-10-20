'use client';

import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {featureSection,isFeatureCopyLoaded,isUiLocaleLoaded,loadFeatureCopy,loadUiLocale,normalizeUiLocale,uiCopy,UI_LOCALE} from './ui-copy';

const UiLocaleContext=createContext(Object.freeze({
  locale:UI_LOCALE,
  copy:uiCopy(UI_LOCALE)
}));

// Fetches the selected language on demand and re-renders once it has arrived.
export function useLoadedUiLocale(locale){
  const normalized=normalizeUiLocale(locale);
  const [ready,setReady]=useState(()=>isUiLocaleLoaded(normalized));
  useEffect(()=>{
    if(isUiLocaleLoaded(normalized)){setReady(true);return undefined;}
    let active=true;
    setReady(false);
    loadUiLocale(normalized).then(()=>{if(active)setReady(true);});
    return ()=>{active=false;};
  },[normalized]);
  return ready||isUiLocaleLoaded(normalized);
}

export function UiLocaleProvider({locale=UI_LOCALE,children}){
  const normalized=normalizeUiLocale(locale);
  const ready=useLoadedUiLocale(normalized);
  const value=useMemo(()=>({locale:normalized,copy:uiCopy(normalized)}),[normalized,ready]);
  return <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>;
}

export function useUiLocale(){
  return useContext(UiLocaleContext);
}

export function useUiCopy(){
  return useUiLocale().copy;
}

// Copy for one lazily loaded feature. `defaults` is that feature's own
// Traditional Chinese section; other languages are fetched on demand.
export function useFeatureCopy(section,defaults){
  const {locale}=useUiLocale();
  const [,refresh]=useState(0);
  useEffect(()=>{
    if(isFeatureCopyLoaded(locale))return undefined;
    let active=true;
    loadFeatureCopy(locale).then(()=>{if(active)refresh(n=>n+1);});
    return ()=>{active=false;};
  },[locale]);
  return featureSection(locale,section,defaults);
}
