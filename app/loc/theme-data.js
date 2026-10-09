'use client';

import {selectRows} from './db-query.mjs';
import {getThemeSlot,THEME_TOKEN_KEYS} from '../modular/theme-registry';

// CSS custom-property names are a fixed renderer contract.
// All theme *values* come from explicit silver.loc_theme columns.
export function themeColumnForToken(key){
  if(!THEME_TOKEN_KEYS.includes(key))throw new Error('Unknown Theme token: '+key);
  return key.slice(2).replaceAll('-','_');
}
export const THEME_DB_COLUMNS=[
  'theme_id','theme_name','theme_order','scheme','style_key','identity_color',
  ...THEME_TOKEN_KEYS.map(themeColumnForToken)
].join(',');

export async function selectThemeOverride(themeId){
  const id=String(themeId||'').trim();
  if(!id)return null;
  const {rows}=await selectRows('silver.loc_theme',{
    columns:THEME_DB_COLUMNS,
    filters:[{column:'theme_id',operator:'eq',value:id}],
    limit:1,offset:0
  });
  return rows?.[0]||null;
}

export async function selectThemeRegistry(){
  const {rows}=await selectRows('silver.loc_theme',{
    columns:THEME_DB_COLUMNS,
    orders:[{column:'theme_order',ascending:true}],
    limit:8,offset:0
  });
  return rows||[];
}

export function mergeThemeSlot(themeId,override=null){
  const base=getThemeSlot(themeId);
  const tokens={...base.tokens};
  for(const key of THEME_TOKEN_KEYS){
    const column=themeColumnForToken(key);
    const value=String(override?.[column]??'').trim();
    if(value)tokens[key]=value;
  }
  return {
    ...base,
    id:String(override?.theme_id||base.id||themeId),
    label:String(override?.theme_name||base.label||themeId),
    scheme:override?.scheme==='dark'?'dark':override?.scheme==='light'?'light':base.scheme,
    styleKey:String(override?.style_key||base.styleKey||''),
    group:String(override?.theme_name||base.group||''),
    identityColor:String(override?.identity_color||base.identityColor||''),
    tokens,
    themeOrder:Number(override?.theme_order)||Number(String(themeId).split('-')[1])||0
  };
}
