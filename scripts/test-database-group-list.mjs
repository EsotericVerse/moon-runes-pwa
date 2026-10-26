import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {scopedDatabaseListRelation} from '../app/loc/providers/database-list-relation.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('database registry table comes from Scope Group, never a fixed LOC name',()=>{
  assert.equal(scopedDatabaseListRelation('loc'),'silver.loc_dblists');
  assert.equal(scopedDatabaseListRelation('others'),'silver.others_dblists');
  assert.equal(scopedDatabaseListRelation('Example'),'silver.example_dblists');
  for(const bad of ['',null,'loc;drop table','a.b','x-y','123','a'.repeat(17)]){
    assert.throws(()=>scopedDatabaseListRelation(bad),/Scope Group/);
  }
});

test('admin and Kysely use the same dynamic Scope Group relation',()=>{
  const app=read('app/loc/LocApp.jsx');
  const admin=read('app/loc/views/AdminHomeView.jsx');
  const panel=read('app/loc/views/admin-panels/DatabaseTarget.jsx');
  const edge=read('supabase/functions/loc-kysely/index.ts');
  assert.match(app,/scopeGroup=\{scopeMeta\?\.featureScope/);
  assert.match(admin,/<DatabaseTarget scopeGroup=\{scopeGroup\}\/>/);
  assert.match(panel,/scopedDatabaseListRelation\(scopeGroup\)/);
  assert.match(panel,/dbAuthRelation\(listRelation\)/);
  assert.match(edge,/scopedDatabaseListRelation\(groups\[0\]\.id\)/);
  assert.match(edge,/selectFrom\(listRelation\)/);
  assert.doesNotMatch(panel,/silver\.database_targets|silver\.loc_dblists/);
  assert.doesNotMatch(edge,/selectFrom\(["']silver\.database_targets["']\)/);
});

test('the PostgreSQL rename preserves the canonical routing RPC',()=>{
  const sql=read('supabase/migrations/20261027235900_scope_group_dblists_rename.sql');
  assert.match(sql,/scope_group\|\|'_dblists'/);
  assert.match(sql,/ALTER TABLE silver\.database_targets RENAME TO %I/);
  assert.match(sql,/CREATE OR REPLACE FUNCTION silver\.loc_public_routing_state\(\)/);
  assert.doesNotMatch(sql,/DROP TABLE|CASCADE/);
});
