import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const expected=['context','statics','evolution','governance','search'];
if(JSON.stringify(map.sharedFunctions)!==JSON.stringify(expected)){throw new Error('Shared NAV functions drifted');}
for(const scope of ['loc','runes','lo3rwang','admin'])if(!map.scopes[scope])throw new Error(`Missing NAV scope: ${scope}`);
if(map.scopes.governance)throw new Error('Retired Governance management scope returned');
if(map.scopes.loc.reserved.label!=='月之符文'||map.scopes.runes.reserved.label!=='語彙'||map.scopes.lo3rwang.reserved.label!=='風格詞'||map.scopes.admin.reserved.label!=='Admin')throw new Error('Reserved NAV entry drifted');
console.log('Declarative NAV route map verified.');
