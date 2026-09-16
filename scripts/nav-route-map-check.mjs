import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const expected=['context','statics','evolution','governance','search'];
if(JSON.stringify(map.sharedFunctions)!==JSON.stringify(expected)){throw new Error('Shared NAV functions drifted');}
for(const scope of ['loc','runes','author','governance'])if(!map.scopes[scope])throw new Error(`Missing NAV scope: ${scope}`);
if(map.scopes.loc.reserved.label!=='月之符文'||map.scopes.runes.reserved.label!=='語彙'||map.scopes.author.reserved.label!=='風格詞'||map.scopes.governance.reserved.label!=='治理規則')throw new Error('Reserved NAV entry drifted');
console.log('Declarative NAV route map verified.');
