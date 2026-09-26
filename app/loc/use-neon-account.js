'use client';

import {useCallback,useEffect,useState} from 'react';
import {getNeonSession,signInNeonWithGoogle,signOutNeon} from './neon-client';
import {createScopeAuthorizer} from './scope-authorization';

const emptyState={
  loading:true,user:null,email:'',role:'',privileges:[],authorizer:null,
  canManage:false,permissionLoading:true,error:''
};

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

      const authorizer=createScopeAuthorizer(user);
      const canManage=Boolean(authorizer.role);
      setState({
        loading:false,
        user,
        email:authorizer.email,
        role:authorizer.role,
        privileges:authorizer.privileges,
        authorizer,
        canManage,
        permissionLoading:false,
        error:''
      });
      return user;
    }catch(error){
      setState({...emptyState,loading:false,permissionLoading:false,error:String(error?.message||error)});
      return null;
    }
  },[]);

  useEffect(()=>{refresh()},[refresh]);

  const signIn=useCallback(()=>signInNeonWithGoogle(typeof window!=='undefined'?window.location.href:'/'),[]);
  const signOut=useCallback(async()=>{
    await signOutNeon();
    setState({...emptyState,loading:false,permissionLoading:false});
  },[]);

  const canManageScope=useCallback(
    async scopeId=>Boolean(state.authorizer?.canManageScopeSync(scopeId)),
    [state.authorizer]
  );
  const canManageGlobal=useCallback(
    async()=>Boolean(state.authorizer?.canManageGlobalSync()),
    [state.authorizer]
  );
  const canManageScopeSync=useCallback(
    scopeId=>Boolean(state.authorizer?.canManageScopeSync(scopeId)),
    [state.authorizer]
  );
  const canManageGlobalSync=useCallback(
    ()=>Boolean(state.authorizer?.canManageGlobalSync()),
    [state.authorizer]
  );

  return {
    ...state,refresh,signIn,signOut,
    canManageScope,canManageGlobal,canManageScopeSync,canManageGlobalSync
  };
}
