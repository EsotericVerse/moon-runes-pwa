import fs from 'node:fs';
const runes=fs.readFileSync('app/runes/page.jsx','utf8');
const duel=fs.readFileSync('app/runes/duel/page.jsx','utf8');
const canon=fs.readFileSync('docs/NAV_GOVERNANCE.md','utf8');
for(const token of ['/list','/duel'])if(!runes.includes(token))throw new Error(`LunaRunes homepage entry drifted: ${token}`);
for(const token of ['one','daily','two','three','five','ow3gs','fight'])if(!duel.includes(token))throw new Error(`LunaRunes Duel entry drifted: ${token}`);
if(runes.includes('href="#draw"')||runes.includes('href="#library"'))throw new Error('Legacy LunaRunes hash menu returned');
if(!canon.includes('頁內子選單'))throw new Error('Local menu terminology missing');
console.log('Page-local entry boundary verified against Current LunaRunes routes.');
