'use client';
import {THEME_SLOTS_V2} from '../modular-v2/theme-registry.v2';
import {selectNeonRows,updateNeonRows} from '../loc/neon-repository';
const THEME_STYLE_COLUMNS='style_key,name_zh,rotation_order,background_color,panel_background_color,text_color,updated_at,updated_by';
export const FALLBACK_THEME_STYLES_V2=Object.freeze(THEME_SLOTS_V2.map(slot=>Object.freeze({
  style_key:slot.styleKey,name_zh:slot.group,rotation_order:slot.order,
  background_color:slot.tokens['--loc-bg'],panel_background_color:slot.tokens['--loc-panel'],text_color:slot.tokens['--loc-text']
})));
export async function fetchThemeStylesV2(){
  const {rows}=await selectNeonRows('api.site_theme_styles',{columns:THEME_STYLE_COLUMNS,orders:[{column:'rotation_order',ascending:true}],limit:8});
  return rows.length?rows:FALLBACK_THEME_STYLES_V2;
}
export async function updateThemeStyleV2(styleKey,patch){
  const {name_zh,background_color,panel_background_color,text_color}=patch||{};
  if(!String(name_zh||'').trim())throw new Error('主題名稱不可空白');
  for(const [label,value] of [['背景色',background_color],['文字框背景色',panel_background_color],['文字色',text_color]]){
    if(!/^#[0-9a-fA-F]{6}$/.test(String(value||'')))throw new Error(label+'必須是六位 HEX 色碼');
  }
  const safe={name_zh:String(name_zh).trim(),background_color,panel_background_color,text_color,updated_at:new Date().toISOString()};
  const rows=await updateNeonRows('api.site_theme_styles',safe,{filters:[{column:'style_key',operator:'eq',value:styleKey}],returning:THEME_STYLE_COLUMNS});
  if(!rows.length)throw new Error('只有管理者可以更新全站風格');
  return rows[0];
}
