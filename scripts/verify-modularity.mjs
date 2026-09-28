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
});

for(const required of [
  'app/loc/rune-repository.js',
  'app/loc/neon-ranking-client.js',
  'app/loc/neon-culture-client.js',
  'app/loc/neon-search.js',
  'app/loc/text-engine.mjs'
]){
  if(!existsSync(resolve(root,required)))failures.push(`${required}: required Neon/module boundary missing`);
}

const runeRepository=readFileSync(resolve(root,'app/loc/rune-repository.js'),'utf8');
if(!runeRepository.includes('neonPublicClient')||!runeRepository.includes('selectRuneCatalog')||!runeRepository.includes('selectRuneKeywordCatalog'))failures.push('app/loc/rune-repository.js: canonical rune read boundary missing');
if(['LOC_DATA','fetchNeonData','canonical/runes','fetchStaticJson','runtime_json_documents'].some(token=>runeRepository.includes(token)))failures.push('app/loc/rune-repository.js: retired path/JSON loader semantics remain');
for(const retired of ['app/loc/data.js','app/loc/data-paths.mjs','app/loc/neon-context-client.js','app/modular-v2/features/ContextV2.jsx','app/modular-v2/features/ContextWorkbenchV2.jsx','app/modular-v2/modules/context-graph/ContextGraphV2.jsx'])if(existsSync(resolve(root,retired)))failures.push(`${retired}: retired path-loader must remain removed`);

const statisticsView=readFileSync(resolve(root,'app/modular-v2/features/StatisticsV2.jsx'),'utf8');
if(!/selectScopeRankingAll\(scopeId/.test(statisticsView))failures.push('StatisticsV2: shared canonical ranking query missing');
if(!/IncrementalLoadV2/.test(statisticsView))failures.push('StatisticsV2: shared incremental ranking loader missing');
if(/selectScopeRankingPage\(/.test(statisticsView))failures.push('StatisticsV2: retired duplicate SQL ranking pagination returned');

const cultureView=readFileSync(resolve(root,'app/modular-v2/features/CultureV2.jsx'),'utf8');
if(!/selectScopeCultureData\(scopeId\)/.test(cultureView))failures.push('CultureV2: shared Neon culture client missing');

const searchClient=readFileSync(resolve(root,'app/loc/neon-search.js'),'utf8');
const searchProviders=readFileSync(resolve(root,'app/loc/search-providers.js'),'utf8');
const textEngine=readFileSync(resolve(root,'app/loc/text-engine.mjs'),'utf8');
const keywordClassifier=readFileSync(resolve(root,'app/loc/keyword-classifier.js'),'utf8');
const searchView=readFileSync(resolve(root,'app/modular-v2/features/SearchV2.jsx'),'utf8');
if(!/from ['"]flexsearch['"]/.test(textEngine)||!/new Resolver/.test(textEngine))failures.push('Text engine: FlexSearch Resolver boundary is missing');
if(!/getRuntimeTextIndex/.test(searchProviders)||!/searchTextIndex/.test(searchProviders))failures.push('Search: shared FlexSearch provider boundary is missing');
if(/\.ilike\(|operator:\s*['"]ilike['"]/.test(searchProviders))failures.push('Search: direct ILIKE search must not replace the shared text engine');
if(!/searchTextIndex/.test(keywordClassifier))failures.push('Style classifier: Culture/Statistics must use the shared FlexSearch engine');
if(!/searchNeonRows\(/.test(searchView))failures.push('SearchV2: shared search client missing');

const scopeManagement=readFileSync(resolve(root,'app/loc/GovernanceManagement.jsx'),'utf8');
const adminManagement=readFileSync(resolve(root,'app/loc/views/AdminHomeView.jsx'),'utf8');
if(!/useNeonAccount/.test(scopeManagement)||!/canManageScopeSync/.test(scopeManagement))failures.push('Scope management: manager role gate missing');
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
