import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const schema=readFileSync(new URL('../sql/portable-current-schema.sql',import.meta.url),'utf8');
const count=pattern=>(schema.match(pattern)||[]).length;

assert.equal(count(/^CREATE TABLE /gm),32,'snapshot must contain every current table');
assert.equal(count(/^CREATE (?:OR REPLACE )?FUNCTION /gm),32,'snapshot must contain every current routine and overload');
assert.equal(count(/^CREATE POLICY /gm),72,'snapshot must preserve every current RLS policy');
assert.equal(count(/^CREATE TRIGGER /gm),6,'snapshot must preserve every current trigger');
assert.equal(count(/^ALTER TABLE .* ENABLE ROW LEVEL SECURITY;/gm),32,'every current table must retain RLS');

for(const table of [
  'VisualNovel','email_blocklist','loc_search_keywords','scope_group_source_sharing',
  'scope_other_sources','scope_registry','scope_source_subcategories',
  'statistics_source_aliases','statistics_source_categories'
])assert.match(schema,new RegExp(`CREATE TABLE \\"silver\\"\\.\\"${table}\\"`),`missing live relation silver.${table}`);

assert.match(schema,/CREATE ROLE anonymous NOLOGIN/,'portable anonymous role must exist');
assert.doesNotMatch(schema,/CREATE POLICY .* TO "anon"/,'Supabase anon role must be mapped to portable anonymous role');
assert.match(schema,/CREATE POLICY "user_records_owner_all"[\s\S]*?owner_id = api\.current_user_id\(\)/,'private user records must remain owner scoped');
assert.match(schema,/CREATE POLICY "user_settings_owner_all"[\s\S]*?owner_id = api\.current_user_id\(\)/,'private user settings must remain owner scoped');

console.log('[portable-schema] 32 tables, 32 routines, 72 RLS policies and 6 triggers match live catalog inventory');
