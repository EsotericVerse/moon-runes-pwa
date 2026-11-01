import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unifiedAnchorSpec,toAnchorRow,fromAnchorRow,unifiedAnchorRelation} from '../app/loc/unified-anchor-compat.mjs';
import {readUnifiedAnchorUids} from '../app/loc/unified-anchor-uids.mjs';

test('only lo3rwang content maps to unified anchor; Suno, Rune and local are untouched',()=>{
 for(const suffix of ['time','trace','keywords','galaxy_media']){
   assert.deepEqual(unifiedAnchorSpec('silver','lo3rwang_'+suffix),{table:'lo3rwang_anchor',legacy:suffix});
 }
 for(const table of ['lrunes_time','suno_galaxy_media','local_time','runes_keywords','lo3rwang_galaxy'])
   assert.equal(unifiedAnchorSpec('silver',table),null);
});
test('four categories map their old columns into the unified physical shape and back',()=>{
 const time=unifiedAnchorSpec('silver','lo3rwang_time');
 const trace=unifiedAnchorSpec('silver','lo3rwang_trace');
 const keywords=unifiedAnchorSpec('silver','lo3rwang_keywords');
 const media=unifiedAnchorSpec('silver','lo3rwang_galaxy_media');
 assert.deepEqual(toAnchorRow(time,{uid:'0001',type:'anchor',address:'2026-11-02',range:{version:1},anchor_ids:[]}),{uid:'0001',type:'anchor',label:'2026-11-02',links:[],attrs:{range:{version:1}}});
 assert.deepEqual(toAnchorRow(trace,{uid:'T001',trace_type:'space_anchor',address:[121,25],times:['2026-11-02T00:00Z']}),{uid:'T001',type:'space_anchor',label:'[121,25]',attrs:{times:['2026-11-02T00:00Z']}});
 assert.deepEqual(toAnchorRow(keywords,{uid:'K001',name:'靈',desc:'分類',lists:['L001'],uid_lists:{hits:[]}}),{uid:'K001',title:'靈',description:'分類',links:['L001'],attrs:{uid_lists:{hits:[]}}});
 assert.deepEqual(toAnchorRow(media,{uid:'M001',title:'歌',url:'https://suno.com/song/1'}),{uid:'M001',title:'歌',label:'https://suno.com/song/1'});
 assert.equal(fromAnchorRow(time,{uid:'0001',label:'2026-11-02',type:'anchor'}).address,'2026-11-02');
 assert.equal(fromAnchorRow(keywords,{uid:'K001',type:'class',title:'靈'}).name,'靈');
});
test('reader scopes by existing type, never duplicate kind',async()=>{
 const calls=[],rows=[
   {uid:'0001',type:'anchor',title:'生日',label:'2026-11-02',attrs:{range:{}}},
   {uid:'0002',type:'space_anchor',title:'地點',label:'[121,25]',attrs:{address:[121,25]}},
   {uid:'0003',type:'class',title:'類別',attrs:{uid_lists:{}}},
   {uid:'12345678',type:'音樂',title:'音樂',label:'https://example.com'}
 ];
 const schema={from:table=>{
   assert.equal(table,'lo3rwang_anchor');
   const conditions=[];
   const q={select(){return q},
     eq(column,value){conditions.push(row=>row[column]===value);return q},
     in(column,values){conditions.push(row=>values.includes(row[column]));return q},
     like(column,pattern){const re=new RegExp('^'+pattern.replace(/_/g,'.')+'$');conditions.push(row=>re.test(row[column]||''));return q},
     range(){calls.push(conditions.length);return Promise.resolve({data:rows.filter(r=>conditions.every(fn=>fn(r))),error:null})}};
   return q;
 }};
 const time=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_time'))
   .select('uid,title,address').eq('type','anchor').range(0,10);
 assert.deepEqual(time.data,[{uid:'0001',title:'生日',address:'2026-11-02'}]);
 const trace=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_trace'))
   .select('uid,address').range(0,10);
 assert.deepEqual(trace.data,[{uid:'0002',address:[121,25]}]);
 const media=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_galaxy_media'))
   .select('uid,url').range(0,10);
 assert.deepEqual(media.data,[{uid:'12345678',url:'https://example.com'}]);
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
        assert.equal(row.uid.length, ['video','rune','音樂','播放清單'].includes(row.type)?8:4);
        assert.equal(typeof row.type,'string');
        assert.equal(typeof row.attrs,'object');
        assert.ok(!Array.isArray(row.attrs));
        if(row.type==='anchor')assert.ok(Object.hasOwn(row.attrs,'range'));
        assert.ok(!Object.hasOwn(row,'kind'));
        assert.ok(!Object.hasOwn(row,'date'));
        assert.ok(!Object.hasOwn(row,'url'));
        assert.ok(!Object.hasOwn(row,'meta_tags'));
        assert.ok(!Object.hasOwn(row,'createtime'));
        if(row.type==='space_anchor')for(const key of ['times','route_list'])
          assert.ok(Object.hasOwn(row.attrs,key),'missing Trace '+key);
        if(row.type==='class')assert.ok(Object.hasOwn(row.attrs,'uid_lists'));
        if(row.type==='space_anchor')assert.equal(typeof row.label,'string');
        if(row.type==='video')assert.deepEqual(row.attrs,{});
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
  assert.deepEqual(fromAnchorRow(spec,{type:'space_anchor',description:stored.description}).description,value);
});


