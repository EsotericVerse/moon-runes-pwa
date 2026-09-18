import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
if((map.scopes.loc.role||[]).some(x=>x.label==='管理者介紹'))throw new Error('LOC root role label must remain 作者介紹');
if(!(map.scopes.runes.role||[]).some(x=>x.label==='管理者介紹'))throw new Error('LunaRunes role label must remain 管理者介紹');
console.log('LOC/LunaRunes role-label exception verified.');
