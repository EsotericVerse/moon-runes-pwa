import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261106232000_retire_linked_media_count_from_overview.sql');
const gateway=read('app/loc/galaxy-query.js');

test('overview keeps daily source counts but never counts media_link',()=>{
  assert.match(migration,/CREATE OR REPLACE FUNCTION silver\.read_scope_overview/);
  assert.match(migration,/silver\.read_scope_statistics\(p_scope_id,p_start,p_end,false\)/);
  const overview=migration.slice(migration.indexOf('CREATE OR REPLACE FUNCTION'),migration.indexOf('DROP FUNCTION'));
  assert.doesNotMatch(overview,/media_link|media_count|linked_media_count/);
  assert.match(migration,/DROP FUNCTION IF EXISTS silver\.read_scope_linked_media_count\(text,date,date\)/);
  assert.doesNotMatch(migration,/\bDROP\s+(TABLE|COLUMN)\b|\bDROP\s+FUNCTION[^;]*\bCASCADE\b/i);
});
test('statistics accepts ISR without the retired multimedia count',()=>{
  const start=gateway.indexOf('async function selectScopeOverviewRaw(');
  const end=gateway.indexOf('async function selectScopeEarliestRaw(',start);
  assert.ok(start>=0&&end>start);
  const snippet=gateway.slice(start,end);
  assert.match(snippet,/Array\.isArray\(snapshot\.rows\)/);
  assert.doesNotMatch(snippet,/mediaCount|media_count|media_link/);
});
