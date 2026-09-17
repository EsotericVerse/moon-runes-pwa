import fs from 'node:fs';
const note=fs.readFileSync('scripts/nav-release-note.md','utf8');
for(const token of ['active Scope','Domain is authoritative','lrunes.lo3rwang.cc','loc.lo3rwang.cc','one NAV only','CI-guarded'])if(!note.includes(token))throw new Error(`NAV release note missing: ${token}`);
console.log('NAV release note verified.');
