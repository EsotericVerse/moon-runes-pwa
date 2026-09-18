import fs from 'node:fs';
const runes=fs.readFileSync('app/runes/page.jsx','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
if(!runes.includes('<RuneDrawClient />')||!runes.includes('<RuneAtlasHome />'))throw new Error('LunaRunes page-local feature entrypoints drifted');
if(!canon.includes('頁內功能入口與快捷選單不是 NAV'))throw new Error('Local menu terminology missing');
console.log('Page-local feature/NAV boundary verified.');
