import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const expected=['context','statics','evolution','governance','search'];
if(map.sharedFunctions.length!==expected.length||expected.some(x=>!map.sharedFunctions.includes(x)))throw new Error('Shared Scope NAV function set drifted');
console.log('Shared Scope NAV function set verified.');
