import {readFileSync} from 'node:fs';
import {THEME_SLOTS,THEME_TOKEN_KEYS,getThemeSlot} from '../app/modular/theme-registry.js';
import {SCOPES} from '../app/modular/scope-registry.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const shell=read('app/AppShell.jsx');
const layout=read('app/layout.jsx');
const game=read('app/lrunes/game/GameView.jsx');

if(THEME_SLOTS.length!==8)failures.push('theme registry must contain eight shared slots');
const expectedSchemes=Object.freeze({
  'theme-1':'dark','theme-2':'light','theme-3':'light','theme-4':'light',
  'theme-5':'light','theme-6':'dark','theme-7':'light','theme-8':'dark'
});
function rgb(value){
  const match=/^#([0-9a-f]{6})$/i.exec(String(value||'').trim());
  if(!match)return null;
  const hex=match[1];
  return [0,2,4].map(index=>parseInt(hex.slice(index,index+2),16)/255);
}
function linear(value){return value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4);}
function luminance(value){
  const valueRgb=rgb(value);
  if(!valueRgb)return null;
  return .2126*linear(valueRgb[0])+.7152*linear(valueRgb[1])+.0722*linear(valueRgb[2]);
}
function contrast(a,b){
  const first=luminance(a),second=luminance(b);
  if(first===null||second===null)return null;
  const high=Math.max(first,second),low=Math.min(first,second);
  return (high+.05)/(low+.05);
}
for(const slot of THEME_SLOTS){
  const keys=Object.keys(slot.tokens||{});
  const missing=THEME_TOKEN_KEYS.filter(key=>!keys.includes(key));
  const extra=keys.filter(key=>!THEME_TOKEN_KEYS.includes(key));
  if(missing.length)failures.push(slot.id+': missing '+missing.join(', '));
  if(extra.length)failures.push(slot.id+': unmanaged '+extra.join(', '));
  if(keys.length!==THEME_TOKEN_KEYS.length)failures.push(slot.id+': token count mismatch');
  if(slot.scheme!==expectedSchemes[slot.id])failures.push(slot.id+': scheme mismatch');
  const panel=slot.tokens['--loc-panel'];
  for(const key of ['--loc-text','--loc-muted','--loc-heading','--loc-accent','--loc-gold','--loc-danger']){
    const ratio=contrast(slot.tokens[key],panel);
    if(ratio===null||ratio<4.5)failures.push(slot.id+': '+key+' panel contrast below 4.5:1');
  }
}
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS.some(slot=>slot.group===group))failures.push('missing theme group '+group);
for(const scope of Object.values(SCOPES)){
  const policy=scope.theme||{mode:'auto'};
  if(policy.mode==='fixed'&&getThemeSlot(policy.themeId).id!==policy.themeId)failures.push(scope.id+': invalid fixed theme '+policy.themeId);
}
for(const token of ["SYSTEM_THEME_ID='system-default'","THEME_TIME_ZONE='Asia/Taipei'","DAY_THEME_ID='theme-7'","NIGHT_THEME_ID='theme-1'","getScope","UI_COPY.common.systemTheme"])if(!shell.includes(token))failures.push('AppShell theme control missing '+token);
for(const stale of ['SCOPE_THEME_POLICY','AUTHOR_THEME_ID','LUNARUNES_THEME_ID'])if(shell.includes(stale))failures.push('AppShell theme control still hard-codes Scope policy: '+stale);
if(!layout.includes("import AppShell from './AppShell'")||!layout.includes('<AppShell>{children}</AppShell>'))failures.push('Root layout must use AppShell');
if(!layout.includes('id="loc-theme-bootstrap"')||!layout.includes('INITIAL_SCOPE_THEMES')||!layout.includes('SCOPES'))failures.push('Root layout must bootstrap themes from Scope metadata before first paint');
if(!layout.includes("if(!scope.mount)return false;")||!layout.includes("||scopes.find(scope=>scope.domain&&host==="))failures.push('Root theme bootstrap must resolve mounted Scopes before host domains');
if(!shell.includes("root.dataset.themeId===slot.id"))failures.push('AppShell theme control must avoid reapplying the already bootstrapped theme');
if(shell.includes('if(fixedThemeId)return null')||shell.includes('if(fixedDefaultThemeId)return null'))failures.push('fixed Scope defaults must not hide the footer theme selector');
for(const token of ["selection.scopeId===scopeId","setSelection({scopeId,themeId:SYSTEM_THEME_ID})","fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now)"])if(!shell.includes(token))failures.push('Scope-local system-default theme behavior missing '+token);
if(!game.includes("THEME_SLOTS")||!game.includes("getThemeSlot")||!game.includes("GAME_THEME_DEFAULT='theme-5'")||!game.includes("GAME_THEME_AUTO='event-auto'"))failures.push('Game must consume the shared eight-group theme registry locally');
if(game.includes('applyTheme(')||game.includes('document.documentElement'))failures.push('Game theme must stay scoped and must not mutate the root Scope theme');
const registry=read('app/modular/theme-registry.js');
if(!registry.includes("root.dataset.themeId=slot.id")||!registry.includes("root.style.colorScheme=slot.scheme"))failures.push('Theme registry must mark the applied theme identity and color scheme');
if(failures.length){
  console.error('[theme-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[theme-contract] eight complete Current palettes, contrast and atomic overrides verified');
