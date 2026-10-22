'use client';

import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {featureSection,isFeatureCopyLoaded,isSectionLoaded,isUiLocaleLoaded,loadFeatureCopy,loadSection,loadUiLocale,normalizeUiLocale,subscribeSectionVersion,uiCopy,UI_LOCALE} from './ui-copy';

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

// Bumps whenever any section (search, statistics, uiExtra.editBlocks, …)
// finishes loading anywhere in the tree, so the context value below is
// recomputed and every UiText/FieldText/useUiCopy consumer re-renders with
// the freshly merged dictionary, without each needing its own plumbing.
function useSectionTick(){
  const [tick,setTick]=useState(0);
  useEffect(()=>subscribeSectionVersion(()=>setTick(t=>t+1)),[]);
  return tick;
}

export function UiLocaleProvider({locale=UI_LOCALE,children}){
  const normalized=normalizeUiLocale(locale);
  const ready=useLoadedUiLocale(normalized);
  const sectionTick=useSectionTick();
  const value=useMemo(()=>({locale:normalized,copy:uiCopy(normalized)}),[normalized,ready,sectionTick]);
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

export function useUiSection(path){
  const {locale}=useUiLocale();
  useEffect(()=>{
    if(isSectionLoaded(locale,path))return undefined;
    let active=true;
    loadSection(locale,path).catch(()=>{});
    return ()=>{active=false;};
  },[locale,path]);
}
