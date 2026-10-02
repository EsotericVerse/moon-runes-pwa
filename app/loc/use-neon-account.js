'use client';

import {useCallback,useEffect,useState} from 'react';
import {getNeonSession,neonAuthRelation,signInNeonWithGoogle,signOutNeon} from './neon-client';
import {createScopeAuthorizer,normalizeAuthEmail} from './scope-authorization';

const emptyState={
  loading:true,user:null,email:'',role:'',authorizer:null,
  permissionLoading:true,error:''
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

      const email=normalizeAuthEmail(user?.email);
      let permissions=[];
      if(email){
        const {data,error}=await neonAuthRelation('silver.manage')
          .select('id,email,role')
          .eq('email',email);
        if(error)throw new Error(error.message||'Neon manage permission read failed');
        permissions=data||[];
      }
      const authorizer=createScopeAuthorizer(user,permissions);
      setState({
        loading:false,
        user,
        email:authorizer.email,
        role:authorizer.role,
        authorizer,
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
