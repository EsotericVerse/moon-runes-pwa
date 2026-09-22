'use client';

import {useCallback,useEffect,useState} from 'react';
import {getNeonSession,neonClient,signInNeonWithGoogle,signOutNeon} from './neon-client';
import {migrateLegacyBrowserDataToNeon} from './neon-legacy-migration';
import {createScopeAuthorizer} from './scope-authorization';

export const NEON_SCOPE_MANAGER_LEVELS=Object.freeze(['scope_manager','page_manager']);

async function readManagementGrants(user){
  if(!user?.id)return [];
  const {data,error}=await neonClient.from('scope_access_grants')
    .select('scope_id,access_level,case_id')
    .eq('user_id',String(user.id))
    .limit(100);
  if(error)throw new Error(error.message||'Neon 管理權限查詢失敗');
  return Array.isArray(data)?data:[];
}

const emptyState={loading:true,user:null,grants:[],authorizer:null,canManage:false,permissionLoading:true,error:''};

export function useNeonAccount(){
  const [state,setState]=useState(emptyState);
  const refresh=useCallback(async()=>{
    try{
      const session=await getNeonSession();
      const user=session?.user||null;
      if(!user){
        setState({...emptyState,loading:false,permissionLoading:false});
        return null;
      }
      setState(current=>({...current,loading:false,user,permissionLoading:true,error:''}));
      const grants=await readManagementGrants(user);
      const authorizer=await createScopeAuthorizer(user.id,grants);
      const canManage=grants.some(grant=>NEON_SCOPE_MANAGER_LEVELS.includes(grant.access_level));
      setState({loading:false,user,grants,authorizer,canManage,permissionLoading:false,error:''});
      await migrateLegacyBrowserDataToNeon().catch(()=>{});
      return user;
    }catch(error){
      setState(current=>({...current,loading:false,grants:[],authorizer:null,canManage:false,permissionLoading:false,error:String(error?.message||error)}));
      return null;
    }
  },[]);
  useEffect(()=>{refresh()},[refresh]);
  const signIn=useCallback(()=>signInNeonWithGoogle(typeof window!=='undefined'?window.location.href:'/'),[]);
  const signOut=useCallback(async()=>{
    await signOutNeon();
    setState({...emptyState,loading:false,permissionLoading:false});
  },[]);
  const canManageScope=useCallback(async(scopeId)=>{
    if(!state.authorizer||!scopeId)return false;
    try{return Boolean(await state.authorizer.canManageScope(scopeId))}catch{return false}
  },[state.authorizer]);
  const canManagePage=useCallback(async(scopeId,pageId)=>{
    if(!state.authorizer||!scopeId||!pageId)return false;
    try{return Boolean(await state.authorizer.canManagePage(scopeId,pageId))}catch{return false}
  },[state.authorizer]);
  return {...state,refresh,signIn,signOut,canManageScope,canManagePage};
}
