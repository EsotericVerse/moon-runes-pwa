import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
for(const [name,cfg] of Object.entries(map.scopes)){
 if(!cfg.reserved?.label||!cfg.reserved?.href)throw new Error(`${name}: reserved NAV entry incomplete`);
 if(!cfg.host&&!cfg.hosts)throw new Error(`${name}: host registration missing`);
}
console.log('Registered Scope NAV entries verified.');
