import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
if(map.scopes.loc.host!=='loc.lo3rwang.cc')throw new Error('LOC host drifted');
if(map.scopes.runes.host!=='lrunes.lo3rwang.cc')throw new Error('LunaRunes canonical host drifted');
if(!map.scopes.lo3rwang.hosts?.includes('lo3rwang.lo3rwang.cc'))throw new Error('Manager/lo3rwang governed host drifted');
if(map.scopes.admin.host!=='admin.lo3rwang.cc')throw new Error('Admin host drifted');
if(map.scopes.governance)throw new Error('Retired governance management scope returned');
console.log('NAV domain-first host/Scope boundaries verified.');
