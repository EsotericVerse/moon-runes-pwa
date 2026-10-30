import {importGeoKey} from './import-geocoordinates.mjs';

// Import identity belongs to the original post, never the generated UID.
// Keep platform boundaries: synchronized Threads/Instagram/Facebook posts are
// distinct even with identical original text and timestamps.
export function comparableImportText(value){
  return String(value??'').normalize('NFKC')
    .replace(/[\p{P}\p{S}\p{Z}\s\u200B-\u200D\uFEFF\u2060]/gu,'')
    .toLocaleLowerCase('und');
}
// Import normalization already provides UTC ISO timestamps.
// Compare the original timestamp at second precision, without epoch conversion.
const importSecondKey=value=>typeof value==='string'&&value.length>=19?value.slice(0,19):null;
// The indexed date is derived from createtime in Asia/Taipei (UTC+8).
// This keeps original timestamps intact and performs no millisecond conversion.
export function importTaipeiDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))
    return null;
  const day=value.slice(0,10),hour=Number(value.slice(11,13));
  if(hour<16)return day;
  let [year,month,date]=day.split('-').map(Number);
  const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  date++;
  if(date>days[month-1]){date=1;month++;if(month>12){month=1;year++;}}
  return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(date).padStart(2,'0');
}
// Only original publishing time can identify a repeated import.
const importDuplicateKey=record=>importSecondKey(record?.createtime);
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map();
  let duplicates=0;
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    const second=importDuplicateKey(row);
    // Same second is a candidate, not proof that two different posts are identical.
    const key=second?JSON.stringify([second,String(row.site||''),String(row.site_id||''),
      String(row.source_id||''),row.source_id?uid:'',String(row.title||''),String(row.content||'')]):null;
    const existing=key?byIdentity.get(key):null;
    if(existing){
      duplicates++;
      aliases.set(uid,existing);
      continue;
    }
    unique.push(row);
    if(key)byIdentity.set(key,uid);
    aliases.set(uid,uid);
  }
  return {unique,aliases,duplicates};
}

// After timestamp matching, exit before writes when every imported article is
// already identical and no location/media follow-up can be required.
export function isUnchangedImportBeforeWrite(records,matches,{hasMedia=false}={}){
  if(hasMedia||!Array.isArray(records)||!records.length||!(matches instanceof Map))return false;
  return records.every(record=>{
    const saved=matches.get(record.uid);
    if(!saved)return false;
    if(record.site_id&&!saved.site_id)return false;
    if(record.source_id&&!saved.source_id)return false;
    if(record.target_id?.some(id=>!(saved.target_id||[]).includes(id)))return false;
    if(String(saved.title||'')!==String(record.title||'')||
       String(saved.content||'')!==String(record.content||''))return false;
    const incomingUrl=String(record.url||'').trim();
    if(incomingUrl&&incomingUrl!==String(saved.url||'').trim())return false;
    // A manually curated Trace anchor may have been added since the last import.
    // Recheck an existing article when the source supplies exact coordinates.
    if(!String(saved.place_id||'').trim()&&importGeoKey(record.__importCoordinates))return false;
    return true;
  });
}

// PostgreSQL performs native TIMESTAMPTZ equality; returned UTC timestamps
// are associated by their existing second component without JS date parsing.
export async function matchExistingImportByCreatedAt(records,{readTimestamps,onProgress}={}){
  if(typeof readTimestamps!=='function')throw Error('缺少精確發文時間查詢');
  const byTime=new Map();
  for(const record of records||[]){
    const key=importSecondKey(record?.createtime);
    if(!key)continue;
    if(!byTime.has(key))byTime.set(key,[]);
    byTime.get(key).push(record);
  }
  const times=[...new Set((records||[]).map(record=>record?.createtime)
    .filter(value=>importSecondKey(value)))];
  const matches=new Map(),claimed=new Set();
  onProgress?.({completed:0,total:times.length,matched:0});
  if(!times.length)return matches;

  // Keep at most one candidate for each requested content/second combination.
  // Unrelated database rows are processed and discarded page by page.
  const state=new Map();
  for(const [key,entries] of byTime){
    state.set(key,{total:0,only:null,exact:new Map(
      entries.map(row=>[String(row.content||''),{count:0,only:null}]))});
  }
  const consumePage=page=>{
    if(!Array.isArray(page))throw Error('發文時間查詢結果無效');
    for(const row of page){
      const entry=state.get(importSecondKey(row.createtime));
      if(!entry)continue;
      entry.total++;
      entry.only=entry.total===1?row:null;
      const exact=entry.exact.get(String(row.content||''));
      if(exact){
        exact.count++;
        exact.only=exact.count===1?row:null;
      }
    }
  };
  const returned=await readTimestamps(times,consumePage);
  if(Array.isArray(returned))consumePage(returned);
  else if(returned!==undefined&&returned!==null)
    throw Error('原始時間查詢沒有回傳有效文章');
  for(const [key,entries] of byTime){
    const group=state.get(key);
    for(const record of entries){
      const exact=group.exact.get(String(record.content||''));
      const candidate=exact?.count===1?exact.only:null;
      if(candidate&&!claimed.has(String(candidate.uid))){
        matches.set(record.uid,candidate);
        claimed.add(String(candidate.uid));
      }
    }
    if(entries.length===1&&group.total===1&&!matches.has(entries[0].uid)
        &&!claimed.has(String(group.only.uid))){
      matches.set(entries[0].uid,group.only);
      claimed.add(String(group.only.uid));
    }
  }
  onProgress?.({completed:times.length,total:times.length,matched:matches.size});
  return matches;
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


