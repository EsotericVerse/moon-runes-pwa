import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mediaStyleTreeDaily,styleTreeClasses} from '../app/loc/media-style-tree-statistics.mjs';

const tree=[
  {class_name:'Pop',class_group:'Progressive',item_name:'Progressive Pop',keywords:['Progressive Pop','Progressive Pop / Hip-Hop']},
  {class_name:'Hip-Hop',class_group:'Progressive',item_name:'Progressive Hip-Hop',keywords:['Progressive Hip-Hop','Progressive Pop / Hip-Hop']},
  {class_name:'Vocal',class_group:'Male',item_name:'Male Vocals',keywords:['Male Voice','Male Vocals']},
  {class_name:'Vocal',class_group:'Female',item_name:'Female Vocals',keywords:['Female Voice','Female Vocals']}
];
const date='2026-10-17T11:00:00+08:00';
const rows=[
  {media_id:'one',createtime:date,meta_tags:'Progressive Pop / Hip-Hop, Male Voice'},
  {media_id:'two',createtime:date,meta_tags:'Progressive Pop, Progressive Pop / Hip-Hop, Male Voice'},
  {media_id:'three',createtime:date,meta_tags:'Progressive Hip-Hop, Female Vocals'},
  {media_id:'four',createtime:date,meta_tags:'Random Text'}
];
const counts=(level,group='')=>Object.fromEntries(
  mediaStyleTreeDaily(rows,tree,level,group).map(row=>[row.category,row.item_count])
);
test('Class to Group to Item reuses Keyword Tree without separate taxonomy tables',()=>{
  assert.deepEqual(styleTreeClasses(tree),['Hip-Hop','Pop','Vocal']);
  assert.deepEqual(counts('class'),{'Hip-Hop':3,'Pop':2,'Vocal':3});
  assert.deepEqual(counts('group'),{'Hip-Hop / Progressive':3,'Pop / Progressive':2,'Vocal / Female':1,'Vocal / Male':2});
  assert.deepEqual(counts('item','Pop'),{'Pop / Progressive / Progressive Pop':2});
});
test('Composite style can belong to multiple classes, but each class counts a media only once',()=>{
  assert.deepEqual(counts('class','Pop'),{Pop:2});
  assert.deepEqual(counts('group','Hip-Hop'),{'Hip-Hop / Progressive':3});
});
test('Style tree requires whole metadata tags, not substring hits',()=>{
  assert.deepEqual(mediaStyleTreeDaily([{createtime:date,meta_tags:'not Progressive Pop'}],tree,'class'),[]);
});
