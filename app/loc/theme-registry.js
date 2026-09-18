'use client';

import { neonClient } from './neon-client';

export const FALLBACK_THEME_STYLES=[
  {style_key:'soul',name_zh:'靈魂',rotation_order:1,legacy_mode:'dark',css_vars:{},enabled:true},
  {style_key:'link',name_zh:'連結',rotation_order:2,legacy_mode:null,css_vars:{},enabled:true},
  {style_key:'life',name_zh:'生命',rotation_order:3,legacy_mode:null,css_vars:{},enabled:true},
  {style_key:'nature',name_zh:'自然',rotation_order:4,legacy_mode:null,css_vars:{},enabled:true},
  {style_key:'mineral',name_zh:'礦物',rotation_order:5,legacy_mode:null,css_vars:{},enabled:true},
  {style_key:'element',name_zh:'元素',rotation_order:6,legacy_mode:null,css_vars:{},enabled:true},
  {style_key:'order',name_zh:'秩序',rotation_order:7,legacy_mode:'light',css_vars:{},enabled:true},
  {style_key:'disorder',name_zh:'無序',rotation_order:8,legacy_mode:null,css_vars:{},enabled:true}
];

export function themeForTime(date=new Date(),styles=FALLBACK_THEME_STYLES){
  const enabled=styles.filter(item=>item.enabled!==false).sort((a,b)=>a.rotation_order-b.rotation_order);
  if(!enabled.length)return FALLBACK_THEME_STYLES[0];
  const slot=Math.floor(date.getHours()/(24/enabled.length));
  return enabled[Math.min(enabled.length-1,slot)];
}

export async function fetchThemeStyles(){
  const {data,error}=await neonClient.from('site_theme_styles')
    .select('style_key,name_zh,rotation_order,css_vars,legacy_mode,enabled,updated_at')
    .order('rotation_order',{ascending:true});
  if(error)throw new Error(error.message||'Theme registry read failed');
  return data?.length?data:FALLBACK_THEME_STYLES;
}

export async function updateThemeStyle(styleKey,patch){
  const safe={...patch,updated_at:new Date().toISOString()};
  const {data,error}=await neonClient.from('site_theme_styles')
    .update(safe).eq('style_key',styleKey)
    .select('style_key,name_zh,rotation_order,css_vars,legacy_mode,enabled,updated_at');
  if(error)throw new Error(error.message||'Theme registry update failed');
  if(!data?.length)throw new Error('只有管理者可以更新全站風格');
  return data[0];
}

export function applyThemeStyle(style,previousVars=[]){
  if(typeof document==='undefined'||!style)return [];
  const root=document.documentElement;
  for(const key of previousVars)root.style.removeProperty(key);
  const vars=style.css_vars&&typeof style.css_vars==='object'?style.css_vars:{};
  const applied=[];
  for(const [key,value] of Object.entries(vars)){
    if(!/^--loc-[a-z0-9-]+$/i.test(key))continue;
    root.style.setProperty(key,String(value));
    applied.push(key);
  }
  root.dataset.themeStyle=style.style_key;
  root.dataset.theme=style.legacy_mode==='light'?'light':'dark';
  return applied;
}
