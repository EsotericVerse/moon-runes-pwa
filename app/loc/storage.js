'use client';

import {
  clearLocalRecords,
  deleteLocalRecord,
  downloadJsonFile,
  getLocalRecord,
  getLocalRecords,
  getLocalRecordsBy,
  importLocalRecord,
  putLocalRecord,
  readJsonFile
} from './local-db';
import {
  authorizeGoogleDrive,
  clearGoogleDriveSession,
  googleDriveConfigured,
  loadJsonFromGoogleDrive,
  saveJsonToGoogleDrive
} from './google-drive';
import { normalizeRecordForStorage } from './model/record-model';

function normalizeRecordList(records){
  return (Array.isArray(records)?records:[]).map(record=>normalizeRecordForStorage(record));
}

function recordTime(record){
  const time=Date.parse(String(record?.updated_at||''));
  return Number.isFinite(time)?time:0;
}

export const localRecordStorage=Object.freeze({
  id:'indexeddb',
  kind:'local-record-store',
  writable:true,
  async put(record){return putLocalRecord(record)},
  async import(record){return importLocalRecord(record)},
  async get(id){return getLocalRecord(id)},
  async list(type){return getLocalRecords(type)},
  async listBy(field,value){return getLocalRecordsBy(field,value)},
  async remove(id){return deleteLocalRecord(id)},
  async clear(type){return clearLocalRecords(type)}
});

export const googleDriveStorage=Object.freeze({
  id:'google-drive',
  kind:'user-owned-snapshot-store',
  writable:true,
  configured:googleDriveConfigured,
  authorize:authorizeGoogleDrive,
  clearSession:clearGoogleDriveSession,
  async saveJson(name,payload){return saveJsonToGoogleDrive(name,payload)},
  async loadJson(name){return loadJsonFromGoogleDrive(name)},
  async saveRecords(name,records,meta={}){
    const payload={
      schema_version:'loc-storage-snapshot-v1',
      exported_at:new Date().toISOString(),
      ...meta,
      records:normalizeRecordList(records)
    };
    return saveJsonToGoogleDrive(name,payload);
  },
  async loadRecords(name){
    const payload=await loadJsonFromGoogleDrive(name);
    const records=Array.isArray(payload)?payload:(payload?.records||[]);
    return {
      ...(Array.isArray(payload)?{}:payload),
      records:normalizeRecordList(records)
    };
  }
});

export const STORAGE_ADAPTERS=Object.freeze({
  indexeddb:localRecordStorage,
  googleDrive:googleDriveStorage
});

export function getStorageAdapter(id){
  const key=String(id||'').trim();
  return STORAGE_ADAPTERS[key]||null;
}

export function exportRecordsJson(data,filename='loc-local-data.json'){
  return downloadJsonFile(data,filename);
}

export function readRecordsJsonFile(file){
  return readJsonFile(file);
}

export async function backupLocalRecordsToGoogleDrive(name='loc-records.json',{type='',meta={}}={}){
  const records=await localRecordStorage.list(type||undefined);
  const result=await googleDriveStorage.saveRecords(name,records,{record_type:type||'all',...meta});
  return {...result,record_count:records.length};
}

export async function mergeGoogleDriveRecordsToLocal(name='loc-records.json'){
  const snapshot=await googleDriveStorage.loadRecords(name);
  let imported=0;
  let skipped=0;
  for(const remote of snapshot.records){
    const local=await localRecordStorage.get(remote.id);
    if(local&&recordTime(local)>=recordTime(remote)){
      skipped+=1;
      continue;
    }
    await localRecordStorage.import(remote);
    imported+=1;
  }
  return {imported,skipped,total:snapshot.records.length,snapshot};
}
