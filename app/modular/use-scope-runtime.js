'use client';

import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {getScope,resolveScope} from './scope-registry';

export function useScopeRuntime(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState(()=>typeof window==='undefined'?'':window.location.hostname);
  useEffect(()=>setHost(window.location.hostname),[]);
  const scopeId=useMemo(()=>resolveScope(host,pathname),[host,pathname]);
  return {scopeId,scope:getScope(scopeId),host,pathname};
}
