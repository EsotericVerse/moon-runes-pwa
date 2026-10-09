// Build-time source of the public page copy. Same DB RPC as AppShell at runtime.
// These are publishable metadata fields only; silver.manage remains private.
import {createSupabaseAdapter} from '../loc/providers/supabase.mjs';

const loads=new Map();
export function readScopePageCopy(scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(id))throw new Error('Invalid page-copy Scope ID');
  if(!loads.has(id)){
    const request=(async()=>{
      const client=createSupabaseAdapter().publicClient;
      const {data,error}=await client.schema('silver').rpc('read_scope_page_copy',{p_scope_id:id});
      if(error)throw new Error('Scope page copy '+id+': '+error.message);
      const row=Array.isArray(data)?data[0]:data;
      const title=String(row?.Title_TW||'').trim();
      const desc=String(row?.Desc_TW||'').trim();
      if(!title||!desc)throw new Error('Scope page copy is incomplete: '+id);
      return {Title_TW:title,Desc_TW:desc};
    })().catch(error=>{loads.delete(id);throw error;});
    loads.set(id,request);
  }
  return loads.get(id);
}
