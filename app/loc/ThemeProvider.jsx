'use client';

import {createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {useNeonSetting} from './use-neon-setting';
import {applyThemeStyle,FALLBACK_THEME_STYLES,fetchThemeStyles,themeForTime} from './theme-registry';

const ThemeContext=createContext(null);

export function ThemeProvider({children}){
  const {value:storedMode,setValue:setMode}=useNeonSetting('loc-theme','auto');
  const [styles,setStyles]=useState(FALLBACK_THEME_STYLES);
  const [registryError,setRegistryError]=useState('');
  const appliedVars=useRef([]);

  useEffect(()=>{
    let live=true;
    fetchThemeStyles()
      .then(rows=>{if(live){setStyles(rows);setRegistryError('')}})
      .catch(error=>{if(live)setRegistryError(String(error?.message||error))});
    return()=>{live=false};
  },[]);

  const legacyMappedMode=storedMode==='light'?'order':storedMode==='dark'?'soul':storedMode;
  const validKeys=new Set(styles.map(item=>item.style_key));
  const mode=legacyMappedMode==='auto'||validKeys.has(legacyMappedMode)?legacyMappedMode:'auto';

  useEffect(()=>{
    if(storedMode==='light')setMode('order');
    if(storedMode==='dark')setMode('soul');
  },[storedMode,setMode]);
  const active=mode==='auto'
    ? themeForTime(new Date(),styles)
    : (styles.find(item=>item.style_key===mode)||themeForTime(new Date(),styles));

  useEffect(()=>{
    appliedVars.current=applyThemeStyle(active,appliedVars.current);
  },[active?.style_key,active?.legacy_mode,JSON.stringify(active?.css_vars||{})]);

  useEffect(()=>{
    if(mode!=='auto')return undefined;
    const sync=()=>setStyles(current=>[...current]);
    const timer=window.setInterval(sync,60_000);
    document.addEventListener('visibilitychange',sync);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',sync)};
  },[mode]);

  const value=useMemo(()=>({mode,setMode,active,styles,registryError}),[mode,setMode,active,styles,registryError]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(){
  const value=useContext(ThemeContext);
  if(!value)throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
