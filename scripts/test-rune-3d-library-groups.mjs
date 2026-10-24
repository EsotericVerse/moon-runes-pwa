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
