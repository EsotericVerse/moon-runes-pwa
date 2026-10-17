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
      ilike(column,value){call.exactMatch=[column,value];return this;},
      range(from,to){call.range=[from,to];return Promise.resolve({data:records.slice(from,to+1),__dataSource:'primary'});}
    };
    calls.push(call);
    return buildQuery(relation);
  };
  const context={
    DEFAULT_LIST_BATCH_SIZE:10,
    unique:items=>[...new Set(items)],
    dateSearchFilters:()=>[],
    applyFilters:q=>q,
    applyLiteralTerms:q=>q,
    applyOrders:(q,orders)=>{calls.at(-1).orders=orders;return q;},
    literalPattern:value=>'%'+String(value||'').trim().replace(/\\/g,'\\\\').replace(/%/g,'\\%').replace(/_/g,'\\_')+'%',
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

test('exact-match providers compare the whole query against the title',async()=>{
  const {makeProvider,calls}=loadProvider([]);
  const provider=makeProvider({
    id:'scope:title-exact',table:'silver.scope_galaxy',source:'scope 文字',scope:{id:'scope'},
    idColumn:'uid',columns:['uid','title'],searchFields:['title'],exactColumn:'title'
  });
  await provider.search('完整標題');
  assert.deepEqual(Array.from(calls[0].exactMatch),['title','完整標題']);
});

test('equal timestamps use title and stable ID ordering',async()=>{
  const {makeProvider,calls}=loadProvider([]);
  const provider=makeProvider({
    id:'scope:text',table:'silver.scope_galaxy',source:'scope 文字',scope:{id:'scope'},
    idColumn:'uid',columns:['uid','title','createtime'],searchFields:['title'],dateColumn:'createtime'
  });
  await provider.search('關鍵字');
  assert.equal(JSON.stringify(calls[0].orders),JSON.stringify([
    {column:'createtime',ascending:true},
    {column:'title',ascending:true},
    {column:'uid',ascending:true}
  ]));
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

test('all title matches are searched before any article body matches',async()=>{
  const source=extract('app/loc/galaxy-query.js','export async function searchGalaxyRows(', '\n\n/**');
  const calls=[];
  const searchGalaxyRows=vm.runInNewContext(source.replace(/^export /,'')+'; searchGalaxyRows',{
    DEFAULT_LIST_BATCH_SIZE:20,
    genericScopeProviders:scope=>['title-exact','title','content-exact','content','timeline'].map(kind=>({
      id:scope.id+':'+kind,
      async search(){calls.push(this.id);return {rows:[{row:{uid:this.id}}],hasMore:false};}
    }))
  });
  let cursor=null;
  for(let index=0;index<10;index++){
    const result=await searchGalaxyRows([{id:'loc'},{id:'culture'}],'月光',{cursor});
    cursor=result.nextCursor;
  }
  assert.deepEqual(calls,[
    'loc:title-exact','culture:title-exact',
    'loc:title','culture:title',
    'loc:content-exact','culture:content-exact',
    'loc:content','culture:content',
    'loc:timeline','culture:timeline'
  ]);
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

test('Search collapses exact duplicate article copies even when their uids differ',()=>{
  const resultSource=extract('app/modular/features/Search.jsx','function toResult(', 'function mergeSummaryResults(');
  const mergeSource=extract('app/modular/features/Search.jsx','function mergeSummaryResults(', 'export default function Search(');
  const context={
    UI_COPY:{search:{sourceIdPrefix:'',typePrefix:'',mediaLink:'media'},format:{songLink:n=>'Media '+n}},
    MEDIA_FALLBACK_TITLE:'Media',WORK_FALLBACK_TITLE:'Work',
    workDisplayText:s=>String(s??''),workDisplayHeading:r=>String(r.title||'Work'),
    rowText:r=>Object.values(r).filter(v=>typeof v==='string').join(' '),
    galaxyRelationLinks:()=>[],galaxyIdentityHref:()=>'',scopeHref:()=>'/'};
  const {toResult,mergeSummaryResults}=vm.runInNewContext(resultSource+'\n'+mergeSource+'; ({toResult,mergeSummaryResults})',context);
  const base={title:'重複文章',content:'相同正文',source_name:'來源',createtime:'2026-10-01',url:'https://example.test/article',__table:'silver.loc_galaxy'};
  const first=toResult({...base,uid:'AAAA1111'},'loc 文字','loc');
  const copy=toResult({...base,uid:'BBBB2222'},'loc 文字','loc');
  assert.equal(mergeSummaryResults([first,copy]).length,1);
  const lineBreakCopy=toResult({...base,uid:'DDDD4444',content:'相同\n正文'},'loc 文字','loc');
  assert.equal(mergeSummaryResults([first,lineBreakCopy]).length,1);
  const distinct=toResult({...base,uid:'CCCC3333',content:'不同正文'},'loc 文字','loc');
  assert.equal(mergeSummaryResults([first,distinct]).length,2);
});

test('editing an article does not rewrite untouched attributes',()=>{
  const source=extract('app/modular/features/Search.jsx','function changedGalaxyAttributes(', 'function GalaxyAttrSummary(');
  const context={
    isoOrNull:()=>null,nullableText:value=>String(value||'').trim()||null,
    parseListText:value=>String(value||'').split(/[\n,]+/g).map(item=>item.trim()).filter(Boolean),
    parseJsonAttr:value=>JSON.parse(value)
  };
  const changedGalaxyAttributes=vm.runInNewContext(source+'; changedGalaxyAttributes',context);
  const attrs={createtime:'',source_native_id:'',source_place:'',searchable:true,url:'',source_id:'',ref_id:'',source_name:'',target_id:'',media_link:'',statistics_able:true,class_id:'',group_lists:'false'};
  const draft={attrs:{...attrs},originalAttrs:{...attrs},hidden:false};
  assert.equal(JSON.stringify(changedGalaxyAttributes(draft,()=>'')),'{}');
  draft.attrs.target_id='id-1\nid-2';
  assert.equal(JSON.stringify(changedGalaxyAttributes(draft,()=>'')),JSON.stringify({target_id:['id-1','id-2']}));
});

test('exact style-tag search returns its complete intro as a separate recommendation row',async()=>{
  const source=extract('app/loc/galaxy-query.js','export async function selectStyleKeywordMatches(', '\nexport async function searchGalaxyRows(');
  const records=[
    {record_id:'style-1',record_type:'style_comment',label:'月光敘事',style_description:'第一段完整介紹。\n第二段也保留。',status:'active'},
    {record_id:'style-2',record_type:'style_comment',label:'其他風格',style_description:'不應命中',status:'active'},
    {record_id:'style-pending',record_type:'style_comment',label:'月光敘事',style_description:'未完成',status:'needs_anchor'}
  ];
  const calls=[];
  const selectStyleKeywordMatches=vm.runInNewContext(source.replace(/^export /,'')+'; selectStyleKeywordMatches',{
    normalizeSearch:value=>String(value||'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/\s/g,''),
    scopeOf:scope=>scope,
    DEFAULT_LIST_BATCH_SIZE:20,
    selectRows:async(table,query)=>{
      calls.push({table,query});
      return {rows:records.filter(row=>row.label===query.filters.find(filter=>filter.column==='label').value)};
    }
  });
  const [match]=await selectStyleKeywordMatches([{id:'loc',time:'loc_time'}],' 月光敘事 ');
  assert.equal(match.row.style_keyword_tag,true);
  assert.equal(match.row.title,'月光敘事');
  assert.equal(match.row.style_description,'第一段完整介紹。\n第二段也保留。');
  assert.equal(match.source,'風格標籤');
  assert.equal(calls.length,1);
  assert.equal(JSON.stringify(calls[0].query.filters),JSON.stringify([
    {column:'record_type',operator:'eq',value:'style_comment'},
    {column:'label',operator:'eq',value:'月光敘事'}
  ]));
  assert.equal(calls[0].query.columns,'record_id,record_type,label,style_description,status');
  assert.equal(calls[0].query.limit,20);
});

test('style-tag recommendations stay above article results without reordering peers',()=>{
  const source=extract('app/modular/features/Search.jsx','function prioritizeStyleTagResults(', '\n\nexport default function Search(');
  const prioritizeStyleTagResults=vm.runInNewContext(source+'; prioritizeStyleTagResults');
  const rows=[{id:'article-a'},{id:'style-a',styleTagMatch:true},{id:'article-b'},{id:'style-b',styleTagMatch:true}];
  assert.deepEqual(Array.from(prioritizeStyleTagResults(rows),row=>row.id),['style-a','style-b','article-a','article-b']);
});
