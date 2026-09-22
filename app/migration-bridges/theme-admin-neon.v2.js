'use client';

import {THEME_SLOTS_V2} from '../modular-v2/theme-registry.v2';
import {selectNeonRows,updateNeonRows} from '../loc/neon-repository';

export const FALLBACK_THEME_STYLES_V2=Object.freeze(THEME_SLOTS_V2.map(slot=>Object.freeze({
  style_key:slot.styleKey,
  name_zh:slot.group,
  rotation_order:slot.order,
  legacy_mode:slot.scheme,
  css_vars:slot.tokens,
  enabled:slot.enabled
})));

export async function fetchThemeStylesV2(){
  const {rows}=await selectNeonRows('api.site_theme_styles',{columns:'style_key,name_zh,rotation_order,css_vars,legacy_mode,enabled,updated_at',orders:[{column:'rotation_order',ascending:true}],limit:1000});
  return rows.length?rows:FALLBACK_THEME_STYLES_V2;
}

export async function updateThemeStyleV2(styleKey,patch){
  const safe={...patch,updated_at:new Date().toISOString()};
  const rows=await updateNeonRows('api.site_theme_styles',safe,{filters:[{column:'style_key',operator:'eq',value:styleKey}],returning:'style_key,name_zh,rotation_order,css_vars,legacy_mode,enabled,updated_at'});
  if(!rows.length)throw new Error('只有管理者可以更新全站風格');
  return rows[0];
}
