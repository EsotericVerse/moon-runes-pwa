'use client';

import {getNeonSession} from './neon-client';

const RECORDS_KEY='loc:user-records';
const SETTINGS_KEY='loc:user-settings';

async function requireUserEmail(){
  const session=await getNeonSession();
  const email=String(session?.user?.email||'').trim().toLowerCase();
  if(!email)throw new Error('請先登入 Neon 帳號');
  return email;
}

function readStore(key,email){
  if(typeof window==='undefined')return {};
  try{return JSON.parse(window.localStorage.getItem(key+':'+email)||'{}')||{}}
  catch{return {}}
}
function writeStore(key,email,value){
  if(typeof window==='undefined')return;
  window.localStorage.setItem(key+':'+email,JSON.stringify(value||{}));
}
function normalizeRecord(record={}){
  return {
    ...record,
    id:String(record.id||'').trim(),
    type:String(record.type||record.record_type||'record').trim(),
    updated_at:new Date().toISOString(),
    created_at:record.created_at||new Date().toISOString()
  };
}

export async function listNeonRecords(type=''){
  const email=await requireUserEmail();
  return Object.values(readStore(RECORDS_KEY,email))
    .filter(row=>!type||row.type===type)
    .sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
}
export async function getNeonRecord(id){
  const email=await requireUserEmail();
  return readStore(RECORDS_KEY,email)[String(id)]||null;
}
export async function putNeonRecord(record){
  const email=await requireUserEmail();
  const row=normalizeRecord(record);
  if(!row.id)throw new Error('record.id is required');
  const store=readStore(RECORDS_KEY,email);
  store[row.id]=row;
  writeStore(RECORDS_KEY,email,store);
  return row;
}
export async function deleteNeonRecord(id){
  const email=await requireUserEmail();
  const store=readStore(RECORDS_KEY,email);
  delete store[String(id)];
  writeStore(RECORDS_KEY,email,store);
}
export async function clearNeonRecords(type=''){
  const email=await requireUserEmail();
  if(!type){writeStore(RECORDS_KEY,email,{});return;}
  const store=readStore(RECORDS_KEY,email);
  for(const [id,row] of Object.entries(store))if(row?.type===type)delete store[id];
  writeStore(RECORDS_KEY,email,store);
}
export async function getNeonSetting(key){
  const email=await requireUserEmail();
  return readStore(SETTINGS_KEY,email)[String(key)]??null;
}
export async function putNeonSetting(key,payload){
  const email=await requireUserEmail();
  const store=readStore(SETTINGS_KEY,email);
  store[String(key)]=payload;
  writeStore(SETTINGS_KEY,email,store);
  return payload;
}
export async function deleteNeonSetting(key){
  const email=await requireUserEmail();
  const store=readStore(SETTINGS_KEY,email);
  delete store[String(key)];
  writeStore(SETTINGS_KEY,email,store);
}
