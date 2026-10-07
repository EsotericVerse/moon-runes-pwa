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

for(const token of ["selectRows('silver.loc_theme'",'theme_attr','THEME_TOKEN_KEYS','mergeThemeSlot'])if(!themeData.includes(token))failures.push('DB theme loader missing '+token);
for(const token of ["queryKey:['theme-registry']",'selectThemeRegistry','mergeThemeSlot','themeChoices'])if(!shell.includes(token))failures.push('AppShell DB-backed theme control missing '+token);
for(const token of ["dbAuthRelation('silver.loc_theme')",'theme_attr','THEME_TOKEN_KEYS','type="color"'])if(!admin.includes(token))failures.push('Admin Theme editor missing '+token);
for(const token of ['selectThemeRegistry','mergeThemeSlot',"queryKey:['theme-registry']"])if(!game.includes(token))failures.push('Game must consume DB-backed theme registry: '+token);

for(const scope of Object.values(SCOPES)){
  const policy=scope.theme||{mode:'auto'};
  if(policy.mode==='fixed'&&!expectedIds.includes(policy.themeId))failures.push(scope.id+': invalid fixed theme '+policy.themeId);
}
if(SCOPES.lo3rwang?.theme?.themeId!=='theme-2')failures.push('author system default must remain Link / theme-2');
if(SCOPES.lrunes?.theme?.themeId!=='theme-5')failures.push('LunaRunes system default must remain Mineral / theme-5');

for(const token of ["SYSTEM_THEME_ID='system-default'","THEME_TIME_ZONE='Asia/Taipei'","DAY_THEME_ID='theme-7'","NIGHT_THEME_ID='theme-1'",'copy.common.systemTheme'])if(!shell.includes(token))failures.push('AppShell theme control missing '+token);
if(!layout.includes("import AppShell from './AppShell'")||!layout.includes('<AppShell>{children}</AppShell>'))failures.push('Root layout must use AppShell');
if(!layout.includes('id="loc-theme-bootstrap"')||!layout.includes('INITIAL_SCOPE_THEMES')||!layout.includes('SCOPES'))failures.push('Root layout must bootstrap a safe initial theme before first paint');
if(!shell.includes('root.dataset.themeId===slot.id'))failures.push('AppShell theme control must avoid needless root reapply');
if(shell.includes('if(fixedThemeId)return null')||shell.includes('if(fixedDefaultThemeId)return null'))failures.push('fixed Scope defaults must not hide the footer theme selector');
for(const token of ["selection.scopeId===scopeId","setSelection({scopeId,themeId:SYSTEM_THEME_ID})","fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now)"])if(!shell.includes(token))failures.push('Scope-local system-default theme behavior missing '+token);

if(!portableSchema.includes('"loc_theme"')||!portableSchema.includes('"theme_attr" jsonb'))failures.push('portable schema must keep loc_theme theme_attr');
if(portableSchema.includes('"theme_registry"'))failures.push('portable schema must not restore legacy theme_registry');

if(failures.length){
  console.error('[theme-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[theme-contract] eight stable theme IDs, DB-backed attrs and emergency fallback verified');
