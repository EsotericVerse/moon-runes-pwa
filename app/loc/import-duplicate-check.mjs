import {importGeoKey} from './import-geocoordinates.mjs';

// Import identity is source site + normalized creation timestamp.
// Native site_id is optional source metadata, not a matching requirement.
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
// An album compares with albums only, an article with articles only.
export const importRowRole=record=>
  String(record?.site_id??'').startsWith('album:')?'album':'article';
const importTimeKey=record=>{
  const site=String(record?.site??'').trim().toLocaleLowerCase('und');
  const date=Date.parse(String(record?.createtime??''));
  return site&&Number.isFinite(date)?
    JSON.stringify([site,new Date(date).toISOString(),importRowRole(record)]):null;
};
// Keep separate source rows even when they share a timestamp; an exact UID
// repeated in the same file is the only safe input-level duplicate.
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byUid=new Map(),byContentTime=new Map();
  let duplicates=0;
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    if(!uid)throw Error('匯入文章缺少 UID');
    const prior=byUid.get(uid);
    if(prior){
      if(String(prior.site||'').trim().toLocaleLowerCase('und')!==
          String(row.site||'').trim().toLocaleLowerCase('und')||
          importTimeKey(prior)!==importTimeKey(row)||
          String(prior.content??'')!==String(row.content??'')||
          String(prior.title??'')!==String(row.title??'')||
          String(prior.site_id??'')!==String(row.site_id??''))
        throw Error('相同 UID 對應不同來源文章，停止匯入：'+uid);
      duplicates++;aliases.set(uid,uid);continue;
    }
    byUid.set(uid,row);
    // For posts with no genuine platform ID, same site + instant + cleaned
    // content is the user's duplicate rule. Distinct native IDs remain distinct.
    const time=importTimeKey(row),text=comparableImportText(row.content);
    const semantic=!importSourceKey(row)&&time&&text?JSON.stringify([time,text]):null;
    const seen=semantic?byContentTime.get(semantic):null;
    if(seen){duplicates++;aliases.set(uid,seen);continue;}
    if(semantic)byContentTime.set(semantic,uid);
    unique.push(row);aliases.set(uid,uid);
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

