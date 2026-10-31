import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewKeywordDiscovery,existingKeywordSet,readableKeywordContent} from '../app/loc/keyword-discovery.mjs';

test('discovery only excludes existing Item names and literal Keywords, without mutating them',()=>{
  const rows=[
    {uid:'It01',type:'item',name:'城市記憶',lists:['夜班生活','混沌']},
    {uid:'Gr01',type:'group',name:'城市組',lists:['It01']}
  ];
  const old=JSON.stringify(rows);
  const scanner=createNewKeywordDiscovery(rows);
  scanner.consume([
    {uid:'Ab12Cd01',content:'都市牢籠，城市記憶，混沌風暴，夜班生活。',createtime:'2026-01-01'},
    {uid:'Ab12Cd02',content:'都市牢籠裡的混沌風暴。',createtime:'2026-02-01'},
    {uid:'Ab12Cd03',content:'混沌風暴中的都市牢籠。',createtime:'2026-03-01'}
  ]);
  const result=scanner.finish();
  const words=new Set(result.candidates.map(row=>row.word));
  assert.equal(result.read,3);
  assert.equal(result.withContent,3);
  assert.ok(words.has('都市牢籠'));
  assert.ok(words.has('混沌風暴'));
  assert.ok(!words.has('城市記憶'));
  assert.ok(!words.has('夜班生活'));
  assert.ok(!words.has('混沌'));
  assert.equal(JSON.stringify(rows),old);
});

test('existing terms use normalized, case-insensitive exact comparison',()=>{
  const set=existingKeywordSet([{type:'item',name:'Ｍａｎｄｏｐｏｐ',lists:['  黑刃 ','DARK JAZZ']}]);
  assert.ok(set.has('mandopop'));
  assert.ok(set.has('黑刃'));
  assert.ok(set.has('dark jazz'));
  assert.ok(!set.has('jazz'));
});

test('candidate needs evidence in multiple documents, not many repeats in one',()=>{
  const discovery=createNewKeywordDiscovery([]);
  discovery.consume([{content:'暗黑爵士，暗黑爵士，暗黑爵士。',createtime:'2026-01-01'}]);
  assert.equal(discovery.finish().candidates.length,0);
  discovery.consume([{content:'暗黑爵士與深夜之聲。',createtime:'2026-02-01'}]);
  const term=discovery.finish().candidates.find(row=>row.word==='暗黑爵士');
  assert.ok(term);
  assert.equal(term.documents,2);
  assert.equal(term.occurrences,4);
  assert.equal(term.sample.includes('暗黑爵士'),true);
});

test('output keeps Chinese and Latin new terms visible without defining Groups',()=>{
  const discovery=createNewKeywordDiscovery([]);
  for(let i=0;i<4;i++)discovery.consume([{
    content:'符文軌跡 旋律星圖 darkjazz ambientwave cyberpunk bossa dancepop synthwave',
    createtime:'2026-0'+(i+1)+'-01'
  }]);
  const result=discovery.finish({limit:5,minDocuments:3});
  assert.ok(result.candidates.some(row=>row.language==='zh'));
  assert.ok(result.candidates.some(row=>row.language==='other'));
  assert.ok(result.candidates.every(row=>!Object.hasOwn(row,'class_uid')&&!Object.hasOwn(row,'group_uid')));
});

test('empty content produces an empty proposal list without writes',()=>{
  const discovery=createNewKeywordDiscovery([]);
  discovery.consume([{content:null},{content:'   '}]);
  const result=discovery.finish();
  assert.equal(result.read,2);
  assert.equal(result.withContent,0);
  assert.deepEqual(result.candidates,[]);
});

test('word joins stop at Chinese connectors and writing-instruction phrases',()=>{
  const scanner=createNewKeywordDiscovery([]);
  for(let i=0;i<3;i++)scanner.consume([{
    content:'都市牢籠與混沌風暴。要用同樣風格寫一首歌。',
    createtime:'2026-10-01'
  }]);
  const terms=new Set(scanner.finish().candidates.map(item=>item.word));
  assert.ok(terms.has('都市牢籠'));
  assert.ok(terms.has('混沌風暴'));
  assert.ok(!terms.has('牢籠與混沌'));
  assert.ok(!terms.has('與混沌風暴'));
  assert.ok(!terms.has('要用同樣風格'));
  assert.ok(!terms.has('同樣風格寫'));
});

test('All complete, broken and HTML-escaped div tags disappear before counting',()=>{
  const raw=[
    '<div class="entry"><span>都市牢籠</span></div>',
    '&lt;div&gt;混沌風暴&lt;/div&gt;',
    '城市記憶 <div',
    '夢想旅程 </div>',
    '<div class="intro"',
    '</div> 混沌風暴'
  ];
  const cleaned=raw.map(readableKeywordContent);
  assert.ok(cleaned.every(text=>!text.includes('<')&&!text.includes('div')));
  const analyzer=createNewKeywordDiscovery([]);
  for(let i=0;i<3;i++){
    analyzer.consume([{content:raw.join(' '),createtime:'2026-10-01'}]);
  }
  const words=analyzer.finish().candidates.map(item=>item.word);
  for(const bad of ['div','span','class','script'])assert.ok(!words.includes(bad));
  assert.ok(words.includes('都市牢籠'));
});

test('Code blocks and serialized JSON metadata are not analyzed as ordinary prose',()=>{
  const samples=[
    '{"type":"div","class":"span","ref":"uid123","content":"城市記憶 <div>幸福頻段</div>"}',
    '文章開始 \`\`\`html\\n<div class="template">CSS layout</div>\\n\`\`\` 城市記憶',
    '<style>.myclass{display:block}</style>混沌風暴'
  ];
  const cleaned=samples.map(readableKeywordContent);
  assert.ok(cleaned[0].includes('城市記憶'));
  assert.ok(!cleaned[0].includes('"type"')&&!cleaned[0].includes('"class"'));
  assert.ok(!cleaned[1].includes('template'));
  assert.ok(!cleaned[2].includes('display'));
  const analyzer=createNewKeywordDiscovery([]);
  for(let i=0;i<3;i++)analyzer.consume(samples.map(content=>({content,createtime:'2026-09-01'})));
  const words=analyzer.finish().candidates.map(item=>item.word);
  for(const bad of ['div','span','template','display','myclass'])assert.ok(!words.includes(bad));
});
