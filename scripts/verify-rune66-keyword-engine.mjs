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

const catalogRows=structureRows.map((row,index)=>({
  keyword_id:index+1,
  group_name:'符文66',
  item_no:row.rune_id,
  item_name:row.rune_name,
  principle:'',
  keywords:[],
  order_no:row.rune_id
}));

const byItem=new Map(catalogRows.map(row=>[row.item_no,row]));
byItem.get(2).keywords=['意識','意識TO魂、潛意識TO夢'];
byItem.get(43).keywords=['水土AND地'];
byItem.get(46).keywords=['水土TO地'];
byItem.get(26).keywords=['花枝NAME、花枝招展TO花'];
byItem.get(7).keywords=['鏡花水月AND幻'];

const rows=[
  {key:'a',title:'',content:'潛意識'},
  {key:'b',title:'',content:'意識'},
  {key:'c',title:'',content:'水土'},
  {key:'d',title:'',content:'花枝'},
  {key:'e',title:'',content:'花枝招展'},
  {key:'f',title:'',content:'鏡花水月'},
  {key:'g',title:'',content:'魂'}
];

const result=classifyRune66Documents(rows,catalogRows,structureRows);
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
assert.equal(byKey.get('f').status,'classified','Class must remain a single displayed value even when raw hit counts tie');
assert.equal(byKey.get('f').classification_group,'靈魂','equal Class counts must resolve deterministically by Class order');
assert.ok(byKey.get('f').tied_groups.includes('靈魂')&&byKey.get('f').tied_groups.includes('無序'),'raw tie diagnostics must remain available');
assert.equal(runeMap(byKey.get('g')).size,0,'Group display name must not become an implicit keyword');

assert.equal(result.documentCount,rows.length);
assert.equal(result.unclassifiedCount,2,'NAME-only and display-name-only samples should remain unclassified');
assert.ok(result.tieCount>=1);

assert.ok(catalogRows.every(row=>Array.isArray(row.keywords)),'keyword catalog must use one keyword collection per classification item');
assert.equal(catalogRows.some(row=>'keyword_group' in row),false,'keyword catalog must not split keywords into style/rule groups');
assert.equal(catalogRows.some(row=>'node_type' in row),false,'keyword catalog must not use style/keyword node types');

const metadataOnly=classifyRune66Documents([
  {key:'metadata',title:'',content:'',meta_tags:'意識',media_metadata_text:'水土',media_type:'花枝招展'},
  {key:'lyrics',title:'',content:'意識',meta_tags:'潛意識'}
],catalogRows,structureRows);
const metadataByKey=new Map(metadataOnly.classifications.map(row=>[row.key,row]));
assert.equal(runeMap(metadataByKey.get('metadata')).size,0,'media metadata must not enter Rune66 body classification');
assert.equal(runeMap(metadataByKey.get('lyrics')).get('魂'),1,'lyrics body remains classifiable');
assert.equal(runeMap(metadataByKey.get('lyrics')).has('夢'),false,'metadata must not add a Rune to lyrics');

console.log('[rune66-keywords] unified keyword items, literal matching and single-pass classification verified');
