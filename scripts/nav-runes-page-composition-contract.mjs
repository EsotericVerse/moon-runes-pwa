import fs from 'node:fs';

const features=['context','statics','evolution','governance','search'];
for(const feature of features){
  const path=`app/runes/${feature}/page.jsx`;
  if(!fs.existsSync(path))throw new Error(`LunaRunes NAV target missing Page Composition: /runes/${feature}`);
}

const context=fs.readFileSync('app/runes/context/page.jsx','utf8');
if(!context.includes('scope="lunarunes"'))throw new Error('LunaRunes context route must inject lunarunes Scope');

const search=fs.readFileSync('app/runes/search/page.jsx','utf8');
if(!search.includes('fixedCollectionId="月之符文"'))throw new Error('LunaRunes search route must lock the LunaRunes collection');

console.log('LunaRunes NAV Page Composition targets verified.');
