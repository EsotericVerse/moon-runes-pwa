import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const required=[
  'app/loc/views/AboutView.jsx',
  'app/loc/galaxy-query.js',
  'app/modular/features/Search.jsx',
  'app/loc/model/daily-trend-engine.mjs',
  'app/loc/scope-data.js',
  'scripts/verify-db-public-read.mjs',
  'governance/runtime-capabilities.json',
  'app/loc/rune66-keyword-analysis.js',
  'app/loc/model/rune66-keyword-engine.mjs',
  'app/loc/KeywordLibraryPanel.jsx',
  'app/modular/features/Statistics.jsx',
  'app/modular/features/Culture.jsx'
];
for(const path of required)if(!fs.existsSync(path)||!read(path).trim())failures.push('missing Current contract file: '+path);
if(!failures.length){
  const identity=read('app/loc/views/AboutView.jsx');
  for(const token of ['語言架構框架','Language Architecture Framework','符號式語言','Symbolic Language'])if(!identity.includes(token))failures.push('identity missing '+token);
  const daily=read('app/loc/model/daily-trend-engine.mjs');
  for(const token of ['summarizeDailyRange','dailyPresetRange'])if(!daily.includes(token))failures.push('daily trend missing '+token);
  const galaxy=read('app/loc/galaxy-query.js');
  for(const token of ["count:'exact',head:true",'.or(','.range(','searchGalaxyRows','selectSourceTrendRows'])if(!galaxy.includes(token))failures.push('Shared Galaxy query pipeline missing '+token);
  if(/flexsearch|new Index\(/i.test(galaxy))failures.push('Global Search must remain Database-first.');
  const scopeData=read('app/loc/scope-data.js');
  for(const token of ["MANAGE_TABLE='silver.manage'",'scopeDataFromManageRows','defaultScopeData','selectManagedScopes'])if(!scopeData.includes(token))failures.push('Scope data source missing '+token);
  const capabilityRegistry=JSON.parse(read('governance/runtime-capabilities.json'));
  const flexCache=capabilityRegistry?.capabilities?.flexsearch_uid_cache_table;
  if(!flexCache||flexCache.status!=='optional')failures.push('FlexSearch UID cache table must remain optional');
  if(flexCache?.authority!==false||flexCache?.canonical_content_allowed!==false)failures.push('FlexSearch UID cache-table must remain non-authoritative and non-canonical');
  if(flexCache?.removal_requires_explicit_governance_change!==false)failures.push('FlexSearch UID cache table must not be a protected requirement');
  for(const token of ['uid','scope_id','cache_name'])if(!(flexCache?.allowed_payload||[]).includes(token))failures.push('FlexSearch UID cache-table allowed payload missing '+token);
  const keywordEngine=capabilityRegistry?.capabilities?.keyword_operations_flexsearch;
  if(!keywordEngine||keywordEngine.status!=='optional')failures.push('Keyword FlexSearch must remain optional');
  if(keywordEngine?.precise_search_engine!=='PostgreSQL'||keywordEngine?.database_keyword_matching_allowed!==true)failures.push('Keyword engine must allow measured database-backed summaries');
  if(keywordEngine?.removal_requires_explicit_governance_change!==false)failures.push('Keyword FlexSearch must not be a protected requirement');
  const rune66Analysis=read('app/loc/rune66-keyword-analysis.js');
  for(const token of ["column:'statistics_able',operator:'eq',value:true"])if(!galaxy.includes(token)||!rune66Analysis.includes(token))failures.push('Statistics and Rune66 analysis must use fixed statistics_able filters');
  const rune66Engine=read('app/loc/model/rune66-keyword-engine.mjs');
  if(!rune66Analysis.includes('classifyRune66Documents'))failures.push('Rune66 data loader must delegate to shared keyword classifier');
  if(!rune66Analysis.includes("silver.lo3rwang_keywords")||rune66Analysis.includes('lo3rwang_style'))failures.push('Rune66 data loader must use the unified keyword library table');
  for(const token of ['classifyRune66Documents'])if(!rune66Engine.includes(token))failures.push('Rune66 keyword engine missing classifier '+token);
  for(const token of ['group_name','item_no','item_name','principle','keywords'])if(!rune66Engine.includes(token))failures.push('Rune66 unified keyword item model missing '+token);
  if(rune66Engine.includes('keyword_group')||rune66Engine.includes("node_type==='style'")||rune66Engine.includes("node_type==='keyword'"))failures.push('Rune66 engine must not restore style/rule/node-type keyword storage');
  const statistics=read('app/modular/features/Statistics.jsx');
  const culture=read('app/modular/features/Culture.jsx');
  for(const token of ['表現風格','Class｜符文群組','Group｜符文排行'])if(!statistics.includes(token))failures.push('Statistics style-filter presentation missing '+token);
  for(const token of ['表現風格','Class｜符文群組比例','culture-style-filter'])if(!culture.includes(token))failures.push('Culture style-filter presentation missing '+token);
  if(statistics.includes('關鍵詞排行')||culture.includes('關鍵詞排行'))failures.push('Keyword-level ranking must remain hidden behind Class / Group presentation');
  const dbAudit=read('scripts/verify-db-public-read.mjs');
  for(const token of ['managedScopes','scopeMapping','scopeMappings','mapping conflict','verifyManagedScope'])if(!dbAudit.includes(token))failures.push('Public database audit missing Scope-derived '+token);
  for(const token of ['lo3rwang_galaxy','lrunes_galaxy','lo3rwang_time','lrunes_time'])if(dbAudit.includes(token))failures.push('Public database audit must not hard-code Scope table '+token);
}
if(failures.length){
  console.error('[current-semantics] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[current-semantics] Current identity, daily trend, fixed Statistics eligibility filters, Database-first Search and optional FlexSearch verified');
