import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-final-checklist.md','utf8');
if((doc.match(/- \[x\]/g)||[]).length!==9)throw new Error('NAV final checklist incomplete');
console.log('NAV final checklist verified.');