// Scope to the exact source site before querying timestamps. Neither content
// nor optional site_id participates in duplicate detection.
export async function matchExistingImportByCreatedAt(records,{readTimestamps,onProgress}={}){
  if(typeof readTimestamps!=='function')throw Error('缺少 createtime 查詢');
  const requested=new Map(),groups=new Map();
  for(const record of records||[]){
    const key=importTimeKey(record);
    if(!key)continue;
    if(!requested.has(key))requested.set(key,[]);
    requested.get(key).push(record);
    const site=String(record.site).trim();
    if(!groups.has(site))groups.set(site,new Set());
    groups.get(site).add(new Date(Date.parse(record.createtime)).toISOString());
  }
  const total=[...groups.values()].reduce((sum,times)=>sum+times.size,0);
  const matches=new Map(),candidates=new Map(),ambiguous=[];
  onProgress?.({completed:0,total,matched:0});
  if(!total)return matches;
  const consumePage=page=>{
    if(!Array.isArray(page))throw Error('createtime 查詢結果無效');
    for(const row of page){
      const key=importTimeKey(row);
      if(!key||!requested.has(key))continue;
      if(!candidates.has(key))candidates.set(key,new Map());
      candidates.get(key).set(String(row.uid),row);
    }
  };
  let base=0;
  for(const [site,times] of groups){
    const report=done=>onProgress?.({completed:Math.min(total,base+done),
      total,matched:candidates.size});
    const returned=await readTimestamps([...times],consumePage,site,report);
    base+=times.size;
    if(Array.isArray(returned))consumePage(returned);
    else if(returned!==undefined&&returned!==null)
      throw Error('createtime 查詢沒有回傳有效文章');
  }
  for(const [key,recordsAtTime] of requested){
    const saved=[...(candidates.get(key)?.values()||[])];
    if(!saved.length)continue;
    const used=new Set(),unresolved=[];
    const eligible=(record,rows)=>rows.filter(row=>{
      if(used.has(String(row.uid)))return false;
      const incomingId=String(record.site_id||'').trim();
      const storedId=String(row.site_id||'').trim();
      // Two different genuine platform IDs are different posts.
      return !incomingId||!storedId||incomingId===storedId;
    });
    const assign=(record,row)=>{
      matches.set(String(record.uid),row);used.add(String(row.uid));
    };
    // A source identifier is definitive even when multiple posts share time.
    for(const record of recordsAtTime){
      const id=String(record.site_id||'').trim();
      const equal=id?saved.filter(row=>!used.has(String(row.uid))&&
        String(row.site_id||'').trim()===id):[];
      if(equal.length===1)assign(record,equal[0]);
      else if(equal.length>1)ambiguous.push({uid:String(record.uid),site:record.site,createtime:record.createtime});
      else unresolved.push(record);
    }
    for(const record of unresolved){
      const sameContent=eligible(record,saved).filter(row=>
        comparableImportText(row.content)===comparableImportText(record.content));
      if(sameContent.length===1){assign(record,sameContent[0]);continue;}
      if(sameContent.length>1){
        ambiguous.push({uid:String(record.uid),site:record.site,createtime:record.createtime});
        continue;
      }
      // A single timestamp on each side also supports an edited article.
      // Never guess when several different posts share the timestamp.
      const options=eligible(record,saved);
      if(recordsAtTime.length===1&&saved.length===1&&options.length===1)
        assign(record,options[0]);
      // No matching saved content: this is a distinct post, not a reason
      // to silently drop it from a bulk import.
    }
  }
  onProgress?.({completed:total,total,matched:matches.size});
  matches.ambiguous=ambiguous;
  return matches;
}

const importIsoTime=value=>{
  const date=Date.parse(String(value??''));
  return Number.isFinite(date)?new Date(date).toISOString():null;
};
// The comparison pool is one site's saved rows inside the incoming time span.
// Requested timestamps are sorted and cut into disjoint windows, so a saved row
// is scanned at most once. A window reads only uid + createtime; full rows are
// read by UID for the timestamps that really matched.
export async function readImportCandidatesByTimeWindows(times,
    {readWindow,readRowsByUid,consumePage,windowSize=5000,onWindowDone}={}){
  if(typeof readWindow!=='function'||typeof readRowsByUid!=='function'||
      typeof consumePage!=='function')throw Error('缺少時間區間查詢');
  if(!Number.isSafeInteger(windowSize)||windowSize<1)throw Error('無效的比對區間大小');
  const sorted=[...new Set((times||[]).map(importIsoTime).filter(Boolean))].sort();
  for(let index=0;index<sorted.length;index+=windowSize){
    const part=sorted.slice(index,index+windowSize);
    const wanted=new Set(part);
    const saved=await readWindow(part[0],part[part.length-1]);
    if(!Array.isArray(saved))throw Error('時間區間查詢結果無效');
    const uids=[];
    for(const row of saved)
      if(wanted.has(importIsoTime(row?.createtime)))uids.push(String(row.uid));
    if(uids.length){
      const full=await readRowsByUid(uids);
      if(!Array.isArray(full))throw Error('UID 查詢結果無效');
      consumePage(full);
    }
    onWindowDone?.(index+part.length);
  }
}

export function isUnchangedImportBeforeWrite(records,matches,{hasMedia=false}={}){
  if(hasMedia||!Array.isArray(records)||!records.length||!(matches instanceof Map))return false;
  return records.every(record=>{
    const saved=matches.get(record.uid);
    if(!saved)return false;
    if(!importTimeKey(record)||importTimeKey(record)!==importTimeKey(saved))return false;
    if(String(saved.title||'')!==String(record.title||'')||
       String(saved.content||'')!==String(record.content||''))return false;
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


