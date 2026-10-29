// Import identity belongs to the original post, never the generated UID.
// Keep platform boundaries: synchronized Threads/Instagram/Facebook posts are
// distinct even with identical original text and timestamps.
export function comparableImportText(value){
  return String(value??'').normalize('NFKC')
    .replace(/[\p{P}\p{S}\p{Z}\s\u200B-\u200D\uFEFF\u2060]/gu,'')
    .toLocaleLowerCase('und');
}
export function importSecond(value){
  if(value===null||value===undefined||value==='')return null;
  const epoch=Date.parse(String(value));
  return Number.isFinite(epoch)?Math.floor(epoch/1000):null;
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
  const site=String(record?.site||'').trim().toLocaleLowerCase('und');
  if(!site||!String(record?.content??'').trim())return null;
  return JSON.stringify([site,...fieldValues(record)]);
};
export function importDuplicateKey(record){
  const second=importSecond(record?.createtime);
  const untimed=importUntimedKey(record);
  if(second===null||!untimed)return null;
  return JSON.stringify([second,untimed,record?.date??null]);
}
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byIdentity=new Map(),byUntimed=new Map();
  const datedByContent=new Map();
  let duplicates=0;
  // Reconcile missing-time copies against the complete incoming archive,
  // irrespective of input order, while retaining every distinct dated post.
  for(const row of records){
    if(importSecond(row?.createtime)===null)continue;
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
  const bySite=new Map();
  for(const record of records||[]){
    if(importSecond(record?.createtime)!==null||alreadyMatched.has(record.uid))continue;
    const site=String(record?.site||'').trim().toLocaleLowerCase('und');
    const content=String(record?.content??'');
    if(!site||!content.trim())continue;
    if(!bySite.has(site))bySite.set(site,new Map());
    const rows=bySite.get(site);
    if(!rows.has(content))rows.set(content,[]);
    rows.get(content).push(record);
  }
  const matched=new Map();
  for(const [site,byContent] of bySite){
    const saved=await readContents(site,[...byContent.keys()]);
    if(!Array.isArray(saved))throw new Error('無時間文章比對資料不完整');
    const byIdentity=new Map();
    for(const article of saved){
      if(String(article?.site||'').trim().toLocaleLowerCase('und')!==site)continue;
      const key=importUntimedKey(article);
      if(!key)continue;
      // A complete dated copy is preferred; the presence of several dated
      // timestamps does not authorize deleting any of those real posts.
      const prior=byIdentity.get(key);
      if(!prior||(importSecond(prior.createtime)===null&&importSecond(article.createtime)!==null))
        byIdentity.set(key,article);
    }
    for(const entries of byContent.values())for(const incoming of entries){
      const article=byIdentity.get(importUntimedKey(incoming));
      if(article)matched.set(incoming.uid,article);
    }
  }
  return matched;
}

// Query only a batch of exact seconds for one source, never the whole Galaxy.
// The two bound conditions per second include timestamps with milliseconds.
export async function findExistingImportDuplicates(records,{readSeconds,batchSeconds=24}={}){
  if(typeof readSeconds!=='function')throw new Error('缺少同秒數資料庫重複檢查。');
  const targets=new Map(),groups=new Map();
  for(const record of records){
    const key=importDuplicateKey(record);
    if(!key)continue;
    targets.set(key,record.uid);
    const source=String(record.site).trim().toLocaleLowerCase('und');
    const second=importSecond(record.createtime);
    if(!groups.has(source))groups.set(source,new Set());
    groups.get(source).add(second);
  }
  const matches=new Map();
  for(const [source,seconds] of groups){
    const values=[...seconds];
    for(let i=0;i<values.length;i+=batchSeconds){
      const rows=await readSeconds(source,values.slice(i,i+batchSeconds));
      if(!Array.isArray(rows))throw new Error('無法確認資料庫重複比對結果。');
      for(const row of rows){
        const key=importDuplicateKey(row);
        if(key&&targets.has(key))matches.set(targets.get(key),String(row.uid||'').trim());
      }
    }
  }
  return matches;
}

// Source timestamp is the import identity. A newly generated Galaxy uid never
// participates in the lookup. A missing timestamp simply has no match.
export async function matchExistingImportByCreatedAt(records,{readSeconds,batchSeconds=24}={}){
  if(typeof readSeconds!=='function')throw Error('缺少原始發文時間查詢');
  const bySource=new Map();
  for(const record of records){
    const second=importSecond(record?.createtime);
    const source=String(record?.site||'').trim().toLowerCase();
    if(second===null||!source)continue;
    if(!bySource.has(source))bySource.set(source,new Map());
    const group=bySource.get(source);
    if(!group.has(second))group.set(second,[]);
    group.get(second).push(record);
  }
  const matches=new Map(),claimed=new Set();
  for(const [source,seconds] of bySource){
    const keys=[...seconds.keys()];
    for(let i=0;i<keys.length;i+=batchSeconds){
      const current=keys.slice(i,i+batchSeconds);
      const rows=await readSeconds(source,current);
      if(!Array.isArray(rows))throw Error('原始時間查詢沒有回傳有效文章');
      for(const second of current){
        const candidates=rows.filter(row=>importSecond(row.createtime)===second&&
          String(row.site||'').trim().toLowerCase()===source)
          .sort((a,b)=>String(a.uid).localeCompare(String(b.uid),'en'));
        for(const record of seconds.get(second)){
          const available=candidates.filter(row=>!claimed.has(String(row.uid)));
          const exact=available.filter(row=>Date.parse(row.createtime)===Date.parse(record.createtime));
          const pool=exact.length?exact:available;
          const comparable=comparableImportText(record.content);
          const same=pool.filter(row=>comparableImportText(row.content)===comparable);
          const chosen=same[0]||(pool.length===1?pool[0]:null);
          if(chosen){matches.set(record.uid,chosen);claimed.add(String(chosen.uid));}
        }
      }
    }
  }
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

// A historic Galaxy row may lack its publishing site. Backfill it only when
// BOTH the source timestamp (second) and normalized body identify exactly one
// such row. A timestamp alone cannot assign a platform to an unrelated post.
export function matchMissingSiteImports(records,missingSiteRows,alreadyMatched=new Map()){
  const assigned=new Set([...alreadyMatched.values()].map(row=>String(row.uid)));
  const bySecond=new Map();
  for(const row of missingSiteRows||[]){
    if(String(row.site||'').trim()||!String(row.uid||'').trim())continue;
    const second=importSecond(row.createtime);
    if(second===null)continue;
    if(!bySecond.has(second))bySecond.set(second,[]);
    bySecond.get(second).push(row);
  }
  const matched=new Map();
  for(const record of records||[]){
    if(alreadyMatched.has(record.uid)||!String(record.site||'').trim())continue;
    const second=importSecond(record.createtime);
    const comparable=comparableImportText(record.content);
    if(second===null||!comparable)continue;
    const candidates=(bySecond.get(second)||[]).filter(row=>
      !assigned.has(String(row.uid))&&comparableImportText(row.content)===comparable);
    if(candidates.length!==1)continue;
    matched.set(record.uid,candidates[0]);
    assigned.add(String(candidates[0].uid));
  }
  return matched;
}
