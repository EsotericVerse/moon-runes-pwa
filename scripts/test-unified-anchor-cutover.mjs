import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unifiedAnchorSpec,toAnchorRow,fromAnchorRow,unifiedAnchorRelation} from '../app/loc/unified-anchor-compat.mjs';
import {readUnifiedAnchorUids} from '../app/loc/unified-anchor-uids.mjs';

test('only lo3rwang content maps to unified anchor; Suno, Rune and local are untouched',()=>{
 for(const [suffix,kind] of Object.entries({time:'time',trace:'trace',keywords:'keywords',galaxy_media:'media'})){
   assert.deepEqual(unifiedAnchorSpec('silver','lo3rwang_'+suffix),{table:'lo3rwang_anchor',kind,legacy:suffix});
 }
 for(const table of ['lrunes_time','suno_galaxy_media','local_time','runes_keywords','lo3rwang_galaxy'])
   assert.equal(unifiedAnchorSpec('silver',table),null);
});
test('four categories map their old columns into the unified physical shape and back',()=>{
 const time=unifiedAnchorSpec('silver','lo3rwang_time');
 const trace=unifiedAnchorSpec('silver','lo3rwang_trace');
 const keywords=unifiedAnchorSpec('silver','lo3rwang_keywords');
 const media=unifiedAnchorSpec('silver','lo3rwang_galaxy_media');
 assert.deepEqual(toAnchorRow(time,{uid:'0001',type:'anchor',address:'2026-11-02',range:{version:1},anchor_ids:[]}),{uid:'0001',type:'anchor',date:'2026-11-02',links:[],attrs:{range:{version:1}},kind:'time'});
 assert.deepEqual(toAnchorRow(trace,{uid:'T001',trace_type:'space_anchor',address:[121,25],times:['2026-11-02T00:00Z']}),{uid:'T001',type:'space_anchor',attrs:{address:[121,25],times:['2026-11-02T00:00Z']},kind:'trace'});
 assert.deepEqual(toAnchorRow(keywords,{uid:'K001',name:'靈',desc:'分類',lists:['L001'],uid_lists:{hits:[]}}),{uid:'K001',title:'靈',description:'分類',links:['L001'],attrs:{uid_lists:{hits:[]}},kind:'keywords'});
 assert.deepEqual(toAnchorRow(media,{uid:'M001',title:'歌',url:'https://suno.com/song/1'}),{uid:'M001',title:'歌',url:'https://suno.com/song/1',kind:'media'});
 assert.equal(fromAnchorRow(time,{uid:'0001',date:'2026-11-02',kind:'time'}).address,'2026-11-02');
 assert.equal(fromAnchorRow(keywords,{uid:'K001',kind:'keywords',title:'靈'}).name,'靈');
});
test('reader scopes every select to the corresponding kind',async()=>{
 const calls=[],rows=[{uid:'0001',kind:'time',type:'anchor',title:'生日',date:'2026-11-02'},
 {uid:'0002',kind:'media',title:'音樂'}];
 const schema={from:table=>{
   assert.equal(table,'lo3rwang_anchor');
   const conditions=[];
   const q={select(){return q},eq(column,value){conditions.push([column,value]);return q},
     range(){calls.push(conditions);return Promise.resolve({data:rows.filter(r=>conditions.every(([k,v])=>r[k]===v)),error:null})}};
   return q;
 }};
 const r=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_time'))
   .select('uid,title,address').eq('type','anchor').range(0,10);
 assert.deepEqual(r.data,[{uid:'0001',title:'生日',address:'2026-11-02'}]);
 assert.equal(calls[0].some(([k,v])=>k==='kind'&&v==='time'),true);
});
test('UID pool spans Time, Trace, Keywords and Media on creation only',async()=>{
 const rows=await readUnifiedAnchorUids('silver.lo3rwang_time',async (table,offset,limit)=>{
   assert.equal(table,'silver.lo3rwang_anchor');
   return offset===0?[{uid:'0001'},{uid:'AAAA'}]:[];
 },{pageSize:2});
 assert.deepEqual(rows,[{uid:'0001'},{uid:'AAAA'}]);
 assert.deepEqual(await readUnifiedAnchorUids('silver.lrunes_time',()=>{throw Error('should not be called')}),[]);
});
test('code routes public and auth writes through unified adapters without schema mutation',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const client=read('app/loc/db-client.mjs'),contract=read('app/loc/db-contract.mjs'),
   scope=read('app/loc/scope-data.js');
 assert.match(client,/unifiedAnchorSpec\(schemaName,table\)/);
 assert.match(client,/unifiedAnchorRelation\(cloudSchema,unified\)/);
 assert.match(contract,/if\(spec\)\{/);
 assert.match(contract,/relation\(\)\.insert\(rows\)\.select\('uid'\)/);
 assert.match(scope,/anchor:'silver\.'\+id\+'_anchor'/);
});
