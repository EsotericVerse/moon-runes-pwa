import fs from 'node:fs';

const routeFeatures=[
  ['context','context'],
  ['statics','statics'],
  ['evolution','culture'],
  ['governance','governance'],
  ['search','search']
];
for(const [route,feature] of routeFeatures){
  const path=`app/runes/${route}/page.jsx`;
  if(!fs.existsSync(path))throw new Error(`LunaRunes NAV target missing Page Composition: /runes/${route}`);
  const rootPath=`app/${route}/page.jsx`;
  const root=fs.readFileSync(rootPath,'utf8');
  if(!root.includes('ScopedFeaturePage')||!root.includes(`feature="${feature}"`))throw new Error(`Standalone host route must dispatch Current feature: /${route} -> ${feature}`);
}

const context=fs.readFileSync('app/runes/context/page.jsx','utf8');
if(!context.includes('scope="lunarunes"'))throw new Error('LunaRunes context route must inject lunarunes Scope');

const search=fs.readFileSync('app/runes/search/page.jsx','utf8');
if(!search.includes('fixedCollectionId="月之符文"'))throw new Error('LunaRunes search route must lock the LunaRunes collection');

const dispatcher=fs.readFileSync('app/ScopedFeaturePage.jsx','utf8');
for(const token of ['detectNavScope','window.location.hostname',"scope==='runes'",'LunaRunesStaticsView','LunaRunesCultureView','LunaRunesGovernanceView','fixedCollectionId="月之符文"']){
  if(!dispatcher.includes(token))throw new Error(`LunaRunes host Page Composition dispatcher missing: ${token}`);
}

console.log('LunaRunes path/host dual-entry Page Composition verified.');
