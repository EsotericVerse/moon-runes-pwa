import {existsSync,readFileSync} from 'node:fs';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/ThemeSelect.jsx');
const registry=read('app/theme-registry.js');
const siteRegistry=read('app/site-registry.js');
const footer=read('app/GlobalFooter.jsx');
const provider=read('app/SiteScopeProvider.jsx');
const layout=read('app/layout.jsx');
const scopeSettings=read('app/loc/scope-public-settings.js');

for(const token of ["group:'靈魂'","group:'連結'","group:'生命'","group:'自然'","group:'礦物'","group:'元素'","group:'秩序'","group:'無序'"]){
  if(!registry.includes(token))failures.push('missing theme group '+token);
}
for(const token of ["id:'loc'","id:'runes'","id:'lo3rwang'","id:'governance'"]){
  if(!siteRegistry.includes(token))failures.push('missing site scope '+token);
}
if(!selector.includes('useSiteScope'))failures.push('ThemeSelect must consume shared SiteScopeProvider');
if(selector.includes('detectThemeScope(window.location'))failures.push('ThemeSelect must not resolve scope independently');
if(!footer.includes('<ThemeSelect/>'))failures.push('Footer must own the user theme selector');
if(!provider.includes('detectSiteScope(pathname,host)'))failures.push('SiteScopeProvider must own route/domain scope resolution');
if(!layout.includes('<SiteScopeProvider>'))failures.push('RootLayout must provide one shared runtime scope');
if(layout.includes('<ThemeProvider>'))failures.push('obsolete global ThemeProvider must remain removed');
if(!scopeSettings.includes("from('scope_theme_defaults')"))failures.push('scope theme defaults must come from Neon');
if(existsSync('app/loc/ThemeProvider.jsx')&&layout.includes('ThemeProvider'))failures.push('legacy ThemeProvider must not be active');

if(failures.length){
  console.error('[theme-contract] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[theme-contract] shared-scope theme system verified');
