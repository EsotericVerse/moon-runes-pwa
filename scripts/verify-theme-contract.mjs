import {existsSync,readFileSync} from 'node:fs';
import {SITE_SCOPES} from '../app/site-registry.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/ThemeSelect.jsx');
const registry=read('app/theme-registry.js');
const footer=read('app/GlobalFooter.jsx');
const layout=read('app/layout.jsx');
const scopeSettings=read('app/loc/scope-public-settings.js');

for(const token of ["group:'靈魂'","group:'連結'","group:'生命'","group:'自然'","group:'礦物'","group:'元素'","group:'秩序'","group:'無序'"]){
  if(!registry.includes(token))failures.push('missing theme group '+token);
}
for(const scope of ['loc','runes','lo3rwang','admin']){
  if(!SITE_SCOPES[scope]?.theme)failures.push(scope+' missing registry theme defaults');
}
if(SITE_SCOPES.loc.theme.mode!=='time')failures.push('LOC must default to time rotation');
if(SITE_SCOPES.runes.theme.theme!=='theme-5')failures.push('LunaRunes must default to mineral theme');
if(SITE_SCOPES.lo3rwang.theme.mode!=='custom')failures.push('lo3rwang must default to custom theme');
if(SITE_SCOPES.admin.theme.mode!=='fixed')failures.push('admin must use fixed theme');
if(!selector.includes("useCurrentScope"))failures.push('ThemeSelect must consume shared Scope resolver');
if(selector.includes('detectThemeScope'))failures.push('ThemeSelect must not own a second Scope resolver');
if(!selector.includes('getScopeThemeDefault'))failures.push('ThemeSelect must read managed scope defaults');
if(!footer.includes('<ThemeSelect/>'))failures.push('Footer must own the user theme selector');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
if(!scopeSettings.includes("from('scope_theme_defaults')"))failures.push('scope theme defaults must come from Neon');
for(const retired of ['app/loc/ThemeProvider.jsx','app/loc/ThemeControl.jsx','app/loc/theme-registry.js']){
  if(existsSync(retired))failures.push(retired+' must remain retired');
}

if(failures.length){
  console.error('[theme-contract] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[theme-contract] single registry-driven theme system verified');
