import {existsSync,readFileSync} from 'node:fs';

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
if(!registry.includes("loc:{mode:'time'"))failures.push('LOC must default to time rotation');
if(!registry.includes("runes:{mode:'fixed',theme:'theme-5'"))failures.push('LunaRunes must default to fixed mineral theme');
if(!registry.includes("lo3rwang:{mode:'custom',theme:'theme-2'"))failures.push('lo3rwang must default to custom light-blue link theme');
if(!registry.includes("admin:{mode:'fixed'"))failures.push('admin must use a fixed default theme');
if(!selector.includes('getScopeThemeDefault'))failures.push('ThemeSelect must read managed scope defaults');
if(!selector.includes("detectThemeScope(window.location.pathname,window.location.hostname)"))failures.push('ThemeSelect must resolve scope by route/domain');
if(!footer.includes('<ThemeSelect/>'))failures.push('Footer must own the user theme selector');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
if(!scopeSettings.includes("from('scope_theme_defaults')"))failures.push('scope theme defaults must come from Neon');
if(existsSync('app/loc/ThemeProvider.jsx') && layout.includes("ThemeProvider"))failures.push('legacy ThemeProvider must not be active');

if(failures.length){
  console.error('[theme-contract] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[theme-contract] scope-aware footer theme system verified');
