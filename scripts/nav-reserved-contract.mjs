import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('scripts/nav-route-map.json','utf8'));
const reserved={loc:'月之符文',runes:'語彙',author:'簡介',governance:'治理規則'};
for(const [scope,label] of Object.entries(reserved))if(map.scopes[scope].reserved.label!==label)throw new Error(`${scope} reserved first NAV entry drifted`);
console.log('Reserved first NAV entries verified.');
