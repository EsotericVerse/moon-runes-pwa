'use client';

import {useCallback,useEffect,useState} from 'react';
import {getNeonSession,signInNeonWithGoogle,signOutNeon} from './neon-client';
import {selectNeonRows} from './neon-repository';
import {createScopeAuthorizer} from './scope-authorization';

async function readManagementPermissions(user){
  const email=String(user?.email||'').trim();
  if(!email)return [];

  const {rows}=await selectNeonRows('silver.manage',{
    columns:'user_id,email,privileges',
    filters:[
      {column:'record_type',operator:'eq',value:'permission'},
      {column:'email',operator:'eq',value:email}
    ],
    limit:1
  });
  return rows;
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
      setState(current=>({...current,loading:false,user,permissionLoading:true,error:''}));
      const permissions=await readManagementPermissions(user);
      const authorizer=await createScopeAuthorizer(permissions);
      const privileges=authorizer.privileges||[];
      setState({
        loading:false,user,grants:permissions,privileges,authorizer,
        canManage:privileges.length>0,permissionLoading:false,error:''
      });
      return user;
    }catch(error){
      setState(current=>({...current,loading:false,grants:[],privileges:[],authorizer:null,canManage:false,permissionLoading:false,error:String(error?.message||error)}));
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
  const canManageGlobal=useCallback(async()=>{
    if(!state.authorizer)return false;
    try{return Boolean(await state.authorizer.canManageGlobal())}catch{return false}
  },[state.authorizer]);
  return {...state,refresh,signIn,signOut,canManageScope,canManagePage,canManageGlobal};
}
