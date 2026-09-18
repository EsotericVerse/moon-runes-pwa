import fs from 'node:fs';
const d=fs.readFileSync('scripts/nav-user-spec.md','utf8');
for(const token of [
  'LOC: 月之符文 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 作者介紹 回月典首頁',
  '個人網頁: 簡介 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者介紹 回作者簡介 回月典首頁',
  'LunaRunes: 語彙 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者介紹 回月之符文首頁 回月典首頁',
  '其他 Scope: (中文第一欄) 脈絡 統計 文化 治理 [文字輸入方塊]搜尋 管理者介紹 回(中文)首頁 回月典首頁',
  '主要網域: (英文).lo3rwang.cc'
])if(!d.includes(token))throw new Error('User-facing NAV spec drifted');
console.log('User-facing NAV specification verified.');
