import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const sources={
  home:read('app/loc/views/AboutView.jsx'),
  nav:read('app/GlobalNav.jsx')+read('app/modular-v2/ScopeNavV2.jsx'),
  governance:read('app/modular-v2/features/GovernanceV2.jsx'),
  terminology:read('data/json/registries/LOC_TERMINOLOGY_CANON.json'),
  registry:read('app/modular-v2/scope-registry.v2.js'),
  layout:read('app/layout.jsx'),
  locApp:read('app/loc/LocApp.jsx')
};
const required=[
  [sources.home,'LOC月典'],
  [sources.home,'模型化語言框架（Modelized Language Framework）'],
  [sources.home,'符號式語言（Symbolic Language）'],
  [sources.home,'ModelArchitectureExplorer'],
  [sources.nav,'脈絡'],[sources.nav,'統計'],[sources.nav,'文化'],[sources.nav,'治理'],[sources.nav,'useScopeRuntimeV2'],
  [sources.governance,'Admin Scope'],
  [sources.terminology,'"zh": "模型化語言框架"'],[sources.terminology,'"en": "Modelized Language Framework"'],
  [sources.terminology,'"zh": "符號式語言"'],[sources.terminology,'"en": "Symbolic Language"'],
  [sources.registry,"domain:'loc.lo3rwang.cc'"],[sources.registry,"domain:'lrunes.lo3rwang.cc'"],[sources.registry,"domain:'lo3rwang.lo3rwang.cc'"],[sources.registry,"domain:'admin.lo3rwang.cc'"],
  [sources.locApp,'ContextV2'],[sources.locApp,'StatisticsV2'],[sources.locApp,'CultureV2'],[sources.locApp,'GovernanceV2'],[sources.locApp,'SearchV2']
];
const forbiddenCurrent=['Language Model Framework','語言模型框架','Language Module Framework','語言系統模組框架','Symbolic Language Module','符號式語言模組','whoami.lo3rwang.cc','manage.lo3rwang.cc'];
const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const currentSources=Object.values(sources).join('\n');
const stale=forbiddenCurrent.filter(token=>currentSources.includes(token));
if(sources.layout.includes('LanguageProvider'))stale.push('LanguageProvider');
if(sources.nav.includes('loc-language-toggle'))stale.push('loc-language-toggle');
if(sources.locApp.includes('EvolutionView'))stale.push('EvolutionView');
if(missing.length||stale.length){
  if(missing.length)console.error('Missing Current UI contract: '+missing.join(', '));
  if(stale.length)console.error('Forbidden stale Current UI token: '+stale.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified against modular V2 Scope composition.');
