import {existsSync,readFileSync} from 'node:fs';
import {
  FEATURES_V2,
  SCOPES_V2,
  SCOPE_POLICY_V2,
  featureHrefV2,
  resolveScopeV2
} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
const requiredCoreScopes=['loc','lunarunes','lo3rwang','admin'];
const requiredFeatures=['context','statics','culture','governance','search'];
const expectedScopeViews={
  loc:{context:'api.loc_context_entries',rankings:'api.loc_rankings'},
  runes:{context:'api.runes_context_entries',rankings:'api.runes_rankings'},
  lo3rwang:{context:'api.lo3rwang_context_entries',rankings:'api.lo3rwang_rankings'},
  admin:{context:null,rankings:null}
};

for(const id of requiredCoreScopes){
  if(!SCOPES_V2[id])failures.push('Current registry missing required core Scope: '+id);
}

for(const [id,views] of Object.entries(expectedScopeViews)){
  for(const key of ['context','rankings']){
    if(SCOPES_V2[id]?.dataViews?.[key]!==views[key]){
      failures.push(id+' '+key+' data view must match the current Neon API view: '+views[key]);
    }
  }
}

if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(requiredFeatures)){
  failures.push('Shared feature registry drifted');
}

if(SCOPE_POLICY_V2.scopeIdPattern!=='^[A-Za-z]+$'){
  failures.push('Current Scope ID grammar drifted');
}

if(!Array.isArray(SCOPE_POLICY_V2.scopeIdExceptions)){
  failures.push('Scope ID exceptions must be an array');
}

if(!SCOPE_POLICY_V2.scopeIdExceptions.includes('lo3rwang')){
  failures.push('Current lo3rwang Scope ID exception missing');
}

if(SCOPE_POLICY_V2.defaultScopeId!=='loc'){
  failures.push('Current default Scope drifted');
}

if(!SCOPE_POLICY_V2.reservedWords.some(item=>item.word==='loc'&&item.scope==='deployment')){
  failures.push('LOC deployment reserved-word policy missing');
}

const ids=Object.keys(SCOPES_V2);
const domains=Object.values(SCOPES_V2).map(scope=>scope.domain);
const aliases=Object.values(SCOPES_V2).map(scope=>scope.aliasName).filter(Boolean);
const mounts=Object.values(SCOPES_V2)
  .filter(scope=>scope.mount)
  .map(scope=>scope.mount.host+'|'+scope.mount.path);

if(new Set(ids).size!==ids.length)failures.push('duplicate Scope id');
if(new Set(domains).size!==domains.length)failures.push('duplicate Scope domain');
if(new Set(aliases).size!==aliases.length)failures.push('duplicate Scope aliasName');
if(new Set(mounts).size!==mounts.length)failures.push('duplicate Scope mount');

const idPattern=new RegExp(SCOPE_POLICY_V2.scopeIdPattern);

for(const [id,scope] of Object.entries(SCOPES_V2)){
  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(!idPattern.test(id)&&!SCOPE_POLICY_V2.scopeIdExceptions.includes(id)){
    failures.push(id+' violates Scope ID grammar without registered exception');
  }

  if(!['domain','directory'].includes(scope.scopeType)){
    failures.push(id+' invalid scopeType');
  }

  if(!scope.domain||scope.domain!==scope.domain.toLowerCase()||scope.domain.includes('/')||scope.domain.includes(':')){
    failures.push(id+' invalid domain');
  }

  if(resolveScopeV2(scope.domain,'/')!==id){
    failures.push(id+' domain does not resolve to itself');
  }

  if(scope.scopeType==='directory'&&!scope.mount){
    failures.push(id+' directory Scope missing mount');
  }

  if(scope.mount){
    if(!scope.mount.host||!scope.mount.path?.startsWith('/')){
      failures.push(id+' invalid mount');
    }
    if(resolveScopeV2(scope.mount.host,scope.mount.path)!==id){
      failures.push(id+' mount does not resolve to itself');
    }
  }

  if(!Array.isArray(scope.localRoutes)){
    failures.push(id+' localRoutes must be an array');
  }
  if(!Array.isArray(scope.routePatterns)){
    failures.push(id+' routePatterns must be an array');
  }
  if(!Array.isArray(scope.compatibilityRoutes)){
    failures.push(id+' compatibilityRoutes must be an array');
  }

  for(const route of scope.localRoutes||[]){
    if(!route||String(route).startsWith('/'))failures.push(id+' localRoutes must use relative route ids: '+route);
  }
  for(const pattern of scope.routePatterns||[]){
    if(!pattern||String(pattern).startsWith('/'))failures.push(id+' routePatterns must use relative route ids: '+pattern);
    for(const segment of String(pattern).split('/')){
      if(segment.startsWith(':')&&segment.length===1)failures.push(id+' route pattern has empty parameter: '+pattern);
    }
  }
  for(const route of scope.compatibilityRoutes||[]){
    if(!route||String(route).startsWith('/'))failures.push(id+' compatibilityRoutes must use relative route ids: '+route);
  }

  for(const feature of FEATURES_V2){
    const href=featureHrefV2(id,feature.id);
    if(!href.startsWith('https://')){
      failures.push(id+'/'+feature.id+' canonical href invalid');
    }
  }
}

if(SCOPES_V2.lunarunes?.scopeType!=='domain'){
  failures.push('LunaRunes must remain a domain Scope');
}
if(SCOPES_V2.lunarunes?.domain!=='lrunes.lo3rwang.cc'){
  failures.push('LunaRunes canonical domain drifted');
}
if(SCOPES_V2.lunarunes?.aliasName!==null){
  failures.push('LunaRunes must not declare aliasName');
}
if(SCOPES_V2.lunarunes?.mount?.host!=='loc.lo3rwang.cc'||SCOPES_V2.lunarunes?.mount?.path!=='/lrunes'){
  failures.push('LunaRunes alternate mount drifted');
}

if(SCOPES_V2.lo3rwang?.scopeType!=='directory'){
  failures.push('Author Scope must remain directory type');
}
if(SCOPES_V2.lo3rwang?.aliasName!=='dlwang'){
  failures.push('Author aliasName drifted');
}
if(SCOPES_V2.lo3rwang?.mount?.host!=='loc.lo3rwang.cc'||SCOPES_V2.lo3rwang?.mount?.path!=='/lo3rwang'){
  failures.push('Author mount drifted');
}

for(const retired of [
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
  if(existsSync(retired))failures.push('Retired runtime returned: '+retired);
}

const compat=readFileSync('app/site-registry.js','utf8');
const hook=readFileSync('app/use-current-scope.js','utf8');

if(!compat.includes("from './modular-v2/scope-registry.v2'")){
  failures.push('site-registry compatibility facade must derive from V2');
}

if(!hook.includes('useScopeRuntimeV2')){
  failures.push('compatibility Scope hook must consume V2 runtime');
}

for(const scope of Object.values(SCOPES_V2)){
  if(compat.includes(scope.domain)){
    failures.push('compatibility registry must not duplicate domain literal '+scope.domain);
  }
}

if(failures.length){
  console.error('[scope-registry] violations:\n'+failures.join('\n'));
  process.exit(1);
}

console.log('Single extensible Current V2 Scope registry verified; required core Scopes exist and compatibility entries are derived only.');
