import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const editor=readFileSync(new URL('../app/modular/features/CultureTimelineEditor.jsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../app/styles/features.css',import.meta.url),'utf8');

test('time_period start/end anchors use React Select autocomplete, not plain <select>',()=>{
  assert.ok(editor.includes("import Select from 'react-select'"));
  assert.match(editor,/anchorOptions=useMemo\(\(\)=>anchorChoices\.map\(row=>/);
  assert.match(editor,/options=\{anchorOptions\}/);
  assert.match(editor,/options=\{anchorOptions\.filter\(option=>option\.value!==segment\.start\)\}/);
});

test('time_trace accepts either picking existing events or connecting anchors directly',()=>{
  assert.match(editor,/const \[tracePairs,setTracePairs\]=useState\(\[\]\)/);
  assert.match(editor,/const addPair=\(\)=>\{/);
  assert.match(editor,/const removePair=index=>setTracePairs/);
  assert.match(editor,/draft\.type==='time_trace'&&!segments\.length&&!tracePairs\.length/);
});

test('anchor pairs reuse an existing time_period by anchor-id set instead of duplicating it',()=>{
  assert.match(editor,/const periodKeyOf=ids=>\[\.\.\.ids\]\.sort\(\)\.join\(','\)/);
  assert.match(editor,/const existingPeriodByPair=useMemo\(\(\)=>\{/);
  assert.match(editor,/existingPeriodByPair\.get\(periodKeyOf\(pair\)\)/);
});

test('new periods created from connected pairs use the canonical allocator and segment encoder',()=>{
  assert.ok(editor.includes("allocateTimeUid} from '../../loc/time-anchor-ranges.mjs'"));
  assert.match(editor,/const uid=allocateTimeUid\(\[\.\.\.all,\.\.\.extraPeriodRows\]\)/);
  assert.match(editor,/anchor_ids:encodeTimeSegment\(a,b\)/);
  assert.match(editor,/if\(extraPeriodRows\.length\)await insertRows\(timeTable,extraPeriodRows\)/);
});

test('time_trace anchor_ids still mixes picked-period uids with pair-derived period uids, point-line-plane intact',()=>{
  assert.match(editor,
    /payload\.anchor_ids=draft\.type==='time_trace'\s*\n\s*\?\[\.\.\.segments\.map\(segment=>segment\.start\),\.\.\.pairPeriodUids\]/);
});

test('invalid/stale anchors in a connected pair are rejected before save, not silently dropped',()=>{
  assert.match(editor,/if\(tracePairs\.some\(pair=>!anchors\.has\(pair\[0\]\)\|\|!anchors\.has\(pair\[1\]\)\)\)/);
  assert.match(editor,/throw new Error\('連線的定錨點有已失效的，請移除'\)/);
});

test('the display labels map time_trace to 時代 and time_period to 期間',()=>{
  assert.match(editor,/time_trace:'時代'/);
  assert.match(editor,/time_period:'期間'/);
  assert.doesNotMatch(editor,/時期/);
});

test('connect-anchors UI has its own styled block, not reusing the plain segment rows unstyled',()=>{
  assert.match(styles,/\.scope-culture-quick-anchor-connect\{/);
  assert.match(styles,/\.scope-culture-quick-anchor-connect-item\{/);
});
