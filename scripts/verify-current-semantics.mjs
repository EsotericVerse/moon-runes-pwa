import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const required=[
  'app/loc/views/AboutView.jsx',
  'app/loc/galaxy-query.js',
  'app/modular/features/Search.jsx',
  'app/loc/model/daily-trend-engine.mjs',
  'app/loc/scope-data.js',
  'scripts/verify-neon-public-read.mjs',
  'governance/runtime-capabilities.json'
];
for(const path of required)if(!fs.existsSync(path)||!read(path).trim())failures.push('missing Current contract file: '+path);
if(!failures.length){
  const identity=read('app/loc/views/AboutView.jsx');
  for(const token of ['語言架構框架','Language Architecture Framework','符號式語言','Symbolic Language'])if(!identity.includes(token))failures.push('identity missing '+token);
  const daily=read('app/loc/model/daily-trend-engine.mjs');
  for(const token of ['summarizeDailyRange','dailyPresetRange'])if(!daily.includes(token))failures.push('daily trend missing '+token);
  const galaxy=read('app/loc/galaxy-query.js');
  for(const token of ["count:'exact',head:true",'.or(','.range(','searchGalaxyRows','selectSourceTrendRows'])if(!galaxy.includes(token))failures.push('Shared Galaxy query pipeline missing '+token);
  if(/flexsearch|new Index\(/i.test(galaxy))failures.push('Global Search must remain Neon-first.');
  const scopeData=read('app/loc/scope-data.js');
  for(const token of ["MANAGE_TABLE='silver.manage'",'scopeDataFromManageRows','defaultScopeData','selectManagedScopes'])if(!scopeData.includes(token))failures.push('Scope data source missing '+token);
  const capabilityRegistry=JSON.parse(read('governance/runtime-capabilities.json'));
  const flexCache=capabilityRegistry?.capabilities?.flexsearch_uid_cache_table;
  if(!flexCache||flexCache.status!=='protected')failures.push('FlexSearch UID cache-table capability must remain protected');
  if(flexCache?.authority!==false||flexCache?.canonical_content_allowed!==false)failures.push('FlexSearch UID cache-table must remain non-authoritative and non-canonical');
  if(flexCache?.must_not_be_removed_as_duplicate_authority!==true||flexCache?.removal_requires_explicit_governance_change!==true)failures.push('FlexSearch UID cache-table removal protection missing');
  for(const token of ['uid','scope_id','cache_name'])if(!(flexCache?.allowed_payload||[]).includes(token))failures.push('FlexSearch UID cache-table allowed payload missing '+token);
  const neonAudit=read('scripts/verify-neon-public-read.mjs');
  for(const token of ['managedScopes','scopeMapping','scopeMappings','mapping conflict','verifyManagedScope'])if(!neonAudit.includes(token))failures.push('Public Neon audit missing Scope-derived '+token);
  for(const token of ['lo3rwang_galaxy','lrunes_galaxy','lo3rwang_time','lrunes_time'])if(neonAudit.includes(token))failures.push('Public Neon audit must not hard-code Scope table '+token);
}
if(failures.length){
  console.error('[current-semantics] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[current-semantics] Current identity, daily trend, Neon-first Search and protected FlexSearch UID cache capability verified');
