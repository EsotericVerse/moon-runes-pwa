import {readFile} from 'node:fs/promises';
import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

for(const id of ['loc','lunarunes','lo3rwang','admin'])if(!SCOPES_V2[id])throw new Error('missing Current Scope: '+id);
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(['statics','culture','governance','search']))throw new Error('shared feature contract drifted');

for(const [id,scope] of Object.entries(SCOPES_V2)){
  if(scope.scopeType==='domain'&&resolveScopeV2(scope.domain,'/')!==id)throw new Error(scope.domain+': expected '+id);
  if(scope.mount&&resolveScopeV2(scope.mount.host,scope.mount.path)!==id)throw new Error(scope.mount.path+': expected '+id);
  for(const feature of FEATURES_V2){
    const base=scope.scopeType==='directory'&&scope.mount
      ?`https://${scope.mount.host}${scope.mount.path}`
      :`https://${scope.domain}`;
    if(featureHrefV2(id,feature.id)!==`${base}/${feature.path}/`)throw new Error(`${id}/${feature.id} canonical route drifted`);
  }
}
const scopeNav=await readFile('app/modular-v2/ScopeNavV2.jsx','utf8');
for(const token of ['FEATURES_V2','featureHrefV2','useScopeRuntimeV2'])if(!scopeNav.includes(token))throw new Error('ScopeNavV2 missing '+token);
for(const scope of Object.values(SCOPES_V2).filter(item=>item.mount)){
  if(resolveScopeV2(scope.mount.host,scope.mount.path+'/statics')!==scope.id)throw new Error(scope.id+' mounted feature resolution failed');
}
console.log('[nav-registry] Current Scope navigation and canonical feature URLs verified');
