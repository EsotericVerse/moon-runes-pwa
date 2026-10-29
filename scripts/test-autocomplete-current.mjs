import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {currentTop10,currentPopularOptions,currentPlaceCounts} from '../app/loc/autocomplete-current.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const space=Array.from({length:15},(_,i)=>({
  uid:'P'+String(i).padStart(3,'0'),title:i<2?'同名地點':'地點'+i,count:100-i
}));
const snapshot={space,time:[{uid:'T1',count:9},{uid:'T2',count:3}],
  event:[{uid:'E1',count:2}]};

test('Scope popular suggestions never exceed ten and do not mutate rankings',()=>{
  assert.equal(currentTop10(snapshot,'space').length,10);
  assert.equal(currentTop10(snapshot,'time').length,2);
  assert.equal(currentTop10(null,'space').length,0);
  assert.equal(currentPlaceCounts(snapshot).length,15);
  assert.equal(space.length,15);
});
test('UID, not a duplicate location name, determines option identity',()=>{
  const options=space.map(row=>({value:row.uid,label:row.title}));
  const top=currentPopularOptions(options.reverse(),snapshot,'space');
  assert.deepEqual(top.map(row=>row.value),space.slice(0,10).map(row=>row.uid));
  assert.equal(top[0].label,top[1].label);
  assert.notEqual(top[0].value,top[1].value);
});
test('available candidates constrain top ten without a new DB scan',()=>{
  const options=[{value:'P008',label:'a'},{value:'P003',label:'b'},
    {value:'P011',label:'outside top ten'}];
  assert.deepEqual(currentPopularOptions(options,snapshot,'space').map(x=>x.value),['P003','P008']);
});
test('every spatial and temporal autocomplete uses the double-click wrapper',()=>{
  const anchor=read('app/loc/TraceManagement.jsx');
  const route=read('app/loc/TraceRouteManager.jsx');
  const time=read('app/modular/features/CultureTimelineEditor.jsx');
  const select=read('app/loc/PopularSelect.jsx');
  assert.match(anchor,/<PopularSelect scopeId=\{scopeId\} kind="space"/);
  assert.equal((route.match(/<PopularSelect scopeId=\{owner\} kind="space"/g)||[]).length,2);
  assert.equal((time.match(/<PopularSelect scopeId=\{dataScope\}/g)||[]).length,4);
  assert.match(select,/onDoubleClick=\{openPopular\}/);
  assert.match(select,/inputValue=\{inputText\}/);
  assert.match(select,/currentPopularOptions\(options,snapshot,kind\)/);
});
test('search/map/input autocomplete and management refresh retain Scope boundaries',()=>{
  const search=read('app/modular/features/Search.jsx');
  const map=read('app/modular/features/trace/TraceMap.jsx');
  const manage=read('app/loc/TraceOrganizer.jsx');
  const batch=read('app/loc/PlaceBatchFill.jsx');
  assert.match(search,/onDoubleClick=\{\(\)=>setSearchPopularOpen\(true\)\}/);
  assert.match(map,/onDoubleClick=\{openPopularAnchors\}/);
  assert.match(manage,/refreshAutocompleteCurrent\(scopeId\)/);
  assert.match(manage,/onToggle=\{event=>\{if\(event.currentTarget.open\)void loadAllCounts\(\);\}\}/);
  assert.match(batch,/onDoubleClick=\{openPopular\}/);
});
test('cached statistics are gated by RLS, exact place identity, and manual refresh',()=>{
  const sql=read('supabase/migrations/20261027132000_scope_autocomplete_current_top10.sql');
  assert.match(sql,/SECURITY INVOKER/);
  assert.match(sql,/silver\.can_manage_scope\(v_id\)/);
  assert.match(sql,/a\.name_matches=1/);
  assert.equal((sql.match(/LIMIT 10\) popular/g)||[]).length,3);
  assert.match(sql,/g\.place_id/);
  assert.match(sql,/g\.location/);
  assert.match(sql,/g\.createtime/);
  assert.doesNotMatch(sql,/UPDATE %s g SET|DELETE FROM silver\..*_galaxy/);
});
