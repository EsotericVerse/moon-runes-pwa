import {createHash} from 'node:crypto';

// Server-side Kysely data-transfer primitive. No connection strings or provider SDKs.
const identifier=/^[a-z][a-z0-9_]*$/i;
function validName(name){
  if(typeof name!=='string'||!identifier.test(name))throw new Error('Invalid transfer identifier: '+String(name));
  return name;
}
export async function importPortableSnapshot(db,manifest,loadRows,{tableName=entry=>entry.table,batchSize=200}={}){
  if(!Array.isArray(manifest)||!manifest.length)throw new Error('A nonempty snapshot manifest is required');
  if(typeof loadRows!=='function')throw new TypeError('loadRows must be a function');
  if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>500)throw new Error('Invalid batchSize');
  const entries=manifest.map(entry=>{
    const table=String(tableName(entry));
    const parts=table.split('.');
    if(parts.length<1||parts.length>2)throw new Error('Invalid transfer table');
    parts.forEach(validName);
    if(!Array.isArray(entry.columns)||!entry.columns.length)throw new Error('Missing columns: '+table);
    entry.columns.forEach(validName);
    if(new Set(entry.columns).size!==entry.columns.length)throw new Error('Duplicate columns: '+table);
    if(!Number.isSafeInteger(entry.rows)||entry.rows<0)throw new Error('Invalid row count: '+table);
    const primaryKey=entry.primaryKey||[];
    if(!Array.isArray(primaryKey)||primaryKey.some(column=>!entry.columns.includes(column)))throw new Error('Invalid primary key: '+table);
    const dependencies=entry.dependsOn||[];
    if(!Array.isArray(dependencies)||dependencies.some(name=>typeof name!=='string'||name===table))throw new Error('Invalid dependencies: '+table);
    return {entry,table,dependencies};
  });
  if(new Set(entries.map(item=>item.table)).size!==entries.length)throw new Error('Duplicate transfer table');
  const bySourceName=new Map(entries.map(item=>[item.entry.table,item.table]));
  for(const item of entries)item.dependencies=item.dependencies.map(name=>bySourceName.get(name)||name);
  const entryByTable=new Map(entries.map(item=>[item.table,item]));
  for(const item of entries)for(const dependency of item.dependencies){
    if(!entryByTable.has(dependency))throw new Error(`Missing dependency ${dependency} required by ${item.table}`);
  }
  // Import referenced rows before dependent rows. Refuse cyclic FK graphs rather
  // than silently disabling constraints or changing database enforcement.
  const ordered=[];
  const pending=new Set(entries);
  while(pending.size){
    const ready=[...pending].filter(item=>item.dependencies.every(name=>ordered.some(done=>done.table===name)));
    if(!ready.length)throw new Error('Snapshot foreign key dependency cycle detected');
    for(const item of ready){ordered.push(item);pending.delete(item);}
  }
  // Transactional target import: any validation, insert or constraint failure rolls back.
  // Refuse non-empty targets rather than deleting/overwriting existing data.
  return db.transaction().execute(async trx=>{
    // Check all destinations before writing the first row. The surrounding
    // transaction remains the final safeguard against races and later failures.
    for(const {table} of ordered){
      const parts=table.split('.');
      const scope=parts.length===2?trx.withSchema(parts[0]):trx;
      const name=parts.at(-1);
      const existing=await scope.selectFrom(name).select(scope.fn.countAll().as('count')).executeTakeFirstOrThrow();
      if(Number(existing.count)!==0)throw new Error('Target table is not empty: '+table);
    }
    const report=[];
    for(const {entry,table} of ordered){
      const parts=table.split('.');
      const scope=parts.length===2?trx.withSchema(parts[0]):trx;
      const name=parts.at(-1);
      const rows=await loadRows(entry);
      if(!Array.isArray(rows)||rows.length!==entry.rows)throw new Error('Snapshot row count mismatch: '+table);
      if(entry.sha256){
        const digest=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
        if(!/^[a-f0-9]{64}$/i.test(entry.sha256)||digest.toLowerCase()!==entry.sha256.toLowerCase())throw new Error('Snapshot checksum mismatch: '+table);
      }
      const allowed=new Set(entry.columns);
      for(const row of rows){
        if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Invalid row: '+table);
        for(const key of Object.keys(row))if(!allowed.has(key))throw new Error('Unexpected column '+key+' in '+table);
        for(const key of allowed)if(!Object.hasOwn(row,key))throw new Error('Missing column '+key+' in '+table);
      }
      if(entry.primaryKey?.length){
        const seen=new Set();
        for(const row of rows){
          const key=JSON.stringify(entry.primaryKey.map(column=>row[column]));
          if(entry.primaryKey.some(column=>row[column]===null||row[column]===undefined))throw new Error('Null primary key: '+table);
          if(seen.has(key))throw new Error('Duplicate primary key in snapshot: '+table);
          seen.add(key);
        }
      }
      for(let i=0;i<rows.length;i+=batchSize){
        await scope.insertInto(name).values(rows.slice(i,i+batchSize)).execute();
      }
      const result=await scope.selectFrom(name).select(scope.fn.countAll().as('count')).executeTakeFirstOrThrow();
      if(Number(result.count)!==rows.length)throw new Error('Target row count mismatch: '+table);
      report.push({table,rows:rows.length});
    }
    return report;
  });
}

