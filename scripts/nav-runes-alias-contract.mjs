import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
if(!runtime.includes("canonicalHost:DOMAIN_SCOPES.runes.canonicalHost"))throw new Error('LunaRunes canonical domain resolver drifted');
if(!runtime.includes("https://lrunes.lo3rwang.cc/"))throw new Error('LunaRunes canonical domain missing from runtime');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
if(!canon.includes('lrunes.lo3rwang.cc/{route}')||!canon.includes('loc.lo3rwang.cc/runes/{route}')||!canon.includes('網域優先'))throw new Error('LunaRunes canonical/fallback canon missing');
console.log('LunaRunes canonical-domain priority with route fallback verified.');
