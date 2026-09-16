import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
if((map.scopes.loc.role||[]).some(x=>x.label==='管理者頁面'))throw new Error('LOC NAV must not expose 管理者頁面');
if((map.scopes.runes.role||[]).some(x=>x.label==='管理者頁面'))throw new Error('LunaRunes NAV must not expose 管理者頁面');
console.log('LOC/LunaRunes management exclusion verified.');
