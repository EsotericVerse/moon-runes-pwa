import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import './test-spatial-anchor-references.mjs';
import './test-facebook-backup-place.mjs';
import {traceAnchorSuggestions,traceAnchorCompletionUid} from '../app/modular/features/trace/trace-anchor-autocomplete.mjs';
import {findAnchorWriteMatches} from '../app/modular/features/trace/trace-organizer.mjs';

const anchors=[
 {uid:'A001',source_scope:'lo3rwang',trace_type:'space_anchor',title:'小柏小傑',postal_address:'臺北'},
 {uid:'a001',source_scope:'lo3rwang',trace_type:'space_anchor',title:'小柏小傑',postal_address:'高雄'},
 {uid:'B002',source_scope:'lo3rwang',trace_type:'space_anchor',title:'板橋車站'},
 {uid:'C003',source_scope:'lo3rwang',trace_type:'space_anchor',title:'無縣市地點'}
];
test('location autocomplete requires no county, GPS, floor or address',()=>{
 assert.deepEqual(traceAnchorSuggestions(anchors,'小柏').map(x=>x.uid),['A001','a001']);
 assert.deepEqual(traceAnchorSuggestions(anchors,'無縣市').map(x=>x.uid),['C003']);
 assert.deepEqual(traceAnchorSuggestions(anchors,'板橋').map(x=>x.uid),['B002']);
 assert.deepEqual(traceAnchorSuggestions(anchors,'').map(x=>x.uid),[]);
});
test('same names remain distinct and never select a candidate implicitly',()=>{
 const matches=traceAnchorSuggestions(anchors,'小柏');
 assert.equal(traceAnchorCompletionUid(matches),'');
 assert.equal(traceAnchorCompletionUid(matches,'a001'),'a001');
 assert.equal(traceAnchorCompletionUid(matches,'A001'),'A001');
 assert.equal(traceAnchorCompletionUid(matches,'other'),'');
});
test('autocomplete caps results and excludes explicitly selected UIDs',()=>{
 const sample=Array.from({length:18},(_,i)=>({uid:'X'+String(i).padStart(3,'0'),trace_type:'space_anchor',title:'重複名稱'}));
 assert.equal(traceAnchorSuggestions(sample,'重複',[],8).length,8);
 assert.deepEqual(traceAnchorSuggestions(sample,'重複',['X000'],2).map(x=>x.uid),['X001','X002']);
});
test('same name or position never silently reuses another anchor UID',()=>{
 const a={uid:'A001',source_scope:'lo3rwang',trace_type:'space_anchor',title:'某商店',
   postal_address:'文化路',address:[121.5,25.1]};
 const b={...a,uid:'a001'};
 const result=findAnchorWriteMatches(a,[b]);
 assert.equal(result.length,1);
 assert.equal(result[0].safeReuse,false);
});
test('route composer offers React Select and does not require a county selector',()=>{
 const source=readFileSync(new URL('../app/loc/TraceRouteManager.jsx',import.meta.url),'utf8');
 assert.ok(source.includes("import Select from 'react-select'"));
 assert.ok(source.includes('onClick={addToSpool}'));
 assert.ok(!source.includes('selectedCounty'));
 assert.ok(!source.includes('county_id'));
});
