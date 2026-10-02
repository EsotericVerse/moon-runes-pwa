import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

const failures=[];
if(resolveScopeV2('unknown.example','/')!=='loc')failures.push('default Scope must remain loc');
for(const [id,scope] of Object.entries(SCOPES_V2)){
  if(scope.id!==id)failures.push(id+' registry key/id mismatch');
  if(scope.domain&&resolveScopeV2(scope.domain,'/')!==id)failures.push(id+' domain resolution mismatch');
  if(scope.domain&&!featureHrefV2(id,FEATURES_V2[0].id).startsWith('https://'+scope.domain+'/'))failures.push(id+' canonical domain mismatch');
  if(!scope.domain&&!scope.mount)failures.push(id+' route identity missing');
  if(scope.mount&&resolveScopeV2(scope.mount.host,scope.mount.path)!==id)failures.push(id+' mount resolution mismatch');
  for(const feature of FEATURES_V2){
    if(!featureHrefV2(id,feature.id).startsWith('https://'))failures.push(id+'/'+feature.id+' canonical href invalid');
  }
}
if(failures.length){
  console.error('[scope-registry] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[scope-registry] Current Scope identity, resolution and canonical feature URLs verified');
