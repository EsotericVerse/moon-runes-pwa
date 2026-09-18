import fs from 'node:fs';
const runes=fs.readFileSync('app/runes/page.jsx','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
if(!runes.includes('?mode=daily')||runes.includes('?mode=daily#draw')||!runes.includes('<RuneAtlasHome />'))throw new Error('LunaRunes page-local route contract drifted');
if(!canon.includes('頁內功能入口與快捷選單不是 NAV')||!canon.includes('正式 route'))throw new Error('Local menu terminology missing');
console.log('Page-local menu boundary verified without functional hash routing.');
