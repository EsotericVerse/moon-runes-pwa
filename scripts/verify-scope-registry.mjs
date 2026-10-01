import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {FEATURES_V2,SCOPES_V2,SCOPE_POLICY_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
if(SCOPE_POLICY_V2.routeAuthority!=='next-filesystem')failures.push('route authority must be Next filesystem');
if(SCOPE_POLICY_V2.dataAuthority!=='neon')failures.push('data authority must be Neon');
for(const [id,scope] of Object.entries(SCOPES_V2)){
  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(!['domain','directory'].includes(scope.scopeType))failures.push(id+' invalid scopeType');
  if(scope.scopeType==='domain'){
    if(!scope.domain)failures.push(id+' domain missing');
    else if(resolveScopeV2(scope.domain,'/')!==id)failures.push(id+' domain resolution mismatch');
  }else if(!scope.mount)failures.push(id+' directory mount missing');
  if(scope.mount&&resolveScopeV2(scope.mount.host,scope.mount.path)!==id)failures.push(id+' mount resolution mismatch');
  for(const feature of FEATURES_V2){
    if(!featureHrefV2(id,feature.id).startsWith('https://'))failures.push(id+'/'+feature.id+' canonical href invalid');
  }
}
function routeShell(route,{pattern=false}={}){
  const parts=String(route||'').split('/').filter(Boolean).map(part=>pattern&&part.startsWith(':')?'['+part.slice(1)+']':part);
  return resolve('app',...parts,'page.jsx');
}
const runes=SCOPES_V2.lunarunes;
for(const route of runes?.localRoutes||[])if(!existsSync(routeShell(route)))failures.push('LunaRunes route shell missing: '+route);
for(const pattern of runes?.routePatterns||[])if(!existsSync(routeShell(pattern,{pattern:true})))failures.push('LunaRunes route pattern shell missing: '+pattern);
if(failures.length){
  console.error('[scope-registry] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[scope-registry] Current Scope metadata, authorities and LunaRunes special routes verified');
