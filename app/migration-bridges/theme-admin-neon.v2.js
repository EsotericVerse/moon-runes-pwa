'use client';
import {THEME_SLOTS_V2} from '../modular-v2/theme-registry.v2';

const STORAGE_KEY='loc:theme-styles-v2';
export const FALLBACK_THEME_STYLES_V2=Object.freeze(THEME_SLOTS_V2.map(slot=>Object.freeze({
  style_key:slot.styleKey,name_zh:slot.group,rotation_order:slot.order,
  background_color:slot.tokens['--loc-bg'],panel_background_color:slot.tokens['--loc-panel'],text_color:slot.tokens['--loc-text']
})));

function readStyles(){
  if(typeof window==='undefined')return FALLBACK_THEME_STYLES_V2;
  try{
    const rows=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'[]');
    return Array.isArray(rows)&&rows.length?rows:FALLBACK_THEME_STYLES_V2;
  }catch{return FALLBACK_THEME_STYLES_V2}
}
function writeStyles(rows){
  if(typeof window!=='undefined')window.localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));
}
export async function fetchThemeStylesV2(){
  return readStyles();
}
export async function updateThemeStyleV2(styleKey,patch){
  const {name_zh,background_color,panel_background_color,text_color}=patch||{};
  if(!String(name_zh||'').trim())throw new Error('主題名稱不可空白');
  for(const [label,value] of [['背景色',background_color],['文字框背景色',panel_background_color],['文字色',text_color]]){
    if(!/^#[0-9a-fA-F]{6}$/.test(String(value||'')))throw new Error(label+'必須是六位 HEX 色碼');
  }
  const safe={style_key:styleKey,name_zh:String(name_zh).trim(),background_color,panel_background_color,text_color,updated_at:new Date().toISOString()};
  const rows=[...readStyles()];
  const index=rows.findIndex(row=>row.style_key===styleKey);
  if(index>=0)rows[index]={...rows[index],...safe}; else rows.push(safe);
  writeStyles(rows);
  return rows.find(row=>row.style_key===styleKey);
}
