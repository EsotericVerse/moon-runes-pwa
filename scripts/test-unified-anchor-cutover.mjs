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


function physicalInsertHarness(){
  const saved=[];
  const schema={from:table=>({
    insert:records=>({select:async()=>{
      assert.equal(table,'lo3rwang_anchor');
      const rows=Array.isArray(records)?records:[records];
      for(const row of rows){
        assert.match(row.uid,/^[A-Za-z0-9]+$/);
        assert.equal(row.uid.length,row.kind==='media'?8:4);
        assert.equal(typeof row.type,'string');
        assert.equal(typeof row.attrs,'object');
        assert.ok(!Array.isArray(row.attrs));
        if(row.kind==='time')assert.ok(Object.hasOwn(row.attrs,'range'));
        if(row.kind==='trace')for(const key of ['address','times','route_list'])
          assert.ok(Object.hasOwn(row.attrs,key),'missing Trace '+key);
        if(row.kind==='keywords')assert.ok(Object.hasOwn(row.attrs,'uid_lists'));
        if(row.kind==='media')assert.deepEqual(row.attrs,{});
      }
      saved.push(...rows);
      return {data:rows,error:null};
    }})
  })};
  return {schema,saved};
}
test('new Time anchor writes usable point range without a database trigger',async()=>{
  const {schema,saved}=physicalInsertHarness();
  const result=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_time'))
    .insert({uid:'A001',type:'anchor',title:'生日',address:'2026-11-02',
      anchor_ids:null,invisible:false}).select('uid,address,range');
  assert.equal(saved[0].attrs.range.version,1);
  assert.equal(saved[0].attrs.range.segments[0].start_date,'2026-11-02');
  assert.deepEqual(saved[0].attrs.range.segments[0].anchor_ids,['A001']);
  assert.equal(result.data[0].address,'2026-11-02');
});
test('new Trace locations allocate unique UIDs and preserve structured description and GPS',async()=>{
  const {schema,saved}=physicalInsertHarness();
  const rows=[{trace_type:'space_anchor',title:'台北',address:[121.5,25.04],
      description:{text:'',address:'台北市',url:'https://example.com'},times:[],anchor_list:[]},
    {trace_type:'space_anchor',title:'高雄',address:[120.3,22.6],times:[],anchor_list:[]}];
  const result=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_trace'))
    .insert(rows).select('uid,trace_type,title,address,description,times,route_list');
  assert.equal(new Set(saved.map(r=>r.uid)).size,2);
  assert.equal(typeof saved[0].description,'string');
  assert.deepEqual(result.data[0].description,rows[0].description);
  assert.deepEqual(result.data[0].address,[121.5,25.04]);
  assert.equal(result.data[0].trace_type,'space_anchor');
});
test('new Keywords and Media satisfy the same physical anchor contract',async()=>{
  const {schema,saved}=physicalInsertHarness();
  const keywords=unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_keywords'));
  await keywords.insert({uid:'b001',type:'class',name:'符文66',lists:[]}).select('uid');
  const media=unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_galaxy_media'));
  await media.insert({type:'video',title:'測試',url:'https://example.com/video'}).select('uid');
  assert.deepEqual(saved[0].attrs.uid_lists,{});
  assert.equal(saved[1].uid.length,8);
  assert.deepEqual(saved[1].attrs,{});
});
test('Trace structured description survives conversion on updates too',()=>{
  const spec=unifiedAnchorSpec('silver','lo3rwang_trace');
  const value={text:'路線',address:'板橋',url:'https://example.com'};
  const stored=toAnchorRow(spec,{description:value});
  assert.equal(typeof stored.description,'string');
  assert.deepEqual(fromAnchorRow(spec,{kind:'trace',description:stored.description}).description,value);
});
