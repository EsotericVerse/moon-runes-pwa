'use client';

import {useCallback,useEffect,useState} from 'react';
import {getNeonSession,signInNeonWithGoogle,signOutNeon} from './neon-client';

const OWNER_EMAIL='sopa2306@gmail.com';

function isOwner(user){
  return String(user?.email||'').trim().toLowerCase()===OWNER_EMAIL;
}

const emptyState={loading:true,user:null,grants:[],privileges:[],authorizer:null,canManage:false,permissionLoading:true,error:''};

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
      const canManage=isOwner(user);
      const email=String(user?.email||'').trim().toLowerCase();
      setState({
        loading:false,
        user,
        grants:canManage?[{user_id:String(user?.id||''),email,privileges:['admin']}]:[],
        privileges:canManage?['admin']:[],
        authorizer:null,
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
  const canManageScope=useCallback(async()=>state.canManage,[state.canManage]);
  const canManageGlobal=useCallback(async()=>state.canManage,[state.canManage]);
  return {...state,refresh,signIn,signOut,canManageScope,canManageGlobal};
}
