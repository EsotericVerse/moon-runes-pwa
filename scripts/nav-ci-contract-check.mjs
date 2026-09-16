import fs from 'node:fs';
const workflow=fs.readFileSync('.github/workflows/nav-contract.yml','utf8');
if(!workflow.includes('node scripts/verify-nav-all.mjs'))throw new Error('NAV CI does not run aggregate contract');
console.log('NAV CI entrypoint verified.');
