import {existsSync,readFileSync,statSync,readdirSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';

const root=process.cwd();
const failures=[];
const warnings=[];

function walk(dir,callback){
  if(!existsSync(dir))return;
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    const stat=statSync(path);
    if(stat.isDirectory())walk(path,callback);
    else callback(path);
  }
}

walk(resolve(root,'app'),path=>{
  if(!/\.(?:js|jsx|mjs)$/.test(path))return;
  const rel=relative(root,path).replaceAll('\\','/');
  const text=readFileSync(path,'utf8');
  if(/fetchStaticJson|runtime_json_documents|fetch\(['"]\/data\/json\//.test(text)||['LOC_DATA','fetchNeonData(','fetchNeonDataBatch(','canonical/runes'].some(token=>text.includes(token))){
    failures.push(`${rel}: retired JSON/path-loader runtime is forbidden`);
  }
  if(/neon-scope-projections|selectScopeProjectionRows/.test(text)){
    failures.push(`${rel}: retired projection loader reference`);
  }
  if(/\bwork_count\b/.test(text)){
    failures.push(`${rel}: stored work_count/runtime work_count naming is forbidden; use live item_count aggregates`);
  }
  if(/silver\.(?:lo3rwang|lrunes)_(?:galaxy(?:_media)?|time)\b/.test(text)){
    failures.push(`${rel}: scope Galaxy/Time table must resolve through silver.manage mapping`);
  }
});

for(const required of [
  'app/loc/neon-statistics-client.js',
  'app/loc/neon-culture-client.js',
  'app/loc/neon-search.js'
]){
  if(!existsSync(resolve(root,required)))failures.push(`${required}: required Neon/module boundary missing`);
}

for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs','app/loc/neon-context-client.js','app/loc/rune-repository.js','app/lrunes/rune-draw-engine.js','app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/ContextWorkbenchV2.jsx','app/modular-v2/modules/context-graph/ContextGraphV2.jsx','app/modular-v2/features/KeywordSettingsV2.jsx','app/modular-v2/features/RuneKeywordSettingsV2.jsx'])if(existsSync(resolve(root,retired)))failures.push(`${retired}: retired path must remain removed`);

const statisticsView=readFileSync(resolve(root,'app/modular-v2/features/StatisticsV2.jsx'),'utf8');
if(!/selectScopeRankingRows\(scopeId/.test(statisticsView))failures.push('StatisticsV2: shared canonical ranking query missing');
if(/selectScopeRankingPage\(/.test(statisticsView))failures.push('StatisticsV2: retired duplicate SQL ranking pagination returned');

const cultureView=readFileSync(resolve(root,'app/modular-v2/features/CultureV2.jsx'),'utf8');
if(!/selectScopeCultureData\(scopeId\)/.test(cultureView))failures.push('CultureV2: shared Neon culture client missing');

const searchClient=readFileSync(resolve(root,'app/loc/neon-search.js'),'utf8');
const searchProviders=readFileSync(resolve(root,'app/loc/search-providers.js'),'utf8');
const searchView=readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8');
for(const token of ["count:'exact',head:true",".or(",".range("])if(!searchProviders.includes(token))failures.push('Search: direct Neon literal query contract missing '+token);
for(const forbidden of ['createTextIndex','searchTextIndex','literalTextMatches'])if(searchProviders.includes(forbidden))failures.push('Search: retired client text engine returned '+forbidden);
if(existsSync(resolve(root,'app/loc/text-engine.mjs')))failures.push('app/loc/text-engine.mjs: retired client text engine returned');
if(existsSync(resolve(root,'app/loc/keyword-classifier.js')))failures.push('app/loc/keyword-classifier.js: retired JS keyword classifier returned');
if(existsSync(resolve(root,'app/loc/style-classifier.js')))failures.push('app/loc/style-classifier.js: retired duplicate classifier returned');
if(!/searchNeonRows\(/.test(searchView))failures.push('SearchV2: shared search client missing');

const scopeManagement=readFileSync(resolve(root,'app/loc/GovernanceManagement.jsx'),'utf8');
const adminManagement=readFileSync(resolve(root,'app/loc/views/AdminHomeView.jsx'),'utf8');
if(!/useNeonAccount/.test(scopeManagement)||!/canManageScopeSync/.test(scopeManagement))failures.push('Scope management: manager role gate missing');
if(/(?:import|<)\s*KeywordSettingsV2\b|RuneKeywordSettingsV2\b|符文關鍵詞分組/.test(scopeManagement))failures.push('Scope management: LunaRunes canonical rune keywords must not be used as editable/fallback style');
if(/silver\.runes|positive_keywords|negative_keywords/.test(scopeManagement))failures.push('Scope management: general Scope defaults must not read LunaRunes canonical keyword data');
if(!/useNeonAccount/.test(adminManagement)||!/canManageGlobalSync/.test(adminManagement))failures.push('Admin management: global manager role gate missing');

for(const retired of ['app/loc/local-db.js','app/loc/google-drive.js','app/loc/storage.js','app/loc/auth-client.js']){
  if(existsSync(resolve(root,retired)))failures.push(`${retired}: retired persistence/auth module must remain removed`);
}

if(warnings.length)console.warn(warnings.join('\\n'));
if(failures.length){
  console.error('[modularity] violations:\\n'+failures.join('\\n'));
  process.exit(1);
}
console.log('[modularity] Neon client/domain boundaries verified');
