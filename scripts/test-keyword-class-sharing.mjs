import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=source('supabase/migrations/20261029226100_keyword_tree_readers.sql');
const trace=source('supabase/migrations/20261029226000_trace_keyword_uid_groups.sql');
const panel=source('app/loc/KeywordLibraryPanel.jsx');
const analysis=source('app/loc/keyword-analysis.js');

test('Class share settings live in the existing Scope config, never in a new table',()=>{
  assert.match(panel,/class_shares:/);
  assert.match(panel,/saveClassShare\(activeClass\.uid/);
  assert.match(panel,/keyword_meta:\{\.\.\.\(config\.keyword_meta\|\|\{\}\),by_class:\{\}\}/);
  assert.doesNotMatch(sql,/^\s*CREATE\s+(?:TEMP\s+|UNLOGGED\s+)?TABLE\b/im);
  assert.doesNotMatch(trace,/^\s*CREATE\s+(?:TEMP\s+|UNLOGGED\s+)?TABLE\b/im);
});

test('all public keyword readers authorize the requested Class UID',()=>{
  assert.equal((sql.match(/silver\.keyword_class_is_shared\(v_scope,v_class\)/g)||[]).length,2);
  assert.match(trace,/silver\.keyword_class_is_shared\(v_scope,v_class_uid\)/);
  assert.match(sql,/RETURN coalesce\(\(v_meta->'class_shares'->>p_class_uid\)::boolean,false\)/);
});

test('shared category identity is derived, not persisted',()=>{
  assert.match(sql,/encode\(sha256\(convert_to\(\$1\|\|':'\|\|c\.uid::text,'UTF8'\)\),'hex'\)/);
  assert.match(sql,/CASE WHEN \$2 THEN c\.uid::text/);
  assert.match(sql,/read_shared_keyword_classes/);
});

test('no module-level Keyword or Galaxy analysis result caching',()=>{
  assert.doesNotMatch(analysis,/analysisPromises\s*=\s*new Map/);
  assert.doesNotMatch(analysis,/analysisPromises\.set/);
});

test('legacy Neon shares are discovered by Class UID without a staging table',()=>{
  assert.match(sql,/DISTINCT ON \(class_uid\) class_uid::text AS uid,class_name AS name/);
  assert.match(sql,/attname='uid'/);
  assert.match(trace,/attname='uid'/);
  assert.match(sql,/coalesce\(keyword_meta->'class_shares','\{\}'::jsonb\)/);
});

test('shared Class directory uses caller authorization even when a public Class exists',async()=>{
  const contract=source('app/loc/db-contract.mjs');
  const definition=contract.match(/  async function readSharedKeywordClasses\(scopeId\)\{[\s\S]*?\n  \}/)?.[0];
  assert.ok(definition);
  let called=0;
  const classes=[{classUid:'eeCc'},{classUid:'IeG0'}];
  const client={schema:()=>({rpc:async(name,args)=>{
    called++;
    assert.equal(name,'read_shared_keyword_classes');
    assert.equal(args.p_scope_id,'lo3rwang');
    return {data:classes,error:null};
  }})};
  const create=new Function('authClient','normalizeScopeId',definition+';return readSharedKeywordClasses;');
  const read=create(client,id=>id);
  assert.deepEqual(await read('lo3rwang'),classes);
  assert.equal(called,1);
  const failing=create({schema:()=>({rpc:async()=>({data:null,error:{message:'denied'}})})},id=>id);
  await assert.rejects(failing('lo3rwang'),/denied/);
});
