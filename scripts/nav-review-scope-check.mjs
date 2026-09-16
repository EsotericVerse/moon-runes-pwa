import fs from 'node:fs';
const s=JSON.parse(fs.readFileSync('scripts/nav-review-scope.json','utf8'));
if(!s.include.includes('Scope detection')||!s.exclude.includes('feature page data implementation'))throw new Error('NAV review scope drifted');
console.log('NAV review scope verified.');
