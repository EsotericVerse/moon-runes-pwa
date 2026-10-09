'use client';

import {selectRows} from './db-query.mjs';
import {getThemeSlot,THEME_TOKEN_KEYS} from '../modular/theme-registry';

export const themeTokenColumn=key=>String(key).slice(2).replaceAll('-','_');
export const THEME_DB_COLUMNS=[
  'theme_id','theme_name','theme_order','scheme','style_key','identity_color',
  ...THEME_TOKEN_KEYS.map(themeTokenColumn)
];
const COLUMNS=THEME_DB_COLUMNS.join(',');

export async function selectThemeOverride(themeId){
  const id=String(themeId||'').trim();
  if(!id)return null;
  const {rows}=await selectRows('silver.loc_theme',{
    columns:COLUMNS,
    filters:[{column:'theme_id',operator:'eq',value:id}],
    limit:1,
    offset:0
  });
  return rows?.[0]||null;
}

export async function selectThemeRegistry(){
  const {rows}=await selectRows('silver.loc_theme',{
    columns:COLUMNS,
    orders:[{column:'theme_order',ascending:true}],
    limit:8,
    offset:0
  });
  return rows||[];
}

// DB scalar columns are authoritative; the only fallback is the existing
// emergency palette when the DB row itself is absent or incomplete.
export function mergeThemeSlot(themeId,row=null){
  const base=getThemeSlot(themeId);
  const tokens={...base.tokens};
  for(const key of THEME_TOKEN_KEYS){
    const value=String(row?.[themeTokenColumn(key)]??'').trim();
    if(value)tokens[key]=value;
  }
  return {
    ...base,
    id:String(row?.theme_id||base.id||themeId),
    label:String(row?.theme_name||base.label||themeId),
    scheme:row?.scheme==='dark'?'dark':row?.scheme==='light'?'light':base.scheme,
    styleKey:String(row?.style_key||base.styleKey||''),
    group:String(row?.theme_name||base.group||''),
    identityColor:String(row?.identity_color||base.identityColor||''),
    tokens,
    themeOrder:Number(row?.theme_order)||Number(String(themeId).split('-')[1])||0
  };
}
