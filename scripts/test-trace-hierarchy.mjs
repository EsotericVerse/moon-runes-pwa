import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryClassGroupIndex,classGroupIndex} from '../app/loc/model/class-group-items.mjs';
import {traceCategories,traceClassificationIndex,routeClasses,routeGroups,searchTraceRoutes,validateTraceRouteLabels}
  from '../app/modular/features/trace/trace-route-classes.mjs';

const routes=[
  {uid:'MAP00001',category:'旅遊',class:'夜市',class_group:'北部',title:'基隆夜市',anchor_uids:['AAA00001','BBB00002']},
  {uid:'MAP00002',category:'旅遊',class:'游泳',class_group:'北部',title:'泳池路線',anchor_uids:['AAA00001','CCC00003']},
  {uid:'MAP00003',category:'旅遊',class:'登山',class_group:'南部',title:'山區路線',anchor_uids:[]},
  {uid:'MAP00004',category:'生活',class:'夜市',class_group:'北部',title:'同名生活分類',anchor_uids:[]},
  {uid:'MAP00005',class:'跟朋友',class_group:'夜市',title:'既有三層 Frame',anchor_uids:['BBB00002','AAA00001']}
];
test('shared old Class/Group/Item remains intact for keywords',()=>{
 const keywordRows=[{class_name:'符文66',class_group:'靈魂',item_name:'靈'}];
 const index=classGroupIndex(keywordRows,{classOf:r=>r.class_name,groupOf:r=>r.class_group});
 assert.equal(index.get('符文66').get('靈魂')[0].item_name,'靈');
});
test('four layers reuse shared index and Item means one Frame, not a Queue stop',()=>{
 const index=traceClassificationIndex(routes);
 assert.equal(index.get('旅遊').get('夜市').get('北部')[0].uid,'MAP00001');
 assert.equal(index.get('旅遊').get('游泳').get('北部')[0].uid,'MAP00002');
 assert.deepEqual(index.get('旅遊').get('夜市').get('北部')[0].anchor_uids,['AAA00001','BBB00002']);
 assert.notEqual(index.get('旅遊').get('夜市').get('北部')[0],
   index.get('生活').get('夜市').get('北部')[0]);
 assert.deepEqual(traceCategories(routes),['生活','旅遊','']);
 assert.deepEqual(routeClasses(routes,'旅遊'),['夜市','游泳','登山']);
 assert.deepEqual(routeGroups(routes,'旅遊','夜市'),['北部']);
});
test('hierarchical filters and search are category-scoped and live',()=>{
 assert.deepEqual(searchTraceRoutes(routes,{category:'旅遊',className:'夜市',group:'北部'}).map(r=>r.uid),['MAP00001']);
 assert.deepEqual(searchTraceRoutes(routes,{query:'基隆'}).map(r=>r.uid),['MAP00001']);
 assert.deepEqual(searchTraceRoutes(routes,{category:'生活',query:'北部'}).map(r=>r.uid),['MAP00004']);
 assert.deepEqual(searchTraceRoutes(routes,{category:''}).map(r=>r.uid),['MAP00005']);
});
test('unclassified legacy Frames remain visible and writable without inventing a category',()=>{
 const index=categoryClassGroupIndex(routes,{categoryOf:r=>r.category,classOf:r=>r.class,groupOf:r=>r.class_group});
 assert.equal(index.get('').get('跟朋友').get('夜市')[0].uid,'MAP00005');
 assert.deepEqual(validateTraceRouteLabels('','跟朋友','夜市'),{category:'',class:'跟朋友',class_group:'夜市'});
 assert.deepEqual(validateTraceRouteLabels('旅遊','夜市','北部'),{category:'旅遊',class:'夜市',class_group:'北部'});
 assert.throws(()=>validateTraceRouteLabels('旅遊','','北部'),/Class/);
});
