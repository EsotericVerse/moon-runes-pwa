'use client';

const DB_NAME='loc-local';
const DB_VERSION=1;
const STORE='records';

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:'id'});
        store.createIndex('type','type',{unique:false});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function requestResult(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export async function putLocalRecord(record){
  const db=await openDb();
  try{
    const tx=db.transaction(STORE,'readwrite');
    await requestResult(tx.objectStore(STORE).put(record));
    return record;
  }finally{db.close();}
}

export async function deleteLocalRecord(id){
  const db=await openDb();
  try{
    const tx=db.transaction(STORE,'readwrite');
    await requestResult(tx.objectStore(STORE).delete(id));
  }finally{db.close();}
}

export async function getLocalRecords(type){
  const db=await openDb();
  try{
    const store=db.transaction(STORE,'readonly').objectStore(STORE);
    if(type)return requestResult(store.index('type').getAll(type));
    return requestResult(store.getAll());
  }finally{db.close();}
}

export async function clearLocalRecords(type){
  const db=await openDb();
  try{
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE);
    if(!type){await requestResult(store.clear());return;}
    const rows=await requestResult(store.index('type').getAllKeys(type));
    await Promise.all(rows.map(id=>requestResult(store.delete(id))));
  }finally{db.close();}
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
