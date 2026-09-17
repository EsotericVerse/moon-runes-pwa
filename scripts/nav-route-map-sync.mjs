import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
for(const fn of map.sharedFunctions){
  const token=fn==='search'?'/search':fn;
  if(!runtime.includes(token))throw new Error(`Runtime NAV missing shared function: ${fn}`);
}
for(const [scope,cfg] of Object.entries(map.scopes)){
  if(!runtime.includes(cfg.reserved.label))throw new Error(`Runtime NAV missing ${scope} reserved entry`);
  for(const item of [...(cfg.role||[]),...(cfg.homes||[])])if(!runtime.includes(item.label)||!runtime.includes(item.href))throw new Error(`Runtime NAV missing ${scope} link: ${item.label}`);
}
console.log('Runtime/declarative NAV maps aligned.');
