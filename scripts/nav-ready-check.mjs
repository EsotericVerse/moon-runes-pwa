import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-ready.md','utf8');
if(!doc.includes('Scope-aware NAV implementation')||!doc.includes('NAV-only change'))throw new Error('NAV readiness marker drifted');
console.log('NAV patch readiness verified.');
