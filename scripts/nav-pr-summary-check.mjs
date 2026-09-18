import fs from 'node:fs';
const s=fs.readFileSync('scripts/nav-pr-summary.md','utf8');
for(const token of ['Centralizes NAV','exact LOC/LunaRunes/lo3rwang/Governance NAV contract','Scope-reserved','CI regression guards','Does not transfer data authority across Scopes'])if(!s.includes(token))throw new Error(`NAV PR summary missing: ${token}`);
console.log('NAV PR summary verified.');
