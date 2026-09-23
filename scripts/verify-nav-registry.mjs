import {readFile} from 'node:fs/promises';
import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

for(const id of ['loc','runes','lo3rwang','admin'])if(!SCOPES_V2[id])throw new Error('missing required core Scope: '+id);
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(['context','statics','culture','governance','search']))throw new Error('Shared feature contract drifted');
for(const [id,scope] of Object.entries(SCOPES_V2)){
  if(resolveScopeV2(scope.domain,'/')!==id)throw new Error(scope.domain+': expected '+id);
  for(const feature of FEATURES_V2){
    const expectedBase=scope.scopeType==='directory'&&scope.mount
      ?`https://${scope.mount.host}${scope.mount.path}`
      :`https://${scope.domain}`;
    if(featureHrefV2(id,feature.id)!==`${expectedBase}/${feature.path}`)throw new Error(`${id}/${feature.id} route drifted`);
  }
}
const globalNav=await readFile('app/GlobalNav.jsx','utf8');
const scopeNav=await readFile('app/modular-v2/ScopeNavV2.jsx','utf8');
const compatNav=await readFile('app/ScopeNav.jsx','utf8');
if(!globalNav.includes('ScopeNavV2'))throw new Error('GlobalNav must render ScopeNavV2');
for(const token of ['FEATURES_V2','featureHrefV2','useScopeRuntimeV2'])if(!scopeNav.includes(token))throw new Error('ScopeNavV2 missing '+token);
if(!compatNav.includes('./modular-v2/ScopeNavV2'))throw new Error('ScopeNav compatibility entry must delegate to V2');
for(const token of ['whoami.lo3rwang.cc','manage.lo3rwang.cc','NAV1','NAV2','NAV3'])if((globalNav+scopeNav+compatNav).includes(token))throw new Error('Forbidden obsolete NAV token: '+token);
for(const scope of Object.values(SCOPES_V2).filter(item=>item.mount)){
  if(resolveScopeV2(scope.mount.host,scope.mount.path+'/statics')!==scope.id)throw new Error(scope.id+' mount must resolve from registry');
}
console.log('V2 registry-driven single NAV verified across registered domain and mount ingress.');
