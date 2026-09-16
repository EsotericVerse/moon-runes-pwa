import fs from 'node:fs';
const current=[fs.readFileSync('app/GlobalNav.jsx','utf8'),fs.readFileSync('app/ScopeNav.jsx','utf8'),fs.readFileSync('app/nav-route-map.js','utf8'),fs.readFileSync('js/loc-nav.js','utf8')].join('\n');
for(const token of ['抽籤紀錄','/runes/history'])if(current.includes(token))throw new Error(`Forbidden NAV regression: ${token}`);
console.log('Draw-history NAV regression guard verified.');
