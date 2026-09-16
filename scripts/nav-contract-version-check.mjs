import fs from 'node:fs';
const v=JSON.parse(fs.readFileSync('scripts/nav-contract-version.json','utf8'));
if(v.status!=='Current'||v.singleNav!==true||v.scopeAware!==true)throw new Error('NAV Current contract flags drifted');
console.log('NAV Current contract flags verified.');
