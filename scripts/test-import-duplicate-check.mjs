import test from 'node:test';
import assert from 'node:assert/strict';
import {comparableImportText,importSecond,dedupeIncomingImport,findExistingImportDuplicates,matchExistingWithoutCreatedAt} from '../app/loc/import-duplicate-check.mjs';

const base={uid:'ABCDEFGH',site:'Threads',createtime:'2026-10-27T15:48:32.000+08:00',content:'天氣真好！\n\n再見。'};
test('Threads generated titles do not change duplicate identity',()=>{
  const result=dedupeIncomingImport([base,
    {...base,uid:'SAME0001',createtime:'2026-10-27T07:48:32.999Z'},
    {...base,uid:'TEXT0001',content:'天氣真好    再見'},
    {...base,uid:'PUNC0001',content:'天氣真好！？\\r\\n再見...'},
    {...base,uid:'TITLE001',title:'原創標題'},
    {...base,uid:'PLACE001',location:'台北車站'},
    {...base,uid:'MEDIA001',media_link:['A1234567']},
    {...base,uid:'STATE001',searchable:false}
  ]);
  assert.equal(result.unique.length,6);
  assert.equal(result.duplicates,2);
  assert.equal(result.aliases.get('TITLE001'),'ABCDEFGH');
  assert.equal(result.aliases.get('SAME0001'),'ABCDEFGH');
  for(const uid of ['TEXT0001','PUNC0001','PLACE001','MEDIA001','STATE001'])
    assert.equal(result.aliases.get(uid),uid);
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
test('Without createdAt, compare all other fields but never collapse another platform',()=>{
  const missing={...base,uid:'NO-TIME1',createtime:null};
  const rows=[missing,
    {...missing,uid:'NO-TIME2'},
    {...missing,uid:'NO-TIME3',site:'Facebook'},
    {...missing,uid:'NO-TIME4',content:'另一篇文章'}];
  const result=dedupeIncomingImport(rows);
  assert.equal(result.unique.length,3);
  assert.equal(result.aliases.get('NO-TIME2'),'NO-TIME1');
  assert.equal(result.aliases.get('NO-TIME3'),'NO-TIME3');
  assert.equal(result.aliases.get('NO-TIME4'),'NO-TIME4');
});
test('The complete incoming archive matches its missing-time copy to a dated post without deleting other dated posts',()=>{
  const missing={...base,uid:'NO-TIME1',createtime:null};
  const datedSecond={...base,uid:'SAME0002',createtime:'2026-10-28T07:48:32Z'};
  const records=[missing,base,datedSecond,{...missing,uid:'NO-TIME2'}];
  const result=dedupeIncomingImport(records);
  assert.deepEqual(result.unique.map(r=>r.uid),['ABCDEFGH','SAME0002']);
  assert.equal(result.aliases.get('NO-TIME1'),'ABCDEFGH');
  assert.equal(result.aliases.get('NO-TIME2'),'ABCDEFGH');
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

test('no-time reimport matches a dated saved post by same site and other fields',async()=>{
  const noTime={...base,uid:'NODATE01',createtime:null,date:null};
  const saved={...base,uid:'SAVED001',createtime:'2026-10-27T07:48:32Z',
    date:'2026-10-27'};
  const matched=await matchExistingWithoutCreatedAt([noTime],{
    readContents:async(site,contents)=>{
      assert.equal(site,'threads');
      assert.deepEqual(contents,[base.content]);
      return [saved];
    }
  });
  assert.equal(matched.get('NODATE01')?.uid,'SAVED001');
});
test('no-time article with different site or content metadata is not merged',async()=>{
  const rows=[
    {...base,uid:'NODATE01',createtime:null},
    {...base,uid:'NODATE02',createtime:null,site:'Facebook'},
    {...base,uid:'NODATE03',createtime:null,location:'另一地點'},
    {...base,uid:'NODATE04',createtime:null,content:'另一段正文'}
  ];
  const matched=await matchExistingWithoutCreatedAt(rows,{
    readContents:async()=>[{...base,uid:'SAVED001'}]
  });
  assert.deepEqual([...matched.keys()],['NODATE01']);
});
test('the import panel reads bounded exact-content matches for missing timestamps',async()=>{
  const fs=await import('node:fs');
  const panel=fs.readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.match(panel,/matchExistingWithoutCreatedAt\(missingTime,/);
  assert.match(panel,/\.ilike\('site',source\)\.in\('content',batch\)/);
  assert.match(panel,/encodeURIComponent\(value\)\.length<=5000/);
});

test('Threads title variations do not split same-second duplicates',()=>{
  const dated={...base,date:'2026-10-27',title:'截取舊版'};
  const other={...base,uid:'ALT00001',date:'2026-10-27',title:'不同標題',createtime:'2026-10-27T07:48:32.900Z'};
  const result=dedupeIncomingImport([dated,other]);
  assert.equal(result.unique.length,1);
  assert.equal(result.duplicates,1);
});
test('Facebook retains independent title in its duplicate check',()=>{
  const a={...base,uid:'FB100001',site:'Facebook',title:'獨立標題'};
  const b={...a,uid:'FB100002',title:'真正不同的標題'};
  assert.equal(dedupeIncomingImport([a,b]).unique.length,2);
});
test('Untimed Threads matches a dated saved row regardless of generated title',async()=>{
  const n={...base,uid:'NT000001',title:'舊標題',createtime:null};
  const d={...base,uid:'DATED001',title:'新標題'};
  const matches=await matchExistingWithoutCreatedAt([n],{readContents:async()=>[d]});
  assert.equal(matches.get('NT000001')?.uid,'DATED001');
});
