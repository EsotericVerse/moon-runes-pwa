import fs from 'node:fs';
const s=fs.readFileSync('scripts/nav-pr-summary.md','utf8');
for(const token of ['Centralizes NAV','exact LOC/LunaRunes/Author/Governance NAV contract','Scope-reserved','CI regression guards','Does not implement underlying scoped feature-page datasets'])if(!s.includes(token))throw new Error(`NAV PR summary missing: ${token}`);
console.log('NAV PR summary verified.');
