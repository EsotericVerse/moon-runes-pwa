'use client';

import {createDatabaseClient} from './db-contract.mjs';
import {createConfiguredAdapter} from './providers/configured.mjs';
import {configureDbSourceLabels} from './db-source-status.mjs';
import {createLocalSqliteAdapter} from './providers/local-sqlite.mjs';

// Provider construction is the only runtime composition point.
const adapter=createConfiguredAdapter();
configureDbSourceLabels(adapter.primarySourceLabel||'Primary',adapter.backupSourceLabel||'Backup');

// The device-local SQLite backend for the hidden `local` Scope (see
// providers/local-sqlite.mjs) is spliced in at this single composition
// point: a `local`/`local_*`/`runes*` table or a `local`-scoped RPC call is
// routed to it; everything else keeps going to the normal Supabase/Neon
// adapter exactly as before. No other file (db-query.mjs, galaxy-query.js,
// db-contract.mjs, or any feature page) needs to know a second backend
// exists or branch on scope id -- they keep calling dbPublicClient /
// dbAuthClient / insertRows / readScopeStatistics / etc. exactly as today.
const localAdapter=createLocalSqliteAdapter();
function isLocalRelation(table){
  const name=String(table||'').split('.').pop();
  return name==='local'||name.startsWith('local_')||name==='runes'||name==='runes_etc'||name==='runes_group';
}
function routedSchema(schemaName,cloudSchema){
  const localSchema=localAdapter.publicClient.schema(schemaName);
  return {
    from(table){return isLocalRelation(table)?localSchema.from(table):cloudSchema.from(table);},
    rpc(name,args={},options={}){
      const toLocal=name==='management_write'?isLocalRelation(args?.p_table):String(args?.p_scope_id||'')==='local';
      return toLocal?localSchema.rpc(name,args):cloudSchema.rpc(name,args,options);
    }
  };
}
// Only `.schema(...)` is ever called on dbPublicClient/dbAuthClient anywhere
// in the app (verified: db-query.mjs's publicRelation, db-contract.mjs's
// dbAuthRelation); `auth` is taken from `adapter.auth` directly, not off
// these clients, so the routed objects only need to carry `.schema`.
const routedAdapter={
  ...adapter,
  publicClient:{schema:name=>routedSchema(name,adapter.publicClient.schema(name))},
  authClient:{schema:name=>routedSchema(name,adapter.authClient.schema(name))}
};
const client=createDatabaseClient(routedAdapter);

export const dbBackupPublicClient=adapter.backupPublicClient||null;
export const dbConfiguredPublicClient=adapter.configuredPublicClient||null;
export const dbPrimarySourceLabel=adapter.primarySourceLabel||'Primary';
export const dbBackupSourceLabel=adapter.backupSourceLabel||'Backup';
export const {publicClient:dbPublicClient,authClient:dbAuthClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,applyKeywordClassification,readKeywordClass,readScopeStatistics,readScopeOverview,readScopeEarliest,readLocStatistics,findGalaxyDuplicates,readRune66Summary,writeKeywordLibraryItem,copyKeywordLibraryClass,copyRune66KeywordClass,isCurrentEmailBlocklisted,deleteScope,moveScopeBlock,provisionScope,manageScopeRegistry,logSearchKeyword,getAccountSession,signInWithGoogle,signOutAccount}=client;
