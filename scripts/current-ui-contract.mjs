// Current-only UI contract for the deployable main branch.
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const sources={
  home:read('app/loc/views/AboutView.jsx'),
  nav:read('app/GlobalNav.jsx')+read('app/ScopeNav.jsx')+read('app/site-registry.js')+read('app/use-current-scope.js'),
  governance:read('app/loc/views/GovernanceView.jsx'),
  profiles:read('app/scope-page-profiles.js'),
  runeGovernanceCompat:read('app/runes/governance/page.jsx'),
  authorGovernanceCompat:read('app/author/governance/page.jsx'),
  terminology:read('data/json/registries/LOC_TERMINOLOGY_CANON.json'),
  registry:read('app/site-registry.js'),
  layout:read('app/layout.jsx')
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
  [sources.nav,'useCurrentScope'],
  [sources.governance,'getScopePageProfile'],
  [sources.profiles,'LunaRunes Governance'],
  [sources.profiles,'Author Governance'],
  [sources.profiles,'Admin Governance'],
  [sources.runeGovernanceCompat,'https://lrunes.lo3rwang.cc/governance'],
  [sources.authorGovernanceCompat,'https://lo3rwang.lo3rwang.cc/governance'],
  [sources.terminology,'"zh": "模型化語言框架"'],
  [sources.terminology,'"en": "Modelized Language Framework"'],
  [sources.terminology,'"zh": "符號式語言"'],
  [sources.terminology,'"en": "Symbolic Language"'],
  [sources.registry,"domain:'loc.lo3rwang.cc'"],
  [sources.registry,"domain:'lrunes.lo3rwang.cc'"],
  [sources.registry,"domain:'lo3rwang.lo3rwang.cc'"],
  [sources.registry,"domain:'admin.lo3rwang.cc'"]
];

const forbiddenCurrent=[
  'Language Model Framework',
  '語言模型框架',
  'Language Module Framework',
  '語言系統模組框架',
  'Symbolic Language Module',
  '符號式語言模組',
  'whoami.lo3rwang.cc',
  'manage.lo3rwang.cc'
];

const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
const currentSources=[sources.home,sources.nav,sources.governance,sources.profiles,sources.registry,sources.layout].join('\n');
const stale=forbiddenCurrent.filter(token=>currentSources.includes(token));
if(sources.layout.includes('LanguageProvider'))stale.push('LanguageProvider');
if(sources.nav.includes('loc-language-toggle'))stale.push('loc-language-toggle');

if(missing.length||stale.length){
  if(missing.length)console.error('Missing Current UI contract: '+missing.join(', '));
  if(stale.length)console.error('Forbidden stale Current UI token: '+stale.join(', '));
  process.exit(1);
}
console.log('Current UI contract verified against registry-driven Scope composition.');
