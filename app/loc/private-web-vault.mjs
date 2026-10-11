// Browser-only local record vault for private import rehearsal.
// Never imports Supabase, Neon, fetch or cloud sync. No online encryption is claimed.
const DATABASE_NAME='loc-private-x-archive-v1';
const DATABASE_VERSION=1;
const BATCH=200;
const fail=e=>e?.target?.error||e||new Error('瀏覽器本機資料庫發生錯誤');
export function openPrivateWebVault(){
  if(typeof indexedDB==='undefined')return Promise.reject(new Error('瀏覽器未提供 IndexedDB。'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DATABASE_NAME,DATABASE_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains('records')){
        const records=db.createObjectStore('records',{keyPath:'key'});
        records.createIndex('sortAt','sortAt');
      }
      if(!db.objectStoreNames.contains('staging')){
        const stage=db.createObjectStore('staging',{keyPath:'key'});
        stage.createIndex('sessionId','sessionId');
      }
      if(!db.objectStoreNames.contains('imports'))db.createObjectStore('imports',{keyPath:'id'});
    };
    request.onerror=()=>reject(fail(request));
    request.onsuccess=()=>resolve(request.result);
    request.onblocked=()=>reject(new Error('另一分頁正在使用舊版私人匯入資料庫，請關閉該分頁。'));
  });
}
function completed(tx){
  return new Promise((resolve,reject)=>{
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(fail(tx));
    tx.onerror=()=>reject(fail(tx));
  });
}
const requestValue=req=>new Promise((resolve,reject)=>{
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(fail(req));
});
export async function createWebImport(db,name){
  const id=crypto.randomUUID();
  const tx=db.transaction('imports','readwrite');
  tx.objectStore('imports').put({id,name,state:'draft',createdAt:new Date().toISOString(),summary:null});
  await completed(tx);
  return id;
}
export async function stageWebRecords(db,id,records){
  if(!records.length)return;
  const tx=db.transaction('staging','readwrite');
  const target=tx.objectStore('staging');
  for(const record of records)target.put({...record,key:id+'/'+record.key,sessionId:id,recordKey:record.key});
  await completed(tx);
}
export async function setWebImportPreview(db,id,summary){
  const tx=db.transaction('imports','readwrite');
  const store=tx.objectStore('imports');
  const request=store.get(id);
  request.onsuccess=()=>{
    if(!request.result){tx.abort();return;}
    store.put({...request.result,state:'preview',summary});
  };
  await completed(tx);
}
export async function listWebImports(db){
  const tx=db.transaction('imports','readonly');
  const result=await requestValue(tx.objectStore('imports').getAll());
  await completed(tx);
  return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function removeWebDraft(db,id){
  // Never delete previously confirmed global records when cancelling a draft.
  for(;;){
    const count=await new Promise((resolve,reject)=>{
      const tx=db.transaction('staging','readwrite');
      const ix=tx.objectStore('staging').index('sessionId');
      const cursor=ix.openCursor(IDBKeyRange.only(id));
      let deleted=0;
      cursor.onerror=()=>reject(fail(cursor));
      cursor.onsuccess=()=>{
        if(!cursor.result||deleted>=BATCH)return;
        cursor.result.delete();deleted++;cursor.result.continue();
      };
      tx.oncomplete=()=>resolve(deleted);
      tx.onerror=()=>reject(fail(tx));
      tx.onabort=()=>reject(fail(tx));
    });
    if(!count)break;
  }
  const tx=db.transaction('imports','readwrite');
  const importStore=tx.objectStore('imports');
  const request=importStore.get(id);
  request.onsuccess=()=>{if(request.result?.state!=='complete')importStore.delete(id);};
  await completed(tx);
}
export async function confirmWebImport(db,id,onProgress){
  const preview=await requestValue(db.transaction('imports','readonly').objectStore('imports').get(id));
  if(!preview||!['draft','preview'].includes(preview.state))throw new Error('這份匯入不在待確認狀態。');
  let inserted=0,duplicates=0;
  // Each chunk is a transaction: a failed session stays as a draft and can resume.
  for(;;){
    const result=await new Promise((resolve,reject)=>{
      const tx=db.transaction(['staging','records'],'readwrite');
      const stage=tx.objectStore('staging'),records=tx.objectStore('records');
      const cursor=stage.index('sessionId').openCursor(IDBKeyRange.only(id));
      let handled=0,added=0,already=0;
      cursor.onerror=()=>reject(fail(cursor));
      cursor.onsuccess=()=>{
        const row=cursor.result;
        if(!row||handled>=BATCH)return;
        handled++;
        const item=row.value;
        const existing=records.get(item.recordKey);
        existing.onerror=()=>tx.abort();
        existing.onsuccess=()=>{
          if(existing.result)already++;
          else {
            const {sessionId,recordKey,...clean}=item;
            // Main record key is stable across repeated X archive imports.
            records.put({...clean,key:recordKey,sortAt:clean.createdAt||'0000'});
            added++;
          }
          row.delete();
          row.continue();
        };
      };
      tx.oncomplete=()=>resolve({handled,added,already});
      tx.onabort=()=>reject(fail(tx));
      tx.onerror=()=>reject(fail(tx));
    });
    inserted+=result.added;duplicates+=result.already;
    onProgress?.({inserted,duplicates});
    if(!result.handled)break;
  }
  const tx=db.transaction('imports','readwrite');
  const store=tx.objectStore('imports');
  const request=store.get(id);
  request.onsuccess=()=>store.put({...request.result,state:'complete',inserted,duplicates,completedAt:new Date().toISOString()});
  await completed(tx);
  return {inserted,duplicates};
}
export async function queryWebRecords(db,search='',limit=100){
  const term=String(search||'').trim().toLocaleLowerCase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('records','readonly');
    const store=tx.objectStore('records');
    const cursor=store.index('sortAt').openCursor(null,'prev');
    const found=[];let total=0;const years={};
    cursor.onsuccess=()=>{
      const row=cursor.result;
      if(!row)return;
      const item=row.value;
      total++;
      const year=item.createdAt?.slice(0,4)||'日期未知';
      years[year]=(years[year]||0)+1;
      if((!term||item.text.toLocaleLowerCase().includes(term))&&found.length<limit)
        found.push({key:item.key,text:item.text,createdAt:item.createdAt,sourcePath:item.sourcePath,suspectedMojibake:item.suspectedMojibake});
      row.continue();
    };
    cursor.onerror=()=>reject(fail(cursor));
    tx.oncomplete=()=>resolve({total,years,found});
    tx.onerror=()=>reject(fail(tx));
    tx.onabort=()=>reject(fail(tx));
  });
}
export async function deleteWebVault(db){
  db.close();
  return new Promise((resolve,reject)=>{
    const request=indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess=()=>resolve();
    request.onerror=()=>reject(fail(request));
    request.onblocked=()=>reject(new Error('請先關閉其他 LOC 匯入分頁，再清除資料。'));
  });
}
