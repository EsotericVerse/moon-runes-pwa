import test from 'node:test';
// Existing bootstrap test suite includes the full spatial-anchor regression tests.
import './test-spatial-anchor-references.mjs';
// Exercise the real Facebook JSON/ZIP import path in the bootstrap gate.
import './test-facebook-backup-place.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {traceAnchorSuggestions,traceAnchorCompletionUid} from '../app/modular/features/trace/trace-anchor-autocomplete.mjs';
import {traceCountyId,traceCountyName} from '../app/modular/features/trace/trace-county-id.mjs';
import {groupTraceAnchorsByCountyId} from '../app/modular/features/trace/trace-spatial-classification.mjs';
import {findAnchorWriteMatches} from '../app/modular/features/trace/trace-organizer.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

const sample=[
 {uid:'AAAA0001',trace_type:'anchor',county_id:'TW-NWT',title:'小柏小傑',latitude:25.0,longitude:121.4},
 {uid:'AAAA0002',trace_type:'anchor',county_id:'TW-NWT',title:'小柏小傑',latitude:25.1,longitude:121.5},
 {uid:'BBBB0001',trace_type:'anchor',county_id:'TW-TPE',title:'小柏小傑',latitude:25.06,longitude:121.5},
 {uid:'CCCC0001',trace_type:'anchor',county_id:'TW-NWT',title:'板橋車站',latitude:25.0,longitude:121.4}
];

test('county IDs roundtrip with stable ISO identifiers, independent of labels',()=>{
 assert.equal(traceCountyId('新北市'),'TW-NWT');
 assert.equal(traceCountyId('台北市'),'TW-TPE');
 assert.equal(traceCountyName('TW-NWT'),'新北市');
 assert.equal(traceCountyId('somewhere'),null);
});
test('same-name collisions stay distinct, never automatically choose first',()=>{
 const matches=traceAnchorSuggestions(sample,'TW-NWT','小柏');
 assert.deepEqual(matches.map(x=>x.uid),['AAAA0001','AAAA0002']);
 assert.equal(traceAnchorCompletionUid(matches), '');
 assert.equal(traceAnchorCompletionUid(matches,'AAAA0002'),'AAAA0002');
 assert.equal(traceAnchorCompletionUid(matches,'BBBB0001'),'');
});
test('county partition precedes completion; query matches substrings and caps suggestions',()=>{
 assert.deepEqual(traceAnchorSuggestions(sample,'TW-TPE','小柏').map(x=>x.uid),['BBBB0001']);
 assert.equal(traceAnchorCompletionUid(traceAnchorSuggestions(sample,'TW-TPE','小柏')),'BBBB0001');
 assert.deepEqual(traceAnchorSuggestions(sample,'TW-NWT','板',[],8).map(x=>x.uid),['CCCC0001']);
 assert.equal(traceAnchorSuggestions(sample,'TW-NWT','').length,0);
 assert.equal(traceAnchorSuggestions(sample,'TW-NWT','小柏',[],1).length,1);
 assert.deepEqual(traceAnchorSuggestions(sample,'TW-NWT','小柏',['AAAA0001']).map(x=>x.uid),['AAAA0002']);
});
test('county grouping retains distinct UIDs and does not silently merge same names',()=>{
 const groups=groupTraceAnchorsByCountyId(sample);
 assert.equal(groups.get('TW-NWT').length,3);
 assert.equal(groups.get('TW-TPE').length,1);
 assert.notEqual(groups.get('TW-NWT')[0].uid,groups.get('TW-NWT')[1].uid);
});
test('Frame editor queries by county + name or UID and adds only on explicit plus',()=>{
 const manager=read('app/loc/TraceRouteManager.jsx');
 const storage=read('app/modular/features/trace/trace-data.js');
 assert.match(manager,/readTraceAnchorSuggestions\(activeScope,county,debouncedQuery,8\)/);
 assert.match(manager,/setQueue\(ids=>ids.includes\(choice.uid\)\?ids:\[\.\.\.ids,choice.uid\]\)/);
 assert.match(manager,/onClick=\{addPoint\}>＋/);
 assert.match(manager,/setPointQuery\(event\.target\.value\);setPicked\(null\)/);
 assert.match(storage,/uid\.eq\./);
 assert.match(storage,/county_id:await countyIdAt\(longitude,latitude,address\)/);
 assert.match(storage,/county_id:countyIdFromAddress\(place\.address\)/);
 assert.match(storage,/anchor_uids:chosen/);
});

