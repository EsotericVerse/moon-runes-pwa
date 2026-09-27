'use client';

import {selectNeonRows,updateNeonRows} from './neon-repository';

const MANAGE_TABLE='silver.manage';

export function databaseScopeId(scope){
  return scope==='moon-runes'||scope==='lrunes'?'lunarunes':scope;
}

function manageIdentity(scope){
  const id=databaseScopeId(scope);
  return id==='loc'
    ?{record_type:'group',column:'group_id',id}
    :{record_type:'scope',column:'scope_id',id};
}

export async function getScopeContact(scope){
  try{
    const target=manageIdentity(scope);
    const {rows}=await selectNeonRows(MANAGE_TABLE,{
      columns:'contact_label,contact_email,updated_at',
      filters:[
        {column:'record_type',operator:'eq',value:target.record_type},
        {column:target.column,operator:'eq',value:target.id}
      ],
      limit:1
    });
    return rows[0]||null;
  }catch{
    return null;
  }
}

export async function getScopeThemeDefault(scope){
  try{
    const target=manageIdentity(scope);
    const {rows}=await selectNeonRows(MANAGE_TABLE,{
      columns:'default_theme_id,updated_at',
      filters:[
        {column:'record_type',operator:'eq',value:target.record_type},
        {column:target.column,operator:'eq',value:target.id}
      ],
      limit:1
    });
    return rows[0]||null;
  }catch{
    return null;
  }
}

export async function updateScopeThemeDefault(scope,themeId){
  if(!/^theme-[1-8]$/.test(String(themeId||'')))throw new Error('主題只能選擇八組預設主題之一');
  const target=manageIdentity(scope);
  const rows=await updateNeonRows(MANAGE_TABLE,{default_theme_id:themeId,updated_at:new Date().toISOString()},{filters:[
    {column:'record_type',operator:'eq',value:target.record_type},
    {column:target.column,operator:'eq',value:target.id}
  ],returning:'default_theme_id,updated_at'});
  if(!rows.length)throw new Error('目前身份沒有此範圍的管理權限，或設定不存在');
  return rows[0];
}
