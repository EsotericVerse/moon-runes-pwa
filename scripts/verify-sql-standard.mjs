import assert from 'node:assert/strict';
import {Kysely, PostgresDialect, MysqlDialect, MssqlDialect, SqliteDialect, DummyDriver} from 'kysely';

// Compile-only: no credentials, connections, schema changes or live queries.
const dialects=[
  ['postgresql',new PostgresDialect({pool:{}})],
  ['mysql',new MysqlDialect({pool:{}})],
  ['sqlserver',new MssqlDialect({tedious:{},pool:{}})],
  ['sqlite',new SqliteDialect({database:{}})]
];
for(const [name,dialect] of dialects){
  // Use Kysely's real SQL compiler with a non-connecting driver.
  const compileDialect={
    createAdapter:()=>dialect.createAdapter(),
    createDriver:()=>new DummyDriver(),
    createIntrospector:db=>dialect.createIntrospector(db),
    createQueryCompiler:()=>dialect.createQueryCompiler()
  };
  const db=new Kysely({dialect:compileDialect});
  const createTable=db.schema.createTable('loc_portable_probe')
    .addColumn('id','integer',column=>column.primaryKey())
    .addColumn('title','varchar(255)',column=>column.notNull())
    .compile();
  assert.match(createTable.sql,/create table/i,name+': portable table DDL must compile');
  assert.match(createTable.sql,/primary key/i,name+': table must retain primary key');
  assert.match(createTable.sql,/not null/i,name+': table must retain required column');
  const createIndex=db.schema.createIndex('loc_portable_probe_title_idx')
    .on('loc_portable_probe').column('title').compile();
  assert.match(createIndex.sql,/create index/i,name+': portable index DDL must compile');
  const query=db.selectFrom('works').select(['id','title']).where('scope_id','=', 'testscope').limit(10).compile();
  assert.equal(query.parameters.includes('testscope'),true,name+': values must be parameters');
  assert.equal(query.sql.includes('testscope'),false,name+': values must not be interpolated');
  assert.match(query.sql,/select/i,name+': must compile SELECT');
  const insert=db.insertInto('works').values({id:1,title:'sample'}).compile();
  assert.equal(insert.parameters.includes('sample'),true,name+': INSERT values must be parameters');
  const update=db.updateTable('works').set({title:'changed'}).where('id','=',1).compile();
  assert.equal(update.parameters.includes('changed'),true,name+': UPDATE values must be parameters');
  const remove=db.deleteFrom('works').where('id','=',1).compile();
  assert.equal(remove.parameters.includes(1),true,name+': DELETE values must be parameters');
}
console.log('[sql-standard] Kysely schema / index / SELECT / INSERT / UPDATE / DELETE compile across PostgreSQL, MySQL, SQL Server and SQLite; no database executed');
