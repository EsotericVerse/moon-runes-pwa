// Import-only duplicate detection. Never edit or delete existing Galaxy rows.
// Match source + UTC second + article text without punctuation/formatting.
// A record without a reliable timestamp is compared by UID only.
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
export function importDuplicateKey(record){
  const source=String(record?.source_name||'').trim().toLocaleLowerCase('und');
  const second=importSecond(record?.createtime);
  const text=comparableImportText(record?.content);
  if(!source||second===null||!text)return null;
  return JSON.stringify([source,second,text]);
}
export function dedupeIncomingImport(records=[]){
  const unique=[],aliases=new Map(),byUid=new Map(),byTextTime=new Map();
  let duplicates=0;
  for(const row of records){
    const uid=String(row?.uid||'').trim();
    const key=importDuplicateKey(row);
    const match=byUid.get(uid)||(key&&byTextTime.get(key));
    if(match){
      duplicates++;
      aliases.set(uid,match.uid);
      continue;
    }
    unique.push(row);
    byUid.set(uid,row);
    if(key)byTextTime.set(key,row);
    aliases.set(uid,uid);
  }
  return {unique,aliases,duplicates};
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
    const source=String(record.source_name).trim().toLocaleLowerCase('und');
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
