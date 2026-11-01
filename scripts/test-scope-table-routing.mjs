import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveScopeRelations} from '../app/loc/scope-table-routing.mjs';

test('legacy settings preserve existing database relations',()=>{
  assert.deepEqual(resolveScopeRelations('lo3rwang',{galaxy:'galaxy',time:'time'}),{
    galaxy:'silver.lo3rwang_galaxy',galaxyMedia:'silver.lo3rwang_galaxy_media',
    time:'silver.lo3rwang_time',keywords:'silver.lo3rwang_keywords',trace:'silver.lo3rwang_trace',
    anchor:null,unified:false
  });
});
test('explicit names map one Scope to two tables without repeated prefixes',()=>{
  assert.deepEqual(resolveScopeRelations('lo3rwang',{galaxy:'lo3rwang',time:'lo3rwang_anchor'}),{
    galaxy:'silver.lo3rwang',galaxyMedia:'silver.lo3rwang_anchor',time:'silver.lo3rwang_anchor',
    keywords:'silver.lo3rwang_anchor',trace:'silver.lo3rwang_anchor',anchor:'silver.lo3rwang_anchor',unified:true
  });
});
test('independent Scope cannot accidentally route to lo3rwang',()=>{
  const scope=resolveScopeRelations('lrunes',{galaxy:'lrunes',time:'lrunes_anchor'});
  assert.equal(scope.galaxy,'silver.lrunes');
  assert.equal(scope.anchor,'silver.lrunes_anchor');
});
test('partial cutover and unsafe table names fail closed',()=>{
  assert.throws(()=>resolveScopeRelations('lo3rwang',{galaxy:'lo3rwang',time:'time'}),/pair/);
  assert.throws(()=>resolveScopeRelations('lo3rwang',{galaxy:'galaxy',time:'lo3rwang_anchor'}),/pair/);
  assert.throws(()=>resolveScopeRelations('lo3rwang',{galaxy:'bad.table',time:'time'}),/identifier/);
  assert.throws(()=>resolveScopeRelations('lo3rwang',{galaxy:'lrunes_anchor',time:'time'}),/scope/);
  assert.throws(()=>resolveScopeRelations('bad-scope'),/scope/);
});
test('existing Scope registry calls the one shared resolver',()=>{
  const source=readFileSync(new URL('../app/loc/scope-data.js',import.meta.url),'utf8');
  assert.match(source,/import \{resolveScopeRelations\} from '\.\/scope-table-routing\.mjs'/);
  assert.match(source,/const tables=resolveScopeRelations\(id,row\)/);
});
