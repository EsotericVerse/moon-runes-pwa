import fs from 'node:fs';
const routeMap=fs.readFileSync('app/nav-route-map.js','utf8');
const scopeNav=fs.readFileSync('app/ScopeNav.jsx','utf8');
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
for(const fn of map.sharedFunctions){
  const source=fn==='search'?scopeNav:routeMap;
  const token=fn==='search'?"navRoute(cfg,'search')":`'${fn}'`;
  if(!source.includes(token))throw new Error(`Runtime NAV missing shared function: ${fn}`);
}
for(const [scope,cfg] of Object.entries(map.scopes)){
  if(!routeMap.includes(cfg.reserved.label))throw new Error(`Runtime NAV missing ${scope} reserved entry`);
  for(const item of [...(cfg.role||[]),...(cfg.homes||[])])if(!routeMap.includes(item.label)||!routeMap.includes(item.href))throw new Error(`Runtime NAV missing ${scope} link: ${item.label}`);
}
console.log('Runtime/declarative NAV maps aligned.');
