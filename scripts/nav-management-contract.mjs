import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const hasAdmin=scope=>(map.scopes[scope].role||[]).some(x=>x.href==='https://admin.lo3rwang.cc');
if(hasAdmin('loc')||hasAdmin('runes'))throw new Error('Admin link leaked into LOC/LunaRunes NAV');
if(!hasAdmin('lo3rwang'))throw new Error('Admin link missing from lo3rwang NAV');
if(map.scopes.admin.role?.length)throw new Error('Admin root must not link to itself as a role entry');
console.log('NAV admin visibility verified.');
