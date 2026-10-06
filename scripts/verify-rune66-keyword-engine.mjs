import assert from 'node:assert/strict';
import {classifyRune66Documents} from '../app/loc/model/rune66-keyword-engine.mjs';

const structureRows=[
  {rune_id:2,rune_name:'魂',group_name:'靈魂'},
  {rune_id:7,rune_name:'鏡',group_name:'靈魂'},
  {rune_id:26,rune_name:'花',group_name:'自然'},
  {rune_id:36,rune_name:'地',group_name:'礦物'},
  {rune_id:41,rune_name:'光',group_name:'元素'},
  {rune_id:43,rune_name:'水',group_name:'元素'},
  {rune_id:46,rune_name:'土',group_name:'元素'},
  {rune_id:48,rune_name:'氣',group_name:'元素'},
  {rune_id:49,rune_name:'日',group_name:'秩序'},
  {rune_id:50,rune_name:'月',group_name:'秩序'},
  {rune_id:52,rune_name:'時',group_name:'秩序'},
  {rune_id:55,rune_name:'空',group_name:'空間'},
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
byItem.get(48).keywords=['空氣TO氣'];
byItem.get(49).keywords=['日光TO光','日月TO時'];
byItem.get(50).keywords=['日月TO時'];
byItem.get(26).keywords=['花枝NAME、花枝招展TO花'];
byItem.get(7).keywords=['鏡花水月AND幻'];

const rows=[
  {key:'a',title:'',content:'潛意識'},
  {key:'b',title:'',content:'意識'},
  {key:'c',title:'',content:'水土'},
  {key:'d',title:'',content:'花枝'},
  {key:'e',title:'',content:'花枝招展'},
  {key:'f',title:'',content:'鏡花水月'},
  {key:'g',title:'',content:'魂'},
  {key:'h',title:'',content:'天空'},
  {key:'i',title:'',content:'空間'},
  {key:'j',title:'',content:'空氣'},
  {key:'k',title:'',content:'日光'},
  {key:'l',title:'',content:'日月'},
  {key:'m',title:'',content:'日常'},
  {key:'n',title:'',content:'月蝕'},
  {key:'o',title:'',content:'意識 潛意識 水 空氣'},
  {key:'p',title:'',content:'意識 意識 意識'}
];

const result=classifyRune66Documents(rows,catalogRows,structureRows);
const byKey=new Map(result.classifications.map(row=>[row.key,row]));
const runeMap=row=>new Map((row?.rune_counts||[]).map(item=>[item.label,item.count]));

assert.equal(runeMap(byKey.get('a')).get('魂'),1,'non-day/moon Rune keyword 意識 must still match inside 潛意識');
assert.equal(runeMap(byKey.get('a')).get('夢'),1,'潛意識 explicit rule must also TO 夢');
assert.ok(byKey.get('a').tied_groups.includes('靈魂')&&byKey.get('a').tied_groups.includes('無序'),'equal cumulative Class scores must keep tie diagnostics');

assert.equal(runeMap(byKey.get('b')).get('魂'),2,'意識 keeps its keyword hit and explicit TO hit because 魂 is not a day/moon exception');
assert.equal(runeMap(byKey.get('b')).has('夢'),false,'standalone 意識 must not become 夢');

assert.ok((runeMap(byKey.get('c')).get('水')||0)>=1,'水土 must keep normal 水 literal attribution');
assert.ok((runeMap(byKey.get('c')).get('土')||0)>=1,'水土 must keep normal 土 literal attribution');
assert.ok((runeMap(byKey.get('c')).get('地')||0)>=1,'水土 explicit rules may additionally attribute 地');

assert.equal(runeMap(byKey.get('d')).size,0,'花枝 NAME must exclude the complete NAME phrase from Rune attribution');
assert.equal(runeMap(byKey.get('e')).get('花'),1,'花枝招展 TO 花 must attribute 花 while 花枝 NAME remains excluded');

assert.ok((runeMap(byKey.get('f')).get('鏡')||0)>=1,'鏡花水月 must preserve 鏡 attribution');
assert.ok((runeMap(byKey.get('f')).get('幻')||0)>=1,'鏡花水月 AND 幻 must add 幻 attribution');
assert.equal(byKey.get('f').status,'classified','Class must remain a single displayed value');
assert.equal(byKey.get('f').classification_group,'靈魂','cumulative configured signals must determine the displayed Class');
assert.equal(runeMap(byKey.get('g')).get('魂'),1,'Rune display name must be an implicit literal keyword');
assert.equal(runeMap(byKey.get('h')).get('空'),1,'suffix literal 天空 must match 空');
assert.equal(runeMap(byKey.get('i')).get('空'),1,'prefix literal 空間 must match 空');
assert.equal(runeMap(byKey.get('j')).get('空'),1,'non-day/moon Rune names must keep normal literal matching inside compounds');
assert.equal(runeMap(byKey.get('j')).get('氣'),2,'空氣 must keep 氣 literal hit and explicit TO attribution as separate configured signals');
assert.equal(runeMap(byKey.get('k')).has('日'),false,'日光 must resolve the 日 exception before 日 literal matching');
assert.equal(runeMap(byKey.get('k')).get('光'),1,'日光 must TO 光');
assert.equal(runeMap(byKey.get('l')).has('日'),false,'日月 must not fall through to 日');
assert.equal(runeMap(byKey.get('l')).has('月'),false,'日月 must not fall through to 月');
assert.equal(runeMap(byKey.get('l')).get('時'),1,'日月 must TO 時');
assert.equal(runeMap(byKey.get('m')).get('日'),1,'ordinary 日 keyword text must still match 日');
assert.equal(runeMap(byKey.get('n')).get('月'),1,'ordinary 月 keyword text must still match 月');

assert.ok((runeMap(byKey.get('o')).get('魂')||0)>=2,'one Rune may keep multiple distinct configured signal hits');
assert.equal(byKey.get('o').classification_group,'元素','Class must use cumulative distinct signal scores');
assert.equal(runeMap(byKey.get('p')).get('魂'),2,'repeating the same text must not duplicate the same keyword or rule signal');

assert.equal(result.documentCount,rows.length);
assert.equal(result.unclassifiedCount,1,'NAME-only sample must remain unclassified');
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
