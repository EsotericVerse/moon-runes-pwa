import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-scope-registry.md','utf8');
for(const token of ['host/base path','reserved first NAV entry','Shared NAV functions are inherited','must not require copying NAV markup'])if(!doc.includes(token))throw new Error(`Scope registry principle missing: ${token}`);
console.log('Scope NAV registration principle verified.');
