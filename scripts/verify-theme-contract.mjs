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
const portableSchema=read('docs/sql/portable-current-schema.sql');

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
for(const token of ["queryKey:['theme-registry']",'selectThemeRegistry','mergeThemeSlot','themeChoices'])if(!shell.includes(token))failures.push('AppShell DB-backed theme control missing '+token);
for(const token of ["dbAuthRelation('silver.loc_theme')",'THEME_DB_COLUMNS','themeColumnForToken','THEME_TOKEN_KEYS','type="color"'])if(!admin.includes(token))failures.push('Admin Theme editor missing '+token);
for(const token of ['selectThemeRegistry','mergeThemeSlot',"queryKey:['theme-registry']"])if(!game.includes(token))failures.push('Game must consume DB-backed theme registry: '+token);

for(const scope of Object.values(SCOPES)){
  const policy=scope.theme||{mode:'auto'};
  if(policy.mode==='fixed'&&!expectedIds.includes(policy.themeId))failures.push(scope.id+': invalid fixed theme '+policy.themeId);
}
if(SCOPES.lo3rwang?.theme?.mode==='fixed'||SCOPES.lrunes?.theme?.mode==='fixed')failures.push('Scope theme defaults must be owned by DB config, not hardcoded in routing');
if(!shell.includes("queryFn:()=>selectScopeConfig(scopeId)")||!shell.includes("fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now)"))failures.push('Scope theme must resolve from current DB config and remain temporary when user switches');

for(const token of ["SYSTEM_THEME_ID='system-default'","THEME_TIME_ZONE='Asia/Taipei'","DAY_THEME_ID='theme-7'","NIGHT_THEME_ID='theme-1'",'copy.common.systemTheme'])if(!shell.includes(token))failures.push('AppShell theme control missing '+token);
if(!layout.includes("import AppShell from './AppShell'")||!layout.includes('<AppShell>{children}</AppShell>'))failures.push('Root layout must use AppShell');
if(!layout.includes('id="loc-theme-bootstrap"')||!layout.includes("themeBootstrap='scheme-only'")||layout.includes('INITIAL_SCOPE_THEMES'))failures.push('Root layout must bootstrap only color scheme without duplicating Scope policy');
if(!layout.includes("const GAME_BOOTSTRAP_THEME_ID='theme-4'")||!layout.includes("pathname==='/game'")||!layout.includes('const scheme=game'))failures.push('Nature game must bootstrap its dark scheme before DB palette hydration');
if(!game.includes("GAME_THEME_DEFAULT='theme-4'")||!game.includes('hasCanonicalGameTheme?')||!game.includes('colorScheme:gameTheme.scheme'))failures.push('Nature game must remain default and avoid Order palette flash while loading');
if(!shell.includes('root.dataset.themeSignature===themeSignature(slot)'))failures.push('AppShell theme control must avoid needless root reapply while detecting token changes');
const globalCss=read('app/globals.css');
if(!shell.includes('if(themeRegistryQuery.isPending)return')||!shell.includes("configQuery.isPending&&configQuery.fetchStatus!=='idle'"))failures.push('AppShell must hold first paint until canonical DB Theme and Scope config are ready');
if(!globalCss.includes('html[data-theme-bootstrap="scheme-only"] body')||!globalCss.includes('visibility:hidden;'))failures.push('First load must not show intermediate Theme colors');
if(layout.includes('sessionStorage')||shell.includes('sessionStorage')||registry.includes('sessionStorage'))failures.push('Temporary Theme choices and palettes must not be stored in browser storage');
if(!registry.includes('delete root.dataset.themeBootstrap'))failures.push('Theme hydration must remove temporary scheme-only bootstrap marker');
if(shell.includes('if(fixedThemeId)return null')||shell.includes('if(fixedDefaultThemeId)return null'))failures.push('fixed Scope defaults must not hide the footer theme selector');
for(const token of ["selection.scopeId===scopeId","setSelection({scopeId,themeId:SYSTEM_THEME_ID})","fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now)"])if(!shell.includes(token))failures.push('Scope-local system-default theme behavior missing '+token);

if(!portableSchema.includes('"loc_theme"')||portableSchema.includes('"theme_attr" jsonb')||!portableSchema.includes('"loc_bg" text NOT NULL')||!portableSchema.includes('"loc_shadow_card" text NOT NULL'))failures.push('portable schema must use explicit theme columns, never JSONB');

