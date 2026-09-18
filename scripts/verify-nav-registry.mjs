import { readFile } from 'node:fs/promises';
import { SHARED_FEATURES, SITE_SCOPES, detectSiteScope, featureRoute, getSiteScope } from '../app/site-registry.js';

const expectedDomains={
  loc:'loc.lo3rwang.cc',
  runes:'lrunes.lo3rwang.cc',
  lo3rwang:'lo3rwang.lo3rwang.cc',
  admin:'admin.lo3rwang.cc'
};
for(const [scope,domain] of Object.entries(expectedDomains)){
  if(SITE_SCOPES[scope]?.domain!==domain)throw new Error(`${scope} domain drifted: ${SITE_SCOPES[scope]?.domain}`);
}

const featureIds=SHARED_FEATURES.map(item=>item.id);
if(JSON.stringify(featureIds)!==JSON.stringify(['context','statics','culture','governance'])){
  throw new Error(`Shared feature contract drifted: ${featureIds.join(',')}`);
}

const cases=[
  ['loc.lo3rwang.cc','/','loc'],
  ['lrunes.lo3rwang.cc','/','runes'],
  ['lo3rwang.lo3rwang.cc','/','lo3rwang'],
  ['admin.lo3rwang.cc','/','admin'],
  ['loc.lo3rwang.cc','/runes','runes']
];
for(const [host,path,expected] of cases){
  const actual=detectSiteScope(path,host);
  if(actual!==expected)throw new Error(`${host}${path}: expected ${expected}, got ${actual}`);
}

for(const scope of Object.keys(expectedDomains)){
  const current=getSiteScope(scope);
  for(const feature of SHARED_FEATURES){
    const expected=`https://${current.domain}/${feature.path}`;
    if(featureRoute(scope,feature.id)!==expected)throw new Error(`${scope}/${feature.id} route drifted`);
  }
  if(featureRoute(scope,'search')!==`https://${current.domain}/search`)throw new Error(`${scope}/search route drifted`);
}

const allowedOrigins=new Set(Object.values(expectedDomains).map(domain=>`https://${domain}`));
for(const [scope,current] of Object.entries(SITE_SCOPES)){
  for(const [,href] of [...current.role,...current.homes]){
    const origin=new URL(href).origin;
    if(!allowedOrigins.has(origin))throw new Error(`${scope} NAV escapes Current Scope domains: ${href}`);
  }
}

const globalNav=await readFile('app/GlobalNav.jsx','utf8');
const scopeNav=await readFile('app/ScopeNav.jsx','utf8');
const legacyNav=await readFile('js/loc-nav.js','utf8');
const governance=await readFile('docs/NAV_GOVERNANCE.md','utf8');

if(!globalNav.includes("import ScopeNav from './ScopeNav'")||!globalNav.includes('<ScopeNav />'))throw new Error('GlobalNav must delegate to ScopeNav');
for(const token of ["from './site-registry'","SHARED_FEATURES","featureRoute","useCurrentScope"]){
  if(!scopeNav.includes(token))throw new Error(`ScopeNav bypasses shared registry/hook: missing ${token}`);
}
if(!scopeNav.includes("featureRoute(scope,'search')"))throw new Error('Search route must derive from current Scope');
if(!legacyNav.includes('__LOC_SITE_REGISTRY__'))throw new Error('Legacy compatibility NAV must consume generated Scope projection');

const currentRuntime=[globalNav,scopeNav,governance].join('\n');
for(const token of ['whoami.lo3rwang.cc','manage.lo3rwang.cc','/evolution','NAV1','NAV2','NAV3']){
  if(currentRuntime.includes(token))throw new Error(`Forbidden obsolete NAV token: ${token}`);
}

console.log('Registry-driven single NAV verified.');
