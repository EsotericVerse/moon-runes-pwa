import fs from 'node:fs';
const s=JSON.parse(fs.readFileSync('scripts/nav-scope-map-schema.json','utf8'));
if(!s.required.includes('reserved')||!s.required.includes('functions')||!s.inherited.includes('context')||!s.inherited.includes('search'))throw new Error('Scope NAV registration schema drifted');
console.log('Scope NAV registration schema verified.');
