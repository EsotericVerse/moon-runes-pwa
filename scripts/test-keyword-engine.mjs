import assert from 'node:assert/strict';
import {test} from 'node:test';
import {classifyKeywordDocuments} from '../app/loc/model/keyword-engine.mjs';
import {classifyRune66Documents} from '../app/loc/model/rune66-keyword-engine.mjs';

test('Rune66 entry point returns the unchanged common classification output',()=>{
  const catalog=[
    {item_no:49,item_name:'日',class_group:'秩序',keywords:['日常','日月TO時']},
    {item_no:50,item_name:'月',class_group:'秩序',keywords:['月蝕','日月TO時']},
    {item_no:51,item_name:'時',class_group:'秩序',keywords:['時間']}
  ];
  const docs=[{uid:'Ab12Cd34',content:'日常的日月有時間'}];
  assert.deepEqual(classifyRune66Documents(docs,catalog),classifyKeywordDocuments(docs,catalog));
});
test('generic classifier supports Item numbers above 66',()=>{
  const result=classifyKeywordDocuments([{uid:'Ab12Cd34',content:'高序號的識別詞'}],
    [{item_no:129,item_name:'新項目',class_group:'新分類',keywords:['識別詞']}]);
  assert.equal(result.classifications[0].rune_counts[0].rune_id,129);
});
