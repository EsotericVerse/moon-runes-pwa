import fs from 'node:fs';

const runes=fs.readFileSync('app/runes/page.jsx','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');

if(!runes.includes('<RuneDrawClient />')||!runes.includes('<RuneAtlasHome />')){
  throw new Error('LunaRunes local feature entrypoints drifted');
}
if(!canon.includes('頁內子選單')||!canon.includes('抽牌｜符文圖鑑')){
  throw new Error('Local menu terminology missing');
}
console.log('Page-local menu boundary verified.');
