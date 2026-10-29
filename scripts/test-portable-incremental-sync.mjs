import assert from 'node:assert/strict';
import {test} from 'node:test';
import {syncPortableMissingRows} from './portable-snapshot-import.mjs';

function fake(rows=[],{caseInsensitive=false}={}){
  const state={rows:rows.map(row=>({...row}))};
  const db={
    state,
    withSchema(){return this},
    transaction(){return {execute:fn=>fn(db)}},
    selectFrom(){
      const spec={cols:null,order:null,limit:null,filters:[]};
      const query={
        select(value){spec.cols=value;return query},
        orderBy(value){spec.order=value;return query},
        limit(value){spec.limit=value;return query},
        where(key,operator,value){spec.filters.push({key,operator,value});return query},
        async execute(){
          let data=state.rows.slice();
          for(const {key,operator,value} of spec.filters){
            if(operator==='>')data=data.filter(row=>String(row[key])>String(value));
            else if(operator==='in')data=data.filter(row=>value.some(x=>
              caseInsensitive?String(row[key]).toLowerCase()===String(x).toLowerCase():row[key]===x));
            else throw Error('Unexpected filter');
          }
          if(spec.order)data.sort((a,b)=>String(a[spec.order])<String(b[spec.order])?-1:String(a[spec.order])>String(b[spec.order])?1:0);
          if(spec.limit!==null)data=data.slice(0,spec.limit);
          return data.map(row=>spec.cols===null?{...row}:
            Object.fromEntries((Array.isArray(spec.cols)?spec.cols:[spec.cols]).map(key=>[key,row[key]])));
        }
      };
      return query;
    },
    insertInto(){
      return {values:values=>({execute:async()=>{
        for(const value of values){
          if(state.rows.some(row=>row.uid===value.uid))throw Error('duplicate primary key');
          state.rows.push({...value});
        }
      }})};
    }
  };
  return db;
}
const params={table:'lo3rwang_galaxy',schema:'silver',columns:['uid','content'],batchSize:2};

test('case-sensitive Base62 keys remain distinct and existing rows are preserved',async()=>{
  const source=fake([{uid:'A1b2C3d4',content:'new'},{uid:'a1b2C3d4',content:'lower'}]);
  const target=fake([{uid:'A1b2C3d4',content:'old'}]);
  const result=await syncPortableMissingRows(source,target,{...params,maxBatches:2});
  assert.equal(result.inserted,1);
  assert.equal(result.existing,1);
  assert.equal(target.state.rows.find(row=>row.uid==='A1b2C3d4').content,'old');
  assert.equal(target.state.rows.find(row=>row.uid==='a1b2C3d4').content,'lower');
});

test('rejects a destination whose UID comparison folds case',async()=>{
  const source=fake([{uid:'a1b2C3d4',content:'new'}]);
  const target=fake([{uid:'A1b2C3d4',content:'other'}],{caseInsensitive:true});
  await assert.rejects(syncPortableMissingRows(source,target,{...params,maxBatches:1}),/not case-sensitive/);
  assert.equal(target.state.rows.length,1);
});

test('bounded batches resume without deleting or overwriting',async()=>{
  const source=fake([{uid:'A0000001',content:'one'},{uid:'B0000002',content:'two'},{uid:'C0000003',content:'three'}]);
  const target=fake([]);
  const first=await syncPortableMissingRows(source,target,{...params,maxBatches:1});
  assert.equal(first.complete,false);
  assert.equal(first.scanned,2);
  const second=await syncPortableMissingRows(source,target,{...params,cursor:first.cursor,maxBatches:2});
  assert.equal(second.complete,true);
  assert.equal(target.state.rows.length,3);
});

test('foreign key normalization cannot change the exact article UID',async()=>{
  const source=fake([{uid:'aB12cD34',content:'hello'}]);
  const target=fake([]);
  await assert.rejects(syncPortableMissingRows(source,target,{...params,maxBatches:1,
    transformRow:row=>({...row,uid:row.uid.toUpperCase()})}),/preserve the original primary key/);
  assert.equal(target.state.rows.length,0);
});
