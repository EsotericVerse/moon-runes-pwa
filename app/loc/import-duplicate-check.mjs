import {importGeoKey} from './import-geocoordinates.mjs';
import {parseImportCreatedTime} from './import-batch.mjs';

// Prefer platform + native site_id. For archives without an ID, only an
// unambiguous same-platform timestamp AND exact content can identify a reimport.
export function comparableImportText(value){
  return String(value??'').normalize('NFKC')
    .replace(/[\p{P}\p{S}\p{Z}\s\u200B-\u200D\uFEFF\u2060]/gu,'')
    .toLocaleLowerCase('und');
}
const importSourceKey=record=>{
  const site=String(record?.site??'').trim().toLocaleLowerCase('und');
  const id=String(record?.site_id??'').trim();
  return site&&id?JSON.stringify([site,id]):null;
};

const importSite=record=>String(record?.site??'').trim().toLocaleLowerCase('und');
const siteQueryName=record=>{
  const site=importSite(record);
  return {facebook:'Facebook',threads:'Threads',instagram:'Instagram'}[site]||
    String(record?.site??'').trim();
};
const importTimeKey=record=>{
  const site=importSite(record);
  const time=parseImportCreatedTime(record?.createtime);
  return site&&time?JSON.stringify([site,time]):null;
};
const importContentKey=record=>String(record?.content??'').normalize('NFC').trim();

export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map();
  let duplicates=0;
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    const key=importSourceKey(row);
    const prior=key?byIdentity.get(key):null;
    if(prior){
      if(String(prior.row.content??'')!==String(row.content??'')||
          String(prior.row.title??'')!==String(row.title??'')||
          String(prior.row.source_id??'')!==String(row.source_id??''))
        throw Error('同一平台的 site_id 對應不同文章，停止匯入：'+String(row.site)+' / '+String(row.site_id));
      duplicates++;
      aliases.set(uid,prior.uid);
      continue;
    }
    unique.push(row);
    if(key)byIdentity.set(key,{uid,row});
    aliases.set(uid,uid);
  }
  return {unique,aliases,duplicates};
}

// The reader may page by site_id only; the matcher enforces the platform too.
// Both lookup strategies query one source site at a time, never the entire Galaxy.
export async function matchExistingImportBySiteId(records,{readSiteIds,onProgress}={}){
  if(typeof readSiteIds!=='function')throw Error('缺少 site_id 查詢');
  const requested=new Map(),bySite=new Map(),candidates=new Map(),matches=new Map();
  for(const record of records||[]){
    const key=importSourceKey(record);
    if(!key)continue;
    if(requested.has(key))throw Error('同一批匯入存在重複的來源 site_id：'+String(record.site_id));
    requested.set(key,record);
    const site=importSite(record);
    if(!bySite.has(site))bySite.set(site,{name:siteQueryName(record),ids:new Set()});
    bySite.get(site).ids.add(String(record.site_id).trim());
  }
  const total=[...bySite.values()].reduce((n,group)=>n+group.ids.size,0);
  onProgress?.({completed:0,total,matched:0});
  const consumePage=page=>{
    if(!Array.isArray(page))throw Error('site_id 查詢結果無效');
    for(const row of page){
      const key=importSourceKey(row);
      if(!key||!requested.has(key))continue;
      const state=candidates.get(key)||{count:0,only:null};
      state.count++;
      state.only=state.count===1?row:null;
      candidates.set(key,state);
    }
  };
  let completed=0;
  for(const {name,ids} of bySite.values()){
    const values=[...ids];
    const returned=await readSiteIds(name,values,consumePage);
    if(Array.isArray(returned))consumePage(returned);
    else if(returned!==undefined&&returned!==null)
      throw Error('site_id 查詢沒有回傳有效文章');
    completed+=values.length;
    onProgress?.({completed,total,matched:0});
  }
  for(const [key,record] of requested){
    const candidate=candidates.get(key);
    if(candidate?.count>1)
      throw Error('資料庫有多筆相同平台與 site_id，停止匯入以避免覆寫：'+String(record.site)+' / '+String(record.site_id));
    if(candidate?.only)matches.set(String(record.uid),candidate.only);
  }
  onProgress?.({completed:total,total,matched:matches.size});
  return matches;
}

