'use client';

import {selectRows} from './db-query.mjs';
import {getThemeSlot,THEME_TOKEN_KEYS} from '../modular/theme-registry';

export async function selectThemeOverride(themeId){
  const id=String(themeId||'').trim();
  if(!id)return null;
  const {rows}=await selectRows('silver.theme_registry',{
    columns:'theme_id,label,scheme,tokens,updated_at',
    filters:[{column:'theme_id',operator:'eq',value:id}],
    limit:1,
    offset:0
  });
  return rows?.[0]||null;
}

export async function selectThemeRegistry(){
  const {rows}=await selectRows('silver.theme_registry',{
    columns:'theme_id,label,scheme,tokens,updated_at',
    orders:[{column:'theme_id',ascending:true}],
    limit:8,
    offset:0
  });
  return rows||[];
}

export function mergeThemeSlot(themeId,override=null){
  const base=getThemeSlot(themeId);
  const tokens={...base.tokens};
  const custom=override?.tokens&&typeof override.tokens==='object'&&!Array.isArray(override.tokens)?override.tokens:{};
  for(const key of THEME_TOKEN_KEYS){
    const value=String(custom[key]??'').trim();
    if(value)tokens[key]=value;
  }
  return {
    ...base,
    label:String(override?.label||base.label),
    scheme:override?.scheme==='dark'?'dark':override?.scheme==='light'?'light':base.scheme,
    tokens
  };
}
