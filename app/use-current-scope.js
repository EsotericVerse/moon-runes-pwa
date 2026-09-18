'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {detectSiteScope,getSiteScope} from './site-registry';

export function useCurrentScope(){
  const pathname=usePathname()||'/';
  const [host,setHost]=useState('');
  useEffect(()=>setHost(window.location.hostname),[]);
  const scope=detectSiteScope(pathname,host);
  return {scope,current:getSiteScope(scope),pathname,host};
}
