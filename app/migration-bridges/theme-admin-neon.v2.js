'use client';

import {THEME_SLOTS_V2} from '../modular-v2/theme-registry.v2';
import {neonClient} from '../loc/neon-client';

export const FALLBACK_THEME_STYLES_V2=Object.freeze(THEME_SLOTS_V2.map(slot=>Object.freeze({
  style_key:slot.styleKey,
  name_zh:slot.group,
  rotation_order:slot.order,
  legacy_mode:slot.scheme,
  css_vars:slot.tokens,
  enabled:slot.enabled
})));

export async function fetchThemeStylesV2(){
  const {data,error}=await neonClient.from('site_theme_styles')
    .select('style_key,name_zh,rotation_order,css_vars,legacy_mode,enabled,updated_at')
    .order('rotation_order',{ascending:true});
  if(error)throw new Error(error.message||'Theme registry read failed');
  return data?.length?data:FALLBACK_THEME_STYLES_V2;
}

export async function updateThemeStyleV2(styleKey,patch){
  const safe={...patch,updated_at:new Date().toISOString()};
  const {data,error}=await neonClient.from('site_theme_styles')
    .update(safe).eq('style_key',styleKey)
    .select('style_key,name_zh,rotation_order,css_vars,legacy_mode,enabled,updated_at');
  if(error)throw new Error(error.message||'Theme registry update failed');
  if(!data?.length)throw new Error('只有管理者可以更新全站風格');
  return data[0];
}
