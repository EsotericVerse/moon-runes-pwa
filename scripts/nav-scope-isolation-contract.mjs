import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
if(!runtime.includes("functionRoutes('https://lrunes.lo3rwang.cc')"))throw new Error('Rune shared routes may escape rune Scope');
if(!runtime.includes("functionRoutes('https://loc.lo3rwang.cc')"))throw new Error('LOC Scope route origin drifted');
console.log('NAV Scope isolation verified.');