// Incremental, append-only Kysely transfer between independently owned SQL
// engines. No destructive reset, dialect-specific UPSERT or vendor Auth token.
// Resume by the source's exact primary-key value, without case conversion.
export async function syncPortableMissingRows(source,target,{
  schema='silver',table,columns,primaryKey='uid',
  batchSize=200,maxBatches=10,cursor=null,transformRow=row=>row,onProgress=()=>{}
}={}){
  validName(table);
  if(schema!==''&&schema!==null)validName(schema);
  validName(primaryKey);
  if(!Array.isArray(columns)||!columns.length||!columns.includes(primaryKey)||
      new Set(columns).size!==columns.length)throw new Error('Explicit transfer columns must include the primary key');
  columns.forEach(validName);
  if(!Number.isSafeInteger(batchSize)||batchSize<1||batchSize>500)throw new Error('Invalid incremental batchSize');
  if(!Number.isSafeInteger(maxBatches)||maxBatches<1||maxBatches>1000)throw new Error('Invalid maxBatches');
  if(cursor!==null&&(typeof cursor!=='string'||!cursor.length||cursor.length>256))throw new Error('Invalid resume cursor');
  if(typeof transformRow!=='function'||typeof onProgress!=='function')throw new TypeError('Invalid transfer callbacks');
  const relation=(db)=>schema?db.withSchema(schema):db;
  let scanned=0,inserted=0,existing=0,batches=0,complete=false,last=cursor;
  for(;batches<maxBatches;batches++){
    let query=relation(source).selectFrom(table).select(columns).orderBy(primaryKey,'asc').limit(batchSize);
    if(last!==null)query=query.where(primaryKey,'>',last);
    const input=await query.execute();
    if(!Array.isArray(input))throw new Error('Source rows must be an array');
    if(!input.length){complete=true;break;}
    const keys=input.map(row=>row?.[primaryKey]);
    if(keys.some(key=>typeof key!=='string'||!key||key.length>256)||new Set(keys).size!==keys.length)
      throw new Error('Invalid or repeated source primary key');
    const exact=new Set(keys);
    const present=await relation(target).selectFrom(table).select(primaryKey)
      .where(primaryKey,'in',keys).execute();
    if(!Array.isArray(present))throw new Error('Destination key query failed');
    // A case-insensitive collation can report a different UID as a match:
    // this is not a safe substitute for the Base62 primary key.
    for(const row of present)if(!exact.has(row[primaryKey]))
      throw new Error('Target primary-key collation is not case-sensitive');
    const already=new Set(present.map(row=>row[primaryKey]));
    const missing=input.filter(row=>!already.has(row[primaryKey])).map(row=>{
      const mapped=transformRow({...row});
      if(!mapped||typeof mapped!=='object'||Array.isArray(mapped)||
          mapped[primaryKey]!==row[primaryKey])throw new Error('A transfer must preserve the original primary key');
      const allowed=new Set(columns);
      for(const key of Object.keys(mapped))if(!allowed.has(key))throw new Error('Unexpected transfer column '+key);
      return mapped;
    });
    if(missing.length){
      await target.transaction().execute(async trx=>{
        await relation(trx).insertInto(table).values(missing).execute();
      });
    }
    scanned+=input.length;
    existing+=input.length-missing.length;
    inserted+=missing.length;
    last=keys.at(-1);
    onProgress({table,scanned,inserted,existing,batches:batches+1,cursor:last});
    if(input.length<batchSize){complete=true;break;}
  }
  return {table,scanned,inserted,existing,batches,cursor:last,complete};
}

