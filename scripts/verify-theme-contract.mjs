import {readFileSync} from 'node:fs';
import {THEME_SLOTS_V2,THEME_TOKEN_KEYS_V2,getThemeSlotV2} from '../app/modular-v2/theme-registry.v2.js';

const failures=[];
const read=path=>readFileSync(path,'utf8');
const selector=read('app/modular-v2/ThemeSelectV2.jsx');
const footer=read('app/modular-v2/ScopeFooterV2.jsx');
const layout=read('app/layout.jsx');

if(THEME_SLOTS_V2.length!==8)failures.push('theme registry must contain eight shared slots');
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
for(const slot of THEME_SLOTS_V2){
  const keys=Object.keys(slot.tokens||{});
  const missing=THEME_TOKEN_KEYS_V2.filter(key=>!keys.includes(key));
  const extra=keys.filter(key=>!THEME_TOKEN_KEYS_V2.includes(key));
  if(missing.length)failures.push(slot.id+': missing '+missing.join(', '));
  if(extra.length)failures.push(slot.id+': unmanaged '+extra.join(', '));
  if(keys.length!==THEME_TOKEN_KEYS_V2.length)failures.push(slot.id+': token count mismatch');
  if(slot.scheme!==expectedSchemes[slot.id])failures.push(slot.id+': scheme mismatch');
  const panel=slot.tokens['--loc-panel'];
  for(const key of ['--loc-text','--loc-muted','--loc-heading','--loc-accent','--loc-gold','--loc-danger']){
    const ratio=contrast(slot.tokens[key],panel);
    if(ratio===null||ratio<4.5)failures.push(slot.id+': '+key+' panel contrast below 4.5:1');
  }
}
for(const group of ['靈魂','連結','生命','自然','礦物','元素','秩序','無序'])if(!THEME_SLOTS_V2.some(slot=>slot.group===group))failures.push('missing theme group '+group);
const probe=THEME_SLOTS_V2[0];
if(getThemeSlotV2(probe.id,{[probe.id]:{scheme:probe.scheme,tokens:{'--loc-bg':'#010203'}}})!==probe)failures.push('partial theme override must be rejected');
const fullTokens=Object.fromEntries(THEME_TOKEN_KEYS_V2.map(key=>[key,probe.tokens[key]]));
fullTokens['--loc-bg']='#010203';
const full=getThemeSlotV2(probe.id,{[probe.id]:{scheme:probe.scheme,tokens:fullTokens}});
if(full===probe||full.tokens['--loc-bg']!=='#010203')failures.push('complete theme override must be accepted');
for(const token of ["AUTO_THEME_ID='auto'","THEME_TIME_ZONE='Asia/Taipei'","DAY_THEME_ID='theme-7'","NIGHT_THEME_ID='theme-1'","AUTHOR_THEME_ID='theme-2'","LUNARUNES_THEME_ID='theme-5'","lo3rwang:Object.freeze({mode:'fixed',themeId:AUTHOR_THEME_ID})","lunarunes:Object.freeze({mode:'fixed',themeId:LUNARUNES_THEME_ID})","loc:Object.freeze({mode:'auto'})"])if(!selector.includes(token))failures.push('Theme selector missing '+token);
if(!footer.includes('<ThemeSelectV2 scopeId={scopeId}/>'))failures.push('ScopeFooter must pass Scope identity to ThemeSelectV2');
if(!layout.includes("import ScopeFooterV2 from './modular-v2/ScopeFooterV2'")||!layout.includes('<ScopeFooterV2 />'))failures.push('Root layout must use ScopeFooterV2');
if(failures.length){
  console.error('[theme-contract] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[theme-contract] eight complete Current palettes, contrast and atomic overrides verified');
