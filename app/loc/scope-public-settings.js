'use client';

import {selectNeonRows} from './neon-repository';

export async function getScopeContact(scope){
  try{
    const {rows}=await selectNeonRows('api.scope_contacts',{columns:'scope_id,contact_label,contact_email,updated_at',filters:[{column:'scope_id',operator:'eq',value:scope}],limit:1});
    return rows[0]||null;
  }catch{
    return null;
  }
}

export async function getScopeThemeDefault(scope){
  try{
    const {rows}=await selectNeonRows('api.scope_theme_defaults',{columns:'scope_id,mode,theme,custom,schedule,updated_at',filters:[{column:'scope_id',operator:'eq',value:scope}],limit:1});
    return rows[0]||null;
  }catch{
    return null;
  }
}
