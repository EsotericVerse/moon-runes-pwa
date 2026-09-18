'use client';

import {neonClient} from './neon-client';

export async function getScopeContact(scope){
  const {data,error}=await neonClient.from('scope_contacts')
    .select('scope_id,contact_label,contact_email,updated_at')
    .eq('scope_id',scope)
    .limit(1);
  if(error)throw new Error(error.message||'Scope contact read failed');
  return data?.[0]||null;
}

export async function getScopeThemeDefault(scope){
  const {data,error}=await neonClient.from('scope_theme_defaults')
    .select('scope_id,mode,theme,custom,schedule,updated_at')
    .eq('scope_id',scope)
    .limit(1);
  if(error)throw new Error(error.message||'Scope theme default read failed');
  return data?.[0]||null;
}
