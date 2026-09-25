import {existsSync,readFileSync} from 'node:fs';
import {THEME_SLOTS_V2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const compatRegistry=read('app/theme-registry.js');
const compatSelector=read('app/ThemeSelect.jsx');
const compatFooter=read('app/GlobalFooter.jsx');
const themeAdmin=read('app/loc/ThemeAdmin.jsx');
const adminBridge=read('app/migration-bridges/theme-admin-neon.v2.js');
const scopeSettings=read('app/loc/scope-public-settings.js');
const scopeRegistry=read('app/modular-v2/scope-registry.v2.js');
const neonRepository=read('app/loc/neon-repository.js');
const layout=read('app/layout.jsx');

if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS_V2.some(slot=>slot.group===group))failures.push('missing theme group '+group);
if(!selector.includes('getScopeThemeDefault')||!selector.includes('updateScopeThemeDefault'))failures.push('theme selector must read and save the scope default');
if(!selector.includes('fetchThemeStylesV2'))failures.push('theme selector must use persisted theme names and colors');
if(/useNeonSetting|schedule|custom|JSON\.parse|jsonb|api\.scope_theme_defaults/.test(selector))failures.push('theme selector must not query or persist JSON/theme schedules');
if(!scopeSettings.includes('silver.loc_scope_registry')||!scopeSettings.includes('default_theme_id'))failures.push('scope theme must live in the scope registry columns');
if(scopeSettings.includes('api.scope_theme_defaults'))failures.push('retired scope theme table remains in the app');
if(!scopeSettings.includes("scope==='runes'?'moon-runes'"))failures.push('runes scope must map to its canonical registry key');
if(!adminBridge.includes('background_color,panel_background_color,text_color'))failures.push('theme admin bridge must read scalar color columns');
if(/css_vars|JSON\.parse|jsonb/.test(adminBridge))failures.push('theme admin bridge must not read or write JSON');
if(/css_vars|JSON\.parse|textarea/.test(themeAdmin))failures.push('theme admin UI must use individual name and color fields');
if(/TIME_SCHEDULE|schedule:|mode:'time'|custom:Object/.test(scopeRegistry))failures.push('scope code must not keep duplicate theme/schedule settings');
if(!neonRepository.includes("'silver.loc_scope_registry'"))failures.push('Neon repository must permit authorized scope theme updates');
if(neonRepository.includes('api.scope_theme_defaults'))failures.push('retired scope theme table remains in the repository allowlist');
if(!footer.includes('<ThemeSelectV2/>'))failures.push('V2 Footer must own theme selector');
if(!compatRegistry.includes("from './modular-v2/theme-registry.v2'"))failures.push('legacy theme registry must be a V2 facade');
if(!compatSelector.includes('./modular-v2/ThemeSelectV2'))failures.push('ThemeSelect compatibility entry must delegate to V2');
if(!compatFooter.includes('./modular-v2/ScopeFooterV2'))failures.push('GlobalFooter compatibility entry must delegate to V2');
if(!themeAdmin.includes('../migration-bridges/theme-admin-neon.v2'))failures.push('ThemeAdmin must use isolated Neon bridge');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
for(const retired of ['app/loc/ThemeProvider.jsx','app/loc/ThemeControl.jsx','app/loc/theme-registry.js'])if(existsSync(retired))failures.push(retired+' must remain retired');

if(failures.length){console.error('[theme-contract] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[theme-contract] eight scalar themes and scope registry defaults verified');
