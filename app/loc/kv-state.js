'use client';

import { normalizeDailyRuneRecord } from './model/record-model';

function baseUrl(){
  return String(process.env.NEXT_PUBLIC_LOC_STATE_URL||'').trim().replace(/\/+$/,'');
}

function endpoint(path=''){
  const base=baseUrl();
  if(!base)throw new Error('尚未設定 NEXT_PUBLIC_LOC_STATE_URL');
  return `${base}${path.startsWith('/')?path:`/${path}`}`;
}

export function kvStateConfigured(){
  return Boolean(baseUrl());
}

async function kvGet(path){
  const response=await fetch(endpoint(path),{headers:{Accept:'application/json'},cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.error||`LOC State HTTP ${response.status}`);
  return data;
}

export async function getKvStateHealth(){
  return kvGet('/health');
}

export async function getKvAliases(){
  const data=await kvGet('/aliases');
  return Array.isArray(data?.aliases)?data.aliases:[];
}

export async function getKvGovernanceProjection(){
  const data=await kvGet('/projection/governance');
  return data?.projection||null;
}

export async function getKvDailyRunes(limit=400){
  const safeLimit=Math.max(1,Math.min(1000,Number(limit)||400));
  const data=await kvGet(`/daily-runes?limit=${safeLimit}`);
  return (data?.daily_draws||[]).map(record=>normalizeDailyRuneRecord({...record,source:record?.source||'kv'}));
}

export async function getKvEras(){
  const data=await kvGet('/eras');
  return Array.isArray(data?.eras)?data.eras:[];
}

export async function getKvContext(kind='events'){
  const relationMode=String(kind)==='relations';
  const data=await kvGet(relationMode?'/context?action=relations':'/context');
  return relationMode?(data?.relations||[]):(data?.events||[]);
}

export async function getKvEvolution(kind='all'){
  const key=String(kind||'all');
  const path=key==='runes'?'/evolution/runes':key==='language'?'/evolution/language':key==='shared'?'/evolution/shared':'/evolution';
  return kvGet(path);
}
