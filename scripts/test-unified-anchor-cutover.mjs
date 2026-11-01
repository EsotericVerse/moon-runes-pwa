import test from 'node:test';
import assert from 'node:assert/strict';
import {unifiedAnchorSpec,toAnchorRow,fromAnchorRow,unifiedAnchorRelation} from '../app/loc/unified-anchor-compat.mjs';
import {readUnifiedAnchorUids} from '../app/loc/unified-anchor-uids.mjs';

const spec=section=>unifiedAnchorSpec('silver','lo3rwang_'+section);
test('only content-scope legacy relations use the physical unified Anchor',()=>{
 for(const [suffix,kind] of Object.entries({time:'time',trace:'trace',keywords:'keywords',galaxy_media:'media'}))
   assert.deepEqual(spec(suffix),{table:'lo3rwang_anchor',kind,legacy:suffix});
 for(const name of ['lrunes_time','suno_galaxy_media','lo3rwang_galaxy','local_time'])
   assert.equal(unifiedAnchorSpec('silver',name),null);
});
test('type, label and attr replace kind, links, date, url and extra media timestamp',()=>{
 assert.deepEqual(toAnchorRow(spec('time'),{uid:'0001',type:'anchor',address:'2026-11-02',range:{version:1}}),{
   uid:'0001',type:'date',label:'2026-11-02'
 });
 assert.deepEqual(toAnchorRow(spec('trace'),{uid:'T001',trace_type:'space_anchor',address:[121,25],times:[]}),{
   uid:'T001',type:'point',label:'[121,25]',attr:{times:[]}
 });
 assert.deepEqual(toAnchorRow(spec('keywords'),{uid:'K001',type:'item',name:'靈',lists:['心','靈'],uid_lists:{hits:[]}}),{
   uid:'K001',type:'item',title:'靈',label:'["心","靈"]',attr:{uid_lists:{hits:[]}}
 });
 assert.deepEqual(toAnchorRow(spec('galaxy_media'),{
   uid:'AAAAAAAA',type:'音樂',url:'https://suno.com/song/1',meta_tags:'Music, Vocals',createtime:'2026-01-01T01:00Z'
 }),{
   uid:'AAAAAAAA',type:'suno',label:'https://suno.com/song/1',description:'Music, Vocals'
 });
});
test('the former public feature views reconstruct time, trace, keyword and Suno data',()=>{
 assert.equal(fromAnchorRow(spec('time'),{uid:'0001',type:'date',label:'2009-05-01'}).address,'2009-05-01');
 assert.deepEqual(fromAnchorRow(spec('time'),{uid:'0002',type:'period',label:'["0001","0003"]'}).anchor_ids,['0001','0003']);
 assert.deepEqual(fromAnchorRow(spec('trace'),{uid:'T001',type:'point',label:'[121,25]'}).address,[121,25]);
 assert.deepEqual(fromAnchorRow(spec('keywords'),{uid:'K001',type:'item',title:'月',label:'["月光"]',attr:{uid_lists:{hits:[]}}}).lists,['月光']);
 const song=fromAnchorRow(spec('galaxy_media'),{uid:'AAAAAAAA',type:'suno',label:'https://suno.com/song/1',description:'tag'});
 assert.equal(song.type,'suno');assert.equal(song.url,'https://suno.com/song/1');assert.equal(song.meta_tags,'tag');
});
test('read filtering uses type only and maps legacy date predicates',async()=>{
 const calls=[];
 const rows=[{uid:'0001',type:'date',title:'生日',label:'2026-11-02'},{
   uid:'0002',type:'suno',title:'音樂',label:'https://suno.com/song/2'
 }];
 const schema={from:table=>{
   assert.equal(table,'lo3rwang_anchor');
   const filters=[];
   const q={
     select(columns){calls.push(['select',columns]);return q},
     eq(col,value){filters.push(row=>row[col]===value);calls.push(['eq',col,value]);return q},
     in(col,values){filters.push(row=>values.includes(row[col]));calls.push(['in',col,values]);return q},
     range(){return Promise.resolve({data:rows.filter(r=>filters.every(f=>f(r))),error:null})}
   };
   return q;
 }};
 const r=await unifiedAnchorRelation(schema,spec('time')).select('uid,title,address')
   .eq('type','anchor').range(0,20);
 assert.deepEqual(r.data,[{uid:'0001',title:'生日',address:'2026-11-02'}]);
 assert.ok(calls.some(c=>c[0]==='in'&&c[1]==='type'&&c[2].includes('date')));
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='type'&&c[2]==='date'));
 assert.equal(calls.some(c=>c[1]==='kind'),false);
});
test('partial updates preserve a single date and point label without specifying type',()=>{
 assert.equal(toAnchorRow(spec('time'),{address:'2026-01-01'}).label,'2026-01-01');
 assert.equal(toAnchorRow(spec('trace'),{address:[121,25]}).label,'[121,25]');
 assert.equal(toAnchorRow(spec('keywords'),{lists:['日','月']}).label,'["日","月"]');
});
test('UID pool is shared across content types only',async()=>{
 const rows=await readUnifiedAnchorUids('silver.lo3rwang_time',async(table,offset)=>{
   assert.equal(table,'silver.lo3rwang_anchor');
   return offset===0?[{uid:'0001'},{uid:'AAAA'}]:[];
 },{pageSize:2});
 assert.deepEqual(rows,[{uid:'0001'},{uid:'AAAA'}]);
 assert.deepEqual(await readUnifiedAnchorUids('silver.lrunes_time',()=>{throw Error('should not read')}),[]);
});
test('new date node persists only date label, not duplicate range attrs',async()=>{
 const saved=[];
 const schema={from:table=>({
   insert:rows=>({select:async()=>{assert.equal(table,'lo3rwang_anchor');saved.push(...(Array.isArray(rows)?rows:[rows]));return {data:[...saved],error:null};}})
 })};
 const r=await unifiedAnchorRelation(schema,spec('time'))
   .insert({uid:'A001',type:'anchor',title:'打卡日期',address:'2026-11-02',invisible:false}).select('uid,address,range');
 assert.equal(saved[0].type,'date');
 assert.equal(saved[0].label,'2026-11-02');
 assert.equal(saved[0].attr,undefined);
 assert.equal(r.data[0].address,'2026-11-02');
});

