'use client';

import {Capacitor} from '@capacitor/core';
import {locPublicIsrUrl} from './scope-data';

const SCOPE=/^[a-z][a-z0-9]{0,14}$/;

// Private device-local SQLite stays independent; Rune-specific Daily analytics
// never call this generic chart adapter and retain their own data provider.
export function usesNumericIsr(scopeId){
  return SCOPE.test(String(scopeId||''))&&scopeId!=='local'&&scopeId!=='admin'
    &&!Capacitor.isNativePlatform();
}

export async function readNumericIsr(scopeId,kind,{startDate='',endDate='',includeUndated=false,dimension=''}={}){
  if(!usesNumericIsr(scopeId))throw new Error('Numeric ISR is not enabled for this Scope');
  if(!['culture','statistics','facet'].includes(kind))throw new Error('Unsupported numeric ISR kind');
  if(kind==='facet'&&!['media_type','media_platform'].includes(dimension))throw new Error('Unsupported media chart dimension');
  const params=new URLSearchParams();
  if(startDate)params.set('start',String(startDate).slice(0,10));
  if(endDate)params.set('end',String(endDate).slice(0,10));
  if(kind==='culture'&&includeUndated)params.set('undated','1');
  if(kind==='facet')params.set('dimension',dimension);
  const url=locPublicIsrUrl('/api/loc/scopes/'+encodeURIComponent(scopeId)+'/numeric/'+kind)
    +(params.size?'?'+params.toString():'');
  const response=await fetch(url,{cache:'no-store'});
  // A failed ISR request must never silently fan out into uncached public SQL.
  if(!response.ok)throw new Error('Numeric ISR '+kind+' HTTP '+response.status);
  return response.json();
}
