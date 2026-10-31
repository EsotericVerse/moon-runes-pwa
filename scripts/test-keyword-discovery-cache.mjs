import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../app/loc/keyword-discovery-cache.mjs',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replaceAll('export function ','function ')
  .replaceAll('export async function ','async function ');
const codec=runInNewContext(source+';({encodeKeywordSuggestionCache,decodeKeywordSuggestionCache})');
test('Cache is one JSONB-compatible array, with summary and term records',()=>{
  const result={read:31,withContent:30,limited:false,
    dense:{start:'2026-06',end:'2026-09',documents:20,novelPerArticle:4.2},
    sparse:{start:'2026-01',end:'2026-05',documents:11,existingRatio:0.75},
    overallExistingRatio:0.8,
    candidates:[{word:'都市牢籠',documents:12,occurrences:15,denseDocuments:10,
      language:'zh',trendChanges:1,sample:'在都市牢籠裡面'}]
  };
  const stored=codec.encodeKeywordSuggestionCache(result,'2026-10-31T10:00:00.000Z');
  assert.ok(Array.isArray(stored));
  assert.equal(stored[0].kind,'summary');
  assert.equal(stored[1].kind,'suggestion');
  const reloaded=codec.decodeKeywordSuggestionCache(stored);
  assert.equal(reloaded.read,31);
  assert.equal(reloaded.sparse.existingRatio,0.75);
  assert.equal(reloaded.dense.start,'2026-06');
  assert.equal(reloaded.candidates[0].word,'都市牢籠');
  assert.equal(reloaded.candidates[0].denseDocuments,10);
  assert.equal(reloaded.scannedAt,'2026-10-31T10:00:00.000Z');
});
test('NULL means no cache; an empty candidate list is still a valid saved scan',()=>{
  assert.equal(codec.decodeKeywordSuggestionCache(null),null);
  const value=codec.decodeKeywordSuggestionCache(codec.encodeKeywordSuggestionCache({
    read:3,withContent:3,candidates:[]
  }));
  assert.ok(value);
  assert.equal(value.read,3);
  assert.equal(value.candidates.length,0);
});
test('Cache restricts stored excerpts and proposal count',()=>{
  const value=codec.encodeKeywordSuggestionCache({read:200,withContent:200,
    candidates:Array.from({length:200},(_,i)=>({
      word:'候選'+i,documents:5,occurrences:5,
      sample:'字'.repeat(900)
    }))
  });
  assert.equal(value.length,121);
  assert.ok(value[1].sample.length<=160);
});
