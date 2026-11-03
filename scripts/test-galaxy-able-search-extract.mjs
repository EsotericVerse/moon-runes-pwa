import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GALAXY_ABLE_KEYS,galaxyAble,prepareGalaxyInsertRows,prepareGalaxyUpdateValues,galaxySelectColumns,galaxyFilterColumns,restoreGalaxyPresentation} from '../app/loc/galaxy-able.mjs';
import {extractSearchContext} from '../app/loc/search-extract.mjs';

test('Galaxy writes eight independent BOOLEAN feature columns, not JSONB able',()=>{
  assert.deepEqual(GALAXY_ABLE_KEYS,['statics','culture','search','trace','list','keyword','others','extract']);
  const legacy={uid:'0123aBCD',able:{statics:true,culture:false,search:true,trace:false,
    list:false,keywords:true,game:false,extract:true}};
  const row=prepareGalaxyInsertRows('silver.lo3rwang_galaxy',[legacy])[0];
  assert.equal(Object.hasOwn(row,'able'),false);
  assert.equal(row.keyword,true);
  assert.equal(row.others,false);
  assert.equal(row.list,false);
  const current=galaxyAble({...row,able:{list:true}});
  assert.equal(current.list,false,'authoritative BOOLEAN value wins over old JSONB');
  assert.equal(current.keywords,true);
  const updated=prepareGalaxyUpdateValues('silver.lrunes_galaxy',{able:{list:false,keywords:false,game:false}});
  assert.deepEqual(updated,{list:false,keyword:false,others:false});
  assert.deepEqual(prepareGalaxyUpdateValues('silver.lrunes_galaxy',{title:'hello'}),{title:'hello'});
  assert.equal(galaxySelectColumns('silver.lo3rwang_galaxy','uid,title,able'),
    'uid,title,statics,culture,search,trace,list,keyword,others,extract');
  assert.deepEqual(galaxyFilterColumns('silver.lo3rwang_galaxy',
    [{column:'able->>keywords',operator:'eq',value:'true'}]),
    [{column:'keyword',operator:'eq',value:true}]);
  const restored=restoreGalaxyPresentation('silver.lo3rwang_galaxy',[row],'uid,able')[0];
  assert.equal(restored.able.game,false);
  assert.equal(restored.able.list,false);
});
test('search excerpt shows exactly the hit with approximately ten surrounding characters',()=>{
  const text='天涯海角的深處星光照耀我們的混沌之月漸漸走向黎明朝陽';
  const snippet=extractSearchContext(text,'混沌',10);
  assert.match(snippet,/混沌/);
  assert.ok(Array.from(snippet.split('混沌')[0].replace(/^…/,'')).length<=10);
  assert.ok(Array.from(snippet.split('混沌')[1].replace(/…$/,'')).length<=10);
  assert.equal(extractSearchContext(text,'不匹配詞',10),'');
  assert.match(extractSearchContext('<p>歌曲<b>混沌</b>之月</p>','混沌'),/混沌/);
  assert.doesNotMatch(extractSearchContext('<p>歌曲<b>混沌</b>之月</p>','混沌'),/<[a-z]/i);
});
test('search is primary, excerpt is optional and never loads in regular browse',()=>{
  const ui=readFileSync(new URL('../app/modular/features/Search.jsx',import.meta.url),'utf8');
  const query=readFileSync(new URL('../app/loc/galaxy-query.js',import.meta.url),'utf8');
  assert.match(query,/able->>search/);
  assert.match(ui,/row\.able\?\.search===false\|\|row\.able\?\.extract===false/);
  assert.match(ui,/if\(q&&!options\.browse&&!options\.placeOnly&&!options\.mediaOnly/);
  assert.match(ui,/extractSearchContext\(article\.content,query,10\)/);
  assert.match(ui,/highlightSearchText\(row\.snippet,matchedQueryRef\.current\)/);
  assert.match(ui,/row\.able\?\.list===false\?'（使用者隱藏）'/);
});
