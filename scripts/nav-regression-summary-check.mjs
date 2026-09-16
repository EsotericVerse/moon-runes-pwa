import fs from 'node:fs';
const s=fs.readFileSync('scripts/nav-regression-summary.md','utf8');
for(const token of ['reserved first entry','Scope host mapping','dual-entry','management-link leakage','draw-history','item order','local draw/library'])if(!s.includes(token))throw new Error(`NAV regression coverage missing: ${token}`);
console.log('NAV regression coverage verified.');
