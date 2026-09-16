import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-no-manual-page-contract.md','utf8');
if(!doc.includes('do not define their own full NAV')||!doc.includes('centralized resolver/registry'))throw new Error('Centralized NAV ownership contract missing');
console.log('Centralized NAV ownership verified.');
