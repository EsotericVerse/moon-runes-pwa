import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const expected=['context','statics','culture','governance','search'];
if(JSON.stringify(map.sharedFunctions)!==JSON.stringify(expected)){throw new Error('Shared NAV functions drifted');}
for(const scope of ['loc','runes','lo3rwang','governance'])if(!map.scopes[scope])throw new Error(`Missing NAV scope: ${scope}`);
for(const [scope,cfg] of Object.entries(map.scopes)){
  const host=(cfg.host||cfg.hosts?.[0]).split('/')[0];
  for(const name of expected)if(cfg.functions?.[name]!==`https://${host}/${name}`)throw new Error(`${scope}: function route ${name} drifted`);
}
if(map.scopes.loc.reserved.label!=='月之符文'||map.scopes.runes.reserved.label!=='語彙'||map.scopes.lo3rwang.reserved.label!=='風格詞'||map.scopes.governance.reserved.label!=='治理規則')throw new Error('Reserved NAV entry drifted');
console.log('Declarative NAV route map verified.');
