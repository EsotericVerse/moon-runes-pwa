import test from 'node:test';
import assert from 'node:assert/strict';
import {comparableImportText,importSecond,dedupeIncomingImport,findExistingImportDuplicates} from '../app/loc/import-duplicate-check.mjs';

const base={uid:'ABCDEFGH',site:'Threads',createtime:'2026-10-27T15:48:32.000+08:00',content:'天氣真好！\n\n再見。'};
test('Multiple newlines, punctuation, spaces, symbols and fullwidth variants do not create duplicate posts',()=>{
  const result=dedupeIncomingImport([base,
    {...base,uid:'12345678',content:'天氣真好    再見'},
    {...base,uid:'XYXYXYXY',content:'天氣真好！？\r\n\r\n\t再見...'}]);
  assert.equal(result.unique.length,1);
  assert.equal(result.duplicates,2);
  assert.equal(result.aliases.get('12345678'),'ABCDEFGH');
  assert.equal(result.aliases.get('XYXYXYXY'),'ABCDEFGH');
});
test('Same second is required, including timezone normalization; different second/source/text stays separate',()=>{
  const records=[base,
    {...base,uid:'SECOND01',createtime:'2026-10-27T07:48:33Z',content:'天氣真好！ 再見。'},
    {...base,uid:'FACEBOOK',site:'Facebook',content:'天氣真好 再見'},
    {...base,uid:'DIFFTEXT',content:'天氣真的好 再見'}];
  assert.equal(dedupeIncomingImport(records).unique.length,4);
  assert.equal(importSecond(base.createtime),importSecond('2026-10-27T07:48:32.999Z'));
  assert.equal(comparableImportText('AA。\n\nBB!'),comparableImportText('aa bb'));
});
test('Unknown timestamps are never used as a content-only duplicate',()=>{
  const rows=[{...base,uid:'NO-TIME1',createtime:null},{...base,uid:'NO-TIME2',createtime:null}];
  assert.equal(dedupeIncomingImport(rows).unique.length,2);
});
test('Existing duplicates are looked up by exact UTC second within source only',async()=>{
  const queried=[];
  const matches=await findExistingImportDuplicates([
    base,{...base,uid:'OTHER001',createtime:'2026-10-27T15:48:33+08:00'},
    {...base,uid:'FACEBOOK',site:'Facebook'}
  ],{readSeconds:async(source,seconds)=>{
    queried.push([source,seconds]);
    return source==='threads'?[{...base,uid:'SAVED001',createtime:'2026-10-27T07:48:32.700Z'}]:[];
  }});
  assert.equal(matches.get('ABCDEFGH'),'SAVED001');
  assert.equal(matches.has('OTHER001'),false);
  assert.equal(matches.has('FACEBOOK'),false);
  assert.deepEqual(queried.map(x=>x[0]),['threads','facebook']);
});
