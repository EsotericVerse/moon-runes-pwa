import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const allowed=new Set(['https://lo3rwang.cc','https://admin.lo3rwang.cc','https://loc.lo3rwang.cc']);
for(const cfg of Object.values(map.scopes))for(const item of [...(cfg.role||[]),...(cfg.homes||[])])if(item.href.startsWith('http')&&!allowed.has(item.href))throw new Error(`Unexpected cross-Scope NAV target: ${item.href}`);
console.log('Explicit cross-Scope NAV targets verified.');
