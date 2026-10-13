import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Kysely, SqliteDialect} from 'kysely';

// Real in-memory execution of the same portable query-builder calls.
// Does not access external services or production databases.
const sqlite=new DatabaseSync(':memory:');
// Kysely's SQLite dialect expects the better-sqlite3 synchronous statement contract.
// Adapt Node's built-in SQLite only inside this isolated test.
const sqliteCompatible={
  prepare(sql){
    const stmt=sqlite.prepare(sql);
    return {
      reader:/^\s*(?:select|with|pragma)\b/i.test(sql),
      all(parameters){return stmt.all(...parameters)},
      run(parameters){return stmt.run(...parameters)}
    };
  },
  close(){sqlite.close()}
};
const db=new Kysely({dialect:new SqliteDialect({database:sqliteCompatible})});
try {
  await db.schema.createTable('loc_portable_probe')
    .addColumn('id','integer',col=>col.primaryKey())
    .addColumn('title','varchar(255)',col=>col.notNull())
    .addColumn('scope_id','varchar(32)',col=>col.notNull())
    .execute();
  await db.schema.createIndex('loc_portable_probe_scope_idx')
    .on('loc_portable_probe').column('scope_id').execute();
  await db.insertInto('loc_portable_probe')
    .values([{id:1,title:'first',scope_id:'testscope'},{id:2,title:'second',scope_id:'otherscope'}])
    .execute();
  const selected=await db.selectFrom('loc_portable_probe').select(['id','title'])
    .where('scope_id','=','testscope').execute();
  assert.deepEqual(selected,[{id:1,title:'first'}]);
  await db.updateTable('loc_portable_probe').set({title:'updated'})
    .where('id','=',1).execute();
  const updated=await db.selectFrom('loc_portable_probe').select('title')
    .where('id','=',1).executeTakeFirstOrThrow();
  assert.equal(updated.title,'updated');
  await db.deleteFrom('loc_portable_probe').where('id','=',2).execute();
  const count=await db.selectFrom('loc_portable_probe')
    .select(db.fn.count('id').as('count')).executeTakeFirstOrThrow();
  assert.equal(count.count,1);
  await assert.rejects(
    ()=>db.insertInto('loc_portable_probe').values({id:3,title:null,scope_id:'testscope'}).execute(),
    /NOT NULL|constraint/i
  );
  console.log('[sql-runtime] SQLite in-memory schema, index, CRUD, filtering and constraint enforcement passed');
} finally {
  await db.destroy();
}
