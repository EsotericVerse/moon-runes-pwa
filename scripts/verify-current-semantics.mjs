import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const required=[
  'app/loc/views/AboutView.jsx',
  'app/modular-v2/scope-registry.v2.js',
  'app/loc/neon-search.js',
  'app/modular-v2/features/SearchV2.jsx',
  'app/loc/model/daily-trend-engine.mjs',
  'app/loc/search-providers.js',
  'app/loc/surface-search.js',
  'app/lrunes/RunesClient.jsx',
  'app/lrunes/RuneDrawClient.jsx'
];
for(const path of required)if(!fs.existsSync(path)||!read(path).trim())failures.push('missing Current contract file: '+path);
if(!failures.length){
  const identity=read('app/loc/views/AboutView.jsx');
  for(const token of ['語言架構框架','Language Architecture Framework','符號式語言','Symbolic Language'])if(!identity.includes(token))failures.push('identity missing '+token);
  const registry=read('app/modular-v2/scope-registry.v2.js');
  for(const token of ["domain:'lrunes.lo3rwang.cc'"])if(!registry.includes(token))failures.push('registry missing '+token);
  const daily=read('app/loc/model/daily-trend-engine.mjs');
  for(const token of ['summarizeDailyRange','dailyPresetRange'])if(!daily.includes(token))failures.push('daily trend missing '+token);
  const runeDraw=read('app/lrunes/RuneDrawClient.jsx');
  for(const token of ["selectNeonRows('silver.runes'","selectNeonRows('silver.runes_etc'"])if(!runeDraw.includes(token))failures.push('Rune draw runtime missing '+token);
  const providers=read('app/loc/search-providers.js');
  const surfaceSearch=read('app/loc/surface-search.js');
  for(const token of ["count:'exact',head:true",".or(",".range("])if(!providers.includes(token))failures.push('Search provider missing '+token);
  for(const token of ["from 'flexsearch'",'new Index(','cache:cacheSize'])if(!surfaceSearch.includes(token))failures.push('Surface FlexSearch missing '+token);
  for(const forbidden of ['neonPublicClient','selectNeonRows','resolveScopeTables'])if(surfaceSearch.includes(forbidden))failures.push('Surface FlexSearch must not own Neon access '+forbidden);
  const search=read('app/loc/neon-search.js');
  for(const token of ['getSearchProviders','getMediaSearchProviders','provider.search'])if(!search.includes(token))failures.push('Search orchestration missing '+token);
}
if(failures.length){
  console.error('[current-semantics] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[current-semantics] Current identity, Neon authority, Rune and Search contracts verified');
