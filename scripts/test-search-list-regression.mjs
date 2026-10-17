import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function extract(file,start,end){
  const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const a=source.indexOf(start);
  const b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Cannot locate executable implementation in '+file);
  return source.slice(a,b);
}
function loadProvider(records){
  const calls=[];
  const source=extract('app/loc/galaxy-query.js','function makeProvider(', 'function genericScopeProviders(');
  const executePublicRead=async(table,buildQuery,{source:dataSource})=>{
    const call={table,source:dataSource};
    const relation={
      select(columns,options){call.columns=columns;call.options=options;return this;},
      range(from,to){call.range=[from,to];return Promise.resolve({data:records.slice(from,to+1),__dataSource:'primary'});}
    };
    calls.push(call);
    return buildQuery(relation);
  };
  const context={
    DEFAULT_LIST_BATCH_SIZE:10,
    unique:items=>[...new Set(items)],
    applyFilters:q=>q,
    applyLiteralTerms:q=>q,
    applyOrders:q=>q,
    executePublicRead,
    recordFor:(row,source,id,scope,table)=>({row,source,id,scope,table})
  };
  return {makeProvider:vm.runInNewContext(source+'; makeProvider',context),calls};
}

test('literal search pagination fetches one bounded page, never an exact COUNT',async()=>{
  const records=Array.from({length:25},(_,i)=>({uid:'doc-'+i}));
  const {makeProvider,calls}=loadProvider(records);
  const provider=makeProvider({
    id:'scope:text',table:'silver.scope_galaxy',source:'scope 文字',
    scope:{id:'scope'},idColumn:'uid',columns:['uid','title'],
    searchFields:['title','content'],dateColumn:'createtime',batchSize:10
  });
  let cursor=0;
  const result=[];
  for(let page=0;page<3;page++){
    const batch=await provider.search('月語者',{cursor,source:'primary'});
    result.push(...batch.rows.map(x=>x.row.uid));
    cursor=batch.nextCursor;
    assert.equal(batch.rows.length,page===2?5:10);
    assert.equal(batch.hasMore,page!==2);
  }
  assert.deepEqual(result,records.map(x=>x.uid));
  assert.deepEqual(calls.map(x=>Array.from(x.range)),[[0,10],[10,20],[20,30]]);
  assert.ok(calls.every(x=>!x.options?.count),'No full-table count request is permitted');
  assert.equal(calls.length,3,'Exactly one public read per page');
});

test('search provider can be invoked again for a different term without reloading',async()=>{
  const {makeProvider,calls}=loadProvider([{uid:'A'},{uid:'B'}]);
  const provider=makeProvider({
    id:'scope:text',table:'silver.scope_galaxy',source:'scope 文字',
    scope:{id:'scope'},idColumn:'uid',columns:['uid','title'],
    searchFields:['title','content'],dateColumn:'createtime',batchSize:10
  });
  const first=await provider.search('月語者',{cursor:0});
  const second=await provider.search('不同關鍵字',{cursor:0});
  assert.equal(first.rows.length,2);
  assert.equal(second.rows.length,2);
  assert.equal(calls.length,2);
  assert.equal(first.hasMore,false);
  assert.equal(second.hasMore,false);
});

test('Galaxy result card does not receive a second copy of the complete body',()=>{
  const source=extract('app/modular/features/Search.jsx','function toResult(', 'function mergeSummaryResults(');
  const context={
    UI_COPY:{search:{sourceIdPrefix:'',typePrefix:''}},
    MEDIA_FALLBACK_TITLE:'Media',WORK_FALLBACK_TITLE:'Work',
    workDisplayText:s=>String(s??''),
    workDisplayHeading:r=>String(r.title||'Work'),
    rowText:r=>Object.values(r).filter(v=>typeof v==='string').join(' '),
    galaxyRelationLinks:()=>[],galaxyIdentityHref:()=>'',scopeHref:()=>'/'
  };
  const toResult=vm.runInNewContext(source+'; toResult',context);
  const row={uid:'1074A2BA',title:'完整文章',content:'第一段\n第二段',__table:'silver.lo3rwang_galaxy'};
  const result=toResult(row,'personal','lo3rwang');
  assert.equal(result.snippet,'','Identity must never print content as a full-sized preview');
  assert.equal(result.resourceType,'galaxy');
  assert.notEqual(toResult({...row,uid:'ANOTHER'},'personal','lo3rwang').key,result.key);
});
