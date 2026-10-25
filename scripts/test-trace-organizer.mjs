import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAnchorAddress,anchorAddress,countyOfAnchor,groupAnchorsByCounty,organizeAnchorCandidates} from '../app/modular/features/trace/trace-organizer.mjs';
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
