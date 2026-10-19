import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseGroupLists,formatGroupLists,parseGroupListsAttr} from '../app/loc/group-lists.mjs';
import {assertPlainGalaxyAttributes,hasHtmlTag} from '../app/loc/content-policy.js';
import {normalizeImportMedia} from '../app/loc/import-batch.mjs';

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
  const executePublicRead=async(table,buildQuery,{source:dataSource,authenticated=false}={})=>{
    const call={table,source:dataSource,authenticated};
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

test('admin hidden-article search routes Galaxy queries through authenticated RLS reads',async()=>{
  const {makeProvider,calls}=loadProvider([{uid:'AL132601',title:'LP13',searchable:false}]);
  const provider=makeProvider({
    id:'lo3rwang:text',table:'silver.lo3rwang_galaxy',source:'lo3rwang 文字',
    scope:{id:'lo3rwang'},idColumn:'uid',columns:['uid','title','searchable'],
    searchFields:['title'],authenticated:true
  });
  const result=await provider.search('LP13');
  assert.equal(calls.length,1);
  assert.equal(calls[0].authenticated,true,'Manager search must not use anonymous Supabase client');
  assert.equal(result.rows[0].row.uid,'AL132601');
});

test('hidden rows are included only in managed Scope providers',()=>{
  const source=extract('app/loc/galaxy-query.js','function genericScopeProviders(', 'function normalizeSearch(');
  const genericScopeProviders=vm.runInNewContext(source+'; genericScopeProviders',{
    scopeOf:s=>s,
    publicContentFilters:filters=>[...filters,{column:'content',operator:'neq',value:''}],
    makeProvider:options=>options
  });
  const scope={id:'lo3rwang',galaxy:'silver.lo3rwang_galaxy',galaxyMedia:'silver.lo3rwang_galaxy_media',time:'silver.lo3rwang_time'};
  const publicSources=genericScopeProviders(scope);
  const managerSources=genericScopeProviders(scope,{includeHiddenText:true});
  for(let index=0;index<4;index++){
    assert.equal(publicSources[index].authenticated,false);
    assert.equal(managerSources[index].authenticated,true);
    assert.ok(publicSources[index].filters.some(filter=>filter.column==='searchable'&&filter.value===true));
    assert.ok(!managerSources[index].filters.some(filter=>filter.column==='searchable'));
  }
  assert.equal(managerSources[4].authenticated,undefined,'Media search must remain on its normal public path');
});

test('admin direct UID lookup reads hidden body through authenticated RLS',async()=>{
  const source=extract('app/loc/galaxy-query.js','export async function selectGalaxyIdentity(', 'function literalPattern(');
  const calls=[];
  const lookup=vm.runInNewContext(source.replace(/^export /,'')+'; selectGalaxyIdentity',{
    scopeOf:s=>s,
    selectRowById:async(table,opts)=>{
      calls.push(opts);
      if(!opts.authenticated)return null;
      return opts.columns==='uid,content'
        ?{uid:'AL132601',content:'LP13 13 首完整歌曲'}
        :{uid:'AL132601',title:'LP13',searchable:false,media_link:[]};
    },
    mediaRowsFor:async()=>[],
    mediaIdsOf:()=>[],
    resolvedLinks:()=>[]
  });
  const scope={id:'lo3rwang',galaxy:'silver.lo3rwang_galaxy',galaxyMedia:'silver.lo3rwang_galaxy_media',time:'silver.lo3rwang_time'};
  assert.equal(await lookup(scope,'AL132601'),null,'Anonymous direct link must not reveal hidden content');
  const found=await lookup(scope,'AL132601',{includeHidden:true});
  assert.equal(found.content,'LP13 13 首完整歌曲');
  assert.ok(calls.slice(-2).every(call=>call.authenticated===true));
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

test('Galaxy TEXT hit pairs and excluded state roundtrip',()=>{
  assert.equal(formatGroupLists({'14':1,'12':3}),'12:3,14:1');
  assert.equal(parseGroupLists('12:3,14:1')['12'],3);
  assert.equal(formatGroupLists(false),'false');
  assert.equal(formatGroupLists({}),'');
  assert.equal(parseGroupListsAttr('14:1, 12:3'),'12:3,14:1');
});
test('editing an article does not rewrite untouched attributes',()=>{
  const source=extract('app/modular/features/Search.jsx','function changedGalaxyAttributes(', 'function normalizeScopeAlias(');
  const context={
    isoOrNull:()=>null,nullableText:value=>String(value||'').trim()||null,
    parseListText:value=>String(value||'').split(/[\n,]+/g).map(item=>item.trim()).filter(Boolean),
    parseGroupListsText:value=>value
  };
  const changedGalaxyAttributes=vm.runInNewContext(source+'; changedGalaxyAttributes',context);
  const attrs={createtime:'',source_place:'',searchable:true,url:'',source_id:'',ref_id:'',source_name:'',target_id:'',media_link:'',statistics_able:true,class_id:'',group_lists:'false'};
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
  const source=extract('app/modular/features/Search.jsx','function prioritizeStyleTagResults(', '\n\nfunction searchHref(');
  const prioritizeStyleTagResults=vm.runInNewContext(source+'; prioritizeStyleTagResults');
  const rows=[{id:'article-a'},{id:'style-a',styleTagMatch:true},{id:'article-b'},{id:'style-b',styleTagMatch:true}];
  assert.deepEqual(Array.from(prioritizeStyleTagResults(rows),row=>row.id),['style-a','style-b','article-a','article-b']);
});


test('advanced filters select real providers without a duplicate media-only search mode',()=>{
  const source=extract('app/loc/galaxy-query.js','function genericScopeProviders(', 'function normalizeSearch(');
  const genericScopeProviders=vm.runInNewContext(source+'; genericScopeProviders',{
    scopeOf:value=>value,
    publicContentFilters:items=>items,
    makeProvider:config=>config
  });
  const scope={id:'author',galaxy:'silver.author_galaxy',
    galaxyMedia:'silver.author_galaxy_media',time:'silver.author_time'};
  const all=genericScopeProviders(scope);
  assert.equal(all.length,6,'Ordinary search should include the media provider');
  assert.equal(all.filter(x=>x.table===scope.galaxyMedia).length,1);
  const media=genericScopeProviders(scope,{contentType:'multimedia',sourceFilter:'suno'});
  assert.equal(media.length,1,'Multimedia is an advanced category, not a separate search mode');
  assert.equal(media[0].table,scope.galaxyMedia);
  assert.match(media[0].sourceClause,/suno\.com/);
  const lyrics=genericScopeProviders(scope,{contentType:'lyrics_work',sourceFilter:'threads'});
  assert.equal(lyrics.length,4);
  assert.ok(lyrics[0].filters.some(f=>f.column==='source_name'&&f.value==='suno'));
  assert.ok(lyrics[0].filters.some(f=>f.column==='source_name'&&f.value==='threads'));
  const timeline=genericScopeProviders(scope,{contentType:'timeline'});
  assert.equal(timeline.length,1);
  assert.equal(timeline[0].table,scope.time);
});

test('date range filters span full Taipei calendar days',()=>{
  const source=extract('app/loc/galaxy-query.js','function dateSearchFilters(', 'function recordFor(');
  const dateSearchFilters=vm.runInNewContext(source+'; dateSearchFilters');
  assert.deepEqual(JSON.parse(JSON.stringify(dateSearchFilters('createtime','2026-10-01','2026-10-07'))),[
    {column:'createtime',operator:'gte',value:'2026-10-01T00:00:00+08:00'},
    {column:'createtime',operator:'lte',value:'2026-10-07T23:59:59.999+08:00'}
  ]);
});

test('browsing without a keyword invokes the bounded search provider',async()=>{
  const source=extract('app/loc/galaxy-query.js','export async function searchGalaxyRows(', '\n\n/**');
  const calls=[];
  const searchGalaxyRows=vm.runInNewContext(source.replace(/^export /,'')+'; searchGalaxyRows',{
    DEFAULT_LIST_BATCH_SIZE:20,
    genericScopeProviders:()=>[{
      id:'author:media',
      async search(query,options){calls.push({query,options});return {rows:[{row:{media_id:'one'}}],hasMore:false};}
    }]
  });
  const result=await searchGalaxyRows([{id:'author'}],'',{browse:true,contentType:'multimedia',startDate:'2026-10-01'});
  assert.equal(result.rows.length,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.browse,true);
  assert.equal(calls[0].options.startDate,'2026-10-01');
});

test('search reference section uses existing editable page=search BlockNote content',()=>{
  const source=fs.readFileSync(new URL('../app/modular/features/Search.jsx',import.meta.url),'utf8');
  assert.ok(source.includes('scope-search-filter-panel'));
  assert.ok(source.includes('selectCultureTimeRows('));
  assert.ok(source.includes('import ScopeEditableBlocks'));
  assert.ok(source.includes('page="search"'));
  assert.ok(source.includes('scopeId={scopeId}'));
  assert.ok(!source.includes('scopeId="loc"'),'Do not share LOC Search block across independent Scope pages');
  const reader=fs.readFileSync(new URL('../app/loc/scope-data.js',import.meta.url),'utf8');
  const blocks=fs.readFileSync(new URL('../app/loc/ScopeEditableBlocks.jsx',import.meta.url),'utf8');
  assert.ok(reader.includes('silver.${id}_blocks'));
  assert.ok(blocks.includes('silver.${scopeId}_blocks'));
  assert.ok(blocks.includes("['scope-blocks',scopeId,pageName]"),'Query caches must be isolated per Scope');
  assert.ok(source.includes('className="scope-search-reference-grid"'));
  assert.ok(source.includes('slotClassName="loc-card scope-search-reference-block"'));
  assert.ok(source.includes('orders={[1]}'),'Search suggestions must use exactly one outer block');
  assert.ok(source.includes('allowDelete={false}'),'The search suggestion container is not an addable or deletable list');
  assert.ok(source.includes('allowInlineChildAdd'),'New suggestions must be nested child cards');
  assert.ok(blocks.includes('function beginWithChild('),'Nested cards must use the existing BlockNote editor');
  assert.ok(blocks.includes('const displayed=rows.map(row=>normalizeRow(row,row.block_order));'),'Unbounded Add Block must render its new draft');
  assert.ok(!source.includes('selectSearchReferenceSuggestions('));
  assert.ok(!source.includes('setSearchMode('));
  assert.ok(blocks.includes("dynamic(()=>import('./BlockNoteEditor')"),'Page blocks must load the canonical BlockNote editor only on demand');
  assert.ok(!/^import BlockNoteEditor/m.test(blocks),'Do not pull the editor into every read-only page');
  assert.ok(blocks.includes('page_name:pageName'));
  assert.ok(blocks.includes('await updateRows(table,values'));
  assert.ok(blocks.includes('await insertRows(table,'));
});

test('LOC, author and runes read distinct page=search Blocks records',async()=>{
  const code=fs.readFileSync(new URL('../app/loc/scope-data.js',import.meta.url),'utf8');
  const start=code.indexOf('export async function selectScopeBlocks(');
  assert.ok(start>=0);
  const queries=[];
  const selectScopeBlocks=vm.runInNewContext(code.slice(start).replace(/^export /,'')+'; selectScopeBlocks',{
    SCOPE_ID_PATTERN:/^[a-z][a-z0-9]{0,14}$/,
    DB_QUERY_BATCH_SIZE:20,
    selectRows:async(table,options)=>{
      queries.push({table,options});return {rows:[]};
    }
  });
  for(const scopeId of ['loc','lo3rwang','lrunes']){
    await selectScopeBlocks(scopeId,'search');
  }
  assert.deepEqual(queries.map(q=>q.table),[
    'silver.loc_blocks','silver.lo3rwang_blocks','silver.lrunes_blocks'
  ]);
  assert.ok(queries.every(q=>q.options.filters[0].value==='search'));
});

test('LOC, author and runes Search routes keep separate Scope identities',()=>{
  const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const loc=read('app/search/page.jsx');
  const author=read('app/lo3rwang/search/page.jsx');
  const runes=read('app/lrunes/search/page.jsx');
  assert.ok(loc.includes('forcedView="search"'));
  assert.ok(!loc.includes('forcedScope='));
  assert.ok(author.includes('forcedView="search" forcedScope="lo3rwang"'));
  assert.ok(runes.includes('forcedView="search" forcedScope="lrunes"'));
});

test('Galaxy attributes accept plain text and reject literal or encoded HTML',()=>{
  for(const value of ['普通文字','A < B 且 B > C','https://suno.com/song/id','12:3,14:1','']){
    assert.equal(hasHtmlTag(value),false);
  }
  for(const value of ['<p>內容</p>','<a href="https://example.com">網址</a>','<br/>','<!-- note -->','&lt;strong&gt;加粗&lt;/strong&gt;','&#60;script&#62;x&#60;/script&#62;']){
    assert.equal(hasHtmlTag(value),true,'HTML must be rejected: '+value);
    assert.throws(()=>assertPlainGalaxyAttributes({source_name:value}),/source_name.*HTML/);
  }
  assert.deepEqual(assertPlainGalaxyAttributes({source_name:'suno',target_id:['A1','A2'],searchable:false}),{
    source_name:'suno',target_id:['A1','A2'],searchable:false
  });
  assert.throws(()=>assertPlainGalaxyAttributes({target_id:['A1','<img src=x>']}),/target_id.*HTML/);
});

test('Search uses a single BlockNote edit draft, with Galaxy metadata below the body only for managers',()=>{
  const source=fs.readFileSync(new URL('../app/modular/features/Search.jsx',import.meta.url),'utf8');
  const shared=fs.readFileSync(new URL('../app/modular/Article.jsx',import.meta.url),'utf8');
  assert.ok(!source.includes('GalaxyAttrEditor'));
  assert.ok(!source.includes('GalaxyAttrSummary'));
  assert.ok(!source.includes('GalaxyAttrPanel'));
  assert.ok(source.includes("attributeFields={editable?(row.resourceType==='galaxy'?GALAXY_ATTR_FIELDS:row.resourceType==='galaxy_media'?MEDIA_ATTR_FIELDS:null):null}"));
  assert.ok(source.includes('canManageSearchScope(account,row.scopeId)'));
  assert.ok(source.includes('assertPlainGalaxyAttributes({'));
  assert.ok(source.indexOf('assertPlainGalaxyAttributes({')<source.indexOf('await updateRows(result.editableTable,contentPatch'));
  assert.ok(!source.includes('editorExtra='));
  const objectEditor=fs.readFileSync(new URL('../app/loc/BlockNoteEditor.jsx',import.meta.url),'utf8');
  assert.ok(shared.includes('<ObjectEditor mode="article"'));
  assert.ok(shared.includes('attributeFields={attributeFields}'));
  assert.ok(objectEditor.includes("export function ObjectEditor("));
  assert.ok(objectEditor.indexOf('onBlocksChange={blocks=>')<objectEditor.indexOf('attributeFields.map('));
  assert.ok(objectEditor.includes("const setValue=value=>onChange?.(previous=>"));
  assert.ok(objectEditor.includes("kind==='boolean'"));
  assert.ok(objectEditor.includes("kind==='array'||kind==='multiline'"));
  assert.ok(shared.includes('onClickCapture={onClickCapture}'));
  assert.ok(shared.includes('onClick:onSave'));
  assert.ok(shared.includes('<ObjectEditor mode="actions"'));
  assert.ok(objectEditor.includes("if(mode==='actions')return actionBar;"));
});

test('Homepage and article click-to-edit ignore existing links and visualization targets',async()=>{
  const {isInteractiveContentTarget}=await import('../app/loc/inline-edit-interaction.mjs');
  for(const selector of ['a','button','svg','canvas','video','.vis-timeline','.recharts-wrapper','[data-no-inline-edit]']){
    const target={closest:value=>value.includes(selector)?{}:null};
    assert.equal(isInteractiveContentTarget(target),true);
  }
  assert.equal(isInteractiveContentTarget({closest:()=>null}),false);
});

test('Galaxy Media import normalizes nested URL assets and existing media references',()=>{
  const linked=normalizeImportMedia([
    {url:'https://suno.com/song/8f51d216-e993-4fee-a3de-5ee2e0467a60',title:'作品',media_type:'suno'},
    '61981c4e-68ba-4b6a-8165-bb6cff4d37e4',
    {url:'https://suno.com/song/8f51d216-e993-4fee-a3de-5ee2e0467a60',title:'作品',media_type:'suno'}
  ],{title:'預設',galaxy_link:'AL132601',createtime:'2026-10-18T00:00:00Z'});
  assert.equal(linked.records.length,1,'Identical source assets are not imported twice');
  assert.equal(linked.records[0].galaxy_link,'AL132601');
  assert.equal(linked.records[0].media_type,'suno');
  assert.deepEqual(linked.references,['61981c4e-68ba-4b6a-8165-bb6cff4d37e4']);
});

test('Search Media Link viewing and editing use the same article and BlockNote attribute component',()=>{
  const search=fs.readFileSync(new URL('../app/modular/features/Search.jsx',import.meta.url),'utf8');
  const article=fs.readFileSync(new URL('../app/modular/Article.jsx',import.meta.url),'utf8');
  const navigation=fs.readFileSync(new URL('../app/modular/feature-navigation.js',import.meta.url),'utf8');
  const importUi=fs.readFileSync(new URL('../app/loc/ManagementImportPanel.jsx',import.meta.url),'utf8');
  assert.ok(article.includes('galaxyMediaHref(mediaScopeId,id)'));
  assert.ok(navigation.includes('media:NavigationValue.optional()'));
  assert.ok(search.includes('executeMediaIdentity(media)'));
  assert.ok(search.includes('MEDIA_EDITOR_COLUMNS'));
  assert.ok(search.includes('changedMediaAttributes(editDraft,t)'));
  assert.ok(search.includes("attributeTitle={row.resourceType==='galaxy_media'?t('uiExtra.searchUI.mediaAttributes'):t('uiExtra.searchUI.attributeTitle')}"));
  assert.ok(search.includes("showBodyEditor={row.resourceType==='galaxy'}"));
  assert.ok(importUi.includes('writeImportBatches(createMedia'));
  assert.ok(importUi.includes('async function syncImportedMedia('));
  assert.ok(importUi.includes('normalized:original,knownArticleIds,galaxy,galaxyMedia,batchSize:format.batchSize,t'));
  assert.ok(importUi.includes('await updateRows(galaxy,{media_link:after}'));
});

test('Search recommendations have explicit edit buttons and non-edit clicks navigate to suggestions',()=>{
  const search=fs.readFileSync(new URL('../app/modular/features/Search.jsx',import.meta.url),'utf8');
  const blocks=fs.readFileSync(new URL('../app/loc/ScopeEditableBlocks.jsx',import.meta.url),'utf8');
  assert.ok(search.includes('explicitEditButton'));
  assert.ok(search.includes('onSuggestionClick={term=>router.push(searchHref(scopeId,term))}'));
  assert.ok(blocks.includes('canEdit&&explicitEditButton?<button'));
  assert.ok(blocks.includes('canEdit&&!active&&!explicitEditButton?event=>'));
  assert.ok(blocks.includes('selectSuggestion(entity.title||entity.text)'));
});

test('Same URL is shown exactly once and prefers a Galaxy Media title',()=>{
  const snippet=extract('app/modular/features/Search.jsx','function uniqueExternalLinks(', 'function mergeSummaryResults(');
  const uniqueExternalLinks=vm.runInNewContext(snippet+'; uniqueExternalLinks',{UI_COPY:{search:{externalLink:'外部連結',mediaLink:'媒體連結'}}});
  const href='https://suno.com/album/61981c4e-68ba-4b6a-8165-bb6cff4d37e4';
  const output=uniqueExternalLinks([
    {id:'primary',href,label:'外部連結'},
    {id:'url',href,label:'外部連結'},
    {id:'media',href,label:'混沌之月，共振之時'}
  ]);
  assert.equal(output.length,1);
  assert.equal(output[0].label,'混沌之月，共振之時');
});


test('route, page and management edit capabilities remain lazily split from read-only entrypoints',()=>{
  const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const app=read('app/loc/LocApp.jsx');
  const ui=read('app/modular/ui.jsx');
  const settings=read('app/loc/GlobalSettings.jsx');
  const article=read('app/modular/Article.jsx');
  const home=read('app/loc/ScopeEditableBlocks.jsx');
  for(const [name,module] of [
    ['AdminHomeView','./views/AdminHomeView'],
    ['AuthorHomeView','./views/AuthorHomeView'],
    ['AboutView','./views/AboutView'],
    ['GenericScopeHomeView','./views/GenericScopeHomeView'],
    ['ScopeGroupOverview','./ScopeGroupOverview']
  ]){
    assert.ok(app.includes("const "+name+"=dynamic(()=>import('"+module+"')"),
      name+' should not be imported by unrelated app routes');
    assert.ok(!app.includes('import '+name+' from '),'No eager route imports');
  }
  for(const name of ['PrivateLocalFiles','ManagementImportPanel','ManagementArticlePublisher','ScopeSettingsPanel','ScopeGroupManagement']){
    assert.ok(settings.includes("const "+name+"=dynamic(()=>import('./"+name+"')"),
      name+' must load only when its Settings section is mounted');
    assert.ok(!settings.includes('import '+name+' from '),'No eager management imports');
  }
  assert.ok(ui.includes("const ScopeEditableBlocks=dynamic(()=>import('../loc/ScopeEditableBlocks')"));
  assert.ok(ui.includes("const BlockNoteEditor=dynamic(()=>import('../loc/BlockNoteEditor')"));
  assert.ok(article.includes("const ObjectEditor=dynamic(()=>import('../loc/BlockNoteEditor').then("));
  assert.ok(home.includes("const ObjectEditor=dynamic(()=>import('./BlockNoteEditor').then("));
  assert.ok(!/^import BlockNoteEditor/m.test(article));
  assert.ok(!/^import BlockNoteEditor/m.test(home));
});
