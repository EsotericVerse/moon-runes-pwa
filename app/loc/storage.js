'use client';

import {
  clearLocalRecords,
  deleteLocalRecord,
  getLocalRecord,
  getLocalRecords,
  getLocalRecordsBy,
  putLocalRecord
} from './local-db';
import {
  authorizeGoogleDrive,
  clearGoogleDriveSession,
  googleDriveConfigured,
  loadJsonFromGoogleDrive,
  saveJsonToGoogleDrive
} from './google-drive';
import { normalizeLocRecord } from './model/record-model';

function normalizeRecordList(records){
  return (Array.isArray(records)?records:[]).map(record=>normalizeLocRecord(record));
}

export const localRecordStorage=Object.freeze({
  id:'indexeddb',
  kind:'local-record-store',
  async put(record){return putLocalRecord(record)},
  async get(id){return getLocalRecord(id)},
  async list(type){return getLocalRecords(type)},
  async listBy(field,value){return getLocalRecordsBy(field,value)},
  async remove(id){return deleteLocalRecord(id)},
  async clear(type){return clearLocalRecords(type)}
});

export const googleDriveStorage=Object.freeze({
  id:'google-drive',
  kind:'user-owned-snapshot-store',
  configured:googleDriveConfigured,
  authorize:authorizeGoogleDrive,
  clearSession:clearGoogleDriveSession,
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
