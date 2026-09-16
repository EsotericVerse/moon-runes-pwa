import fs from 'node:fs';
const d=fs.readFileSync('scripts/nav-scope-derivation.md','utf8');
for(const token of ['derives the current Scope from host/path','reserved/role/home','shared function set','Scope base path'])if(!d.includes(token))throw new Error(`NAV Scope derivation missing: ${token}`);
console.log('NAV Scope derivation verified.');