if(!portableSchema.includes('"theme_id" smallint NOT NULL')||
  !portableSchema.includes('CONSTRAINT "loc_theme_id_check" CHECK (theme_id BETWEEN 1 AND 8)')||
  portableSchema.includes("theme_id ~ '^theme-[1-8]
if(themeData.includes('theme_attr')||admin.includes('theme_attr'))failures.push('Live Theme loader/editor may not use JSONB');
if(portableSchema.includes('"theme_registry"'))failures.push('portable schema must not restore legacy theme_registry');

// CSS subtraction guard: preserve the active shared frame and remove obsolete hero variants.
const homeCss=read('app/styles/home-content.css');
const homeFrameCss=read('app/styles/loc-about-original.css');
const uiCss=read('app/styles/uiux.css');
const responsiveCss=read('app/styles/responsive.css');
const authorHome=read('app/loc/views/AuthorHomeView.jsx');
for(const selector of ['.home-title-row{','.home-section-heading{','.home-architecture-figure{','.author-role-grid{','.author-trinity-layout{','.author-official-links{']){
  if(!homeCss.includes(selector))failures.push('CSS subtraction removed active layout '+selector);
}
for(const className of ['author-home-hero','home-progress-grid','home-about-layout','home-framework-figure','author-about-grid','author-method-grid','author-contact-layout']){
  if(homeCss.includes(className)||authorHome.includes(className))failures.push('obsolete CSS/DOM returned: '+className);
}
if(responsiveCss.includes('scope-home-hero-with-visual')||uiCss.includes('.home-progress-grid'))failures.push('retired homepage overrides returned');
for(const required of ['.loc-home-block__header{','.loc-home-block--hero-side','.loc-home-block--with-image']){
  if(!homeFrameCss.includes(required))failures.push('shared LOC/Author frame missing: '+required);
}
if(!authorHome.includes('<AuthorHomeEditableBlocks/>')||!authorHome.includes('loc-hero loc-hero-feature'))failures.push('Author home/subpages must preserve shared block display and feature hero');

if(failures.length){
  console.error('[theme-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[theme-contract] eight stable theme IDs, DB-backed typed columns and emergency fallback verified');
"))failures.push('loc_theme DB theme_id must be numeric 1–8, not theme-prefixed text');
if(!themeData.includes('export function themeUiId(')||!themeData.includes('export function themeNumber('))failures.push('Presentation Theme IDs must be converted only at the DB boundary');
if(!admin.includes('theme_db_numeric')||!admin.includes('themeNumber(themeId)'))failures.push('Theme Admin editor must save numeric DB key after migration');

if(themeData.includes('theme_attr')||admin.includes('theme_attr'))failures.push('Live Theme loader/editor may not use JSONB');
if(portableSchema.includes('"theme_registry"'))failures.push('portable schema must not restore legacy theme_registry');

// CSS subtraction guard: preserve the active shared frame and remove obsolete hero variants.
const homeCss=read('app/styles/home-content.css');
const homeFrameCss=read('app/styles/loc-about-original.css');
const uiCss=read('app/styles/uiux.css');
const responsiveCss=read('app/styles/responsive.css');
const authorHome=read('app/loc/views/AuthorHomeView.jsx');
for(const selector of ['.home-title-row{','.home-section-heading{','.home-architecture-figure{','.author-role-grid{','.author-trinity-layout{','.author-official-links{']){
  if(!homeCss.includes(selector))failures.push('CSS subtraction removed active layout '+selector);
}
for(const className of ['author-home-hero','home-progress-grid','home-about-layout','home-framework-figure','author-about-grid','author-method-grid','author-contact-layout']){
  if(homeCss.includes(className)||authorHome.includes(className))failures.push('obsolete CSS/DOM returned: '+className);
}
if(responsiveCss.includes('scope-home-hero-with-visual')||uiCss.includes('.home-progress-grid'))failures.push('retired homepage overrides returned');
for(const required of ['.loc-home-block__header{','.loc-home-block--hero-side','.loc-home-block--with-image']){
  if(!homeFrameCss.includes(required))failures.push('shared LOC/Author frame missing: '+required);
}
if(!authorHome.includes('<AuthorHomeEditableBlocks/>')||!authorHome.includes('loc-hero loc-hero-feature'))failures.push('Author home/subpages must preserve shared block display and feature hero');

if(failures.length){
  console.error('[theme-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[theme-contract] eight stable theme IDs, DB-backed typed columns and emergency fallback verified');
