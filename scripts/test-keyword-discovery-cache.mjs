import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../app/loc/keyword-discovery-cache.mjs',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replaceAll('export function ','function ')
  .replaceAll('export async function ','async function ');
const {encodeKeywordSuggestionCache,decodeKeywordSuggestionCache}=runInNewContext(
  source+';({encodeKeywordSuggestionCache,decodeKeywordSuggestionCache})');

test('Cache is a plain text[] containing only unique candidate words',()=>{
  const stored=encodeKeywordSuggestionCache({read:31,withContent:30,
    dense:{start:'2026-06',end:'2026-09',documents:20},
    candidates:[{word:'都市牢籠',documents:12,sample:'原文'},
      {word:'星辰共鳴',documents:7},{word:'都市牢籠',documents:6}]
  });
  assert.ok(Array.isArray(stored));
  assert.deepEqual([...stored],['都市牢籠','星辰共鳴']);
  assert.ok(stored.every(word=>typeof word==='string'));
  const loaded=decodeKeywordSuggestionCache(stored);
  assert.equal(loaded.cachedOnly,true);
  assert.deepEqual(loaded.candidates.map(row=>row.word),['都市牢籠','星辰共鳴']);
  assert.equal(loaded.candidates[0].documents,undefined);
});

test('NULL cache means no prior scan while empty text[] is a valid scan',()=>{
  assert.equal(decodeKeywordSuggestionCache(null),null);
  const cached=decodeKeywordSuggestionCache(encodeKeywordSuggestionCache({candidates:[]}));
  assert.equal(cached.cachedOnly,true);
  assert.equal(cached.candidates.length,0);
});

test('Cache never writes counts, examples, or more than 120 terms',()=>{
  const value=encodeKeywordSuggestionCache({
    candidates:Array.from({length:200},(_,i)=>({
      word:'候選'+i,documents:5,occurrences:10,sample:'一段隱藏的內文'
    }))
  });
  assert.equal(value.length,120);
  assert.ok(value.every(word=>typeof word==='string'&&!word.includes('隱藏')));
});
