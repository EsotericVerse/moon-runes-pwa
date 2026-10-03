import assert from 'node:assert/strict';
import {classifyRune66Documents} from '../app/loc/model/rune66-keyword-engine.mjs';

const structureRows=[
  {rune_id:2,rune_name:'魂',group_name:'靈魂'},
  {rune_id:7,rune_name:'鏡',group_name:'靈魂'},
  {rune_id:26,rune_name:'花',group_name:'自然'},
  {rune_id:36,rune_name:'地',group_name:'礦物'},
  {rune_id:43,rune_name:'水',group_name:'元素'},
  {rune_id:46,rune_name:'土',group_name:'元素'},
  {rune_id:60,rune_name:'夢',group_name:'無序'},
  {rune_id:61,rune_name:'幻',group_name:'無序'}
];

const styleNodes=structureRows.map(row=>({
  style_no:row.rune_id,
  node_type:'style',
  representative_name:row.rune_name,
  parent_group_name:'符文66',
  keyword_group:null,
  keyword:null,
  order_no:row.rune_id
}));

const keywordRows=[
  {style_no:2,node_type:'keyword',keyword_group:'style',keyword:'意識',order_no:1},
  {style_no:2,node_type:'keyword',keyword_group:'rule',keyword:'意識TO魂、潛意識TO夢',order_no:9000},
  {style_no:43,node_type:'keyword',keyword_group:'rule',keyword:'水土AND地',order_no:9000},
  {style_no:46,node_type:'keyword',keyword_group:'rule',keyword:'水土TO地',order_no:9000},
  {style_no:26,node_type:'keyword',keyword_group:'rule',keyword:'花枝NAME、花枝招展TO花',order_no:9000},
  {style_no:7,node_type:'keyword',keyword_group:'rule',keyword:'鏡花水月AND幻',order_no:9000}
];

const rows=[
  {key:'a',title:'',content:'潛意識'},
  {key:'b',title:'',content:'意識'},
  {key:'c',title:'',content:'水土'},
  {key:'d',title:'',content:'花枝'},
  {key:'e',title:'',content:'花枝招展'},
  {key:'f',title:'',content:'鏡花水月'}
];

const result=classifyRune66Documents(rows,[...styleNodes,...keywordRows],structureRows);
const byKey=new Map(result.classifications.map(row=>[row.key,row]));
const runeMap=row=>new Map((row?.rune_counts||[]).map(item=>[item.label,item.count]));

assert.equal(runeMap(byKey.get('a')).has('魂'),false,'潛意識 must not fall through to shorter 意識→魂 rule');
assert.equal(runeMap(byKey.get('a')).get('夢'),1,'潛意識 must TO 夢');

assert.equal(runeMap(byKey.get('b')).get('魂'),1,'standalone 意識 must TO 魂');
assert.equal(runeMap(byKey.get('b')).has('夢'),false,'standalone 意識 must not become 夢');

assert.equal(runeMap(byKey.get('c')).get('水'),1,'水土 AND 地 must preserve 水 attribution');
assert.equal(runeMap(byKey.get('c')).has('土'),false,'水土 TO 地 must not preserve 土 attribution');
assert.ok((runeMap(byKey.get('c')).get('地')||0)>=1,'水土 rules must attribute 地');

assert.equal(runeMap(byKey.get('d')).size,0,'花枝 NAME must not create Rune attribution');
assert.equal(runeMap(byKey.get('e')).get('花'),1,'longer 花枝招展 TO 花 must win before 花枝 NAME');

assert.equal(runeMap(byKey.get('f')).get('鏡'),1,'鏡花水月 AND 幻 must preserve 鏡 attribution');
assert.equal(runeMap(byKey.get('f')).get('幻'),1,'鏡花水月 AND 幻 must add 幻 attribution');
assert.equal(byKey.get('f').status,'tie','equal top group counts must remain a tie instead of arbitrary classification');

assert.equal(result.documentCount,rows.length);
assert.equal(result.unclassifiedCount,1,'only 花枝 NAME sample should remain unclassified');
assert.ok(result.tieCount>=1);

console.log('[rune66-keywords] FlexSearch Rune66 attribution and single-pass classification verified');
