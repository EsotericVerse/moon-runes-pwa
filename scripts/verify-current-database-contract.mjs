import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {SQL_ENGINE_PORTS,SQL_ENGINE_OPTIONS,getSqlEnginePort,resolveSqlExecutionPort} from '../app/loc/providers/sql-engine-ports.mjs';
import {DATABASE_PROVIDERS,normalizeDatabaseTarget,selectedDatabaseTarget} from '../app/loc/providers/selected-database-target.mjs';
import {RPC_ALLOWLIST} from '../app/loc/providers/kysely-runtime.mjs';

// Check executable modules and release probes, not a checked-in historical SQL dump.
const engines=['postgres','mysql','mssql','sqlite'];
assert.deepEqual(SQL_ENGINE_PORTS.map(port=>port.id),engines);
assert.deepEqual(SQL_ENGINE_OPTIONS.map(option=>option.value),engines);
assert.deepEqual(DATABASE_PROVIDERS,['supabase','neon','custom']);
for(const engine of engines)assert.equal(getSqlEnginePort(engine).id,engine);
assert.throws(()=>getSqlEnginePort('unknown'),/Unsupported SQL engine/);
for(const provider of ['supabase','neon']){
  const target=normalizeDatabaseTarget({provider,engine:'postgres'});
  assert.equal(resolveSqlExecutionPort(target).engine,'postgres');
}
assert.throws(()=>normalizeDatabaseTarget({provider:'custom',engine:'sqlite',connection_alias:'sqlite_local'}),/persistent trusted local/);
assert.throws(()=>selectedDatabaseTarget([{provider:'supabase',selected:true},{provider:'neon',selected:true}]),/More than one/);
for(const name of ['management_write','provision_scope','manage_scope_registry','apply_keyword_classification','read_keyword_class']){
  assert.ok(Array.isArray(RPC_ALLOWLIST['silver.'+name]),'RPC must remain allowlisted: '+name);
}
const releaseProbe=readFileSync(new URL('./verify-db-public-read.mjs',import.meta.url),'utf8');
for(const requirement of ['managedScopes(client)','verifyManagedScope(client,scope)','verifyGameContract(client)',
  'probe(client,scope.galaxy,galaxyColumns)']){
  assert.ok(releaseProbe.includes(requirement),'Release data check is missing '+requirement);
}
const admin=readFileSync(new URL('../app/loc/views/AdminHomeView.jsx',import.meta.url),'utf8');
const supabaseAdapter=readFileSync(new URL('../app/loc/providers/supabase.mjs',import.meta.url),'utf8');
assert.ok(supabaseAdapter.includes("rpc('loc_public_routing_state')"),'Routine routing status must stay on managed Data API');
assert.ok(admin.includes('save_database_target')&&admin.includes('saveRouting')&&admin.includes('set_database_routing'),
  'Admin must separate saving from deliberate emergency database switching');
const ignored=new Set(['.git','.next','node_modules','out','dist','ios','.turbo']);
const root=new URL('../',import.meta.url);
function inspect(folder){
  for(const entry of readdirSync(folder,{withFileTypes:true})){
    if(ignored.has(entry.name))continue;
    const path=join(folder,entry.name);
    if(entry.isDirectory())inspect(path);
    else assert.ok(!entry.name.toLowerCase().endsWith('.sql'),'Repository must not retain standalone SQL: '+path);
  }
}
inspect(root.pathname);
console.log('[database-contract] Kysely dialects, RPC allowlist, Supabase live CI probes, manual failover and zero standalone SQL files verified');
