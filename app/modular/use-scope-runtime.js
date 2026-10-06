'use client';

import {useEffect,useMemo,useState} from 'react';
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
  const [location,setLocation]=useState(()=>({
    host:typeof window==='undefined'?'':window.location.hostname,
    pathname:typeof window==='undefined'?'/':window.location.pathname||'/',
    search:typeof window==='undefined'?'':window.location.search
  }));

  useEffect(()=>{
    const sync=()=>setLocation({
      host:window.location.hostname,
      pathname:window.location.pathname||'/',
      search:window.location.search
    });
    sync();
    window.addEventListener('popstate',sync);
    return()=>window.removeEventListener('popstate',sync);
  },[]);

  const genericId=useMemo(()=>genericRouteScope(location.pathname,location.search),[location.pathname,location.search]);
  const scopeId=genericId||resolveScope(location.host,location.pathname);
  const dynamic=Boolean(genericId&&!isKnownScope(genericId));
  const cached=dynamic?registryCache.get(scopeId):null;
  const [registryRow,setRegistryRow]=useState(cached||null);
  const [registryResolved,setRegistryResolved]=useState(!dynamic||registryCache.has(scopeId));
  const [registryError,setRegistryError]=useState('');

  useEffect(()=>{
    let active=true;
    if(!dynamic){
      setRegistryRow(null);setRegistryResolved(true);setRegistryError('');
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
  },[dynamic,scopeId]);

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
    host:location.host,pathname:location.pathname,
    dynamic,registryRow,registryResolved,registryError
  };
}
