import {readFile} from 'node:fs/promises';
import {FEATURES_V2,SCOPES_V2,featureHrefV2,resolveScopeV2} from '../app/modular-v2/scope-registry.v2.js';

const expectedDomains={loc:'loc.lo3rwang.cc',runes:'lrunes.lo3rwang.cc',lo3rwang:'dlwang.lo3rwang.cc',admin:'admin.lo3rwang.cc'};
for(const [scope,domain] of Object.entries(expectedDomains))if(SCOPES_V2[scope]?.domain!==domain)throw new Error(`${scope} domain drifted`);
if(JSON.stringify(FEATURES_V2.map(item=>item.id))!==JSON.stringify(['context','statics','culture','governance','search']))throw new Error('Shared feature contract drifted');
for(const [id,domain] of Object.entries(expectedDomains)){
  if(resolveScopeV2(domain,'/')!==id)throw new Error(`${domain}: expected ${id}`);
  for(const feature of FEATURES_V2){
    const scope=SCOPES_V2[id];
    const expectedBase=scope.mount?`https://${scope.mount.host}${scope.mount.path}`:`https://${domain}`;
    if(featureHrefV2(id,feature.id)!==`${expectedBase}/${feature.path}`)throw new Error(`${id}/${feature.id} route drifted`);
  }
}
const globalNav=await readFile('app/GlobalNav.jsx','utf8');
const scopeNav=await readFile('app/modular-v2/ScopeNavV2.jsx','utf8');
const compatNav=await readFile('app/ScopeNav.jsx','utf8');
if(!globalNav.includes('ScopeNavV2'))throw new Error('GlobalNav must render ScopeNavV2');
for(const token of ['FEATURES_V2','featureHrefV2','useScopeRuntimeV2'])if(!scopeNav.includes(token))throw new Error('ScopeNavV2 missing '+token);
if(!compatNav.includes('./modular-v2/ScopeNavV2'))throw new Error('ScopeNav compatibility entry must delegate to V2');
for(const token of ['whoami.lo3rwang.cc','manage.lo3rwang.cc','/evolution','NAV1','NAV2','NAV3'])if((globalNav+scopeNav+compatNav).includes(token))throw new Error('Forbidden obsolete NAV token: '+token);
if(resolveScopeV2('loc.lo3rwang.cc','/runes/statics')!=='runes')throw new Error('LunaRunes mount must resolve to runes Scope');
if(resolveScopeV2('loc.lo3rwang.cc','/lo3rwang/statics')!=='lo3rwang')throw new Error('author mount must resolve to lo3rwang Scope');
console.log('V2 registry-driven single NAV verified with bounded directory mounts.');
