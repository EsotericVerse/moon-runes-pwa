import {createClient} from '@supabase/supabase-js';

export const LOC_ISR_SECONDS=1209600;
export const LOC_PUBLIC_CACHE_TAG='loc-public-metadata';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://qlouywsdiiyiyzpoxyqy.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

export function createPublicSupabaseClient(){
  return createClient(SUPABASE_URL,SUPABASE_KEY,{
    db:{schema:'silver'},
    auth:{persistSession:false,autoRefreshToken:false}
  });
}

export async function readPublicScopeConfig(scopeId){
  const client=createPublicSupabaseClient();
  const {data,error}=await client.from(scopeId)
    .select('id,display_name,search_intro,search_aliases,theme,locale,search_able,statistics_able,culture_able')
    .eq('id',scopeId).limit(1).maybeSingle();
  if(error)throw error;
  return data||null;
}

export async function readPublicScopeBlocks(scopeId,pageName){
  const client=createPublicSupabaseClient();
  const {data,error}=await client.from(`${scopeId}_blocks`)
    .select('uid,page_name,block_eyebrow,block_title,block_subtitle,block_text,block_order,block_entity,block_image')
    .eq('page_name',pageName).order('block_order',{ascending:true}).range(0,65534);
  if(error)throw error;
  return data||[];
}

export function validScopeId(value){
  return /^[a-z][a-z0-9]{0,14}$/.test(String(value||''));
}

export function validPageName(value){
  return /^[a-z0-9_-]+$/.test(String(value||''));
}
