import {existsSync,readFileSync} from 'node:fs';
import {THEME_SLOTS_V2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const scopeRegistry=read('app/modular-v2/scope-registry.v2.js');
const layout=read('app/layout.jsx');

if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS_V2.some(slot=>slot.group===group))failures.push('missing theme group '+group);
if(selector.includes('localStorage')||selector.includes('migration-bridges')||selector.includes('scope-public-settings'))failures.push('theme selection must remain session-local and must not query retired scope settings');
if(!selector.includes("AUTO_THEME_ID='auto'")||!selector.includes("THEME_TIME_ZONE='Asia/Taipei'"))failures.push('LOC theme selector must retain Taiwan day/night automatic mode');
if(!selector.includes("DAY_THEME_ID='theme-7'")||!selector.includes("NIGHT_THEME_ID='theme-1'"))failures.push('automatic theme mapping must remain order-by-day and soul-by-night');
if(/fetchThemeStylesV2|background_color|panel_background_color|text_color/.test(selector))failures.push('theme definitions must remain fixed in the shared code registry');
if(existsSync('app/migration-bridges'))failures.push('retired migration-bridges directory remains');
if(existsSync('app/loc/ThemeAdmin.jsx'))failures.push('retired global theme-definition editor remains');
if(/TIME_SCHEDULE|schedule:|mode:'time'|custom:Object/.test(scopeRegistry))failures.push('scope code must not keep duplicate theme/schedule settings');
if(!footer.includes('<ThemeSelectV2 scopeId={scopeId}/>'))failures.push('V2 Footer must pass Scope identity into theme policy');
if(!selector.includes("AUTHOR_THEME_ID='theme-2'")||!selector.includes("LUNARUNES_THEME_ID='theme-5'"))failures.push('fixed Scope theme mapping must remain author=link and LunaRunes=mineral');
if(!selector.includes("lo3rwang:Object.freeze({mode:'fixed',themeId:AUTHOR_THEME_ID})"))failures.push('author Scope must remain fixed to link theme');
if(!selector.includes("lunarunes:Object.freeze({mode:'fixed',themeId:LUNARUNES_THEME_ID})"))failures.push('LunaRunes Scope must remain fixed to mineral theme');
if(!selector.includes("loc:Object.freeze({mode:'auto'})"))failures.push('LOC Scope must remain automatic day/night theme');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
if(!layout.includes("import ScopeFooterV2 from './modular-v2/ScopeFooterV2'"))failures.push('Root layout must use Current ScopeFooterV2 directly');
for(const retired of ['app/loc/ThemeProvider.jsx','app/loc/ThemeControl.jsx','app/loc/theme-registry.js','app/theme-registry.js','app/ThemeSelect.jsx','app/GlobalFooter.jsx','app/loc/ScopeDefaultThemeSetting.jsx','app/loc/scope-public-settings.js'])if(existsSync(retired))failures.push(retired+' must remain retired');

if(failures.length){console.error('[theme-contract] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[theme-contract] eight themes verified with LOC day/night auto, author link fixed, and LunaRunes mineral fixed');
