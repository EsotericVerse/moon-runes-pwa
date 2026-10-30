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
// All source article fields except generated UID and database update clock.
// The date column is derived from createtime, so a time-less row has no
// independent date information to keep when an otherwise equal dated row exists.
const IMPORT_IDENTITY_FIELDS=['title','content','location','place_id','url','source_id',
  'target_id','ref_id','media_link','searchable','statistics_able'];
const fieldValues=record=>IMPORT_IDENTITY_FIELDS.map(field=>
  // Threads titles are generated from content and cannot establish identity.
  field==='title'&&String(record?.site||'').trim().toLowerCase()==='threads'
    ?null:record?.[field]===undefined?null:record[field]);
const importUntimedKey=record=>{
  if(!String(record?.content??'').trim())return null;
  return JSON.stringify(fieldValues(record));
};
const importDuplicateKey=record=>importSecondKey(record?.createtime);
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map(),byUntimed=new Map();
  const datedByContent=new Map();
  let duplicates=0;
  // Reconcile missing-time copies against the complete incoming archive,
  // irrespective of input order, while retaining every distinct dated post.
  for(const row of records){
    if(importSecondKey(row?.createtime)===null)continue;
    const key=importUntimedKey(row);
    if(key&&!datedByContent.has(key))datedByContent.set(key,String(row.uid||'').trim());
  }
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    const key=importDuplicateKey(row);
    const untimedKey=key===null?importUntimedKey(row):null;
    const existing=key?byIdentity.get(key)
      :((untimedKey&&datedByContent.get(untimedKey))||
         (untimedKey&&byUntimed.get(untimedKey)));
    if(existing){
      duplicates++;
      aliases.set(uid,existing);
      continue;
    }
    unique.push(row);
    if(key)byIdentity.set(key,uid);
    if(untimedKey)byUntimed.set(untimedKey,uid);
    aliases.set(uid,uid);
  }
  return {unique,aliases,duplicates};
}

// Reimporting an archive with no source timestamp must not recreate the
// incomplete copies already represented by equal saved posts. Fetch only the
// exact content strings for the current source, never another platform.
export async function matchExistingWithoutCreatedAt(records,{readContents,alreadyMatched=new Map()}={}){
  if(typeof readContents!=='function')throw new Error('缺少無時間文章比對查詢');
  const byContent=new Map();
  for(const record of records||[]){
    if(importSecondKey(record?.createtime)!==null||alreadyMatched.has(record.uid))continue;
    const content=String(record?.content??'');
    if(!content.trim())continue;
    if(!byContent.has(content))byContent.set(content,[]);
    byContent.get(content).push(record);
  }
  const matched=new Map();
  if(!byContent.size)return matched;
  const saved=await readContents([...byContent.keys()]);
  if(!Array.isArray(saved))throw new Error('無時間文章比對資料不完整');
  const byIdentity=new Map();
  for(const article of saved){
    const key=importUntimedKey(article);
    if(!key)continue;
    const prior=byIdentity.get(key);
    if(!prior||(importSecondKey(prior.createtime)===null&&importSecondKey(article.createtime)!==null))
      byIdentity.set(key,article);
  }
  for(const entries of byContent.values())for(const incoming of entries){
    const article=byIdentity.get(importUntimedKey(incoming));
    if(article)matched.set(incoming.uid,article);
  }
  return matched;
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


