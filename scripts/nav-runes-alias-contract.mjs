import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
if(!runtime.includes("host==='lrunes.lo3rwang.cc'?'':'/runes'"))throw new Error('LunaRunes dual-entry route resolver drifted');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
if(!canon.includes('lrunes.lo3rwang.cc/{route}')||!canon.includes('loc.lo3rwang.cc/runes/{route}'))throw new Error('LunaRunes dual-entry canon missing');
console.log('LunaRunes dual-entry NAV equivalence verified.');
