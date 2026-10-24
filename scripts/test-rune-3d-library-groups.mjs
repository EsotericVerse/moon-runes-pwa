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

test('3D atlas queries only the selected group, not all 67 cards',()=>{
  assert.ok(librarySource.includes("filters:[{column:'rune_id',operator:'in',value:ids}]"));
  assert.ok(librarySource.includes('limit:ids.length,offset:0'));
  assert.ok(!librarySource.includes('limit:67,offset:0'));
  assert.ok(!librarySource.includes('next.length!==67'));
});

test('3D atlas supports the same #group-6 and rune deep-links as 2D',()=>{
  assert.ok(librarySource.includes('window.location.hash'));
  assert.ok(librarySource.includes("addEventListener('hashchange',syncLocation)"));
  assert.ok(librarySource.includes("addEventListener('popstate',syncLocation)"));
  assert.ok(librarySource.includes("'#group-'+entry.id"));
  assert.ok(librarySource.includes("'#group-'+groupId+'/rune-'+runeId"));
});
