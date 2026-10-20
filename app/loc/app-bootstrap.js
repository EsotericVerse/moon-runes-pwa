'use client';

import {useQuery} from '@tanstack/react-query';
import {dbPublicClient} from './db-client.mjs';
import {selectScopeBlocks,selectScopeConfig,selectScopeRegistry} from './scope-data';
import {selectThemeRegistry} from './theme-data';

// ONE request per page. React Query dedupes every consumer that asks for the
// same (scopeId, pageName) under this one key, so the Scope Registry, NAV
// titles, Themes, the Scope's own configuration and that page's blocks arrive
// together instead of as separate round trips from the shell, the Theme menu,
// the NAV labels and the page's own editable blocks.
const SCOPE_ID=/^[a-z][a-z0-9]{0,14}$/;
const PAGE_NAME=/^[a-z0-9_-]+$/;
let bootstrapRpcInstalled=true;
const missingRpc=error=>['PGRST202','42883'].includes(String(error?.code||''));

export function appBootstrapKey(scopeId,pageName='index'){
  const id=String(scopeId||'').trim().toLowerCase();
  const page=String(pageName||'index').trim().toLowerCase();
  return ['app-bootstrap',SCOPE_ID.test(id)?id:'',PAGE_NAME.test(page)?page:'index'];
}

// Fallback while the database function is absent (for example on the backup
// database): the previous per-table reads, kept as the single alternative path.
async function legacyBootstrap(id,page){
  const [registry,themes,config,blocks]=await Promise.all([
    selectScopeRegistry().catch(()=>[]),
    selectThemeRegistry().catch(()=>[]),
    id?selectScopeConfig(id).catch(()=>null):Promise.resolve(null),
    id?selectScopeBlocks(id,page).catch(()=>[]):Promise.resolve([])
  ]);
  return {
    scope_id:id,page_name:page,config,blocks,registry,page_copy:[],
    theme_list:themes.map(row=>({theme_id:row.theme_id,theme_name:row.theme_name,theme_order:row.theme_order})),
    themes
  };
}

export async function selectAppBootstrap(scopeId,pageName='index'){
  const [,id,page]=appBootstrapKey(scopeId,pageName);
  if(bootstrapRpcInstalled){
    try{
      const {data,error}=await dbPublicClient.schema('silver').rpc('read_app_bootstrap',{p_scope_id:id,p_page_name:page});
      if(error)throw error;
      return {
        scope_id:String(data?.scope_id||id),
        page_name:String(data?.page_name||page),
        config:data?.config||null,
        blocks:Array.isArray(data?.blocks)?data.blocks:[],
        registry:Array.isArray(data?.registry)?data.registry:[],
        page_copy:Array.isArray(data?.page_copy)?data.page_copy:[],
        theme_list:Array.isArray(data?.theme_list)?data.theme_list:[],
        themes:Array.isArray(data?.themes)?data.themes:[]
      };
    }catch(error){
      if(!missingRpc(error))throw error;
      bootstrapRpcInstalled=false;
    }
  }
  return legacyBootstrap(id,page);
}

export function appBootstrapPageCopy(data,scopeId){
  const id=String(scopeId||'').trim().toLowerCase();
  const row=(data?.page_copy||[]).find(item=>String(item?.scope_id||'').trim().toLowerCase()===id);
  return row?{scope_id:id,Title_TW:String(row.Title_TW||'').trim(),Desc_TW:String(row.Desc_TW||'').trim()}:null;
}

export function useAppBootstrap(scopeId,pageName='index',{enabled=true}={}){
  const key=appBootstrapKey(scopeId,pageName);
  return useQuery({queryKey:key,queryFn:()=>selectAppBootstrap(scopeId,pageName),staleTime:60_000,enabled});
}
