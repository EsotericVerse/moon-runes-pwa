import {readFileSync} from 'node:fs';
import {THEME_SLOTS,THEME_TOKEN_KEYS,getThemeSlot} from '../app/modular/theme-registry.js';
import {SCOPES} from '../app/modular/scope-registry.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const shell=read('app/AppShell.jsx');
const layout=read('app/layout.jsx');
const game=read('app/lrunes/game/GameView.jsx');
const registry=read('app/modular/theme-registry.js');
const themeData=read('app/loc/theme-data.js');
const admin=read('app/loc/views/AdminHomeView.jsx');
const adminTheme=read('app/loc/views/admin-panels/ThemeEditor.jsx');
if(!admin.includes("dynamic(()=>import('./admin-panels/ThemeEditor')"))failures.push('Theme editor must load only when its Admin panel is selected');

if(THEME_SLOTS.length!==8)failures.push('theme registry must expose eight stable IDs');
const ids=THEME_SLOTS.map(slot=>slot.id);
const expectedIds=Array.from({length:8},(_,index)=>'theme-'+(index+1));
if(JSON.stringify(ids)!==JSON.stringify(expectedIds))failures.push('theme IDs must remain theme-1 through theme-8 in order');
if(THEME_TOKEN_KEYS.length!==43)failures.push('theme token contract must remain 43 keys');
if(new Set(THEME_TOKEN_KEYS).size!==THEME_TOKEN_KEYS.length)failures.push('theme token keys must be unique');

const fallback=getThemeSlot('theme-7');
if(fallback.id!=='theme-7'||!fallback.tokens||Object.keys(fallback.tokens).length!==THEME_TOKEN_KEYS.length)failures.push('theme-7 emergency fallback must stay complete');
if(!registry.includes('Emergency fallback only')||registry.includes("const THEME_1=")||registry.includes("const THEME_8="))failures.push('static JS must keep only one emergency palette, not eight canonical palettes');

for(const token of ["selectRows('silver.loc_theme'",'THEME_DB_COLUMNS','themeColumnForToken','THEME_TOKEN_KEYS','mergeThemeSlot'])if(!themeData.includes(token))failures.push('DB theme column loader missing '+token);
for(const token of ['useAppBootstrap','bootstrap.data?.themes','mergeThemeSlot','themeChoices'])if(!shell.includes(token))failures.push('AppShell DB-backed theme control missing '+token);
for(const token of ["dbAuthRelation('silver.loc_theme')",'THEME_DB_COLUMNS','themeColumnForToken','THEME_TOKEN_KEYS','type="color"'])if(!adminTheme.includes(token))failures.push('Admin Theme editor missing '+token);
for(const token of ['selectThemeRegistry','mergeThemeSlot',"queryKey:['theme-registry']"])if(!game.includes(token))failures.push('Game must consume DB-backed theme registry: '+token);

for(const scope of Object.values(SCOPES)){
  const policy=scope.theme||{mode:'auto'};
  if(policy.mode==='fixed'&&!expectedIds.includes(policy.themeId))failures.push(scope.id+': invalid fixed theme '+policy.themeId);
}
if(SCOPES.lo3rwang?.theme?.mode==='fixed'||SCOPES.lrunes?.theme?.mode==='fixed')failures.push('Scope theme defaults must be owned by DB config, not hardcoded in routing');
if(!shell.includes("bootstrap.data?.config?.theme")||!shell.includes("fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now)"))failures.push('Scope theme must resolve from current DB config and remain temporary when user switches');

for(const token of ["SYSTEM_THEME_ID='system-default'","THEME_TIME_ZONE='Asia/Taipei'","DAY_THEME_ID='theme-7'","NIGHT_THEME_ID='theme-1'",'copy.common.systemTheme'])if(!shell.includes(token))failures.push('AppShell theme control missing '+token);
if(!layout.includes("import AppShell from './AppShell'")||!layout.includes('<AppShell>{children}</AppShell>'))failures.push('Root layout must use AppShell');
if(!layout.includes('id="loc-theme-bootstrap"')||!layout.includes("themeBootstrap='scheme-only'")||layout.includes('INITIAL_SCOPE_THEMES'))failures.push('Root layout must bootstrap only color scheme without duplicating Scope policy');
if(!layout.includes("const GAME_BOOTSTRAP_THEME_ID='theme-4'")||!layout.includes("pathname==='/game'")||!layout.includes('const scheme=game'))failures.push('Nature game must bootstrap its dark scheme before DB palette hydration');
if(!game.includes("GAME_THEME_DEFAULT='theme-4'")||!game.includes('hasCanonicalGameTheme?')||!game.includes('colorScheme:gameTheme.scheme'))failures.push('Nature game must remain default and avoid Order palette flash while loading');
if(!shell.includes('root.dataset.themeSignature===themeSignature(slot)'))failures.push('AppShell theme control must avoid needless root reapply while detecting token changes');
const globalCss=read('app/globals.css');
if(shell.includes('if(themeRegistryQuery.isPending)return')||shell.includes("configQuery.isPending&&configQuery.fetchStatus!=='idle'"))failures.push('AppShell must not hold first paint on the network: show the built-in palette at hydration, then apply the DB Theme when it arrives');
if(!globalCss.includes('html[data-theme-bootstrap="scheme-only"] body')||!globalCss.includes('visibility:hidden;'))failures.push('First load must not show intermediate Theme colors');
if(layout.includes('sessionStorage')||shell.includes('sessionStorage')||registry.includes('sessionStorage'))failures.push('Temporary Theme choices and palettes must not be stored in browser storage');
if(!registry.includes('delete root.dataset.themeBootstrap'))failures.push('Theme hydration must remove temporary scheme-only bootstrap marker');
if(shell.includes('if(fixedThemeId)return null')||shell.includes('if(fixedDefaultThemeId)return null'))failures.push('fixed Scope defaults must not hide the footer theme selector');
for(const token of ["selection.scopeId===scopeId","setSelection({scopeId,themeId:SYSTEM_THEME_ID})","fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now)"])if(!shell.includes(token))failures.push('Scope-local system-default theme behavior missing '+token);

for(const token of ['THEME_DB_COLUMNS','THEME_TOKEN_KEYS.map(themeColumnForToken)','themeColumnForToken','themeUiId','themeNumber'])if(!themeData.includes(token))failures.push('Live theme database column adapter missing '+token);
for(const key of ['--loc-bg','--loc-shadow-card'])if(!THEME_TOKEN_KEYS.includes(key))failures.push('Theme DB column mapping missing '+key);
if(themeData.includes('theme_attr')||adminTheme.includes('theme_attr'))failures.push('Live theme code must not restore legacy JSONB attributes');
if(!adminTheme.includes('theme_db_numeric')||!adminTheme.includes('themeNumber(themeId)'))failures.push('Admin theme ID translation must work with database numeric IDs');

if(failures.length){
  console.error('[theme-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[theme-contract] eight stable theme IDs, DB-backed typed columns and emergency fallback verified');
