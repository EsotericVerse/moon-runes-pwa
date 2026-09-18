import {existsSync,readFileSync} from 'node:fs';
import {SCOPES_V2} from '../app/modular-v2/scope-registry.v2.js';
import {THEME_SLOTS_V2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const compatSelector=read('app/ThemeSelect.jsx');
const compatFooter=read('app/GlobalFooter.jsx');
const layout=read('app/layout.jsx');
const scopeSettings=read('app/loc/scope-public-settings.js');
if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');
for(const id of ['theme-1','theme-2','theme-3','theme-4','theme-5','theme-6','theme-7','theme-8'])if(!THEME_SLOTS_V2.some(slot=>slot.id===id))failures.push('missing '+id);
for(const scope of ['loc','runes','lo3rwang','admin'])if(!SCOPES_V2[scope]?.theme)failures.push(scope+' missing registry theme defaults');
if(SCOPES_V2.loc.theme.mode!=='time')failures.push('LOC must default to time rotation');
if(SCOPES_V2.runes.theme.theme!=='theme-5')failures.push('LunaRunes must default to mineral theme');
if(SCOPES_V2.lo3rwang.theme.mode!=='custom')failures.push('lo3rwang must default to custom theme');
if(SCOPES_V2.admin.theme.mode!=='fixed')failures.push('admin must use fixed theme');
if(!selector.includes('useScopeRuntimeV2'))failures.push('ThemeSelectV2 must consume shared Scope runtime');
if(!selector.includes('getScopeThemeDefault'))failures.push('ThemeSelectV2 must read managed scope defaults');
if(!footer.includes('<ThemeSelectV2/>'))failures.push('V2 Footer must own theme selector');
if(!compatSelector.includes('./modular-v2/ThemeSelectV2'))failures.push('ThemeSelect compatibility entry must delegate to V2');
if(!compatFooter.includes('./modular-v2/ScopeFooterV2'))failures.push('GlobalFooter compatibility entry must delegate to V2');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
if(!scopeSettings.includes("from('scope_theme_defaults')"))failures.push('scope theme defaults must come from Neon');
for(const retired of ['app/loc/ThemeProvider.jsx','app/loc/ThemeControl.jsx','app/loc/theme-registry.js'])if(existsSync(retired))failures.push(retired+' must remain retired');
if(failures.length){console.error('[theme-contract] violations:\n'+failures.join('\n'));process.exit(1);}
console.log('[theme-contract] V2 single registry-driven theme system verified');
