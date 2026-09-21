'use client';

import { useCallback, useEffect, useState } from 'react';
import { getNeonSession, signInNeonWithGoogle, signOutNeon } from './neon-client';
export function useNeonAccount(){
  const [state,setState]=useState({loading:true,user:null,error:''});
  const refresh=useCallback(async()=>{
    try{
      const session=await getNeonSession();
      const user=session?.user||null;
      setState({loading:false,user,error:''});
      return user;
    }catch(error){
      setState({loading:false,user:null,error:String(error?.message||error)});
      return null;
    }
  },[]);
  useEffect(()=>{refresh()},[refresh]);
  const signIn=useCallback(()=>signInNeonWithGoogle(typeof window!=='undefined'?window.location.href:'/'),[]);
  const signOut=useCallback(async()=>{await signOutNeon();setState({loading:false,user:null,error:''});},[]);
  const canManage=Boolean(state.user&&(state.user.role==='admin'||state.user.role==='owner'));
  return {...state,canManage,refresh,signIn,signOut};
}
