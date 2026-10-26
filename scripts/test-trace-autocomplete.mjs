import test from 'node:test';
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
 assert.match(manager,/setQueue\(ids=>\[\.\.\.ids,choice\.uid\]\)/);
 assert.match(manager,/onClick=\{addPoint\}>＋/);
 assert.match(manager,/setPointQuery\(event\.target\.value\);setPicked\(null\)/);
 assert.match(storage,/uid\.eq\./);
 assert.match(storage,/county_id:await countyIdAt\(longitude,latitude\)/);
 assert.match(storage,/county_id:traceCountyId\(countyForCoordinates\(place\.longitude,place\.latitude\)\)/);
 assert.match(storage,/anchor_uids:chosen/);
});

test('same-name candidate list stays capped at eight; exact UID is a separate server lookup',()=>{
 const crowds=Array.from({length:15},(_,index)=>({
   uid:'X'+String(index).padStart(7,'0'),trace_type:'anchor',
   county_id:'TW-NWT',title:'同名店',
   description:'地址：新北市板橋區第'+index+'路'
 }));
 assert.equal(traceAnchorSuggestions(crowds,'TW-NWT','同名店').length,8);
 assert.ok(read('app/modular/features/trace/trace-data.js').includes("'title.ilike.'+pattern+',uid.eq.'+q"));
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
