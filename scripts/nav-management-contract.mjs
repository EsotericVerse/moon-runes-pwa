import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const hasManage=scope=>(map.scopes[scope].role||[]).some(x=>x.href==='https://manage.lo3rwang.cc');
if(hasManage('loc')||hasManage('runes'))throw new Error('Management link leaked into LOC/LunaRunes NAV');
if(!hasManage('author')||!hasManage('governance'))throw new Error('Management link missing from Author/Governance NAV');
console.log('NAV management visibility verified.');
