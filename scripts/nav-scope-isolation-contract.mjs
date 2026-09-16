import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
if(!runtime.includes("const base=host==='lrunes.lo3rwang.cc'?'':'/runes'"))throw new Error('Rune shared routes may escape rune Scope');
if(!runtime.includes("return {base:'',reserved:['月之符文','/runes']"))throw new Error('LOC Scope route base drifted');
console.log('NAV Scope isolation verified.');
