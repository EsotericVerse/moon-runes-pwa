'use client';

import { clear, del, entries, get, set } from 'idb-keyval';

export async function putLocalRecord(record){
  if(!record?.id)throw new Error('record.id is required');
  await set(record.id,record);
  return record;
}

export function getLocalRecord(id){
  return get(id);
}

export function deleteLocalRecord(id){
  return del(id);
}

export async function getLocalRecords(type){
  const rows=await entries();
  return rows.map(([,value])=>value).filter(value=>!type||value?.type===type);
}

export async function clearLocalRecords(type){
  if(!type)return clear();
  const rows=await entries();
  await Promise.all(rows.filter(([,value])=>value?.type===type).map(([key])=>del(key)));
}

export function downloadJsonFile(data,filename='loc-local-data.json'){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=filename;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

export async function readJsonFile(file){
  if(!file)throw new Error('未選擇檔案');
  return JSON.parse(await file.text());
}
