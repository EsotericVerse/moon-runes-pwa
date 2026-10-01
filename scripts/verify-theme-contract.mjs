import {existsSync,readFileSync} from 'node:fs';
import {THEME_SLOTS_V2,THEME_TOKEN_KEYS_V2,getThemeSlotV2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const scopeRegistry=read('app/modular-v2/scope-registry.v2.js');
const layout=read('app/layout.jsx');

if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');

const expectedSchemes=Object.freeze({
  'theme-1':'dark','theme-2':'light','theme-3':'light','theme-4':'light',
  'theme-5':'light','theme-6':'dark','theme-7':'light','theme-8':'dark'
});
function hexRgb(value){
  const match=/^#([0-9a-f]{6})$/i.exec(String(value||'').trim());
  if(!match)return null;
  const hex=match[1];
  return [0,2,4].map(index=>parseInt(hex.slice(index,index+2),16)/255);
}
function linear(value){return value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4);}
function luminance(value){
  const rgb=hexRgb(value);
  if(!rgb)return null;
  return .2126*linear(rgb[0])+.7152*linear(rgb[1])+.0722*linear(rgb[2]);
}
function contrast(a,b){
  const first=luminance(a),second=luminance(b);
  if(first===null||second===null)return null;
  const high=Math.max(first,second),low=Math.min(first,second);
  return (high+.05)/(low+.05);
}

for(const slot of THEME_SLOTS_V2){
  const tokenKeys=Object.keys(slot.tokens||{});
  const missing=THEME_TOKEN_KEYS_V2.filter(key=>!tokenKeys.includes(key));
  const extra=tokenKeys.filter(key=>!THEME_TOKEN_KEYS_V2.includes(key));
  if(missing.length)failures.push(`${slot.id}: incomplete theme palette, missing ${missing.join(', ')}`);
  if(extra.length)failures.push(`${slot.id}: unmanaged theme tokens ${extra.join(', ')}`);
  if(tokenKeys.length!==THEME_TOKEN_KEYS_V2.length)failures.push(`${slot.id}: theme token count must be exactly ${THEME_TOKEN_KEYS_V2.length}`);
  if(slot.scheme!==expectedSchemes[slot.id])failures.push(`${slot.id}: expected ${expectedSchemes[slot.id]} scheme, got ${slot.scheme}`);

  const panel=slot.tokens['--loc-panel'];
  for(const key of ['--loc-text','--loc-muted','--loc-heading','--loc-accent','--loc-gold','--loc-danger']){
    const ratio=contrast(slot.tokens[key],panel);
    if(ratio===null)failures.push(`${slot.id}: ${key} and --loc-panel must use testable solid hex colors`);
    else if(ratio<4.5)failures.push(`${slot.id}: ${key} contrast on panel is ${ratio.toFixed(2)}:1, below WCAG AA 4.5:1`);
  }
  const panel2Ratio=contrast(slot.tokens['--loc-text'],slot.tokens['--loc-panel-2']);
  if(panel2Ratio===null||panel2Ratio<4.5)failures.push(`${slot.id}: --loc-text contrast on --loc-panel-2 must be at least 4.5:1`);
}
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS_V2.some(slot=>slot.group===group))failures.push('missing theme group '+group);
const overrideProbe=THEME_SLOTS_V2[0];
const partialOverride=getThemeSlotV2(overrideProbe.id,{
  [overrideProbe.id]:{scheme:overrideProbe.scheme,tokens:{'--loc-bg':'#010203'}}
});
if(partialOverride!==overrideProbe)failures.push('partial Admin theme overrides must be rejected as a whole');

const fullProbeTokens=Object.fromEntries(THEME_TOKEN_KEYS_V2.map(key=>[key,overrideProbe.tokens[key]]));
fullProbeTokens['--loc-bg']='#010203';
const fullOverride=getThemeSlotV2(overrideProbe.id,{
  [overrideProbe.id]:{scheme:overrideProbe.scheme,tokens:fullProbeTokens}
});
if(fullOverride===overrideProbe||fullOverride.tokens['--loc-bg']!=='#010203')failures.push('complete Admin theme overrides must be accepted atomically');

if(selector.includes('localStorage')||selector.includes('migration-bridges')||selector.includes('scope-public-settings'))failures.push('theme selection must remain session-local and must not query retired scope settings');
if(!selector.includes("AUTO_THEME_ID='auto'")||!selector.includes("THEME_TIME_ZONE='Asia/Taipei'"))failures.push('LOC theme selector must retain Taiwan day/night automatic mode');
if(!selector.includes("DAY_THEME_ID='theme-7'")||!selector.includes("NIGHT_THEME_ID='theme-1'"))failures.push('automatic theme mapping must remain order-by-day and soul-by-night');
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
console.log('[theme-contract] eight complete default palettes verified with WCAG AA core text contrast and future override compatibility');
