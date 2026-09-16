import fs from 'node:fs';
const d=fs.readFileSync('scripts/nav-contract-sources.md','utf8');
for(const token of ['docs/NAV_GOVERNANCE.md','scripts/nav-route-map.json','app/nav-route-map.js','app/ScopeNav.jsx','js/loc-nav.js','.github/workflows/nav-contract.yml'])if(!d.includes(token))throw new Error(`NAV source chain missing: ${token}`);
console.log('Current NAV source chain verified.');
