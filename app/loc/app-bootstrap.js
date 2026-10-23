'use client';

import {useCallback,useEffect,useState} from 'react';
import {dbPublicClient} from './db-client.mjs';
import {invalidatePublicScopeMetadata,invalidatePublicThemeSnapshot,selectPublicSiteBootstrap,selectScopeBlocks,selectScopeConfig,selectScopeRegistry} from './scope-data';
import {selectThemeRegistry,themeUiId} from './theme-data';

// Share only identical in-flight/completed bootstrap reads, without a TTL.
// Reads change after explicit writes, not after a fixed number of seconds.
const bootstrapReads=new Map();
function clearBootstrapReads(scopeId='',page=''){
  const prefix=scopeId?'app-bootstrap|'+scopeId+'|':'';
  for(const key of bootstrapReads.keys()){
    if((!prefix||key.startsWith(prefix))&&(!page||key===prefix+page))bootstrapReads.delete(key);
  }
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('loc-bootstrap-refresh',{
    detail:{scopeId,page}
  }));
}
export function refreshAppBootstrap(scopeId='',page=''){
  clearBootstrapReads(scopeId,page);
}
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
  clearBootstrapReads();
}
export function invalidateAppBootstrapThemes(){
  locHomeSnapshotDelivered=false;
  invalidatePublicThemeSnapshot();
  clearBootstrapReads();
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
    id&&id!=='admin'?selectScopeConfig(id).catch(()=>null):Promise.resolve(null),
    id&&id!=='admin'&&page!=='culture'?selectScopeBlocks(id,page).catch(()=>[]):Promise.resolve([])
  ]);
  return {
    scope_id:id,page_name:page,config,blocks,registry,page_copy:[],
    theme_list:themes.map(row=>({theme_id:row.theme_id,theme_name:row.theme_name,theme_order:row.theme_order})),
    themes
  };
}

export async function selectAppBootstrap(scopeId,pageName='index',{configHint=null}={}){
  const [,id,page]=appBootstrapKey(scopeId,pageName);
  if(bootstrapRpcInstalled){
    try{
      // The site snapshot and this Scope's public Config/blocks are
      // independent reads. Start them together instead of waiting for the
      // Registry/Theme RPC before issuing the Scope requests (a waterfall).
      // LOC/index alone uses the blocks already returned by that RPC.
      const isLocHome=id==='loc'&&page==='index';
      const [site,scopeReads]=await Promise.all([
        selectPublicSiteBootstrap(),
        isLocHome?Promise.resolve(null):Promise.all([
          id&&id!=='loc'&&id!=='admin'
            ?(configHint?Promise.resolve(configHint):selectScopeConfig(id))
            :Promise.resolve(null),
          id&&id!=='admin'&&page!=='culture'?selectScopeBlocks(id,page):Promise.resolve([])
        ])
      ]);
      const [config,blocks]=isLocHome
        ?[site.config||null,
          locHomeSnapshotDelivered
            ?await selectScopeBlocks('loc','index')
            :Array.isArray(site.blocks)?site.blocks:[]]
        :[id==='loc'?site.config||null:scopeReads[0],scopeReads[1]];
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
  const [,id,page]=appBootstrapKey(scopeId,pageName);
  const key='app-bootstrap|'+id+'|'+page;
  const [state,setState]=useState({key:'',data:null,error:null,isPending:true});
  const reload=useCallback(()=>{
    clearBootstrapReads(id,page);
  },[id,page]);
  useEffect(()=>{
    if(!enabled)return undefined;
    let active=true;
    const run=()=>{
      setState(current=>current.key===key?{...current,isPending:true}:{key,data:null,error:null,isPending:true});
      let request=bootstrapReads.get(key);
      if(!request){
        request=selectAppBootstrap(id,page).catch(error=>{
          bootstrapReads.delete(key);
          throw error;
        });
        bootstrapReads.set(key,request);
      }
      request.then(data=>{
        if(active)setState({key,data,error:null,isPending:false});
      }).catch(error=>{
        if(active)setState({key,data:null,error,isPending:false});
      });
    };
    const onRefresh=event=>{
      const changed=event.detail||{};
      if((!changed.scopeId||changed.scopeId===id)&&(!changed.page||changed.page===page))run();
    };
    run();
    window.addEventListener('loc-bootstrap-refresh',onRefresh);
    return ()=>{
      active=false;
      window.removeEventListener('loc-bootstrap-refresh',onRefresh);
    };
  },[key,id,page,enabled]);
  const resolved=state.key===key?state:{key,data:null,error:null,isPending:true};
  return {...resolved,isSuccess:!resolved.isPending&&!resolved.error,
    isError:Boolean(resolved.error),refetch:reload};
}
