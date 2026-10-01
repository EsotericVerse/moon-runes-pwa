import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  FEATURES_V2,
  SCOPES_V2,
  SCOPE_POLICY_V2,
  featureHrefV2,
  resolveScopeV2
} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];

if(SCOPE_POLICY_V2.routeAuthority!=='next-filesystem')failures.push('route authority must remain Next filesystem');
if(SCOPE_POLICY_V2.dataAuthority!=='neon')failures.push('Scope data authority must remain Neon');

for(const [id,scope] of Object.entries(SCOPES_V2)){
  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(!['domain','directory'].includes(scope.scopeType))failures.push(id+' invalid scopeType');

  if(scope.scopeType==='domain'){
    if(!scope.domain)failures.push(id+' domain Scope missing domain');
    else if(resolveScopeV2(scope.domain,'/')!==id)failures.push(id+' domain resolution mismatch');
  }else if(!scope.mount){
    failures.push(id+' directory Scope missing mount');
  }

  if(scope.mount&&resolveScopeV2(scope.mount.host,scope.mount.path)!==id){
    failures.push(id+' mount resolution mismatch');
  }

  for(const feature of FEATURES_V2){
    const href=featureHrefV2(id,feature.id);
    if(!href.startsWith('https://'))failures.push(id+'/'+feature.id+' canonical href invalid');
  }
}

function routeShell(route,{pattern=false}={}){
  const parts=String(route||'').split('/').filter(Boolean).map(part=>pattern&&part.startsWith(':')?'['+part.slice(1)+']':part);
  return resolve('app',...parts,'page.jsx');
}

// LunaRunes is the only Scope with canonical special route declarations.
const runes=SCOPES_V2.lunarunes;
for(const route of runes?.localRoutes||[]){
  if(!existsSync(routeShell(route)))failures.push('LunaRunes route shell missing: '+route);
}
for(const pattern of runes?.routePatterns||[]){
  if(!existsSync(routeShell(pattern,{pattern:true})))failures.push('LunaRunes route pattern shell missing: '+pattern);
}

for(const retired of ['app/site-registry.js','app/use-current-scope.js','app/ScopeNav.jsx']){
  if(existsSync(retired))failures.push('retired Scope runtime returned: '+retired);
}

if(failures.length){
  console.error('[scope-registry] governance violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[scope-registry] runtime Scope metadata and LunaRunes special routes verified');
