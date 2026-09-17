import fs from 'node:fs';
const doc=fs.readFileSync('scripts/nav-current-contract.md','utf8');
for(const line of ['LOC: 月之符文｜脈絡｜統計｜文化｜治理｜搜尋｜管理者首頁｜回月典首頁','LunaRunes: 語彙｜脈絡｜統計｜文化｜治理｜搜尋｜管理者首頁｜回月之符文首頁｜回月典首頁','lo3rwang: 風格詞｜脈絡｜統計｜文化｜治理｜搜尋｜管理者頁面｜回 lo3rwang｜回月典首頁','Governance: 治理規則｜脈絡｜統計｜文化｜治理｜搜尋｜管理者頁面｜回治理頁面｜回月典首頁'])if(!doc.includes(line))throw new Error('Current NAV snapshot drifted');
for(const token of ['Domain is the highest routing authority','https://lrunes.lo3rwang.cc/list','https://lo3rwang.lo3rwang.cc'])if(!doc.includes(token))throw new Error(`Current NAV domain contract missing: ${token}`);
console.log('Current NAV snapshot verified.');
