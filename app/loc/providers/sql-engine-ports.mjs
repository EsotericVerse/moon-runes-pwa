// Single source of truth for the LOC SQL engine plug-in points.
// Kysely provides dialect-specific SQL generation; connection and security
// adapters remain on the trusted runtime (never in the browser).
const ENGINE_DEFINITIONS=[
  {id:'postgres',label:'PostgreSQL',dialect:'PostgresDialect',driver:'pg',runtime:'edge',namespace:'schema',session:'postgres-rls',schema:'kysely'},
  {id:'mysql',label:'MySQL / MariaDB',dialect:'MysqlDialect',driver:'mysql2',runtime:'edge',namespace:'database',session:'external-acl',schema:'kysely'},
  {id:'mssql',label:'SQL Server / Azure SQL',dialect:'MssqlDialect',driver:'tedious+tarn',runtime:'edge',namespace:'schema',session:'external-acl',schema:'kysely'},
  {id:'sqlite',label:'SQLite',dialect:'SqliteDialect',driver:'sqlite',runtime:'persistent-gateway',namespace:'attached-database',session:'external-acl',schema:'kysely'}
];
export const SQL_ENGINE_PORTS=Object.freeze(ENGINE_DEFINITIONS.map(entry=>Object.freeze(entry)));
export const SQL_ENGINE_OPTIONS=Object.freeze(SQL_ENGINE_PORTS.map(({id,label})=>Object.freeze({value:id,label})));
const byId=new Map(SQL_ENGINE_PORTS.map(entry=>[entry.id,entry]));
export function getSqlEnginePort(engine){
  const result=byId.get(String(engine));
  if(!result)throw new Error('Unsupported SQL engine');
  return result;
}
export function getSqlRuntimeCapabilities(engine){
  const port=getSqlEnginePort(engine);
  return Object.freeze({
    dialect:port.dialect,
    driver:port.driver,
    runtime:port.runtime,
    namespace:port.namespace,
    session:port.session,
    schema:port.schema,
    operations:Object.freeze(['select','insert','update','delete','upsert'])
  });
}
// Runtime hook boundary: the core Kysely CRUD remains common to all SQL engines.
// PostgreSQL uses existing RLS; other engines require a trusted permission
// adapter before private reads or mutations can be enabled.
export function resolveSqlExecutionPort(target){
  const port=getSqlEnginePort(target.engine);
  return Object.freeze({engine:port.id,session:port.session,namespace:port.namespace,runtime:port.runtime});
}
