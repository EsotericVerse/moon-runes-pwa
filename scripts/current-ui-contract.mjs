import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const sources={
  home:read('app/loc/views/AboutView.jsx'),
  nav:read('app/GlobalNav.jsx')+read('app/modular-v2/ScopeNavV2.jsx'),
  registry:read('app/modular-v2/scope-registry.v2.js'),
  uiCopy:read('app/i18n/ui-copy.js'),
  layout:read('app/layout.jsx'),
  locApp:read('app/loc/LocApp.jsx')
};
const required=[
  [sources.home,'LOC月典'],
  [sources.home,'Language Architecture Framework'],
  [sources.home,'Symbolic Language'],
  [sources.registry,'UI_COPY.features.statics.title'],
  [sources.registry,'UI_COPY.features.culture.title'],
  [sources.registry,'UI_COPY.features.governance.title'],
  [sources.registry,'UI_COPY.features.search.title'],
  [sources.uiCopy,"title:'統計'"],
  [sources.uiCopy,"title:'文化'"],
  [sources.uiCopy,"title:'治理'"],
  [sources.uiCopy,"title:'搜尋'"],
  [sources.nav,'FEATURES_V2'],
  [sources.nav,'useScopeRuntimeV2'],
  [sources.registry,"routeAuthority:'next-filesystem'"],
  [sources.registry,"dataAuthority:'neon'"],
  [sources.registry,"domain:'loc.lo3rwang.cc'"],
  [sources.registry,"domain:'lrunes.lo3rwang.cc'"],
  [sources.registry,"domain:'admin.lo3rwang.cc'"],
  [sources.locApp,'StatisticsV2'],
  [sources.locApp,'CultureV2'],
  [sources.locApp,'GovernanceV2'],
  [sources.locApp,'SearchV2'],
  [sources.layout,"import AppExperience from './AppExperience'"],
  [sources.layout,'<AppExperience />']
];
const missing=required.filter(([source,token])=>!source.includes(token)).map(([,token])=>token);
if(missing.length){
  console.error('[ui-contract] missing Current UI contract: '+missing.join(', '));
  process.exit(1);
}
console.log('[ui-contract] Current identity, navigation, feature composition and app shell verified');