test('Trace check-in timestamp write is compatible with Kysely builder lacking abortSignal',async()=>{
  const {recordImportPlaceVisits}=await import('../app/loc/import-place-anchors.mjs');
  const uid='A0b1',previous='2026-10-01T00:00:00.000Z',fresh='2026-11-01T04:30:00.000Z';
  const row={uid,type:'space_anchor',attrs:{
    times:[previous],address:[121.5,25.0],route_list:['R001'],other:'preserved'
  }};
  const writes=[];
  // KyselyEdge's physical builder deliberately has no .abortSignal() method.
  const schema={from:table=>{
    assert.equal(table,'lo3rwang_anchor');
    return {
      select:()=>({
        eq(){return this},
        maybeSingle:async()=>({data:{uid:row.uid,attrs:row.attrs},error:null})
      }),
      update:values=>{
        const filters=[];
        const q={
          eq(column,value){filters.push([column,value]);return q},
          select:async()=>{
            assert.equal(filters.some(([key])=>key==='kind'),false);
            assert.deepEqual(filters,[['uid',uid],['type','space_anchor']]);
            writes.push(values);
            row.attrs={...values.attrs};
            return {data:[{...row}],error:null};
          }
        };
        return q;
      }
    };
  }};
  const relation=()=>unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_trace'));
  const timesByUid=new Map([[uid,[previous]]]);
  const first=await recordImportPlaceVisits([{uid,time:fresh}],{
    relation,table:'silver.lo3rwang_trace',timesByUid
  });
  assert.deepEqual(first,{updated:1,added:1});
  assert.equal(writes.length,1);
  assert.deepEqual(row.attrs.times,[previous,fresh]);
  assert.equal(row.attrs.other,'preserved');
  assert.deepEqual(row.attrs.route_list,['R001']);
  assert.deepEqual(await recordImportPlaceVisits([{uid,time:fresh}],{
    relation,table:'silver.lo3rwang_trace',timesByUid
  }),{updated:0,added:0});
  assert.equal(writes.length,1,'reimport must not double-write already persisted times');
});

test('unified Trace forwards an abort signal only to physical builders that support it',async()=>{
  const uid='A0b2',signal=AbortSignal.timeout(45000);
  let received=null,updates=0;
  const schema={from:()=>({
    select:()=>({
      eq(){return this},
      maybeSingle:async()=>({data:{uid,attrs:{times:[],tag:'keep'}},error:null})
    }),
    update:values=>{
      const q={
        eq(){return q},
        abortSignal(value){received=value;return q},
        select:async()=>{updates++;return {data:[{uid,type:'space_anchor',attrs:values.attrs}],error:null}}
      };
      return q;
    }
  })};
  const result=await unifiedAnchorRelation(schema,unifiedAnchorSpec('silver','lo3rwang_trace'))
    .update({times:['2026-11-01T00:00:00.000Z']})
    .eq('uid',uid).eq('trace_type','space_anchor').abortSignal(signal);
  assert.equal(result.error,null);
  assert.equal(received,signal);
  assert.equal(updates,1);
});

test('media metadata moves into description; original timestamp survives only in attrs',()=>{
 const media=unifiedAnchorSpec('silver','lo3rwang_galaxy_media');
 const mapped=toAnchorRow(media,{uid:'abcd1234',type:'音樂',title:'曲目',
   url:'https://suno.com/song/example',meta_tags:'Bossa, Dark Jazz',
   createtime:'2026-11-02T03:04:05+08:00'});
 assert.deepEqual(mapped,{uid:'abcd1234',type:'音樂',title:'曲目',
   label:'https://suno.com/song/example',description:'Bossa, Dark Jazz',
   attrs:{published_at:'2026-11-02T03:04:05+08:00'}});
 assert.deepEqual(fromAnchorRow(media,{...mapped}).meta_tags,'Bossa, Dark Jazz');
 assert.equal(fromAnchorRow(media,{...mapped}).createtime,'2026-11-02T03:04:05+08:00');
});
test('trace GPS leaves attrs and roundtrips as a coordinate array in label',()=>{
 const spec=unifiedAnchorSpec('silver','lo3rwang_trace');
 const original={uid:'Ab12',trace_type:'space_anchor',address:[121.49086,25.05338],
    times:[],route_list:[]};
 const mapped=toAnchorRow(spec,original);
 assert.equal(mapped.label,'[121.49086,25.05338]');
 assert.equal(Object.hasOwn(mapped.attrs,'address'),false);
 assert.deepEqual(fromAnchorRow(spec,mapped).address,original.address);
});
