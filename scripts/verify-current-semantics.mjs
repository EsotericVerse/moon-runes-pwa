import fs from 'node:fs';

const files={
  identity:'app/loc/views/AboutView.jsx',
  registry:'app/modular-v2/scope-registry.v2.js',
  guidance:'app/loc/model/semantic-state.mjs',
  canonicalLoader:'app/loc/rune-repository.js',
  search:'app/loc/neon-search.js',
  searchView:'app/modular-v2/features/SearchV2.jsx',
  dailyTrend:'app/loc/model/daily-trend-engine.mjs',
  searchProviders:'app/loc/search-providers.js'
};
const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
for(const [name,path] of Object.entries(files)){
  if(!fs.existsSync(path))failures.push(`${path}: missing canonical guard file`);
  else if(!read(path).trim())failures.push(`${path}: empty canonical guard file`);
}
const identity=read(files.identity);
for(const token of ['語言架構框架','Language Architecture Framework','符號式語言','Symbolic Language'])if(!identity.includes(token))failures.push(`identity: missing ${token}`);
const registry=read(files.registry);
for(const token of ["defaultScopeId:'loc'","domain:'lrunes.lo3rwang.cc'"])if(!registry.includes(token))failures.push(`scope registry: missing ${token}`);
const guidance=read(files.guidance);
for(const token of ['RUNE_SEMANTIC_STATES','resolveStatePair','resolveSpreadState'])if(!guidance.includes(token))failures.push(`semantic state: missing ${token}`);
for(const token of ['buildDailyStateIndex','findDailyState','createTextIndex','searchTextIndex'])if(guidance.includes(token))failures.push(`semantic state: retired Daily search token ${token}`);
const dailyTrend=read(files.dailyTrend);
for(const token of ['summarizeDailyRange','dailyPresetRange'])if(!dailyTrend.includes(token))failures.push(`daily trend: missing ${token}`);
for(const token of ['SPREAD_WEIGHTS','DIRECTION_FACTOR','POLARITY_SCORE','weighted','GUIDANCE_RANGES'])if(guidance.includes(token))failures.push(`semantic state: forbidden weighted-score token ${token}`);
const loader=read(files.canonicalLoader);
for(const token of ['selectNeonCount','selectNeonRows','selectRuneCatalog'])if(!loader.includes(token))failures.push(`canonical rune repository: missing ${token}`);
for(const path of Object.values(files)){
  const source=read(path);
  if(['data/json','runtime_json_documents','LOC_DATA','canonical/runes','fetchNeonData'].some(token=>source.includes(token)))failures.push(`${path}: retired data-path/JSON identifier remains`);
}
for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs'])if(fs.existsSync(retired))failures.push(`${retired}: retired path loader returned`);

const search=read(files.search);
const searchProviders=read(files.searchProviders);
for(const token of ["count:'exact',head:true",".or(",".range("])if(!searchProviders.includes(token))failures.push(`search providers: missing direct Neon query contract ${token}`);
for(const forbidden of ['createTextIndex','searchTextIndex','literalTextMatches'])if(searchProviders.includes(forbidden))failures.push(`search providers: retired client text engine returned ${forbidden}`);
if(fs.existsSync('app/loc/text-engine.mjs'))failures.push('app/loc/text-engine.mjs: retired client text engine returned');
if(fs.existsSync('app/loc/keyword-classifier.js'))failures.push('app/loc/keyword-classifier.js: retired JS keyword classifier returned');
for(const token of ['getSearchProviders','getMediaSearchProviders','provider.search'])if(!search.includes(token))failures.push(`search: missing Current provider contract ${token}`);
for(const path of [files.search,files.searchView,files.canonicalLoader]){
  const source=read(path);
  if(/columns:\s*['"]\*['"]|JSON\.stringify|canonical_payload|SEARCH_(?:INDEX|TABLE)_CACHE|memoryCache/.test(source))failures.push(`${path}: forbidden JSON read or retained cache remains`);
}

if(failures.length){console.error('Current semantic authority guard failed:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('Current semantic authority guard passed for the Neon canonical runtime.');
