// Current-only UI contract. Historical compatibility is never a Current requirement.
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const retiredPersonalSources=['lo3rwang.html','app/author/page.jsx','app/author/governance/page.jsx'];
const resurrected=retiredPersonalSources.filter(path=>fs.existsSync(path));
function walkCurrentUi(dir){
  if(!fs.existsSync(dir))return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=dir+'/'+entry.name;
    if(entry.isDirectory())out.push(...walkCurrentUi(full));
    else if(/\.(jsx|js|mjs|tsx|ts)$/.test(entry.name))out.push(full);
  }
  return out;
}
const queryNavigation=[];
for(const file of walkCurrentUi('app')){
  const source=read(file);
  const literalHref=/href\s*=\s*(?:["'][^"'<>]*\?[^"'<>]*["']|\{\s*["'][^"'<>]*\?[^"'<>]*["']\s*\}|\{\s*`[^`]*\?[^`]*`\s*\})/g;
  const matches=source.match(literalHref)||[];
  for(const match of matches)queryNavigation.push(file+': '+match);
}
if(queryNavigation.length){
  console.error('Current navigation must use concrete routes, not query-string hrefs:\n'+queryNavigation.join('\n'));
  process.exit(1);
}
const contentSearchLinks=[];
for(const file of walkCurrentUi('app')){
  if(file==='app/ScopeNav.jsx')continue;
  const source=read(file);
  const searchHref=/href\s*=\s*(?:["']\/search(?:["'\/]|$)|\{\s*["']\/search(?:["'\/]|$))/g;
  const matches=source.match(searchHref)||[];
  for(const match of matches)contentSearchLinks.push(file+': '+match);
}
if(contentSearchLinks.length){
  console.error('Content pages must point users to the top-right search box instead of linking to /search:\n'+contentSearchLinks.join('\n'));
  process.exit(1);
}
if(resurrected.length){console.error('Retired personal sources must not return: '+resurrected.join(', '));process.exit(1);}
const sources={
 home:read('app/loc/views/AboutView.jsx'),
 nav:read('app/GlobalNav.jsx')+read('app/ScopeNav.jsx')+read('app/nav-route-map.js'),
 runes:read('app/runes/page.jsx'),
 governance:read('app/loc/views/GovernanceView.jsx'),
 personal:read('app/lo3rwang/page.jsx'),
 admin:read('app/management/page.jsx')+read('app/loc/GovernanceManagement.jsx'),
 terminology:read('data/json/registries/LOC_TERMINOLOGY_CANON.json'),
 navCanon:read('docs/NAV_GOVERNANCE.md'),
 searchView:read('app/loc/views/SearchView.jsx'),
 searchCollections:read('app/loc/search-collections.js'),
 scopeNav:read('app/ScopeNav.jsx'),
 runeListRoute:read('app/runes/list/[group]/[number]/page.jsx')
};
const required=[
 [sources.home,'把語言整理成可理解、可搜尋、可推演的模組結構。'],
 [sources.home,'模型化語言框架（Modelized Language Framework）'],
 [sources.home,'符號式語言（Symbolic Language）'],
 ...['月之符文','語彙','脈絡','統計','文化','治理','搜尋','lo3rwang','lrunes.lo3rwang.cc','lo3rwang.lo3rwang.cc','admin.lo3rwang.cc'].map(t=>[sources.nav,t]),
 [sources.terminology,'"zh": "模型化語言框架"'],
 [sources.terminology,'"en": "Modelized Language Framework"'],
 [sources.terminology,'"zh": "符號式語言"'],
 [sources.terminology,'"en": "Symbolic Language"'],
 [sources.navCanon,'每個介面只有一條正式導覽列'],
 [sources.navCanon,'網域優先，目錄其次，頁面最後'],
 [sources.scopeNav,"window.sessionStorage.setItem('loc-pending-search',value)"],
 [sources.searchView,'searchCollectionForHost(window.location.hostname)'],
 [sources.searchCollections,"if(h==='lrunes.lo3rwang.cc')return SEARCH_COLLECTIONS['月之符文']"],
 [sources.searchCollections,"if(h==='lo3rwang.lo3rwang.cc')return SEARCH_COLLECTIONS['政德文化']"],
 [sources.searchCollections,"if(h==='admin.lo3rwang.cc')return SEARCH_COLLECTIONS['治理']"],
 [sources.searchCollections,'return SEARCH_COLLECTIONS.all'],
 [sources.runeListRoute,'generateStaticParams'],
 [sources.runeListRoute,"String(group).padStart(2,'0')"]
];
const forbidden=['Language Model Framework','Language Module Framework','語言系統模組框架','Symbolic Language Module','符號式語言模組','author.lo3rwang.cc','whoami.lo3rwang.cc','manage.lo3rwang.cc','/author/governance'];
const missing=required.filter(([src,t])=>!src.includes(t)).map(([,t])=>t);
const stale=forbidden.filter(t=>Object.values(sources).some(src=>src.includes(t)));
if(missing.length||stale.length){if(missing.length)console.error('Missing Current UI contract: '+missing.join(', '));if(stale.length)console.error('Forbidden stale Current semantics: '+stale.join(', '));process.exit(1);}
console.log('Current UI contract verified against Current terminology and canonical Scope identity.');
