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
import {
  getKvContext,
  getKvDailyRunes,
  getKvEras,
  getKvEvolution,
  getKvStateHealth,
  kvStateConfigured
} from './kv-state';
import { normalizeLocRecord } from './model/record-model';

function normalizeRecordList(records){
  return (Array.isArray(records)?records:[]).map(record=>normalizeLocRecord(record));
}

export const localRecordStorage=Object.freeze({
  id:'indexeddb',
  kind:'local-record-store',
  writable:true,
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
  writable:true,
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

export const kvStateStorage=Object.freeze({
  id:'kv-state',
  kind:'remote-state-store',
  writable:false,
  configured:kvStateConfigured,
  health:getKvStateHealth,
  listDailyRunes:getKvDailyRunes,
  listEras:getKvEras,
  getContext:getKvContext,
  getEvolution:getKvEvolution
});

export const STORAGE_ADAPTERS=Object.freeze({
  indexeddb:localRecordStorage,
  googleDrive:googleDriveStorage,
  kvState:kvStateStorage
});

export function getStorageAdapter(id){
  const key=String(id||'').trim();
  return STORAGE_ADAPTERS[key]||null;
}
