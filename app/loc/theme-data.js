'use client';

import {selectRows} from './db-query.mjs';
import {getThemeSlot,THEME_TOKEN_KEYS} from '../modular/theme-registry';

function attrOf(row){
  return row?.theme_attr&&typeof row.theme_attr==='object'&&!Array.isArray(row.theme_attr)
    ?row.theme_attr
    :{};
}

export async function selectThemeOverride(themeId){
  const id=String(themeId||'').trim();
  if(!id)return null;
  const {rows}=await selectRows('silver.loc_theme',{
    columns:'theme_id,theme_name,theme_attr,theme_order',
    filters:[{column:'theme_id',operator:'eq',value:id}],
    limit:1,
    offset:0
  });
  return rows?.[0]||null;
}

export async function selectThemeRegistry(){
  const {rows}=await selectRows('silver.loc_theme',{
    columns:'theme_id,theme_name,theme_attr,theme_order',
    orders:[{column:'theme_order',ascending:true}],
    limit:8,
    offset:0
  });
  return rows||[];
}

export function mergeThemeSlot(themeId,override=null){
  const base=getThemeSlot(themeId);
  const attr=attrOf(override);
  const tokens={...base.tokens};
  const custom=attr.tokens&&typeof attr.tokens==='object'&&!Array.isArray(attr.tokens)?attr.tokens:{};
  for(const key of THEME_TOKEN_KEYS){
    const value=String(custom[key]??'').trim();
    if(value)tokens[key]=value;
  }
  return {
    ...base,
    id:String(override?.theme_id||base.id||themeId),
    label:String(override?.theme_name||base.label||themeId),
    scheme:attr.scheme==='dark'?'dark':attr.scheme==='light'?'light':base.scheme,
    styleKey:String(attr.style_key||base.styleKey||''),
    group:String(attr.group||base.group||''),
    identityColor:String(attr.identity_color||base.identityColor||''),
    tokens,
    themeOrder:Number(override?.theme_order)||Number(String(themeId).split('-')[1])||0
  };
}
