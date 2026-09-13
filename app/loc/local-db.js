'use client';

import { entries as legacyEntries } from 'idb-keyval';

const DB_NAME='loc-local-records';
const DB_VERSION=1;
const RECORD_STORE='records';
const META_STORE='meta';
const LEGACY_MIGRATION_KEY='legacy-idb-keyval-migrated';

let dbPromise;
let migrationPromise;

function requestToPromise(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function transactionDone(transaction){
  return new Promise((resolve,reject)=>{
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error);
    transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted'));
  });
}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      const records=db.createObjectStore(RECORD_STORE,{keyPath:'id'});
      records.createIndex('type','type',{unique:false});
      records.createIndex('date','date',{unique:false});
      records.createIndex('source','source',{unique:false});
      records.createIndex('person','person',{unique:false});
      records.createIndex('family','family',{unique:false});
      db.createObjectStore(META_STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}

async function ensureLegacyMigration(){
  if(migrationPromise)return migrationPromise;
  migrationPromise=(async()=>{
    const db=await openDb();
    const metaTx=db.transaction(META_STORE,'readonly');
    const alreadyMigrated=await requestToPromise(metaTx.objectStore(META_STORE).get(LEGACY_MIGRATION_KEY));
    await transactionDone(metaTx);
    if(alreadyMigrated)return;

    const rows=await legacyEntries();
    const tx=db.transaction([RECORD_STORE,META_STORE],'readwrite');
    const records=tx.objectStore(RECORD_STORE);
    for(const [key,value] of rows){
      if(!value||typeof value!=='object')continue;
      records.put(value.id?value:{...value,id:String(key)});
    }
    tx.objectStore(META_STORE).put(true,LEGACY_MIGRATION_KEY);
    await transactionDone(tx);
  })();
  return migrationPromise;
}

async function recordsStore(mode='readonly'){
  await ensureLegacyMigration();
  const db=await openDb();
  const tx=db.transaction(RECORD_STORE,mode);
  return {tx,store:tx.objectStore(RECORD_STORE)};
}

export async function putLocalRecord(record){
  if(!record?.id)throw new Error('record.id is required');
  const {tx,store}=await recordsStore('readwrite');
  store.put(record);
  await transactionDone(tx);
  return record;
}

export async function getLocalRecord(id){
  const {tx,store}=await recordsStore();
  const value=await requestToPromise(store.get(id));
  await transactionDone(tx);
  return value;
}

export async function deleteLocalRecord(id){
  const {tx,store}=await recordsStore('readwrite');
  store.delete(id);
  await transactionDone(tx);
}

export async function getLocalRecords(type){
  const {tx,store}=await recordsStore();
  const request=type?store.index('type').getAll(type):store.getAll();
  const values=await requestToPromise(request);
  await transactionDone(tx);
  return values;
}

export async function clearLocalRecords(type){
  const {tx,store}=await recordsStore('readwrite');
  if(!type){
    store.clear();
    await transactionDone(tx);
    return;
  }

  const index=store.index('type');
  await new Promise((resolve,reject)=>{
    const request=index.openKeyCursor(IDBKeyRange.only(type));
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor){
        resolve();
        return;
      }
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
  await transactionDone(tx);
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
