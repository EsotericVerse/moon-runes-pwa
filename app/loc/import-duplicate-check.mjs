// Import identity belongs to the original post, never the generated UID.
// Keep platform boundaries: synchronized Threads/Instagram/Facebook posts are
// distinct even with identical original text and timestamps.
export function comparableImportText(value){
  return String(value??'').normalize('NFKC')
    .replace(/[\p{P}\p{S}\p{Z}\s\u200B-\u200D\uFEFF\u2060]/gu,'')
    .toLocaleLowerCase('und');
}
export function importEpochMs(value){
  if(value===null||value===undefined||value==='')return null;
  const epoch=Date.parse(String(value));
  return Number.isFinite(epoch)?epoch:null;
}
export function importSecond(value){
  const ms=importEpochMs(value);
  return ms===null?null:Math.floor(ms/1000);
}
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
export function importDuplicateKey(record){
  const ms=importEpochMs(record?.createtime);
  return ms===null?null:String(ms);
}
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map(),byUntimed=new Map();
  const datedByContent=new Map();
  let duplicates=0;
  // Reconcile missing-time copies against the complete incoming archive,
  // irrespective of input order, while retaining every distinct dated post.
  for(const row of records){
    if(importEpochMs(row?.createtime)===null)continue;
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
    if(importEpochMs(record?.createtime)!==null||alreadyMatched.has(record.uid))continue;
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
    if(!prior||(importEpochMs(prior.createtime)===null&&importEpochMs(article.createtime)!==null))
      byIdentity.set(key,article);
  }
  for(const entries of byContent.values())for(const incoming of entries){
    const article=byIdentity.get(importUntimedKey(incoming));
    if(article)matched.set(incoming.uid,article);
  }
  return matched;
}

// Exact timestamp equality, without site/source or time ranges.
export async function findExistingImportDuplicates(records,{readTimestamps,batchSize=128}={}){
  if(typeof readTimestamps!=='function')throw new Error('缺少精確時間資料庫比對。');
  const targets=new Map();
  for(const record of records||[]){
    const ms=importEpochMs(record?.createtime);
    if(ms!==null&&!targets.has(ms))targets.set(ms,record.uid);
  }
  const matches=new Map(),times=[...targets.keys()];
  for(let i=0;i<times.length;i+=batchSize){
    const saved=await readTimestamps(times.slice(i,i+batchSize));
    if(!Array.isArray(saved))throw new Error('無法確認資料庫重複比對結果。');
    for(const row of saved){
      const ms=importEpochMs(row.createtime);
      if(ms!==null&&targets.has(ms))matches.set(targets.get(ms),String(row.uid||'').trim());
    }
  }
  return matches;
}

// Match epoch milliseconds as numbers. Multiple saved articles with the same
// exact timestamp need content disambiguation, never arbitrary replacement.
export async function matchExistingImportByCreatedAt(records,{readTimestamps,batchSize=128}={}){
  if(typeof readTimestamps!=='function')throw Error('缺少精確發文時間查詢');
  const grouped=new Map();
  for(const record of records||[]){
    const ms=importEpochMs(record?.createtime);
    if(ms===null)continue;
    if(!grouped.has(ms))grouped.set(ms,[]);
    grouped.get(ms).push(record);
  }
  const matched=new Map(),claimed=new Set(),times=[...grouped.keys()];
  for(let i=0;i<times.length;i+=batchSize){
    const current=times.slice(i,i+batchSize);
    const rows=await readTimestamps(current);
    if(!Array.isArray(rows))throw Error('原始時間查詢沒有回傳有效文章');
    const candidatesByTime=new Map();
    for(const row of rows){
      const ms=importEpochMs(row.createtime);
      if(ms===null||!grouped.has(ms))continue;
      if(!candidatesByTime.has(ms))candidatesByTime.set(ms,[]);
      candidatesByTime.get(ms).push(row);
    }
    for(const ms of current){
      const candidates=(candidatesByTime.get(ms)||[])
        .sort((a,b)=>String(a.uid).localeCompare(String(b.uid),'en'));
      for(const record of grouped.get(ms)){
        const available=candidates.filter(row=>!claimed.has(String(row.uid)));
        const comparable=comparableImportText(record.content);
        const same=available.filter(row=>comparableImportText(row.content)===comparable);
        const chosen=same.length===1?same[0]:(same.length>1?null:(available.length===1?available[0]:null));
        if(chosen){matched.set(record.uid,chosen);claimed.add(String(chosen.uid));}
      }
    }
  }
  return matched;
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


