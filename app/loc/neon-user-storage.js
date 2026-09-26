'use client';

import {getNeonSession} from './neon-client';

const RECORDS_KEY='loc:user-records';
const SETTINGS_KEY='loc:user-settings';

async function requireUser(){
  const session=await getNeonSession();
  if(!session?.user?.id)throw new Error('請先登入 Neon 帳號');
  return session.user;
}

function readStore(key,userId){
  if(typeof window==='undefined')return {};
  try{return JSON.parse(window.localStorage.getItem(key+':'+userId)||'{}')||{}}
  catch{return {}}
}
function writeStore(key,userId,value){
  if(typeof window==='undefined')return;
  window.localStorage.setItem(key+':'+userId,JSON.stringify(value||{}));
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
  const user=await requireUser();
  return Object.values(readStore(RECORDS_KEY,user.id))
    .filter(row=>!type||row.type===type)
    .sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
}
export async function getNeonRecord(id){
  const user=await requireUser();
  return readStore(RECORDS_KEY,user.id)[String(id)]||null;
}
export async function putNeonRecord(record){
  const user=await requireUser();
  const row=normalizeRecord(record);
  if(!row.id)throw new Error('record.id is required');
  const store=readStore(RECORDS_KEY,user.id);
  store[row.id]=row;
  writeStore(RECORDS_KEY,user.id,store);
  return row;
}
export async function deleteNeonRecord(id){
  const user=await requireUser();
  const store=readStore(RECORDS_KEY,user.id);
  delete store[String(id)];
  writeStore(RECORDS_KEY,user.id,store);
}
export async function clearNeonRecords(type=''){
  const user=await requireUser();
  if(!type){writeStore(RECORDS_KEY,user.id,{});return;}
  const store=readStore(RECORDS_KEY,user.id);
  for(const [id,row] of Object.entries(store))if(row?.type===type)delete store[id];
  writeStore(RECORDS_KEY,user.id,store);
}
export async function getNeonSetting(key){
  const user=await requireUser();
  return readStore(SETTINGS_KEY,user.id)[String(key)]??null;
}
export async function putNeonSetting(key,payload){
  const user=await requireUser();
  const store=readStore(SETTINGS_KEY,user.id);
  store[String(key)]=payload;
  writeStore(SETTINGS_KEY,user.id,store);
  return payload;
}
export async function deleteNeonSetting(key){
  const user=await requireUser();
  const store=readStore(SETTINGS_KEY,user.id);
  delete store[String(key)];
  writeStore(SETTINGS_KEY,user.id,store);
}
