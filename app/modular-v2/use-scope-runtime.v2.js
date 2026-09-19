'use client';

import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {getScopeV2,resolveScopeV2} from './scope-registry.v2';

export function useScopeRuntimeV2(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState(()=>typeof window==='undefined'?'':window.location.hostname);
  useEffect(()=>setHost(window.location.hostname),[]);
  const scopeId=useMemo(()=>resolveScopeV2(host,pathname),[host,pathname]);
  return {scopeId,scope:getScopeV2(scopeId),host,pathname};
}
