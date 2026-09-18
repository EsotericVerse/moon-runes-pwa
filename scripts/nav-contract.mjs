import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const registry=read('app/site-registry.js');
const nav=read('app/ScopeNav.jsx');
const provider=read('app/SiteScopeProvider.jsx');
const canon=read('docs/NAV_GOVERNANCE.md');

for(const token of [
  "domain:'loc.lo3rwang.cc'",
  "domain:'lrunes.lo3rwang.cc'",
  "domain:'lo3rwang.lo3rwang.cc'",
  "domain:'admin.lo3rwang.cc'",
  "id:'context'","id:'statics'","id:'culture'","id:'governance'"
]){
  if(!registry.includes(token))throw new Error('Missing Current site-registry contract: '+token);
}
for(const token of ['SHARED_FEATURES','useSiteScope','current.reserved','current.role','current.homes']){
  if(!nav.includes(token))throw new Error('ScopeNav bypasses Current registry/provider contract: '+token);
}
if(!provider.includes('detectSiteScope(pathname,host)'))throw new Error('SiteScopeProvider must own runtime scope resolution');
for(const stale of ['whoami.lo3rwang.cc','manage.lo3rwang.cc']){
  if(registry.includes(stale)||nav.includes(stale)||provider.includes(stale))throw new Error('Forbidden stale Current domain: '+stale);
}
if(!canon.includes('單一')||!canon.includes('NAV'))throw new Error('NAV governance must preserve the single-NAV principle');
console.log('Current single-source NAV contract verified.');
