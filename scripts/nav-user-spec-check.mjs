import fs from 'node:fs';
const d=fs.readFileSync('scripts/nav-user-spec.md','utf8');
for(const token of ['LOC: 月之符文 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者首頁 回月典首頁','LunaRunes: 語彙 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者首頁 回月之符文首頁 回月典首頁','lo3rwang: 風格詞 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者頁面 回 lo3rwang 回月典首頁','Governance: 治理規則 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者頁面 回治理頁面 回月典首頁'])if(!d.includes(token))throw new Error('User-facing NAV spec drifted');
for(const token of ['https://loc.lo3rwang.cc','https://lrunes.lo3rwang.cc/list','https://lo3rwang.lo3rwang.cc'])if(!d.includes(token))throw new Error(`User-facing governed domain missing: ${token}`);
console.log('User-facing NAV specification verified.');
