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
// Only original publishing time can identify a repeated import.
const importDuplicateKey=record=>importSecondKey(record?.createtime);
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map();
  let duplicates=0;
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    const key=importDuplicateKey(row);
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
  const times=[...byTime.values()].map(entries=>entries[0].createtime);
  const matches=new Map(),claimed=new Set();
  onProgress?.({completed:0,total:times.length,matched:0});
  if(!times.length)return matches;
  const saved=await readTimestamps(times);
  if(!Array.isArray(saved))throw Error('原始時間查詢沒有回傳有效文章');
  const candidatesByTime=new Map();
  for(const row of saved){
    const key=importSecondKey(row.createtime);
    if(!byTime.has(key))continue;
    if(!candidatesByTime.has(key))candidatesByTime.set(key,[]);
    candidatesByTime.get(key).push(row);
  }
  for(const [key,entries] of byTime){
    const candidates=candidatesByTime.get(key)||[];
    for(const record of entries){
      const available=candidates.filter(row=>!claimed.has(String(row.uid)));
      const same=available.filter(row=>String(row.content||'')===String(record.content||''));
      const chosen=same.length===1?same[0]:(same.length>1?null:(available.length===1?available[0]:null));
      if(chosen){matches.set(record.uid,chosen);claimed.add(String(chosen.uid));}
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
  async function write(rows){
    try{
      const result=await writeBatch(rows);
      if(result&&Number.isInteger(result.count)&&result.count!==rows.length)
        throw Error('寫入筆數不符');
      inserted+=rows.length;
    }catch(error){
      if(!isUidPrimaryKeyConflict(error))throw error;
      if(rows.length===1){conflicts++;return;}
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
  return {completed,inserted,conflicts};
}


