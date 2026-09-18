import {existsSync,readFileSync} from 'node:fs';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const provider=read('app/loc/ThemeProvider.jsx');
const registry=read('app/loc/theme-registry.js');
const control=read('app/loc/ThemeControl.jsx');
const layout=read('app/layout.jsx');

if(existsSync('app/ThemeSelect.jsx'))failures.push('duplicate ThemeSelect controller must remain removed');
for(const token of ["'soul'","'link'","'life'","'nature'","'mineral'","'element'","'order'","'disorder'"]){
  if(!registry.includes(token))failures.push('missing theme slot '+token);
}
if(!registry.includes("legacy_mode:'dark'"))failures.push('Soul must preserve existing 永夜/dark style');
if(!registry.includes("legacy_mode:'light'"))failures.push('Order must preserve existing 永日/light style');
if(!provider.includes("useNeonSetting('loc-theme','auto')"))failures.push('default theme mode must remain auto');
if(!provider.includes("themeForTime(new Date(),styles)"))failures.push('auto mode must rotate by time');
if(!provider.includes("storedMode==='light'?'order'"))failures.push('legacy light must migrate to Order');
if(!provider.includes("storedMode==='dark'?'soul'"))failures.push('legacy dark must migrate to Soul');
if(!layout.includes('<ThemeProvider>'))failures.push('RootLayout must own the single ThemeProvider');
if(!control.includes('隨時間輪替'))failures.push('theme control must expose time rotation');
if(!registry.includes('/^--loc-[a-z0-9-]+$/i'))failures.push('admin CSS variables must be restricted to --loc-*');

if(failures.length){
  console.error('[theme-contract] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[theme-contract] unified eight-style theme system verified');
