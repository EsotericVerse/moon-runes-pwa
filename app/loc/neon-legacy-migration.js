'use client';

import { putNeonRecord, putNeonSetting } from './neon-user-storage';

const MARKER='loc-neon-browser-migration-v1';
const STYLE_KEYS=['loc-style-groups-v1','loc-my-style-v1'];

async function dbExists(name){
  if(typeof indexedDB==='undefined')return false;
  if(typeof indexedDB.databases!=='function')return true;
  const list=await indexedDB.databases();
  return list.some(item=>item.name===name);
}

async function readStore(dbName,storeName){
  if(!(await dbExists(dbName)))return [];
  return new Promise(resolve=>{
    const request=indexedDB.open(dbName);
    request.onerror=()=>resolve([]);
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(storeName)){db.close();resolve([]);return;}
      const tx=db.transaction(storeName,'readonly');
      const getAll=tx.objectStore(storeName).getAll();
      getAll.onerror=()=>{db.close();resolve([]);};
      getAll.onsuccess=()=>{const rows=getAll.result||[];tx.oncomplete=()=>{db.close();resolve(rows)};};
    };
  });
}

async function removeLegacyDatabases(){
  for(const name of ['loc-local-records','keyval-store']){
    if(typeof indexedDB!=='undefined')indexedDB.deleteDatabase(name);
  }
}

export async function migrateLegacyBrowserDataToNeon(){
  if(typeof window==='undefined'||localStorage.getItem(MARKER)==='done')return {migrated:false};
  const rows=[...(await readStore('loc-local-records','records'))];
  for(const value of await readStore('keyval-store','keyval'))if(value&&typeof value==='object')rows.push(value);
  const unique=new Map(rows.filter(row=>row?.id).map(row=>[row.id,row]));
  for(const record of unique.values())await putNeonRecord(record);
  for(const key of STYLE_KEYS){
    const raw=localStorage.getItem(key);
    if(!raw)continue;
    try{await putNeonSetting(key,JSON.parse(raw));localStorage.removeItem(key);}catch{}
  }
  await removeLegacyDatabases();
  localStorage.setItem(MARKER,'done');
  return {migrated:true,records:unique.size};
}
