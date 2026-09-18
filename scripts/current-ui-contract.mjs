// Current-only UI contract for the deployable main branch.
// Historical compatibility must never block a Current deployment.
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const sources={
  home:read('app/loc/views/AboutView.jsx'),
  nav:read('app/GlobalNav.jsx')+read('app/ScopeNav.jsx')+read('app/site-registry.js')+read('app/SiteScopeProvider.jsx'),
  runes:read('app/runes/page.jsx'),
  governance:read('app/loc/views/GovernanceView.jsx'),
  runeGovernance:read('app/runes/governance/page.jsx'),
  terminology:read('data/json/registries/LOC_TERMINOLOGY_CANON.json'),
  registry:read('app/site-registry.js'),
  layout:read('app/layout.jsx'),
  provider:read('app/SiteScopeProvider.jsx')
};

const required=[
  [sources.home,'LOC月典'],
  [sources.home,'模型化語言框架（Modelized Language Framework）'],
  [sources.home,'符號式語言（Symbolic Language）'],
  [sources.home,'ModelArchitectureExplorer'],
  [sources.nav,'脈絡'],
  [sources.nav,'統計'],
  [sources.nav,'文化'],
  [sources.nav,'治理'],
  [sources.nav,'搜尋'],
  [sources.runeGovernance,'LunaRunes Scope'],
  [sources.runeGovernance,'Master Data／Base66'],
  [sources.terminology,'"zh": "模型化語言框架"'],
  [sources.terminology,'"en": "Modelized Language Framework"'],
  [sources.terminology,'"zh": "符號式語言"'],
  [sources.terminology,'"en": "Symbolic Language"'],
  [sources.registry,"domain:'lo3rwang.lo3rwang.cc'"],
  [sources.registry,"dataViews:Object.freeze({context:'runes_context_entries',rankings:'runes_rankings'})"],
  [sources.registry,"dataViews:Object.freeze({context:'lo3rwang_context_entries',rankings:'lo3rwang_rankings'})"],
  [sources.layout,'<SiteScopeProvider>'],
  [sources.provider,'detectSiteScope(pathname,host)']
];

const forbiddenCurrent=[
  'Language Model Framework',
  '語言模型框架',
  'Language Module Framework',
  '語言系統模組框架',
  'Symbolic Language Module',
  '符號式語言模組'
];

const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const stale=forbiddenCurrent.filter(token=>sources.home.includes(token));
if(sources.nav.includes('whoami.lo3rwang.cc'))stale.push('whoami.lo3rwang.cc');
if(sources.layout.includes('LanguageProvider'))stale.push('LanguageProvider');
if(sources.nav.includes('loc-language-toggle'))stale.push('loc-language-toggle');

if(missing.length||stale.length){
  if(missing.length)console.error('Missing Current UI contract: '+missing.join(', '));
  if(stale.length)console.error('Forbidden stale homepage identity: '+stale.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified against frozen terminology without historical UI requirements.');