// Missing native IDs: use the source timestamp only to fetch candidates.
// A match requires the same site, exact normalized time and exact article text.
// Ambiguous candidates are left unmatched, never assigned an arbitrary UID.
export async function matchExistingImportBySiteAndTime(records,{readSiteTimes,onProgress}={}){
  if(typeof readSiteTimes!=='function')throw Error('缺少同平台時間查詢');
  const requested=new Map(),bySite=new Map(),candidates=new Map(),matches=new Map();
  for(const record of records||[]){
    if(importSourceKey(record))continue;
    const timeKey=importTimeKey(record),content=importContentKey(record);
    if(!timeKey||!content)continue;
    const key=JSON.stringify([timeKey,content]);
    if(!requested.has(key))requested.set(key,[]);
    requested.get(key).push(record);
    const site=importSite(record);
    if(!bySite.has(site))bySite.set(site,{name:siteQueryName(record),times:new Set()});
    bySite.get(site).times.add(parseImportCreatedTime(record.createtime));
  }
  const total=[...bySite.values()].reduce((n,group)=>n+group.times.size,0);
  onProgress?.({completed:0,total,matched:0});
  const consumePage=page=>{
    if(!Array.isArray(page))throw Error('同平台時間查詢結果無效');
    for(const row of page){
      if(importSourceKey(row))continue; // Never replace a post with a native ID via time.
      const timeKey=importTimeKey(row),content=importContentKey(row);
      if(!timeKey||!content)continue;
      const key=JSON.stringify([timeKey,content]);
      if(!requested.has(key))continue;
      const state=candidates.get(key)||{count:0,only:null};
      state.count++;
      state.only=state.count===1?row:null;
      candidates.set(key,state);
    }
  };
  let completed=0;
  for(const {name,times} of bySite.values()){
    const values=[...times];
    const returned=await readSiteTimes(name,values,consumePage);
    if(Array.isArray(returned))consumePage(returned);
    else if(returned!==undefined&&returned!==null)
      throw Error('同平台時間查詢沒有回傳有效文章');
    completed+=values.length;
    onProgress?.({completed,total,matched:0});
  }
  for(const [key,incoming] of requested){
    const candidate=candidates.get(key);
    if(incoming.length===1&&candidate?.count===1)
      matches.set(String(incoming[0].uid),candidate.only);
  }
  onProgress?.({completed:total,total,matched:matches.size});
  return matches;
}

export function isUnchangedImportBeforeWrite(records,matches,{hasMedia=false}={}){
  if(hasMedia||!Array.isArray(records)||!records.length||!(matches instanceof Map))return false;
  return records.every(record=>{
    const saved=matches.get(record.uid);
    if(!saved)return false;
    const native=importSourceKey(record);
    const sameNative=native&&native===importSourceKey(saved);
    const time=importTimeKey(record);
    const sameFallback=!native&&!importSourceKey(saved)&&time&&time===importTimeKey(saved)&&
      importContentKey(record)===importContentKey(saved);
    if(!sameNative&&!sameFallback)return false;
    if(record.source_id&&!saved.source_id)return false;
    if(record.target_id?.some(id=>!(saved.target_id||[]).includes(id)))return false;
    if(String(saved.title||'')!==String(record.title||'')||
       String(saved.content||'')!==String(record.content||''))return false;
    const incomingUrl=String(record.url||'').trim();
    if(incomingUrl&&incomingUrl!==String(saved.url||'').trim())return false;
    if(!String(saved.place_id||'').trim()&&importGeoKey(record.__importCoordinates))return false;
    return true;
  });
}

function isUidPrimaryKeyConflict(error){
  const message=String(error?.message||error||'');
  return /(?:23505|duplicate key|unique constraint|UNIQUE constraint failed)/i.test(message)
    &&/(?:_pkey|PRIMARY KEY|\.uid|uid[^a-z])/i.test(message);
}
// Bisect only real primary-key conflicts. Never turn an unrelated SQL error
// into a silent success. Batch commits stay bounded by the database gateway.
export async function insertImportBatches(records,{writeBatch,batchSize=200,onProgress}={}){
  if(!Array.isArray(records)||typeof writeBatch!=='function')throw Error('無效匯入批次');
  if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>10000)throw Error('無效批次大小');
  let completed=0,inserted=0,conflicts=0;
  const insertedUids=new Set(),conflictedUids=new Set();
  async function write(rows){
    try{
      const result=await writeBatch(rows);
      if(result&&Number.isInteger(result.count)&&result.count!==rows.length)
        throw Error('寫入筆數不符');
      inserted+=rows.length;
      for(const row of rows)insertedUids.add(String(row.uid));
    }catch(error){
      if(!isUidPrimaryKeyConflict(error))throw error;
      if(rows.length===1){conflicts++;conflictedUids.add(String(rows[0].uid));return;}
      const middle=Math.floor(rows.length/2);
      await write(rows.slice(0,middle));
      await write(rows.slice(middle));
    }
  }
  for(let i=0;i<records.length;i+=batchSize){
    const part=records.slice(i,i+batchSize);
    await write(part);
    completed+=part.length;
    onProgress?.({completed,total:records.length,inserted,conflicts});
  }
  return {completed,inserted,conflicts,insertedUids,conflictedUids};
}


