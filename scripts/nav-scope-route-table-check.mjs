import fs from 'node:fs';
const d=fs.readFileSync('scripts/nav-scope-route-table.md','utf8');
for(const token of ['/runes/context','/runes/statics','/runes/culture','/runes/governance','/runes/search','active Scope controls the result'])if(!d.includes(token))throw new Error(`NAV route table missing: ${token}`);
console.log('NAV derived route table verified.');
