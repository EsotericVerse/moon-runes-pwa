import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-current-contract.md','utf8');
for(const line of [
  'LOC: 月之符文｜脈絡｜統計｜文化｜治理｜搜尋框｜作者介紹｜回月典首頁',
  'LunaRunes: 語彙｜脈絡｜統計｜文化｜治理｜搜尋框｜管理者介紹｜回月之符文首頁｜回月典首頁',
  'Author: 簡介｜脈絡｜統計｜文化｜治理｜搜尋框｜管理者介紹｜回作者簡介｜回月典首頁',
  'Governance: 治理規則｜脈絡｜統計｜文化｜治理｜搜尋框｜管理者介紹｜回治理頁面｜回月典首頁'
])if(!doc.includes(line))throw new Error('Current NAV snapshot drifted');
console.log('Current NAV snapshot verified.');
