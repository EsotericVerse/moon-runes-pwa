// Run with: node --experimental-vm-modules scripts/verify-neon-batching.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {z} from 'zod';

let calls=[],total=2501,missingCount=false,maxRows=Infinity,fatal=null;
const client={schema(){return this;},from(table){
  const call={table,start:0,size:20,orders:[],filters:[]};
  return {
    select(columns,options){call.columns=columns;call.count=options?.count;return this;},
    eq(column,value){call.filters.push({column,value});return this;},
    in(column,value){call.filters.push({column,value});return this;},
    or(value){call.or=value;return this;},
    order(column){call.orders.push(column);return this;},
    range(start,end){call.start=start;call.size=end-start+1;return this;},
    limit(size){call.size=size;return this;},
    then(resolve,reject){
      calls.push({...call});
      let result;
      if(fatal)result={status:400,error:fatal};
      else if(call.size>maxRows)result={status:413,error:{message:'response too large'}};
      else if(call.start>=total&&call.size)result={status:416,error:{code:'PGRST103',message:'offset outside range'}};
      else result={status:200,error:null,count:missingCount?null:(call.count?total:null),data:Array.from({length:Math.max(0,Math.min(call.size,total-call.start))},(_,i)=>({galaxy_id:call.start+i}))};
      return Promise.resolve(result).then(resolve,reject);
    }
  };
}};
const synthetic=values=>new SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);});
const policy=new SourceTextModule(readFileSync('app/loc/query-policy.js','utf8'));
await policy.link(()=>{throw Error('unexpected policy dependency');});await policy.evaluate();
const io=new SourceTextModule(readFileSync('app/loc/io-controller.js','utf8'));
await io.link(spec=>spec==='./query-policy'?policy:synthetic({default:async(a,f)=>Promise.all(a.map(f)),pMapIterable:async function*(a,f){for(const item of a)yield await f(item);}}));
await io.evaluate();
const repository=new SourceTextModule(readFileSync('app/loc/neon-repository.js','utf8'));
await repository.link(spec=>{
  if(spec==='zod')return synthetic({z});
  if(spec==='./neon-client')return synthetic({neonPublicClient:client,neonAuthClient:client});
  if(spec==='./query-policy')return policy;
  if(spec==='./io-controller')return synthetic({...Object.fromEntries(Object.keys(io.namespace).map(k=>[k,io.namespace[k]])),runNeonIo:task=>task(),reportNeonIoError:()=>{}});
  if(spec==='./text-engine.mjs')return synthetic({clearRuntimeTextIndexes:()=>{}});
  throw Error(spec);
});
await repository.evaluate();
const api=repository.namespace;
const table='silver.lo3rwang_galaxy';
const options={columns:'galaxy_id',filters:[{column:'source_name',operator:'eq',value:'threads'}],orFilter:'galaxy_id.gt.0,galaxy_id.eq.0'};
function reset(){calls=[];total=2501;missingCount=false;maxRows=Infinity;fatal=null;}
function complete(rows,start,length){assert.equal(rows.length,length);assert.deepEqual(rows.map(r=>r.galaxy_id),Array.from({length},(_,i)=>start+i));}
reset();complete((await api.selectNeonRows(table,{...options,limit:2501})).rows,0,2501);
assert(calls.length>2);assert(calls.every(c=>c.size<=1000&&c.filters[0].value==='threads'&&c.or===options.orFilter&&c.orders.includes('galaxy_id')));
reset();complete((await api.selectNeonRows(table,{...options,range:[300,2499]})).rows,300,2200);
reset();missingCount=true;complete((await api.selectNeonAllRows(table,options)).rows,0,2501);
reset();maxRows=17;complete((await api.selectNeonRows(table,{...options,limit:200})).rows,0,200);
assert(calls.some((c,i)=>i>0&&c.start===calls[i-1].start&&c.size<calls[i-1].size));
reset();total=31;maxRows=2;const heavy=[];await api.processNeonHeavyRows(table,{columns:'galaxy_id,content',onBatch:rows=>heavy.push(...rows)});complete(heavy,0,31);
reset();fatal={code:'42703',message:'column does not exist'};await assert.rejects(api.selectNeonRows(table,options),/column does not exist/);assert.equal(calls.length,1);
reset();maxRows=0;await assert.rejects(api.selectNeonRows(table,options),/response too large/);assert(calls.length<12);
reset();await api.selectNeonRows('silver.lo3rwang_galaxy_media',{columns:'media_id,media_link,style_tags',filters:[{column:'media_link',operator:'eq',value:'x'}],limit:1});assert.equal(calls[0].columns,'media_id,media_link:galaxy_link,style_tags:style_prompt');assert.equal(calls[0].filters[0].column,'galaxy_link');
reset();await api.selectNeonRows(table,{...options,limit:0});assert.equal(calls.length,1);assert.equal(calls[0].size,0);
await assert.rejects(api.selectNeonRows(table,{...options,limit:Infinity}),/finite/);
console.log('Neon shared batching: 2501 rows, ranges, missing counts, 416 exhaustion, oversized retries, heavy streaming, fatal errors and media mappings passed.');
