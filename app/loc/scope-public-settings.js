'use client';

import {selectNeonRows,updateNeonRows} from './neon-repository';

export async function getScopeContact(scope){
  try{
    const {rows}=await selectNeonRows('silver.loc_scope',{columns:'scope_id,contact_label,contact_email,updated_at',filters:[{column:'record_type',operator:'eq',value:'scope'},{column:'scope_id',operator:'eq',value:databaseScopeId(scope)}],limit:1});
    return rows[0]||null;
  }catch{
    return null;
  }
}

const SCOPE_REGISTRY_TABLE='silver.loc_scope';

export function databaseScopeId(scope){
  return scope==='moon-runes'?'runes':scope;
}

export async function getScopeThemeDefault(scope){
  try{
    const scopeId=databaseScopeId(scope);
    const {rows}=await selectNeonRows(SCOPE_REGISTRY_TABLE,{columns:'scope_id,default_theme_id,updated_at',filters:[{column:'record_type',operator:'eq',value:'scope'},{column:'scope_id',operator:'eq',value:scopeId}],limit:1});
    return rows[0]||null;
  }catch{
    return null;
  }
}

export async function updateScopeThemeDefault(scope,themeId){
  if(!/^theme-[1-8]$/.test(String(themeId||'')))throw new Error('主題只能選擇八組預設主題之一');
  const scopeId=databaseScopeId(scope);
  const rows=await updateNeonRows(SCOPE_REGISTRY_TABLE,{default_theme_id:themeId,updated_at:new Date().toISOString()},{filters:[{column:'record_type',operator:'eq',value:'scope'},{column:'scope_id',operator:'eq',value:scopeId}],returning:'scope_id,default_theme_id,updated_at'});
  if(!rows.length)throw new Error('目前身份沒有此 Scope 的管理權限，或 Scope 不存在');
  return rows[0];
}
