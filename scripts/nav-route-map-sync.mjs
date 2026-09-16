import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
const registry=fs.readFileSync('app/scope-registry.js','utf8');
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
for(const fn of map.sharedFunctions)if(!registry.includes(`'${fn}'`))throw new Error(`Scope Registry missing shared function: ${fn}`);
const aliases={governance:'management'};
for(const [scope,cfg] of Object.entries(map.scopes)){
  const id=aliases[scope]||scope;
  if(!registry.includes(`id:'${id}'`))throw new Error(`Scope Registry missing scope: ${id}`);
  if(!registry.includes(cfg.reserved.label))throw new Error(`Scope Registry missing ${scope} reserved entry`);
  for(const item of [...(cfg.role||[]),...(cfg.homes||[])])if(!registry.includes(item.label))throw new Error(`Scope Registry missing ${scope} link: ${item.label}`);
}
for(const token of ['detectScope','getScope','scopeRoute'])if(!runtime.includes(token))throw new Error(`Runtime NAV adapter missing: ${token}`);
console.log('Runtime/declarative NAV maps aligned through Scope Registry.');
