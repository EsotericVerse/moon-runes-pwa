import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-minimal-invariants.md','utf8');
for(const token of ['Exactly one NAV','reserved entry','inherit the active Scope','equivalent `lrunes`','Page-local menus are not NAV','Draw history is not exposed'])if(!doc.includes(token))throw new Error(`Missing NAV invariant: ${token}`);
console.log('NAV invariants verified.');
