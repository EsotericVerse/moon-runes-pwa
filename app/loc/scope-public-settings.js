'use client';

import {neonClient} from './neon-client';

export async function getScopeContact(scope){
  try{
    const {data,error}=await neonClient.from('scope_contacts')
      .select('scope_id,contact_label,contact_email,updated_at')
      .eq('scope_id',scope)
      .limit(1);
    if(error)return null;
    return data?.[0]||null;
  }catch{
    return null;
  }
}

export async function getScopeThemeDefault(scope){
  try{
    const {data,error}=await neonClient.from('scope_theme_defaults')
      .select('scope_id,mode,theme,custom,schedule,updated_at')
      .eq('scope_id',scope)
      .limit(1);
    if(error)return null;
    return data?.[0]||null;
  }catch{
    return null;
  }
}
