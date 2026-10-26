import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {traceAnchorSuggestions,traceAnchorCompletionUid} from '../app/modular/features/trace/trace-anchor-autocomplete.mjs';
import {findAnchorWriteMatches} from '../app/modular/features/trace/trace-organizer.mjs';
import './test-spatial-anchor-references.mjs';
import './test-facebook-backup-place.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const anchors=[
 {uid:'A001',trace_type:'space_anchor',title:'小柏小傑',postal_address:'新北'},
 {uid:'a001',trace_type:'space_anchor',title:'小柏小傑',postal_address:'高雄'},
 {uid:'B002',trace_type:'space_anchor',title:'板橋車站'}
];
test('name-only autocomplete is independent of county',()=>{
 assert.deepEqual(traceAnchorSuggestions(anchors,'小柏').map(x=>x.uid),['A001','a001']);
 assert.deepEqual(traceAnchorSuggestions(anchors,'小柏',['A001']).map(x=>x.uid),['a001']);
 assert.deepEqual(traceAnchorSuggestions(anchors,'小柏',[],1).map(x=>x.uid),['A001']);
 assert.deepEqual(traceAnchorSuggestions(anchors,''),[]);
});
test('single suggestion never auto-selects its UID',()=>{
 assert.equal(traceAnchorCompletionUid(anchors.slice(0,1)),'');
 assert.equal(traceAnchorCompletionUid(anchors,'a001'),'a001');
 assert.equal(traceAnchorCompletionUid(anchors,'Z999'),'');
});
test('React Select and RPC use name rather than county or floor filters',()=>{
 const ui=read('app/loc/TraceManagement.jsx'),route=read('app/loc/TraceRouteManager.jsx');
 const db=read('app/modular/features/trace/trace-data.js');
 assert.match(ui,/import Select from 'react-select'/);
 assert.match(route,/onClick=\{addToSpool\}/);
 assert.match(route,/readAllTraceAnchors\(owner/);
 assert.doesNotMatch(ui+route,/countyOptions|setFloorLevel|setFloorLabel/);
 assert.match(db,/rpc\('search_scope_trace_place_names'/);
 assert.doesNotMatch(db,/county_id|floor_level|floor_label/);
});
test('near-identical anchors never authorize automatic UID reuse',()=>{
 const a={uid:'A001',trace_type:'space_anchor',source_scope:'lo3rwang',title:'同名店',address:[121.5,25]};
 const matches=findAnchorWriteMatches(a,[{...a,uid:'a001'}]);
 assert.equal(matches.length,1);
 assert.equal(matches[0].safeReuse,false);
});
