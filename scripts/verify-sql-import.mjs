import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Kysely,SqliteDialect} from 'kysely';
import {importPortableSnapshot} from './portable-snapshot-import.mjs';
const native=new DatabaseSync(':memory:');
const compatible={prepare(sql){const stmt=native.prepare(sql);return {reader:/^\\s*(?:select|with|pragma)\\b/i.test(sql),all(p){return stmt.all(...p)},run(p){return stmt.run(...p)}}},close(){native.close()}};
const db=new Kysely({dialect:new SqliteDialect({database:compatible})});
const table='transfer_test';
const manifest=[{table:'silver.'+table,columns:['id','title'],rows:2}];
const load=async()=>[{id:1,title:'First'},{id:2,title:'Second'}];
try{
  await db.schema.createTable(table).addColumn('id','integer',c=>c.primaryKey()).addColumn('title','varchar(50)',c=>c.notNull()).execute();
  const rename={tableName:entry=>entry.table.split('.').at(-1)};
  const result=await importPortableSnapshot(db,manifest,load,rename);
  assert.deepEqual(result,[{table,rows:2}]);
  const contents=await db.selectFrom(table).select(['id','title']).orderBy('id').execute();
  assert.deepEqual(contents.map(x=>({id:x.id,title:x.title})),await load());
  await assert.rejects(()=>importPortableSnapshot(db,manifest,load,rename),/not empty/);
  await db.deleteFrom(table).execute();
  await assert.rejects(()=>importPortableSnapshot(db,manifest,async()=>[{id:3,title:'one'},{id:3,title:'duplicate'}],rename),/UNIQUE|constraint/i);
  assert.equal(Number((await db.selectFrom(table).select(db.fn.countAll().as('n')).executeTakeFirstOrThrow()).n),0,'transaction must roll back on failure');
  await assert.rejects(()=>importPortableSnapshot(db,[{table:'silver.'+table,columns:['id','title'],rows:2}],async()=>[{id:1,title:'a'}],rename),/row count mismatch/);
  await assert.rejects(()=>importPortableSnapshot(db,[{table:'silver.'+table,columns:['id','title'],rows:1}],async()=>[{id:1,title:'a',extra:'bad'}],rename),/Unexpected column/);
  await assert.rejects(()=>importPortableSnapshot(db,[{table:'silver.x;DROP TABLE users',columns:['id'],rows:0}],async()=>[]),/Invalid transfer identifier/);
  console.log('[sql-import] Kysely transactional snapshot import, row integrity, fail-closed and rollback passed');
}finally{await db.destroy()}
