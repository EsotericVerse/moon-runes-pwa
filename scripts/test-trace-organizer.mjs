import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAnchorAddress,anchorAddress,countyOfAnchor,groupAnchorsByCounty,organizeAnchorCandidates,findAnchorWriteMatches} from '../app/modular/features/trace/trace-organizer.mjs';
const item=(uid,title,description,latitude,longitude)=>({
  uid,title,description,latitude,longitude,source_scope:'lo3rwang',trace_type:'anchor'
});
test('same postal address with different name is a reviewed merge suggestion',()=>{
  const list=[
    item('AAA00001','高鐵板橋站','地址：新北市板橋區縣民大道二段7號。',25.014,121.463),
    item('BBB00002','板橋車站','地址：新北市板橋區縣民大道二段7號。',25.01403,121.463)
  ];
  const suggestions=organizeAnchorCandidates(list);
  assert.equal(suggestions.length,1);
  assert.equal(suggestions[0].type,'same-address');
  assert.equal(suggestions[0].canMerge,true);
  assert.equal(countyOfAnchor(list[0]),'新北市');
});
test('adjacent but different addresses must not be merged',()=>{
  const list=[
    item('AAA00001','便利商店','地址：新北市中和區景平路693號。',25.003259,121.496394),
    item('BBB00002','五金店','地址：新北市中和區中山路二段291號。',25.003259,121.496394)
  ];
  assert.equal(organizeAnchorCandidates(list)[0].type,'near-different-address');
  assert.equal(organizeAnchorCandidates(list)[0].canMerge,false);
});
test('missing address remains manual review, never an automatic merge',()=>{
  const items=[item('AAA00001','舊名稱','',25.0,121.5),item('BBB00002','新名稱','',25.00005,121.5)];
  const candidate=organizeAnchorCandidates(items)[0];
  assert.equal(candidate.type,'near-unverified');
  assert.equal(candidate.address,'');
});
test('region organizer groups and preserves labels',()=>{
  assert.equal(normalizeAnchorAddress('臺北市中山區 民生東路2段 147巷10-1號'),
    normalizeAnchorAddress('台北市中山區民生東路2段147巷10-1號'));
  assert.equal(anchorAddress({description:'店址。地址：新北市板橋區文化路1號。'}),'新北市板橋區文化路1號');
  const groups=groupAnchorsByCounty([item('AAA00001','臺南車站','',22.9969,120.213),item('BBB00002','福隆海水浴場','',25.02,121.945)]);
  assert.deepEqual(groups.map(g=>g.county),['新北市','臺南市']);
});

test('historical same-address names are review candidates, never automatic UID reuse',()=>{
  const original=item('AAA00001','板橋車站','地址：新北市板橋區縣民大道二段7號。',25.014,121.463);
  const same={...item('__incoming__','高鐵板橋站','地址：新北市板橋區縣民大道二段7號。',25.01403,121.463)};
  assert.equal(findAnchorWriteMatches(same,[original])[0].safeReuse,false);
  assert.equal(findAnchorWriteMatches(same,[original])[0].canMerge,true);
  const far={...same,latitude:25.0163};
  assert.equal(findAnchorWriteMatches(far,[original])[0].safeReuse,false);
  assert.equal(findAnchorWriteMatches(far,[original])[0].type,'same-address');
});
test('postal-address evidence cannot be replaced with wide search-radius overlap',()=>{
  const a=item('AAA00001','隔壁商店 A','',25.01,121.5);
  const b=item('__incoming__','隔壁商店 B','',25.01009,121.5);
  a.radius_m=5000;b.radius_m=5000;
  const candidates=findAnchorWriteMatches(b,[a]);
  assert.equal(candidates[0].type,'near-unverified');
  assert.equal(candidates[0].safeReuse,false);
  assert.equal(findAnchorWriteMatches(b,[{...a,source_scope:'lrunes'}]).length,0);
});
test('an exact coordinate with different full addresses cannot silently reuse anchor',()=>{
  const a=item('AAA00001','店 A','地址：新北市三重區忠孝路1號。',25.01,121.5);
  const b=item('__incoming__','店 B','地址：新北市三重區忠孝路3號。',25.01,121.5);
  const [match]=findAnchorWriteMatches(b,[a]);
  assert.equal(match.type,'near-different-address');
  assert.equal(match.canMerge,false);
  assert.equal(match.safeReuse,false);
});
test('batch and single Trace writes share the duplicate preflight and preserve route UIDs',()=>{
  const file=readFileSync(new URL('../app/modular/features/trace/trace-data.js',import.meta.url),'utf8');
  assert.match(file,/inspectTraceAnchorBeforeWrite\(\{scopeId:id,anchor:data\}\)/);
  assert.match(file,/const previous=await readTraceData\(id\)/);
  assert.match(file,/classifyNewAnchor\(data,known\)/);
  assert.match(file,/reuseExistingAnchor\(/);
  assert.match(file,/organizeAnchorCandidates\(comparableAnchors\(current,id\)\)/);
  assert.match(file,/reviewCount,reviewPreview,auditError/);
  assert.doesNotMatch(file,/\.delete\(\)/);
});
