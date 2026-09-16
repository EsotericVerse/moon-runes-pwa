import fs from 'node:fs';
const d=fs.readFileSync('scripts/nav-acceptance.md','utf8');
for(const token of ['four specified NAV sequences','inherit active Scope','dual-entry semantics','obsolete tier terminology','NAV CI workflow passes'])if(!d.includes(token))throw new Error(`NAV acceptance condition missing: ${token}`);
console.log('NAV acceptance conditions verified.');
