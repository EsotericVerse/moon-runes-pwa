import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
if(map.scopes.loc.host!=='loc.lo3rwang.cc')throw new Error('LOC host drifted');
if(!map.scopes.runes.hosts.includes('lrunes.lo3rwang.cc')||!map.scopes.runes.hosts.includes('loc.lo3rwang.cc/runes'))throw new Error('LunaRunes dual entry drifted');
if(map.scopes.author.host!=='whoami.lo3rwang.cc')throw new Error('Author host drifted');
if(map.scopes.governance.host!=='manage.lo3rwang.cc')throw new Error('Management host drifted');
console.log('NAV host/Scope boundaries verified.');
