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
   uid:'0001',type:'date',label:'2026-11-02',attr:{}
 });
 assert.deepEqual(toAnchorRow(spec('trace'),{uid:'T001',trace_type:'space_anchor',address:[121,25],times:[]}),{
   uid:'T001',type:'point',label:'[121,25]'
 });
 assert.deepEqual(toAnchorRow(spec('keywords'),{uid:'K001',type:'item',name:'靈',lists:['心','靈'],uid_lists:{hits:[]}}),{
   uid:'K001',type:'item',title:'靈',label:'["心","靈"]',attr:{total:0,uidlists:[]}
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
test('new date node persists a label and an empty attr',async()=>{
 const saved=[];
 const schema={from:table=>({
   insert:rows=>({select:async()=>{assert.equal(table,'lo3rwang_anchor');saved.push(...(Array.isArray(rows)?rows:[rows]));return {data:[...saved],error:null};}})
 })};
 const r=await unifiedAnchorRelation(schema,spec('time'))
   .insert({uid:'A001',type:'anchor',title:'打卡日期',address:'2026-11-02',invisible:false}).select('uid,address,range');
 assert.equal(saved[0].type,'date');
 assert.equal(saved[0].label,'2026-11-02');
 assert.deepEqual(saved[0].attr,{});
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

test('fixed date ignores accidental interval snapshots, including partial updates',()=>{
 const specTime=spec('time');
 const payload={range:{version:1,segments:[{start_date:'2026-09-23',end_date:'2026-09-23'}]}};
 assert.deepEqual(toAnchorRow(specTime,{uid:'006D',type:'date',address:'2026-09-23',...payload}).attr,{});
 assert.deepEqual(toAnchorRow(specTime,{uid:'006D',type:'anchor',address:'2026-09-23',...payload,attr:{bad:true}}).attr,{});
 assert.deepEqual(toAnchorRow(specTime,{address:'2026-09-23',...payload}).attr,{});
 const period=toAnchorRow(specTime,{uid:'006E',type:'period',anchor_ids:['006D'],...payload});
 assert.deepEqual(period.attr,{});
});

test('Time has no cached attr for date, period, era; Era retains selected period UIDs',()=>{
 const t=spec('time'),range={version:1,segments:[{start_date:'2025-01-01'}]};
 for(const type of ['anchor','period','era']){
  const row={uid:type==='anchor'?'A001':'A002',type,range,attr:{invalid_period_uids:['x']}};
  if(type==='anchor')row.address='2026-09-23';
  else row.anchor_ids=type==='period'?['A001','A005']:['A002','A003'];
  const saved=toAnchorRow(t,row);
  assert.deepEqual(saved.attr,{});
  assert.equal(fromAnchorRow(t,saved).range,null);
  if(type==='era')assert.deepEqual(fromAnchorRow(t,saved).anchor_ids,['A002','A003']);
 }
});
test('Keywords compact each UID only once and preserve one aggregate total',()=>{
 const k=spec('keywords');
 const item=toAnchorRow(k,{uid:'I001',type:'item',name:'靈',lists:['精神'],
  uid_lists:{hits:[{uid:'Ab12Cd34',times:3},{uid:'aB12Cd34',times:2}]}});
 assert.deepEqual(item.attr,{total:5,uidlists:['Ab12Cd34','aB12Cd34']});
 assert.deepEqual(fromAnchorRow(k,item).uid_lists,item.attr);
 const group=toAnchorRow(k,{uid:'G001',type:'group',lists:['I001'],
  uid_lists:{articles:['aB12Cd34','Ab12Cd34','aB12Cd34']}});
 assert.deepEqual(group.attr,{total:2,uidlists:['Ab12Cd34','aB12Cd34']});
 assert.deepEqual(toAnchorRow(k,{uid:'C001',type:'class',lists:['G001'],uid_lists:{}}).attr,{});
});
test('Trace omits only empty JSON, retaining meaningful map relationships',()=>{
 const t=spec('trace');
 const point=toAnchorRow(t,{uid:'P001',trace_type:'space_anchor',address:[121,25],route_list:{routes:[],segments:[],postal_address:''},times:[]});
 assert.equal(point.attr,undefined);
 const postal=toAnchorRow(t,{uid:'P002',trace_type:'space_anchor',address:[121,25],route_list:{routes:[],segments:[],postal_address:'中山路'}});
 assert.deepEqual(postal.attr,{route_list:{postal_address:'中山路'}});
 const trace=toAnchorRow(t,{uid:'T001',trace_type:'trace',anchor_list:['P001','P002'],
  route_list:{routes:['R001'],segments:[['P001','P002']]}});
 assert.deepEqual(trace.attr,{route_list:{routes:['R001'],segments:[['P001','P002']]}});
});

test('Trace update can clear stale route JSON without dropping separate times',async()=>{
 let saved;
 const schema={from:()=>({
  select:()=>({
   eq(){return this},in(){return this},
   maybeSingle:async()=>({data:{uid:'P001',type:'point',attr:{
    route_list:{postal_address:'舊地址'},times:['2026-01-01']
   }},error:null})
  }),
  update(value){
   saved=value;
   return {eq(){return this},in(){return this},
    select:async()=>({data:[{uid:'P001',type:'point',label:'[121,25]',attr:value.attr}],error:null})};
  }
 })};
 await unifiedAnchorRelation(schema,spec('trace'))
  .update({route_list:{routes:[],segments:[],postal_address:''}})
  .eq('uid','P001').select('uid,route_list');
 assert.deepEqual(saved.attr,{times:['2026-01-01']});
});
