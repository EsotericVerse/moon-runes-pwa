import {importGeoKey} from './import-geocoordinates.mjs';

// Native platform IDs take precedence. ID-less posts match only by site,
// UTC creation time AND exact body; a timestamp alone is never an identity.
export function comparableImportText(value){
  return String(value??'').normalize('NFKC')
    .replace(/[\\p{P}\\p{S}\\p{Z}\\s\\u200B-\\u200D\\uFEFF\\u2060]/gu,'')
    .toLocaleLowerCase('und');
}
const importSourceKey=record=>{
  const site=String(record?.site??'').trim().toLocaleLowerCase('und');
  const id=String(record?.site_id??'').trim();
  return site&&id?JSON.stringify([site,id]):null;
};
const importTimeContentKey=record=>{
  const site=String(record?.site??'').trim().toLocaleLowerCase('und');
  const date=Date.parse(String(record?.createtime??''));
  const body=String(record?.content??'').normalize('NFC').replace(/\\r\\n?/g,'\\n').trim();
  return site&&Number.isFinite(date)&&body?
    JSON.stringify([site,new Date(date).toISOString(),body]):null;
};
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map();
  let duplicates=0;
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    const nativeKey=importSourceKey(row);
    const key=nativeKey||importTimeContentKey(row);
    const prior=key?byIdentity.get(key):null;
    if(prior){
      if(!nativeKey&&prior.uid!==uid)
        throw Error('同平台、同時間、相同內容卻有不同 UID，無法安全辨識為同一篇：'+String(row.site)+' / '+String(row.createtime));
      if(String(prior.row.content??'')!==String(row.content??'')||
          String(prior.row.title??'')!==String(row.title??'')||
          String(prior.row.source_id??'')!==String(row.source_id??''))
        throw Error('同一平台的文章識別對應不同內容，停止匯入：'+String(row.site)+' / '+String(row.site_id||row.createtime));
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

export async function matchExistingImportBySiteId(records,{readSiteIds,onProgress}={}){
  if(typeof readSiteIds!=='function')throw Error('缺少 site_id 查詢');
  const requested=new Map(),groups=new Map();
  for(const record of records||[]){
    const key=importSourceKey(record);
    if(!key)continue;
    if(requested.has(key))throw Error('同一批匯入存在重複的來源 site_id：'+String(record.site_id));
    requested.set(key,record);
    const site=String(record.site).trim();
    if(!groups.has(site))groups.set(site,new Set());
    groups.get(site).add(String(record.site_id).trim());
  }
  const total=[...groups.values()].reduce((sum,ids)=>sum+ids.size,0);
  const matches=new Map(),candidates=new Map();
  onProgress?.({completed:0,total,matched:0});
  if(!total)return matches;
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
  for(const [site,ids] of groups){
    // The third argument allows database readers to add .eq('site', site).
    const returned=await readSiteIds([...ids],consumePage,site);
    if(Array.isArray(returned))consumePage(returned);
    else if(returned!==undefined&&returned!==null)
      throw Error('site_id 查詢沒有回傳有效文章');
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

export async function matchExistingImportByCreatedAt(records,{readTimestamps,onProgress}={}){
  if(typeof readTimestamps!=='function')throw Error('缺少 createtime 查詢');
  const requested=new Map(),groups=new Map();
  for(const record of records||[]){
    if(importSourceKey(record))continue;
    const key=importTimeContentKey(record);
    if(!key)continue;
    if(requested.has(key))
      throw Error('同平台、同時間、相同內容有多筆來源文章，無法安全比對：'+String(record.site)+' / '+String(record.createtime));
    requested.set(key,record);
    const site=String(record.site).trim();
    if(!groups.has(site))groups.set(site,new Set());
    groups.get(site).add(new Date(Date.parse(record.createtime)).toISOString());
  }
  const total=[...groups.values()].reduce((sum,times)=>sum+times.size,0);
  const matches=new Map(),candidates=new Map();
  onProgress?.({completed:0,total,matched:0});
  if(!total)return matches;
  const consumePage=page=>{
    if(!Array.isArray(page))throw Error('createtime 查詢結果無效');
    for(const row of page){
      const key=importTimeContentKey(row);
      if(!key||!requested.has(key))continue;
      const state=candidates.get(key)||{count:0,only:null};
      state.count++;
      state.only=state.count===1?row:null;
      candidates.set(key,state);
    }
  };
  for(const [site,times] of groups){
    const returned=await readTimestamps([...times],consumePage,site);
    if(Array.isArray(returned))consumePage(returned);
    else if(returned!==undefined&&returned!==null)
      throw Error('createtime 查詢沒有回傳有效文章');
  }
  for(const [key,record] of requested){
    const candidate=candidates.get(key);
    if(candidate?.count>1)
      throw Error('同平台、同時間、相同內容在資料庫有多筆，停止匯入避免誤覆寫：'+String(record.site)+' / '+String(record.createtime));
    if(candidate?.only)matches.set(String(record.uid),candidate.only);
  }
  onProgress?.({completed:total,total,matched:matches.size});
  return matches;
}

export function isUnchangedImportBeforeWrite(records,matches,{hasMedia=false}={}){
  if(hasMedia||!Array.isArray(records)||!records.length||!(matches instanceof Map))return false;
  return records.every(record=>{
    const saved=matches.get(record.uid);
    if(!saved)return false;
    const nativeKey=importSourceKey(record);
    const sameIdentity=nativeKey?nativeKey===importSourceKey(saved):
      Boolean(importTimeContentKey(record)&&importTimeContentKey(record)===importTimeContentKey(saved));
    if(!sameIdentity)return false;
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


