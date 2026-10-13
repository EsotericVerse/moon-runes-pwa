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
