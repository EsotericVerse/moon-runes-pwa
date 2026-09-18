import {existsSync,readFileSync} from 'node:fs';
import {FEATURES_V2,SCOPES_V2,SCOPE_POLICY_V2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
for(const id of ['loc','runes','lo3rwang','admin']){
  if(!SCOPES_V2[id])failures.push('Current registry missing required core Scope: '+id);
}
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(['context','statics','culture','governance','search']))failures.push('Shared feature registry drifted');
if(SCOPE_POLICY_V2.scopeIdPattern!=='^[A-Za-z]+
for(const retired of ['lo3rwang.html','css/style.css','css/day.css','css/night.css','css/style-base.css','js/loc-nav.js','js/site-registry.generated.js','scripts/generate-legacy-scope-contract.mjs','tools/build_public_articles.py','app/nav-route-map.js','scripts/nav-route-map.json'])if(existsSync(retired))failures.push('Retired runtime returned: '+retired);
const compat=readFileSync('app/site-registry.js','utf8');
const hook=readFileSync('app/use-current-scope.js','utf8');
if(!compat.includes("from './modular-v2/scope-registry.v2'"))failures.push('site-registry compatibility facade must derive from V2');
if(!hook.includes('useScopeRuntimeV2'))failures.push('compatibility Scope hook must consume V2 runtime');
for(const domain of ['loc.lo3rwang.cc','lrunes.lo3rwang.cc','dlwang.lo3rwang.cc','admin.lo3rwang.cc'])if(compat.includes(domain))failures.push('compatibility registry must not duplicate domain literal '+domain);
if(failures.length){console.error('[scope-registry] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('Single extensible Current V2 Scope registry verified; required core Scopes exist and compatibility entries are derived only.');
)failures.push('Current Scope ID grammar drifted');
if(SCOPE_POLICY_V2.defaultScopeId!=='loc')failures.push('Current default Scope drifted');
if(!SCOPE_POLICY_V2.reservedWords.some(item=>item.word==='loc'&&item.scope==='deployment'))failures.push('LOC deployment reserved-word policy missing');
for(const retired of ['lo3rwang.html','css/style.css','css/day.css','css/night.css','css/style-base.css','js/loc-nav.js','js/site-registry.generated.js','scripts/generate-legacy-scope-contract.mjs','tools/build_public_articles.py','app/nav-route-map.js','scripts/nav-route-map.json'])if(existsSync(retired))failures.push('Retired runtime returned: '+retired);
const compat=readFileSync('app/site-registry.js','utf8');
const hook=readFileSync('app/use-current-scope.js','utf8');
if(!compat.includes("from './modular-v2/scope-registry.v2'"))failures.push('site-registry compatibility facade must derive from V2');
if(!hook.includes('useScopeRuntimeV2'))failures.push('compatibility Scope hook must consume V2 runtime');
for(const domain of ['loc.lo3rwang.cc','lrunes.lo3rwang.cc','dlwang.lo3rwang.cc','admin.lo3rwang.cc'])if(compat.includes(domain))failures.push('compatibility registry must not duplicate domain literal '+domain);
if(failures.length){console.error('[scope-registry] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('Single Current V2 Scope registry verified; compatibility entries are derived only.');
