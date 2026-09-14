'use client';

const DB_NAME='loc-local-data';
const DB_VERSION=1;
const META_STORE='meta';
const SEGMENT_STORE='segments';
const DATA_VERSION_KEY='data-version';

let dbPromise;
function requestToPromise(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted'));});}
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore(META_STORE);const segments=db.createObjectStore(SEGMENT_STORE,{keyPath:'path'});segments.createIndex('dataset','dataset',{unique:false});segments.createIndex('hash','hash',{unique:false});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function readMeta(key){const db=await openDb();const tx=db.transaction(META_STORE,'readonly');const value=await requestToPromise(tx.objectStore(META_STORE).get(key));await transactionDone(tx);return value;}
async function writeMeta(key,value){const db=await openDb();const tx=db.transaction(META_STORE,'readwrite');tx.objectStore(META_STORE).put(value,key);await transactionDone(tx);}
export async function getLocalDataVersion(){return readMeta(DATA_VERSION_KEY);}
export async function listLocalDataSegments(){const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readonly');const values=await requestToPromise(tx.objectStore(SEGMENT_STORE).getAll());await transactionDone(tx);return values;}
export async function getLocalDataSegment(path){const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readonly');const value=await requestToPromise(tx.objectStore(SEGMENT_STORE).get(path));await transactionDone(tx);return value;}
export async function putLocalDataSegment({path,dataset,hash,bytes,data}){if(!path)throw new Error('data segment path is required');const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readwrite');tx.objectStore(SEGMENT_STORE).put({path,dataset:dataset||'',hash:hash||'',bytes:Number(bytes||0),data});await transactionDone(tx);}
export async function deleteLocalDataSegment(path){const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readwrite');tx.objectStore(SEGMENT_STORE).delete(path);await transactionDone(tx);}
export async function commitLocalDataVersion(version,metadata={}){await writeMeta(DATA_VERSION_KEY,{version,updated_at:new Date().toISOString(),...metadata});}
export async function clearLocalData(){const db=await openDb();const tx=db.transaction([META_STORE,SEGMENT_STORE],'readwrite');tx.objectStore(META_STORE).clear();tx.objectStore(SEGMENT_STORE).clear();await transactionDone(tx);}
