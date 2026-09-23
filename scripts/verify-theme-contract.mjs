import {existsSync,readFileSync} from 'node:fs';
import {SCOPES_V2} from '../app/modular-v2/scope-registry.v2.js';
import {THEME_SLOTS_V2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const registry=read('app/modular-v2/theme-registry.v2.js');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const compatRegistry=read('app/theme-registry.js');
const compatSelector=read('app/ThemeSelect.jsx');
const compatFooter=read('app/GlobalFooter.jsx');
const themeAdmin=read('app/loc/ThemeAdmin.jsx');
const adminBridge=read('app/migration-bridges/theme-admin-neon.v2.js');
const layout=read('app/layout.jsx');
const scopeSettings=read('app/loc/scope-public-settings.js');

if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS_V2.some(slot=>slot.group===group))failures.push('missing theme group '+group);
for(const scope of ['loc','runes','lo3rwang','admin'])if(!SCOPES_V2[scope]?.theme)failures.push(scope+' missing registry theme defaults');
if(SCOPES_V2.loc.theme.mode!=='time')failures.push('LOC must default to time rotation');
if(SCOPES_V2.runes.theme.theme!=='theme-5')failures.push('LunaRunes must default to mineral theme');
if(SCOPES_V2.lo3rwang.theme.mode!=='custom')failures.push('lo3rwang must default to custom theme');
if(SCOPES_V2.admin.theme.mode!=='fixed')failures.push('admin must use fixed theme');
if(!selector.includes('useScopeRuntimeV2'))failures.push('ThemeSelectV2 must consume shared Scope runtime');
if(!selector.includes('useNeonSetting'))failures.push('ThemeSelectV2 must preserve Neon user setting persistence');
if(selector.includes('localStorage'))failures.push('ThemeSelectV2 must not create shadow browser-only persistence');
if(!selector.includes('getScopeThemeDefault'))failures.push('ThemeSelectV2 must read managed scope defaults');
if(!footer.includes('<ThemeSelectV2/>'))failures.push('V2 Footer must own theme selector');
if(!compatRegistry.includes("from './modular-v2/theme-registry.v2'"))failures.push('legacy theme registry must be a V2 facade');
if(compatRegistry.includes('DEFAULT_THEME_SLOTS=[')||compatRegistry.includes("'靈魂':'#"))failures.push('legacy theme registry duplicated theme truth');
if(!compatSelector.includes('./modular-v2/ThemeSelectV2'))failures.push('ThemeSelect compatibility entry must delegate to V2');
if(!compatFooter.includes('./modular-v2/ScopeFooterV2'))failures.push('GlobalFooter compatibility entry must delegate to V2');
if(!themeAdmin.includes('../migration-bridges/theme-admin-neon.v2'))failures.push('ThemeAdmin must use isolated Neon bridge');
if(!adminBridge.includes("'api.site_theme_styles'"))failures.push('theme admin bridge must preserve Neon site_theme_styles storage');
if(!adminBridge.includes('THEME_SLOTS_V2'))failures.push('theme admin fallback must derive from V2 theme slots');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
if(!scopeSettings.includes("api.scope_theme_defaults"))failures.push('scope theme defaults must come from Neon');
for(const retired of ['app/loc/ThemeProvider.jsx','app/loc/ThemeControl.jsx','app/loc/theme-registry.js'])if(existsSync(retired))failures.push(retired+' must remain retired');
if(!registry.includes("SCOPE_THEME_SETTINGS_KEY_V2='scope-theme-settings-v2'"))failures.push('Current theme settings key drifted');

if(failures.length){console.error('[theme-contract] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[theme-contract] one V2 theme registry + Neon managed/admin persistence verified');
