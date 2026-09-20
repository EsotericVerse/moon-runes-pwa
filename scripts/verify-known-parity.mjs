import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const failures=[];
const text=path=>readFileSync(resolve(root,path),'utf8');
const requireFile=path=>{if(!existsSync(resolve(root,path)))failures.push('missing required file: '+path);};
const requireText=(path,needles)=>{
  if(!existsSync(resolve(root,path))){failures.push('missing required file: '+path);return;}
  const source=text(path);
  for(const needle of needles)if(!source.includes(needle))failures.push(path+': missing '+needle);
};
const forbidText=(path,needles)=>{
  if(!existsSync(resolve(root,path)))return;
  const source=text(path);
  for(const needle of needles)if(source.includes(needle))failures.push(path+': stale/forbidden '+needle);
};

for(const path of [
  'LunaRune66.xlsx','LunarRunesCardCut.pdf','pics/LOC-FrameworkPic.png',
  'pics/LOC-structure.png','pics/LunaRunes.jpg','pics/aboutme.png',
  'js/runes-core.js','js/galaxy.js','js/writing.js','js/rune-graph-core.js'
])requireFile(path);

if(existsSync(resolve(root,'lib')))failures.push('lib/ must not be recreated; shared JavaScript belongs in js/');

requireText('app/loc/views/AboutView.jsx',[
  'LOC月典',
  '模型化語言框架（Modelized Language Framework）',
  '符號式語言（Symbolic Language）',
  'ModelArchitectureExplorer',
  "scopeHrefV2('runes','duel/one')",
  "scopeHrefV2('runes','duel/daily')",
  "featureHrefV2('runes','context')",
  '<img src="/pics/LunaRunes.jpg" alt="LunaRunes 月之符文" loading="lazy" />'
]);
forbidText('app/loc/views/AboutView.jsx',[
  'href="/runes',
  "href='/runes",
  "name:'Methodology'",
  "name:'Evolution'",
  'Governance Architecture'
]);

requireText('app/GlobalNav.jsx',[
  "import ScopeNavV2 from './modular-v2/ScopeNavV2'",
  '<ScopeNavV2/>'
]);
requireText('app/GlobalFooter.jsx',[
  "export {default} from './modular-v2/ScopeFooterV2'"
]);
requireText('app/modular-v2/ScopeNavV2.jsx',[
  'FEATURES_V2','featureHrefV2','useScopeRuntimeV2'
]);
requireText('app/modular-v2/ScopeFooterV2.jsx',[
  'useScopeRuntimeV2','ThemeSelectV2'
]);

if(existsSync(resolve(root,'app/runes/page.jsx')))failures.push('app/runes/page.jsx must remain retired; app/runes is source-only');
for(const path of [
  'app/runes/RuneDrawClient.jsx',
  'app/runes/RunesClient.jsx',
  'app/runes/RuneListPage.jsx',
  'app/runes/RuneHistoryPage.jsx',
  'app/runes/history/HistoryClient.jsx'
])requireFile(path);

requireText('app/runes/RuneDrawClient.jsx',[
  "scopeHrefV2('runes','duel/one')",
  "scopeHrefV2('runes','duel/daily')",
  "key: 'ow3gs'",
  '第 7–11 張為核心判定'
]);
forbidText('app/runes/RuneDrawClient.jsx',["'/duel/one'","'/duel/daily'"]);

requireText('app/modular-v2/scope-registry.v2.js',[
  "scopeIdPattern:'^[A-Za-z]+$'",
  "scopeIdExceptions:Object.freeze(['lo3rwang'])",
  "defaultScopeId:'loc'",
  "word:'loc'",
  "domain:'lrunes.lo3rwang.cc'",
  "mount:Object.freeze({host:'loc.lo3rwang.cc',path:'/lrunes'})",
  "localRoutes:Object.freeze([",
  "'list'",
  "'history'",
  "'duel/one'",
  "'duel/ow3gs'",
  'export function scopeHrefV2',
  'export function isScopeRequestAllowedV2'
]);

requireText('app/loc/model/moon-phase.js',[
  'day >= 1 && day <= 7',"return '新月'","return '上弦'","return '滿月'","return '下弦'","return '空亡'"
]);
requireText('docs/LOC_Canon_1.1.md',['「卡片月相」與「真實月相」是兩個不同欄位']);
requireText('scripts/prepare-next-public.mjs',['PUBLIC_PICS',"'LunarRunesCardCut.pdf'","'LunaRunes.jpg'"]);
requireText('scripts/verify-public-payload.mjs',['pics/LOC-FrameworkPic.png','pics/LunaRunes.jpg','pics/LOC-structure.png','LunarRunesCardCut.pdf']);

if(failures.length){
  console.error('[known-parity] Current regressions found:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[known-parity] Current modular Scope, LunaRunes source modules, NAV and moon-phase Canon are guarded');
