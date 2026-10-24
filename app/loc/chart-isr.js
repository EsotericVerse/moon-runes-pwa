'use client';

import {Capacitor} from '@capacitor/core';

// A failed ISR backend must not prevent the existing public database reader
// from working. Device-local SQLite never leaves the device.
export async function selectPublicChart(scopeId,metric,{
  startDate='',endDate='',includeUndated=false,dimension=''
}={}){
  const scope=String(scopeId||'').trim().toLowerCase();
  if(scope==='local'||Capacitor.isNativePlatform())return null;
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scope))return null;
  const origin=String(process.env.NEXT_PUBLIC_LOC_ISR_ORIGIN||'').trim().replace(/\/+$/,'');
  const base='/api/loc/charts/'+encodeURIComponent(scope)+'/'+encodeURIComponent(metric);
  const query=new URLSearchParams();
  if(startDate)query.set('start',String(startDate).slice(0,10));
  if(endDate)query.set('end',String(endDate).slice(0,10));
  if(includeUndated)query.set('undated','1');
  if(dimension)query.set('dimension',dimension);
  try{
    const response=await fetch((origin||'')+base+(query.size?'?'+query:''),
      {cache:'no-store',credentials:'omit'});
    if(!response.ok)return null;
    return await response.json();
  }catch{return null;}
}
