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
    return {entry,table};
  });
  if(new Set(entries.map(item=>item.table)).size!==entries.length)throw new Error('Duplicate transfer table');
  // Transactional target import: any validation, insert or constraint failure rolls back.
  // Refuse non-empty targets rather than deleting/overwriting existing data.
  return db.transaction().execute(async trx=>{
    const report=[];
    for(const {entry,table} of entries){
      const parts=table.split('.');
      const scope=parts.length===2?trx.withSchema(parts[0]):trx;
      const name=parts.at(-1);
      const existing=await scope.selectFrom(name).select(scope.fn.countAll().as('count')).executeTakeFirstOrThrow();
      if(Number(existing.count)!==0)throw new Error('Target table is not empty: '+table);
      const rows=await loadRows(entry);
      if(!Array.isArray(rows)||rows.length!==entry.rows)throw new Error('Snapshot row count mismatch: '+table);
      const allowed=new Set(entry.columns);
      for(const row of rows){
        if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Invalid row: '+table);
        for(const key of Object.keys(row))if(!allowed.has(key))throw new Error('Unexpected column '+key+' in '+table);
        for(const key of allowed)if(!Object.hasOwn(row,key))throw new Error('Missing column '+key+' in '+table);
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
