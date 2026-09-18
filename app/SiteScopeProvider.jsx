'use client';

import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {detectSiteScope,featureRoute,getSiteScope,scopeDataView,scopeOrigin} from './site-registry';

const SiteScopeContext=createContext(null);

export function SiteScopeProvider({children}){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState('');

  useEffect(()=>setHost(window.location.hostname),[]);

  const value=useMemo(()=>{
    const scope=detectSiteScope(pathname,host);
    const current=getSiteScope(scope);
    return {
      scope,
      current,
      host,
      pathname,
      ready:Boolean(host),
      origin:scopeOrigin(scope),
      route:feature=>featureRoute(scope,feature),
      dataView:feature=>scopeDataView(scope,feature)
    };
  },[pathname,host]);

  return <SiteScopeContext.Provider value={value}>{children}</SiteScopeContext.Provider>;
}

export function useSiteScope(){
  const value=useContext(SiteScopeContext);
  if(!value)throw new Error('useSiteScope must be used inside SiteScopeProvider');
  return value;
}
