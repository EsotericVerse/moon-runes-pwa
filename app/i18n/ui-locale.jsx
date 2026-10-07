'use client';

import {createContext,useContext,useMemo} from 'react';
import {normalizeUiLocale,uiCopy,UI_LOCALE} from './ui-copy';

const UiLocaleContext=createContext(Object.freeze({
  locale:UI_LOCALE,
  copy:uiCopy(UI_LOCALE)
}));

export function UiLocaleProvider({locale=UI_LOCALE,children}){
  const normalized=normalizeUiLocale(locale);
  const value=useMemo(()=>({locale:normalized,copy:uiCopy(normalized)}),[normalized]);
  return <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>;
}

export function useUiLocale(){
  return useContext(UiLocaleContext);
}

export function useUiCopy(){
  return useUiLocale().copy;
}