test('removed media datetime projects as null, never reinterpreted as UID',async()=>{
 const actual=[];
 const schema={from:table=>{
   assert.equal(table,'lo3rwang_anchor');
   const q={
     select(cols){actual.push(['select',cols]);return q},
     in(column,values){actual.push(['in',column,values]);return q},
     order(column){actual.push(['order',column]);return q},
     range:async()=>({data:[{uid:'ABCDEFGH',type:'suno',title:'歌曲',label:'https://suno.com/song/test'}],error:null})
   };
   return q;
 }};
 const rows=await unifiedAnchorRelation(schema,spec('galaxy_media'))
   .select('uid,type,title,url,createtime,location').order('createtime',{ascending:false}).limit(1);
 assert.equal(rows.data[0].uid,'ABCDEFGH');
 assert.equal(rows.data[0].url,'https://suno.com/song/test');
 assert.equal(rows.data[0].createtime,null);
 assert.equal(rows.data[0].location,null);
 assert.ok(actual.some(([op,col])=>op==='order'&&col==='title'));
 assert.ok(actual.every(entry=>!JSON.stringify(entry).includes('"kind"')));
});
test('removed media timestamp is not an indexed date filter',async()=>{
 const schema={from:()=>({select:()=>({})})};
 await assert.rejects(
   unifiedAnchorRelation(schema,spec('galaxy_media')).select('uid')
     .gte('createtime','2026-01-01').limit(1),
   /requires article Galaxy.date\/media_link/
 );
});

test('imported range caches stay derived from labels; a date needs no range',()=>{
 const range={version:1,segments:[{start_date:'2026-01-01',end_date:'2026-02-01'}],invalid_period_uids:[]};
 const period=fromAnchorRow(spec('time'),{uid:'A002',type:'period',label:'["A001"]',attr:range});
 assert.equal(period.range,null);
 const era=fromAnchorRow(spec('time'),{uid:'A003',type:'era',label:'["A002"]',attr:{range}});
 assert.equal(era.range,null);
 const date=fromAnchorRow(spec('time'),{uid:'A001',type:'date',label:'2026-01-01',attr:range});
 assert.equal(date.range,null);
 assert.equal(toAnchorRow(spec('time'),{uid:'A002',type:'period',anchor_ids:['A001'],range}).attr,undefined);
 assert.equal(toAnchorRow(spec('time'),{uid:'A001',type:'date',address:'2026-01-01',range}).attr,undefined);
});
