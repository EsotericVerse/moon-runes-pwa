import fs from 'node:fs';

const registry=fs.readFileSync('app/scope-registry.js','utf8');
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');

const requiredRegistry=[
  "host:'lrunes.lo3rwang.cc'",
  "canonicalOrigin:'https://lrunes.lo3rwang.cc'",
  "pathBase:'/runes'",
  'equivalentPathRoute'
];
const missingRegistry=requiredRegistry.filter(token=>!registry.includes(token));
if(missingRegistry.length)throw new Error('LunaRunes Scope Registry alias contract missing: '+missingRegistry.join(', '));
if(!runtime.includes('scopeRoute'))throw new Error('NAV route resolver must delegate to Scope Registry');
if(!canon.includes('lrunes.lo3rwang.cc/{route}')||!canon.includes('loc.lo3rwang.cc/runes/{route}'))throw new Error('LunaRunes dual-entry canon missing');
console.log('LunaRunes dual-entry equivalence verified from Scope Registry.');
