import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('shared Article summary never renders check-in metadata',()=>{
  const source=read('app/modular/Article.jsx');
  assert.doesNotMatch(source,/checkIn=\{checkInPlace/);
  assert.match(source,/attributeFields=\{attributeFields\}/);
});

test('Search hides location in all result cards, suggestions and public searches',()=>{
  const source=read('app/modular/features/Search.jsx');
  assert.doesNotMatch(source,/checkInPlace=\{row\.checkInPlace\}/);
  assert.doesNotMatch(source,/已有打卡地點：'\+row\.checkInPlace/);
  assert.doesNotMatch(source,/suggestedPlaces/);
  assert.match(source,/placeOnly:managementMode&&Boolean\(options\.placeOnly\)/);
  assert.match(source,/attributeFields=\{managementMode&&editable\?/);
});

test('both Galaxy location attributes are visible only inside management article editor',()=>{
  const search=read('app/modular/features/Search.jsx');
  const draft=read('app/modular/features/search-edit-draft.js');
  assert.match(search,/location,place_id,searchable/);
  assert.match(search,/'location','place_id'/);
  assert.match(draft,/place_id:String\(row\.place_id\|\|''\)/);
  assert.match(draft,/changed\.place_id=next\|\|null/);
});

test('public search metadata reads never request location',()=>{
  const source=read('app/loc/galaxy-query.js');
  assert.doesNotMatch(source,/columns:'uid,title,createtime,location/);
  assert.doesNotMatch(source,/columns:'uid,title,site,location/);
});

test('trace article report omits place label and sensitive metadata',()=>{
  const report=read('app/modular/features/trace/TracePlaceResults.jsx');
  const trace=read('app/modular/features/Trace.jsx');
  assert.doesNotMatch(report,/checkInPlace=|site,location|<h2>\{name\}<\/h2>/);
  assert.match(report,/tab!=='articles'&&!sourceFilter/);
  assert.doesNotMatch(trace,/<strong>\{reportPlace\.title\}<\/strong>/);
});
