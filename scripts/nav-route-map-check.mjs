import fs from 'node:fs';
const registry=fs.readFileSync('app/scope-registry.js','utf8');
const expected=['context','statics','evolution','governance','search'];
for(const fn of expected)if(!registry.includes(`'${fn}'`))throw new Error(`Missing shared Scope function: ${fn}`);
for(const scope of ['loc','runes','author','management'])if(!registry.includes(`id:'${scope}'`))throw new Error(`Missing Current Scope: ${scope}`);
for(const label of ['月之符文','語彙','風格詞','治理規則'])if(!registry.includes(`reserved:['${label}'`))throw new Error(`Reserved NAV entry drifted: ${label}`);
console.log('Authoritative Scope Registry NAV map verified.');
