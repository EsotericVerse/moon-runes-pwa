import fs from 'node:fs';
const s=fs.readFileSync('app/nav-route-map.js','utf8');
if(!s.includes("return 'loc';"))throw new Error('NAV resolver lacks LOC fallback');
if(!s.includes("pathname==='/runes'||pathname.startsWith('/runes/')"))throw new Error('NAV resolver lacks nested rune scope');
console.log('NAV Scope resolver fallback verified.');
