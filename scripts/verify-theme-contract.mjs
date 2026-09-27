import {existsSync,readFileSync} from 'node:fs';
import {THEME_SLOTS_V2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const compatRegistry=read('app/theme-registry.js');
const compatSelector=read('app/ThemeSelect.jsx');
const compatFooter=read('app/GlobalFooter.jsx');
const scopeSettings=read('app/loc/scope-public-settings.js');
const scopeRegistry=read('app/modular-v2/scope-registry.v2.js');
const neonRepository=read('app/loc/neon-repository.js');
const layout=read('app/layout.jsx');

if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS_V2.some(slot=>slot.group===group))failures.push('missing theme group '+group);
if(!selector.includes('getScopeThemeDefault'))failures.push('theme selector must read the Neon scope default on scope entry');
if(selector.includes('localStorage')||selector.includes('migration-bridges'))failures.push('theme selection must follow the Neon scope default without a local override');
if(/fetchThemeStylesV2|background_color|panel_background_color|text_color/.test(selector))failures.push('theme definitions must remain fixed in the shared code registry');
if(!scopeSettings.includes('silver.manage')||!scopeSettings.includes('default_theme_id'))failures.push('scope theme must live in silver.manage');
if(scopeSettings.includes('api.scope_theme_defaults'))failures.push('retired scope theme table remains in the app');
if(!scopeSettings.includes("scope==='moon-runes'||scope==='lrunes'?'lrunes'"))failures.push('rune scope aliases must map to canonical lrunes');
if(existsSync('app/migration-bridges'))failures.push('retired migration-bridges directory remains');
if(existsSync('app/loc/ThemeAdmin.jsx'))failures.push('retired global theme-definition editor remains');
if(/TIME_SCHEDULE|schedule:|mode:'time'|custom:Object/.test(scopeRegistry))failures.push('scope code must not keep duplicate theme/schedule settings');
if(!neonRepository.includes("'silver.manage'"))failures.push('Neon repository must permit authorized scope theme updates');
if(neonRepository.includes('api.scope_theme_defaults'))failures.push('retired scope theme table remains in the repository allowlist');
if(!footer.includes('<ThemeSelectV2/>'))failures.push('V2 Footer must own theme selector');
if(!compatRegistry.includes("from './modular-v2/theme-registry.v2'"))failures.push('legacy theme registry must be a V2 facade');
if(!compatSelector.includes('./modular-v2/ThemeSelectV2'))failures.push('ThemeSelect compatibility entry must delegate to V2');
if(!compatFooter.includes('./modular-v2/ScopeFooterV2'))failures.push('GlobalFooter compatibility entry must delegate to V2');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
for(const retired of ['app/loc/ThemeProvider.jsx','app/loc/ThemeControl.jsx','app/loc/theme-registry.js'])if(existsSync(retired))failures.push(retired+' must remain retired');

if(failures.length){console.error('[theme-contract] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[theme-contract] eight scalar themes and silver.manage defaults verified');
