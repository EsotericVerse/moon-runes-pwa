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
// `runes`/`runes_etc`/`runes_group` is a BARE table name collision: the
// on-device "local" Scope plans its own read-only copy of these under that
// same name (see local-sqlite.mjs's header comment), but the live,
// pre-existing `silver.runes*` tables -- read by the whole Rune feature
// (draw, directory, 3D library, daily log, game board, management panel)
// site-wide, today -- share the exact same bare name. Matching on name
// alone silently redirected every one of those production reads to the
// empty on-device SQLite file (confirmed: silver.runes_group/runes/runes_etc
// instead of Supabase), breaking every rune draw.
// `local`/`local_*` has no such collision (nothing else in the app uses
// those names), so only the runes* tables need the schema check: they only
// ever route locally under the Scope's own `local` schema, never `silver`.
function isLocalRelation(table,schemaName){
  const name=String(table||'').split('.').pop();
  if(name==='local'||name.startsWith('local_'))return true;
  if(name==='runes'||name==='runes_etc'||name==='runes_group')return schemaName==='local';
  return false;
}
function routedSchema(schemaName,cloudSchema){
  const localSchema=localAdapter.publicClient.schema(schemaName);
  return {
    from(table){return isLocalRelation(table,schemaName)?localSchema.from(table):cloudSchema.from(table);},
    rpc(name,args={},options={}){
      const toLocal=name==='management_write'?isLocalRelation(args?.p_table,schemaName):String(args?.p_scope_id||'')==='local';
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

// Use the existing public Supabase SDK socket for browser/iOS game rooms.
export const dbRealtimeClient=adapter.realtimeClient;
export const dbBackupPublicClient=adapter.backupPublicClient||null;
export const dbConfiguredPublicClient=adapter.configuredPublicClient||null;
// Passive Auth events use the configured SDK, not the routed query client.
export const dbAuthEvents=adapter.auth;
export const dbPrimarySourceLabel=adapter.primarySourceLabel||'Primary';
export const dbBackupSourceLabel=adapter.backupSourceLabel||'Backup';
export const {publicClient:dbPublicClient,authClient:dbAuthClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,applyKeywordClassification,resetKeywordClassification,readKeywordClass,readScopeStatistics,readScopeCategoryTotals,readScopeOverview,readScopeEarliest,readLocStatistics,findGalaxyDuplicates,readRune66Summary,writeKeywordLibraryItem,copyKeywordLibraryClass,copyRune66KeywordClass,isCurrentEmailBlocklisted,deleteScope,moveScopeBlock,provisionScope,manageScopeRegistry,getAccountSession,signInWithGoogle,signOutAccount}=client;
