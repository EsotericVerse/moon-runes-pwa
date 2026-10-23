'use client';

import {useQuery} from '@tanstack/react-query';
import {dbPublicClient} from './db-client.mjs';
import {invalidatePublicScopeMetadata,selectPublicSiteBootstrap,selectScopeBlocks,selectScopeConfig,selectScopeRegistry} from './scope-data';
import {selectThemeRegistry,themeUiId} from './theme-data';

// Shared public site snapshot (Registry/Theme/page copy) is fetched once per
// client runtime. Each Scope page fetches only its own config and page blocks.
// React Query deduplicates consumers of the same (scopeId, pageName) key.
const SCOPE_ID=/^[a-z][a-z0-9]{0,14}$/;
const PAGE_NAME=/^[a-z0-9_-]+$/;
let bootstrapRpcInstalled=true;
// The site RPC already delivers LOC/index blocks on the first view. On later
// invalidations (e.g. a successful editor save), refresh only loc_blocks
// instead of repeating the public Registry/Theme/loc bootstrap.
let locHomeSnapshotDelivered=false;
// The public snapshot is long-lived until an explicit Admin Registry refresh.
export function invalidateAppBootstrapMetadata(){
  locHomeSnapshotDelivered=false;
  invalidatePublicScopeMetadata();
}
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
      const site=await selectPublicSiteBootstrap();
      // The LOC homepage is the site snapshot itself. Other pages do not
      // repeat its silver.loc Registry/page-copy/Theme reads.
      const isLocHome=id==='loc'&&page==='index';
      const [config,blocks]=isLocHome
        ?[site.config||null,
          locHomeSnapshotDelivered
            ?await selectScopeBlocks('loc','index')
            :Array.isArray(site.blocks)?site.blocks:[]]
        :await Promise.all([
          id?(id==='loc'?Promise.resolve(site.config||null):selectScopeConfig(id)):Promise.resolve(null),
          id?selectScopeBlocks(id,page):Promise.resolve([])
        ]);
      if(isLocHome)locHomeSnapshotDelivered=true;
      return {
        scope_id:id,
        page_name:page,
        config,
        blocks,
        registry:Array.isArray(site.registry)?site.registry:[],
        page_copy:Array.isArray(site.page_copy)?site.page_copy:[],
        // Site Themes use numeric IDs in PostgreSQL and theme-N in the UI.
        theme_list:(Array.isArray(site.theme_list)?site.theme_list:[]).map(row=>({...row,theme_id:themeUiId(row.theme_id)})),
        themes:(Array.isArray(site.themes)?site.themes:[]).map(row=>({...row,theme_id:themeUiId(row.theme_id)}))
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
