'use client';

import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {getScope,isKnownScope,normalizeScopeId,resolveScope} from './scope-registry';
import {selectScopeConfig,selectScopeRegistryEntry} from '../loc/scope-data';

const registryCache=new Map();
const configCache=new Map();

function genericRouteScope(pathname,search){
  const path=String(pathname||'/');
  if(!(path==='/scope'||path.startsWith('/scope/')))return '';
  const params=new URLSearchParams(String(search||'').replace(/^\?/,''));
  return normalizeScopeId(params.get('scope'));
}

export function useScopeRuntime(){
  const pathname=usePathname()||'/';
  const genericShell=pathname==='/scope'||pathname.startsWith('/scope/');
  const [location,setLocation]=useState({host:'',search:'',mounted:false});

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
  const cached=scopeId?registryCache.get(scopeId):null;
  const [registryRow,setRegistryRow]=useState(cached||null);
  const [registryResolved,setRegistryResolved]=useState(!dynamic||(Boolean(scopeId)&&registryCache.has(scopeId)));
  const [registryError,setRegistryError]=useState('');

  useEffect(()=>{
    let active=true;
    // Every Scope, including built-ins, reads the canonical Registry display_name.
    if(!location.mounted){
      if(dynamic)setRegistryResolved(false);
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
    setRegistryRow(null);
    setRegistryResolved(!dynamic);
    setRegistryError('');
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
  const configEnabled=Boolean(
    scopeId&&scopeId!=='admin'&&!base.aggregateChildren&&(!dynamic||registryRow?.scope_kind==='scope')
  );
  const [configRow,setConfigRow]=useState(()=>configEnabled?(configCache.get(scopeId)||null):null);

  useEffect(()=>{
    let active=true;
    if(!configEnabled){
      setConfigRow(null);
      return()=>{active=false};
    }
    if(configCache.has(scopeId)){
      setConfigRow(configCache.get(scopeId));
      return()=>{active=false};
    }
    selectScopeConfig(scopeId).then(row=>{
      if(!active)return;
      configCache.set(scopeId,row||null);
      setConfigRow(row||null);
    }).catch(()=>{
      if(!active)return;
      setConfigRow(null);
    });
    return()=>{active=false};
  },[scopeId,configEnabled]);

  const structural=registryRow?{
    ...base,
    label:registryRow.display_name||scopeId,
    searchTitle:registryRow.display_name||scopeId,
    aggregateChildren:registryRow.scope_kind==='group',
    registry:registryRow
  }:base;
  const scope=configRow?{
    ...structural,
    label:String(configRow.display_name||structural.label||scopeId).trim(),
    searchTitle:String(configRow.display_name||structural.searchTitle||structural.label||scopeId).trim(),
    searchAliases:Array.isArray(configRow.search_aliases)?configRow.search_aliases:structural.searchAliases,
    searchIntro:String(configRow.search_intro||'').trim(),
    config:configRow
  }:structural;

  return {
    scopeId,scope,
    host:location.host,pathname,
    dynamic,registryRow,registryResolved,registryError,
    configRow
  };
}
