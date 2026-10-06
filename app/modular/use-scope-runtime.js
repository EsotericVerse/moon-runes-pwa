'use client';

import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {getScope,isKnownScope,normalizeScopeId,resolveScope} from './scope-registry';
import {selectScopeRegistryEntry} from '../loc/scope-data';

const registryCache=new Map();

function genericRouteScope(pathname,search){
  const path=String(pathname||'/');
  if(!(path==='/scope'||path.startsWith('/scope/')))return '';
  const params=new URLSearchParams(String(search||'').replace(/^\?/,''));
  return normalizeScopeId(params.get('scope'));
}

export function useScopeRuntime(){
  const pathname=usePathname()||'/';
  const genericShell=pathname==='/scope'||pathname.startsWith('/scope/');
  const [location,setLocation]=useState(()=>({
    host:typeof window==='undefined'?'':window.location.hostname,
    search:typeof window==='undefined'?'':window.location.search,
    mounted:typeof window!=='undefined'
  }));

  useEffect(()=>{
    const sync=()=>setLocation({
      host:window.location.hostname,
      search:window.location.search,
      mounted:true
    });
    sync();
    window.addEventListener('popstate',sync);
    return()=>window.removeEventListener('popstate',sync);
  },[]);

  const genericId=useMemo(()=>genericRouteScope(pathname,location.search),[pathname,location.search]);
  const scopeId=genericId||(genericShell?'':resolveScope(location.host,pathname));
  const dynamic=Boolean(genericShell&&(!genericId||!isKnownScope(genericId)));
  const cached=dynamic?registryCache.get(scopeId):null;
  const [registryRow,setRegistryRow]=useState(cached||null);
  const [registryResolved,setRegistryResolved]=useState(!dynamic||(Boolean(scopeId)&&registryCache.has(scopeId)));
  const [registryError,setRegistryError]=useState('');

  useEffect(()=>{
    let active=true;
    if(!dynamic){
      setRegistryRow(null);setRegistryResolved(true);setRegistryError('');
      return()=>{active=false};
    }
    if(!location.mounted){
      setRegistryResolved(false);
      return()=>{active=false};
    }
    if(!scopeId){
      setRegistryRow(null);setRegistryResolved(true);setRegistryError('缺少 Scope ID。');
      return()=>{active=false};
    }
    if(registryCache.has(scopeId)){
      setRegistryRow(registryCache.get(scopeId));setRegistryResolved(true);setRegistryError('');
      return()=>{active=false};
    }
    setRegistryResolved(false);setRegistryError('');
    selectScopeRegistryEntry(scopeId).then(row=>{
      if(!active)return;
      registryCache.set(scopeId,row||null);
      setRegistryRow(row||null);setRegistryResolved(true);
    }).catch(error=>{
      if(!active)return;
      setRegistryRow(null);setRegistryResolved(true);setRegistryError(String(error?.message||error||'Scope Registry 讀取失敗'));
    });
    return()=>{active=false};
  },[dynamic,scopeId,location.mounted]);

  const base=getScope(scopeId);
  const scope=registryRow?{
    ...base,
    label:registryRow.display_name||scopeId,
    searchTitle:registryRow.display_name||scopeId,
    aggregateChildren:registryRow.scope_kind==='group',
    registry:registryRow
  }:base;

  return {
    scopeId,scope,
    host:location.host,pathname,
    dynamic,registryRow,registryResolved,registryError
  };
}
