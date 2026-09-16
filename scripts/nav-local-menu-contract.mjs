import fs from 'node:fs';
const runes=fs.readFileSync('app/runes/page.jsx','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
if(!runes.includes('href="#draw"')||!runes.includes('href="#library"'))throw new Error('LunaRunes local menu drifted');
if(!canon.includes('頁內子選單'))throw new Error('Local menu terminology missing');
console.log('Page-local menu boundary verified.');
