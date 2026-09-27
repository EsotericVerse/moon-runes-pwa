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
const requiredFeatures=['statics','culture','governance','search'];
for(const id of requiredCoreScopes){
  if(!SCOPES_V2[id])failures.push('Current registry missing required core Scope: '+id);
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

  if(scope.scopeType==='domain'){
    if(!scope.domain||scope.domain!==scope.domain.toLowerCase()||scope.domain.includes('/')||scope.domain.includes(':')){
      failures.push(id+' invalid domain');
    }else if(resolveScopeV2(scope.domain,'/')!==id){
      failures.push(id+' domain does not resolve to itself');
    }
  }else if(scope.domain!==null){
    failures.push(id+' directory Scope must not duplicate a canonical domain');
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

  for(const route of scope.localRoutes||[]){
    if(!route||String(route).startsWith('/'))failures.push(id+' localRoutes must use relative route ids: '+route);
  }
  for(const pattern of scope.routePatterns||[]){
    if(!pattern||String(pattern).startsWith('/'))failures.push(id+' routePatterns must use relative route ids: '+pattern);
    for(const segment of String(pattern).split('/')){
      if(segment.startsWith(':')&&segment.length===1)failures.push(id+' route pattern has empty parameter: '+pattern);
    }
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
if(SCOPES_V2.lo3rwang?.aliasName!==null){
  failures.push('Author Scope must not carry a runtime aliasName');
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
  'scripts/nav-route-map.json',
  'app/site-registry.js',
  'app/use-current-scope.js',
  'app/ScopeNav.jsx'
]){
  if(existsSync(retired))failures.push('Retired runtime returned: '+retired);
}

if(failures.length){
  console.error('[scope-registry] violations:\n'+failures.join('\n'));
  process.exit(1);
}

console.log('Single Current V2 Scope registry verified; retired compatibility registry/hook entries are absent.');
