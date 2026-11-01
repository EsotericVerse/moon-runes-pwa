import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261027001000_trace_anchor_list_column.sql');

test('all three Scope Trace tables rename their original ordered Queue column without rewriting rows',()=>{
 for(const scope of ['lo3rwang','lrunes','loc'])
   assert.ok(migration.includes('ALTER TABLE silver.'+scope+'_trace RENAME COLUMN anchor_uids TO anchor_list;'));
 assert.match(migration,/CREATE|DO \$guard\$/);
 assert.ok(migration.includes('pg_get_functiondef(routine.oid)'));
 assert.ok(migration.includes("replace(old_definition,'anchor_uids','anchor_list')"));
 assert.doesNotMatch(migration,/\b(?:UPDATE|DELETE|TRUNCATE)\s+silver\./i);
 assert.ok(migration.includes('ROLLBACK')===false,'migration should commit atomically after verification');
});
test('Trace Frame, map and reporting code use anchor_list only',()=>{
 const files=[
 'app/loc/TraceRouteManager.jsx',
 'app/modular/features/trace/trace-data.js',
 'app/modular/features/trace/trace-map-engine.js',
 'app/modular/features/trace/TraceMap.jsx',
 'app/modular/features/Trace.jsx',
 'app/modular/features/trace/TracePlaceResults.jsx',
 'app/modular/features/trace/trace-route-classes.mjs',
 'app/loc/model/class-group-items.mjs',
 'app/modular/features/trace/trace-article-places.mjs'
 ];
 for(const path of files){
   const content=read(path);
   assert.ok(content.includes('anchor_list'),path+' must use the new queue');
   assert.ok(!content.includes('anchor_uids'),path+' must not depend on old queue');
 }
});

test('batch Trace anchors follow the text + JSONB relation contract',()=>{
 const code=read('app/modular/features/trace/trace-data.js');
 const from=code.indexOf('export async function addTraceAnchorsBatch(');
 const to=code.indexOf('function validatedConnections(',from);
 assert.ok(from>=0&&to>from);
 const section=code.slice(from,to);
 assert.match(section,/description:descriptionText\(place\.description\|\|''\)/);
 assert.match(section,/route_list:\{routes:\[\],segments:\[\],postal_address:postalText\(place\.address\|\|''\)\}/);
 assert.doesNotMatch(section,/descriptionObject\(/);
});
