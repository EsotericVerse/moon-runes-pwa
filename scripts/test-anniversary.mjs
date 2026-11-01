import test from 'node:test';
import assert from 'node:assert/strict';
import {anniversarySuggestionsForDate} from '../app/loc/anniversary.mjs';
import {readFileSync} from 'node:fs';

const anchors=[
  {uid:'AB12',type:'anchor',title:'重要日',address:'2020-10-16'},
  {uid:'AB13',type:'anchor',title:'不相關',address:'2024-11-16'},
  {uid:'AB14',type:'anchor',title:'閏年日',address:'2024-02-29'}
];
test('anniversary is a virtual suggestion for NEW anchor creation, not an automatic saved event',()=>{
  assert.deepEqual(anniversarySuggestionsForDate('2026-10-16',anchors),[
    {date:'2026-10-16',years:6,sourceUid:'AB12',sourceDate:'2020-10-16',
      sourceTitle:'重要日',title:'重要日 · 6 週年'}
  ]);
  assert.deepEqual(anniversarySuggestionsForDate('2020-10-16',anchors),[]);
});
test('existing dates do not suggest duplicate anchors',()=>{
  assert.deepEqual(anniversarySuggestionsForDate('2020-10-16',anchors),[]);
});
test('leap day is suggested only in real leap years',()=>{
  assert.equal(anniversarySuggestionsForDate('2028-02-29',anchors)[0].years,4);
  assert.deepEqual(anniversarySuggestionsForDate('2027-02-29',anchors),[]);
});
test('articles show actual Time/Trace links, NOT fake persisted anniversaries',()=>{
  const ui=readFileSync(new URL('../app/modular/ui.jsx',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../app/modular/features/CultureTimelineEditor.jsx',import.meta.url),'utf8');
  const galaxy=readFileSync(new URL('../app/loc/galaxy-query.js',import.meta.url),'utf8');
  assert.match(ui,/row\('定錨'/);
  assert.match(ui,/row\('期間'/);
  assert.match(ui,/row\('時代'/);
  assert.doesNotMatch(ui,/row\('週年紀念'/);
  assert.match(editor,/anniversarySuggestionsForDate/);
  assert.match(editor,/套用建議/);
  assert.match(galaxy,/columns:'uid,title,address'/);
  assert.match(galaxy,/column:'address',operator:'eq',value:day/);
  assert.match(galaxy,/articleSpaceContext\(current,placeId/);
});
test('Scope birthday is suggested without an existing birthday Time row',()=>{
  const matches=anniversarySuggestionsForDate('2026-06-23',anchors,{birthday:'1980-06-23'});
  assert.equal(matches.length,1);
  assert.equal(matches[0].title,'生日 · 46 歲');
  assert.equal(matches[0].sourceUid,'birthday');
  assert.deepEqual(anniversarySuggestionsForDate('2026-06-24',anchors,{birthday:'1980-06-23'}),[]);
});
test('existing exact anchors suppress birthday and annual duplicates',()=>{
  assert.deepEqual(anniversarySuggestionsForDate('2026-06-23',[
    ...anchors,{uid:'F00A',type:'anchor',title:'已建立',address:'2026-06-23'}
  ],{birthday:'1980-06-23'}),[]);
});
test('lookup handles many records once and does not suggest a fictitious leap day',async()=>{
  const {createAnniversaryLookup}=await import('../app/loc/anniversary.mjs');
  const lookup=createAnniversaryLookup(anchors,{birthday:'1980-02-29'});
  assert.equal(lookup('2028-02-29')[0].sourceUid,'birthday');
  assert.deepEqual(lookup('2027-02-29'),[]);
  assert.deepEqual(lookup('2019-10-16'),[]);
});
