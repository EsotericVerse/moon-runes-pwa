import fs from 'node:fs';

const files={
  identity:'app/loc/views/AboutView.jsx',
  registry:'app/modular-v2/scope-registry.v2.js',
  search:'app/loc/neon-search.js',
  searchView:'app/modular-v2/features/SearchV2.jsx',
  dailyTrend:'app/loc/model/daily-trend-engine.mjs',
  searchProviders:'app/loc/search-providers.js',
  surfaceSearch:'app/loc/surface-search.js'
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
const dailyTrend=read(files.dailyTrend);
for(const token of ['summarizeDailyRange','dailyPresetRange'])if(!dailyTrend.includes(token))failures.push(`daily trend: missing ${token}`);
const runeRuntime=read('app/lrunes/RunesClient.jsx');
for(const token of ["selectNeonRows('silver.runes'","selectNeonRows('silver.runes_etc'"])if(!runeRuntime.includes(token))failures.push(`canonical rune runtime: missing ${token}`);
for(const path of Object.values(files)){
  const source=read(path);
  if(['data/json','runtime_json_documents','LOC_DATA','canonical/runes','fetchNeonData'].some(token=>source.includes(token)))failures.push(`${path}: retired data-path/JSON identifier remains`);
}
for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs','app/loc/rune-repository.js','app/lrunes/rune-draw-engine.js','app/loc/model/semantic-state.mjs','app/loc/model/spread-guidance.mjs'])if(fs.existsSync(retired))failures.push(`${retired}: retired runtime layer returned`);
for(const path of ['app/lrunes/RunesClient.jsx','app/lrunes/RuneDrawClient.jsx','app/lrunes/RuneSingleReading.jsx','app/loc/RuneManagementPanel.jsx']){
  const source=read(path);
  for(const forbidden of ['semantic-state','spread-guidance','resolveSpreadState','cardSemanticState','buildSpreadGuidance'])if(source.includes(forbidden))failures.push(`${path}: semantic rendering layer returned: ${forbidden}`);
}

const search=read(files.search);
const searchProviders=read(files.searchProviders);
for(const token of ["count:'exact',head:true",".or(",".range("])if(!searchProviders.includes(token))failures.push(`search providers: missing direct Neon query contract ${token}`);
if(/flexsearch|createSurfaceSearch|new Index\\(/i.test(searchProviders))failures.push('search providers: FlexSearch must not become the global corpus query layer');
const surfaceSearch=read(files.surfaceSearch);
for(const token of ["from 'flexsearch'",'new Index(','cache:cacheSize'])if(!surfaceSearch.includes(token))failures.push(`surface search: missing ${token}`);
for(const forbidden of ['neonPublicClient','selectNeonRows','resolveScopeTables'])if(surfaceSearch.includes(forbidden))failures.push(`surface search: must not own Neon access ${forbidden}`);
for(const token of ['getSearchProviders','getMediaSearchProviders','provider.search'])if(!search.includes(token))failures.push(`search: missing Current provider contract ${token}`);
for(const path of [files.search,files.searchView]){
  const source=read(path);
  if(/columns:\s*['"]\*['"]|JSON\.stringify|canonical_payload|SEARCH_(?:INDEX|TABLE)_CACHE|memoryCache/.test(source))failures.push(`${path}: forbidden JSON read or retained cache remains`);
}

if(failures.length){console.error('Current semantic authority guard failed:\\n'+failures.map(item=>`- ${item}`).join('\\n'));process.exit(1);}
console.log('Current runtime authority guard passed: canonical Neon data with no semantic rendering layer.');
