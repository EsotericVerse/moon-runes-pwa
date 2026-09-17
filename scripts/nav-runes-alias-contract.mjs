import fs from 'node:fs';
const runtime=fs.readFileSync('app/nav-route-map.js','utf8');
if(!runtime.includes("normalizedHost==='lrunes.lo3rwang.cc'"))throw new Error('LunaRunes domain resolver missing');
if(!runtime.includes("normalizedHost==='loc.lo3rwang.cc'"))throw new Error('LOC domain resolver missing');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
if(!canon.includes('Domain 是最高路由與 Scope 治理邊界'))throw new Error('Domain-first governance missing');
if(!canon.includes('https://lrunes.lo3rwang.cc/list'))throw new Error('LunaRunes vocabulary entry missing');
console.log('LunaRunes domain-first NAV authority verified.');
