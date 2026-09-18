import {existsSync,readFileSync} from 'node:fs';
import {SHARED_FEATURES,SITE_SCOPES} from '../app/site-registry.js';

const failures=[];
const expectedScopes=['loc','runes','lo3rwang','admin'];
if(JSON.stringify(Object.keys(SITE_SCOPES))!==JSON.stringify(expectedScopes)){
  failures.push('Current Scope registry must be loc/runes/lo3rwang/admin only');
}
if(JSON.stringify(SHARED_FEATURES.map(item=>item.id))!==JSON.stringify(['context','statics','culture','governance'])){
  failures.push('Shared feature registry drifted');
}

for(const path of [
  'lo3rwang.html',
  'css/style.css',
  'css/day.css',
  'css/night.css',
  'css/style-base.css',
  'js/loc-nav.js',
  'js/site-registry.generated.js',
  'scripts/generate-legacy-scope-contract.mjs',
  'tools/build_public_articles.py',
  'app/nav-route-map.js',
  'scripts/nav-route-map.json'
]){
  if(existsSync(path))failures.push('Retired runtime returned: '+path);
}

const hook=readFileSync('app/use-current-scope.js','utf8');
for(const token of ['detectSiteScope','getSiteScope']){
  if(!hook.includes(token))failures.push('Shared Scope hook missing '+token);
}

if(failures.length){
  console.error('[scope-registry] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('Single Current Scope registry verified; retired runtimes remain absent.');
