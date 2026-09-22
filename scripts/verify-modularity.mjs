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
  if(/fetchStaticJson|runtime_json_documents|fetch\(['"]\/data\/json\//.test(text)){
    failures.push(`${rel}: runtime JSON/static fallback is forbidden`);
  }
  if(/neon-scope-projections|selectScopeProjectionRows/.test(text)){
    failures.push(`${rel}: retired projection loader reference`);
  }
});

for(const required of [
  'app/api/loc/data/route.js',
  'app/api/context/route.js',
  'app/api/culture/route.js',
  'app/api/statistics/rankings/route.js',
  'app/api/scope/affiliations/route.js',
  'app/loc/neon-repository.js',
  'app/loc/neon-server.js',
  'app/loc/scope-authorization.js'
]){
  if(!existsSync(resolve(root,required)))failures.push(`${required}: required Neon/module boundary missing`);
}

const dataRuntime=readFileSync(resolve(root,'app/loc/data.js'),'utf8');
if(!/api\/loc\/data/.test(dataRuntime))failures.push('app/loc/data.js: shared Neon canonical route missing');
if(/fetchStaticJson|runtime_json_documents|force-cache/.test(dataRuntime))failures.push('app/loc/data.js: JSON/static fallback remains');

const contextView=readFileSync(resolve(root,'app/modular-v2/features/ContextV2.jsx'),'utf8');
if(!/selectScopeContextRows\(scopeId\)/.test(contextView))failures.push('ContextV2: shared Neon context client missing');

const statisticsView=readFileSync(resolve(root,'app/modular-v2/features/StatisticsV2.jsx'),'utf8');
if(!/selectScopeRankingPage\(scopeId/.test(statisticsView))failures.push('StatisticsV2: shared Neon SQL pagination missing');

const cultureView=readFileSync(resolve(root,'app/modular-v2/features/CultureV2.jsx'),'utf8');
if(!/selectScopeCultureData\(scopeId\)/.test(cultureView))failures.push('CultureV2: shared Neon culture client missing');

const scopeManagement=readFileSync(resolve(root,'app/modular-v2/ScopeManagementV2.jsx'),'utf8');
if(!/useNeonAccount/.test(scopeManagement)||!/account\.canManage/.test(scopeManagement))failures.push('Scope management: manager role gate missing');

for(const retired of ['app/loc/local-db.js','app/loc/google-drive.js','app/loc/storage.js','app/loc/auth-client.js']){
  if(existsSync(resolve(root,retired)))failures.push(`${retired}: retired persistence/auth module must remain removed`);
}

if(warnings.length)console.warn(warnings.join('\\n'));
if(failures.length){
  console.error('[modularity] violations:\\n'+failures.join('\\n'));
  process.exit(1);
}
console.log('[modularity] Neon canonical/module/permission boundaries verified');