test('same-name candidate list stays capped at eight; exact UID is a separate server lookup',()=>{
 const crowds=Array.from({length:15},(_,index)=>({
   uid:'X'+String(index).padStart(7,'0'),trace_type:'anchor',
   county_id:'TW-NWT',title:'同名店',
   description:'地址：新北市板橋區第'+index+'路'
 }));
 assert.equal(traceAnchorSuggestions(crowds,'TW-NWT','同名店').length,8);
 assert.match(read('app/modular/features/trace/trace-data.js'),/filters\.push\('uid\.eq\.'\+q\)/);
 assert.match(read('app/loc/TraceRouteManager.jsx'),/UID \{anchor\.uid\}/);
});
test('same address but different business names are never safe for automatic reuse',()=>{
 const previous={uid:'OLD12345',trace_type:'anchor',source_scope:'lo3rwang',title:'舊餐廳',
   latitude:25,longitude:121.5,description:'地址：新北市板橋區一號'};
 const next={...previous,uid:'NEW12345',title:'新餐廳'};
 const matches=findAnchorWriteMatches(next,[previous]);
 assert.equal(matches.length,1);
 assert.equal(matches[0].type,'same-address');
 assert.equal(matches[0].safeReuse,false);
});
test('same names at different locations remain independent spatial anchors',()=>{
 const previous={uid:'OLD12345',trace_type:'anchor',source_scope:'lo3rwang',title:'小柏小傑',
   latitude:25,longitude:121.5,description:''};
 const next={...previous,uid:'NEW12345',longitude:121.51};
 const matches=findAnchorWriteMatches(next,[previous]);
 assert.equal(matches.length,1);
 assert.equal(matches[0].safeReuse,false);
 const storage=read('app/modular/features/trace/trace-data.js');
 assert.doesNotMatch(storage,/distinctTitleOrThrow/);
 assert.doesNotMatch(storage,/if\(check\.byName/);
});

test('vertical floor identity preserves downstairs and upstairs within one 2D coordinate',()=>{
 const source=read('app/modular/features/trace/trace-data.js');
 const match=source.match(/function locationFields\([\s\S]*?\n\}/);
 assert.ok(match,'locationFields must remain an executable validator');
 const locationFields=new Function(match[0]+';return locationFields')();
 assert.deepEqual(locationFields({address:'新北市永和區仁愛路152號B1'}),
   {address:'新北市永和區仁愛路152號B1',floor_label:'B1',floor_level:-1});
 assert.deepEqual(locationFields({address:'新北市某區某路100號2樓'}),
   {address:'新北市某區某路100號2樓',floor_label:'2樓',floor_level:2});
 assert.deepEqual(locationFields({address:'新北市中和區中山路291號3–4樓'}),
   {address:'新北市中和區中山路291號3–4樓',floor_label:'3–4樓',floor_level:null});
 assert.deepEqual(locationFields({address:'未知道路'}),{address:'未知道路',floor_label:'',floor_level:null});
 assert.throws(()=>locationFields({floor_level:'3.5'}),/樓層序號/);
 assert.match(source,/county_id:await countyIdAt\(longitude,latitude,address\),\s*\.\.\.locationFields/);
 assert.match(source,/address,floor_label,floor_level/);
});
test('full address and different floors prevent spatial ID auto reuse',()=>{
 const a={uid:'AAA11111',trace_type:'anchor',source_scope:'lo3rwang',title:'某大樓商店',
   address:'新北市某區某路100號',floor_label:'B1',floor_level:-1,latitude:25,longitude:121.5};
 const b={...a,uid:'BBB22222',floor_label:'2樓',floor_level:2};
 const matches=findAnchorWriteMatches(a,[b]);
 assert.equal(matches.length,1);
 assert.equal(matches[0].type,'different-floor');
 assert.equal(matches[0].safeReuse,false);
 assert.equal(matches[0].canMerge,false);
 const sameName={...a,uid:'CCC33333'};
 const duplicate=findAnchorWriteMatches(a,[sameName]);
 assert.equal(duplicate.length,1);
 assert.equal(duplicate[0].safeReuse,false,'UID identity cannot be implied by coordinates and label');
 const manager=read('app/loc/TraceManagement.jsx');
 const engine=read('app/modular/features/trace/trace-map-engine.js');
 assert.match(manager,/setFloorLevel/);
 assert.match(manager,/setFloorLabel/);
 assert.match(manager,/setAddress/);
 assert.match(manager,/floor_level:floorLevel/);
 assert.match(engine,/floor_label:String\(a\.floor_label/);
});

test('postal city wins over GPS county boundary when known',()=>{
 const source=read('app/modular/features/trace/trace-data.js');
 const countyId=(name)=>({'新北市':'TW-NWT','臺北市':'TW-TPE'}[name]||null);
 const match=source.match(/function countyIdFromAddress\([\s\S]*?\n\}/);
 assert.ok(match);
 const decide=new Function('traceCountyId',match[0]+';return countyIdFromAddress')(countyId);
 assert.equal(decide('新北市板橋區文化路100號2樓'),'TW-NWT');
 assert.equal(decide('臺北市中山區南京東路10號B1'),'TW-TPE');
 assert.equal(decide(''),null);
});

test('own-anchor search includes complete postal addresses and distinguishes floors',()=>{
 const rows=[
   {uid:'FLR00001',trace_type:'anchor',county_id:'TW-NWT',title:'同名店',address:'新北市板橋區文化路100號',floor_label:'B1'},
   {uid:'FLR00002',trace_type:'anchor',county_id:'TW-NWT',title:'同名店',address:'新北市板橋區文化路100號',floor_label:'2樓'}
 ];
 assert.deepEqual(traceAnchorSuggestions(rows,'TW-NWT','文化路').map(x=>x.uid),['FLR00001','FLR00002']);
 assert.deepEqual(traceAnchorSuggestions(rows,'TW-NWT','B1').map(x=>x.uid),['FLR00001']);
 assert.equal(traceAnchorCompletionUid(traceAnchorSuggestions(rows,'TW-NWT','同名店')),'');
});

test('unknown postal county is never guessed from coordinates during new writes',()=>{
 const db=read('app/modular/features/trace/trace-data.js');
 assert.match(db,/return countyIdFromAddress\(address\);/);
 assert.doesNotMatch(db,/countyIdFromAddress\(place\.address\)\|\|traceCountyId\(countyForCoordinates/);
 assert.match(db,/county_id:countyIdFromAddress\(place\.address\)/);
});

test('editing a legacy addressless anchor preserves its stored county ID',async()=>{
 const source=read('app/modular/features/trace/trace-data.js');
 const match=source.match(/export async function updateTraceAnchor[\s\S]*?(?=\nfunction validatedTraceMapValues)/);
 assert.ok(match,'actual updateTraceAnchor implementation is available');
 const writes=[];
 const query={
   eq(){return this;},
   select(){return {single:async()=>({data:{uid:'ABCDEFG1'},error:null})};}
 };
 const dbAuthRelation=()=>({update:values=>{writes.push(values);return query;}});
 const deps={
   sourceId:x=>x,
   validCoordinates:()=>true,validRadius:()=>true,
   verifiedText:x=>x,descriptionText:x=>x,
   countyIdFromAddress:address=>address.startsWith('新北市')?'TW-NWT':null,
   locationFields:x=>x,
   inspectTraceAnchorBeforeWrite:async()=>({reuse:null}),
   dbAuthRelation,relation:x=>x,verified:result=>result.data
 };
 const update=new Function(...Object.keys(deps),
   match[0].replace('export async function','async function')+';return updateTraceAnchor;')
   (...Object.values(deps));
 await update({scopeId:'lo3rwang',uid:'ABCDEFG1',title:'更名',address:'',
   longitude:121.5,latitude:25});
 assert.equal(Object.hasOwn(writes[0],'county_id'),false,
   'editing without verified address must not clear historical county_id');
 await update({scopeId:'lo3rwang',uid:'ABCDEFG1',title:'更名',address:'新北市板橋區文化路100號',
   longitude:121.5,latitude:25});
 assert.equal(writes[1].county_id,'TW-NWT');
});
