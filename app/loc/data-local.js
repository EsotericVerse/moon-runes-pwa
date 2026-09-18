const DB_NAME='loc-local-data';
const DB_VERSION=1;
const META_STORE='meta';
const SEGMENT_STORE='segments';
const DATA_VERSION_KEY='data-version';

let dbPromise;
function requestToPromise(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted'));});}
function browserReady(){return typeof window!=='undefined'&&typeof indexedDB!=='undefined';}
function openDb(){
  if(!browserReady())return Promise.reject(new Error('IndexedDB is only available in the browser.'));
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result; if(!db.objectStoreNames.contains(META_STORE))db.createObjectStore(META_STORE); if(!db.objectStoreNames.contains(SEGMENT_STORE)){const segments=db.createObjectStore(SEGMENT_STORE,{keyPath:'path'});segments.createIndex('dataset','dataset',{unique:false});segments.createIndex('hash','hash',{unique:false});}};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function readMeta(key){if(!browserReady())return null;const db=await openDb();const tx=db.transaction(META_STORE,'readonly');const value=await requestToPromise(tx.objectStore(META_STORE).get(key));await transactionDone(tx);return value;}
async function writeMeta(key,value){const db=await openDb();const tx=db.transaction(META_STORE,'readwrite');tx.objectStore(META_STORE).put(value,key);await transactionDone(tx);}
export async function getLocalDataVersion(){return readMeta(DATA_VERSION_KEY);}
export async function listLocalDataSegments(){if(!browserReady())return [];const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readonly');const values=await requestToPromise(tx.objectStore(SEGMENT_STORE).getAll());await transactionDone(tx);return values;}
export async function getLocalDataSegment(path){if(!browserReady()||!path)return null;const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readonly');const value=await requestToPromise(tx.objectStore(SEGMENT_STORE).get(path));await transactionDone(tx);return value;}
export async function getFreshLocalDataSegment(path,{hash='',version=''}={}){if(!path)return null;const value=await getLocalDataSegment(path);if(!value)return null;if(hash)return value.hash===hash?value:null;if(version)return value.source_version===version?value:null;return value;}
export async function putLocalDataSegment({path,dataset,hash,bytes,data,source_version=''}){if(!browserReady())return;if(!path)throw new Error('data segment path is required');const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readwrite');tx.objectStore(SEGMENT_STORE).put({path,dataset:dataset||'',hash:hash||'',bytes:Number(bytes||0),source_version:source_version||'',data});await transactionDone(tx);}
export async function deleteLocalDataSegment(path){if(!browserReady()||!path)return;const db=await openDb();const tx=db.transaction(SEGMENT_STORE,'readwrite');tx.objectStore(SEGMENT_STORE).delete(path);await transactionDone(tx);}
export async function commitLocalDataVersion(version,metadata={}){if(!browserReady())return;await writeMeta(DATA_VERSION_KEY,{version,updated_at:new Date().toISOString(),...metadata});}
export async function clearLocalData(){if(!browserReady())return;const db=await openDb();const tx=db.transaction([META_STORE,SEGMENT_STORE],'readwrite');tx.objectStore(META_STORE).clear();tx.objectStore(SEGMENT_STORE).clear();await transactionDone(tx);}
