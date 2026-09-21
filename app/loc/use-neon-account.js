'use client';

import { useCallback, useEffect, useState } from 'react';
import { getNeonSession, neonClient, signInNeonWithGoogle, signOutNeon } from './neon-client';
import { migrateLegacyBrowserDataToNeon } from './neon-legacy-migration';

export const NEON_SCOPE_MANAGER_LEVELS = Object.freeze(['scope_manager','page_manager']);

async function readManagementGrants(user){
  if(!user?.id)return [];
  const {data,error}=await neonClient.from('scope_access_grants')
    .select('scope_id,access_level,case_id')
    .eq('user_id',String(user.id))
    .limit(100);
  if(error)throw new Error(error.message||'Neon management permission failed');
  return Array.isArray(data)?data:[];
}

export function useNeonAccount(){
  const [state,setState]=useState({loading:true,user:null,grants:[],canManage:false,permissionLoading:true,error:''});
  const refresh=useCallback(async()=>{
    try{
      const session=await getNeonSession();
      const user=session?.user||null;
      if(!user){
        setState({loading:false,user:null,grants:[],canManage:false,permissionLoading:false,error:''});
        return null;
      }
      setState(current=>({...current,loading:false,user,permissionLoading:true,error:''}));
      const grants=await readManagementGrants(user);
      const canManage=grants.some(grant=>NEON_SCOPE_MANAGER_LEVELS.includes(String(grant.access_level||'')));
      setState(current=>({...current,loading:false,user,grants,canManage,permissionLoading:false,error:''}));
      if(user)await migrateLegacyBrowserDataToNeon().catch(()=>{});
      return user;
    }catch(error){
      setState(current=>({...current,loading:false,grants:[],canManage:false,permissionLoading:false,error:String(error?.message||error)}));
      return null;
    }
  },[]);
  useEffect(()=>{refresh()},[refresh]);
  const signIn=useCallback(()=>signInNeonWithGoogle(typeof window!=='undefined'?window.location.href:'/'),[]);
  const signOut=useCallback(async()=>{await signOutNeon();setState({loading:false,user:null,grants:[],canManage:false,permissionLoading:false,error:''});},[]);
  return {...state,refresh,signIn,signOut};
}
