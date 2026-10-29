import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const contract=readFileSync(new URL('../app/loc/db-contract.mjs',import.meta.url),'utf8');
const start=contract.indexOf('  async function resetKeywordClassification(');
const end=contract.indexOf('\n  async function readKeywordClass(',start);
assert.ok(start>=0&&end>start,'Keywords reset must use the current uidlist implementation');

function client(){
  const calls=[];
  function relation(table){
    let values=null,filters=[];
    return {
      update(payload){values=payload;return this;},
      eq(key,value){filters.push([key,value]);return this;},
      select(){
        calls.push({table,values,filters});
        return Promise.resolve({data:table.endsWith('_keywords')?[{keyword_id:1},{keyword_id:2}]:[{id:'scope'}],error:null});
      }
    };
  }
  const reset=new Function('normalizeScopeId','preflightWrite','selectAuthRow','dbAuthRelation',
    contract.slice(start,end)+'\nreturn resetKeywordClassification;')(
      value=>value,()=>{},
      async()=>({current_keyword_class_uid:'aB3d'}),relation);
  return {reset,calls};
}

test('reset clears only active Class item uidlists, never Galaxy articles',async()=>{
  const {reset,calls}=client(),events=[];
  const result=await reset('lo3rwang',{onProgress:e=>events.push(e)});
  assert.equal(result.count,2);
  const clear=calls.find(x=>x.table==='silver.lo3rwang_keywords');
  assert.deepEqual(clear.values,{uidlist:[]});
  assert.deepEqual(clear.filters,[['class_uid','aB3d']]);
  assert.ok(calls.some(x=>x.table==='silver.lo3rwang'&&x.values.staticstime===null));
  assert.ok(!calls.some(x=>x.table.includes('galaxy')));
  assert.equal(events.at(-1).phase,'completed');
});

test('classification writer that modified Galaxy has been retired',()=>{
  assert.ok(!contract.includes('async function applyKeywordClassification('));
  assert.ok(!contract.includes('keywordClassificationWriteUnchecked'));
  assert.ok(!contract.includes("mode:'chunk',rows:batch"));
});
