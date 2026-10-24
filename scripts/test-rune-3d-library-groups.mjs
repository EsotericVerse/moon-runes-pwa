import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const librarySource=await readFile(new URL('../app/lrunes/Rune3DLibrary.jsx',import.meta.url),'utf8');
const directorySource=await readFile(new URL('../app/lrunes/rune-directory.mjs',import.meta.url),'utf8');

test('3D rune atlas renders cards from the canonical group membership function',()=>{
  assert.match(librarySource,/runeslist:\s*runeNumbersForGroup\(entry\.id\)/);
  assert.doesNotMatch(librarySource,/entry\.(start|end)/);
  assert.match(librarySource,/allRunes\.filter\(rune=>inGroup\(rune,group\)\)/);
  assert.match(librarySource,/RuneArtStage mode="runes" items=\{runes\}/);
});

test('canonical groups include all 67 catalog cards (including rune zero)',()=>{
  // Guard the canonical source, not another hard-coded mapping in the component.
  assert.match(directorySource,/if\(id===9\)return \[0,65,66\]/);
  assert.match(directorySource,/const start=\(id-1\)\*8\+1/);
  assert.match(directorySource,/Array\.from\(\{length:8\}/);
});

test('3D atlas fetches only selected group IDs just like the 2D catalog',()=>{
  assert.match(librarySource,/filters:\\[\\{column:'rune_id',operator:'in',value:ids\\}\\]/);
  assert.match(librarySource,/limit:ids\\.length,offset:0/);
  assert.doesNotMatch(librarySource,/limit:67,offset:0/);
  assert.doesNotMatch(librarySource,/next\\.length!==67/);
});

test('2D to 3D switch preserves group deep-links including group six',()=>{
  assert.match(librarySource,/window\\.location\\.hash/);
  assert.match(librarySource,/addEventListener\\('hashchange',syncLocation\\)/);
  assert.match(librarySource,/addEventListener\\('popstate',syncLocation\\)/);
  assert.match(librarySource,/'#group-'\\+entry\\.id/);
  assert.match(librarySource,/'#group-'\\+groupId\\+'\\/rune-'\\+runeId/);
});
