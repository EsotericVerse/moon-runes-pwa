import assert from 'node:assert/strict';
import {classifyRune66Documents} from '../app/loc/model/rune66-keyword-engine.mjs';

const catalogStructure=[
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
  {rune_id:61,rune_name:'幻',group_name:'無序'},
  {rune_id:65,rune_name:'玄',group_name:'特殊',class_enable:false},
  {rune_id:66,rune_name:'命',group_name:'特殊',class_enable:false}
];

const catalogRows=catalogStructure.map((row,index)=>({
  keyword_id:index+1,
  class_name:'符文66',
  class_group:row.group_name,
  class_enable:row.class_enable!==false,
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
byItem.get(49).keywords=['日常','日光TO光','日月TO時'];
byItem.get(50).keywords=['日月TO時'];
byItem.get(26).keywords=['花枝NAME、花枝招展TO花'];
byItem.get(7).keywords=['鏡花水月AND幻'];
byItem.get(65).keywords=['混沌'];
byItem.get(66).keywords=['人生'];

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
  {key:'p',title:'',content:'意識 意識 意識'},
  {key:'q',title:'',content:'2026年10月6日'},
  {key:'r',title:'',content:'六月十日'},
  {key:'s',title:'',content:'人生 意識'},
  {key:'t',title:'',content:'玄 混沌'},
  {key:'u',title:'',content:'日常 魂'},
  {key:'v',title:'',content:'魂 夢'}
];

const result=classifyRune66Documents(rows,catalogRows);
const byKey=new Map(result.classifications.map(row=>[row.key,row]));
const runeMap=row=>new Map((row?.rune_counts||[]).map(item=>[item.label,item.count]));

assert.equal(runeMap(byKey.get('a')).get('魂'),1,'non-day/moon Rune keyword 意識 must still match inside 潛意識');
assert.equal(runeMap(byKey.get('a')).get('夢'),1,'潛意識 explicit rule must also TO 夢');
assert.equal(byKey.get('a').classification_group,'無序','equal signal counts must use total signal characters as the second Class discriminator');

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
assert.equal(runeMap(byKey.get('q')).has('日'),false,'numeric calendar dates must not count 日');
assert.equal(runeMap(byKey.get('q')).has('月'),false,'numeric calendar dates must not count 月');
assert.equal(runeMap(byKey.get('r')).has('日'),false,'Chinese calendar dates must not count 日');
assert.equal(runeMap(byKey.get('r')).has('月'),false,'Chinese calendar dates must not count 月');
assert.ok((runeMap(byKey.get('s')).get('命')||0)>=1,'exception Rune 命 must keep its own signal count');
assert.equal(byKey.get('s').classification_group,'靈魂','class_enable=false Runes must not compete with enabled Groups for Class');
assert.ok((runeMap(byKey.get('t')).get('玄')||0)>=1,'exception Rune 玄 must keep its own signal count');
assert.equal(byKey.get('t').status,'unclassified','class_enable=false-only documents must not be forced into an enabled Class');
assert.equal(byKey.get('u').classification_group,'秩序','equal signal counts must prefer the group with more signal characters');
assert.equal(byKey.get('v').classification_group,'特殊','equal signal counts and equal signal characters must fall back to the reserved Class group');
assert.ok(byKey.get('v').tied_groups.includes('靈魂')&&byKey.get('v').tied_groups.includes('無序'),'final unresolved tie diagnostics must remain available');
const specialTotal=result.groupTotals.find(row=>row.group==='特殊');
assert.ok(Number(specialTotal?.hit_count||0)>0,'class_enable=false Rune signals must remain visible in Group totals');
assert.equal(Number(specialTotal?.document_count||0),1,'reserved Class group must receive only unresolved enabled-group ties');

assert.equal(result.documentCount,rows.length);
assert.equal(result.unclassifiedCount,4,'NAME-only, calendar-date-only and exception-only samples must remain unclassified');
assert.equal(result.tieCount,1,'only signal-count and signal-character ties must remain final ties');

assert.ok(catalogRows.every(row=>Array.isArray(row.keywords)),'keyword catalog must use one keyword collection per classification item');
assert.equal(catalogRows.some(row=>'keyword_group' in row),false,'keyword catalog must not split keywords into style/rule groups');
assert.equal(catalogRows.some(row=>'node_type' in row),false,'keyword catalog must not use style/keyword node types');
assert.ok(catalogRows.every(row=>row.class_name==='符文66'&&row.class_group),'keyword catalog must carry its own Class and Group metadata');
assert.ok(catalogRows.every(row=>typeof row.class_enable==='boolean'),'keyword catalog must carry its own Class participation flag');

const metadataOnly=classifyRune66Documents([
  {key:'metadata',title:'',content:'',meta_tags:'意識',media_metadata_text:'水土',media_type:'花枝招展'},
  {key:'lyrics',title:'',content:'意識',meta_tags:'潛意識'}
],catalogRows);
const metadataByKey=new Map(metadataOnly.classifications.map(row=>[row.key,row]));
assert.equal(runeMap(metadataByKey.get('metadata')).size,0,'media metadata must not enter Rune66 body classification');
assert.equal(runeMap(metadataByKey.get('lyrics')).get('魂'),2,'lyrics body keeps cumulative distinct configured signals');
assert.equal(runeMap(metadataByKey.get('lyrics')).has('夢'),false,'metadata must not add a Rune to lyrics');

console.log('[rune66-keywords] unified keyword items, literal matching and single-pass classification verified');
