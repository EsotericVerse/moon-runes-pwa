'use client';

import {useCallback,useEffect,useState} from 'react';
import {z} from 'zod';
import {getAccountSession,dbAuthRelation,signInWithGoogle,signOutAccount} from './db-client.mjs';
import {defaultScopeData,scopeDataFromManageRows} from './scope-data';

const EmailSchema=z.string().trim().toLowerCase().email();
const ManageRoleSchema=z.enum(['admin','scope']);

function normalizeAuthEmail(value){
  const parsed=EmailSchema.safeParse(String(value||'').trim().toLowerCase());
  return parsed.success?parsed.data:'';
}
function normalizeScopeId(value){
  return String(value||'').trim();
}
function normalizeManageRole(value){
  const parsed=ManageRoleSchema.safeParse(String(value||'').trim());
  return parsed.success?parsed.data:'';
}
function createScopeAuthorizer(user,permissionRows=[]){
  const email=normalizeAuthEmail(user?.email);
  const permissions=(Array.isArray(permissionRows)?permissionRows:[]).flatMap(row=>{
    const rowEmail=normalizeAuthEmail(row?.email);
    const role=normalizeManageRole(row?.role);
    const id=normalizeScopeId(row?.id);
    if(!email||rowEmail!==email||!role||!id)return [];
    return [{id,email:rowEmail,role}];
  });
  const admin=permissions.some(row=>row.role==='admin');
  const scopes=new Set(permissions.filter(row=>row.role==='scope').map(row=>row.id));
  return Object.freeze({
    email,
    role:admin?'admin':(scopes.size?'scope':''),
    scopeIds:Object.freeze([...scopes].sort()),
    canManageGlobalSync:()=>admin,
    canManageScopeSync:scopeId=>admin||scopes.has(normalizeScopeId(scopeId))
  });
}

const emptyState={
  loading:true,user:null,email:'',role:'',authorizer:null,
  permissionLoading:true,error:'',scopes:[]
};

export function useAccount(){
  const [state,setState]=useState(emptyState);

  const refresh=useCallback(async()=>{
    try{
      const session=await getAccountSession();
      const user=session?.user||null;
      if(!user){
        setState({...emptyState,loading:false,permissionLoading:false});
        return null;
      }

      const email=normalizeAuthEmail(user?.email);
      let permissions=[];
      if(email){
        const {data,error}=await dbAuthRelation('silver.manage')
          .select('id,email,role,galaxy,time,birthday')
          .eq('email',email);
        if(error)throw new Error(error.message||'Management permission read failed');
        permissions=data||[];
      }
      const authorizer=createScopeAuthorizer(user,permissions);
      const scopes=scopeDataFromManageRows(permissions);
      setState({
        loading:false,
        user,
        email:authorizer.email,
        role:authorizer.role,
        authorizer,
        scopes,
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

  const signIn=useCallback(callbackURL=>signInWithGoogle(String(callbackURL||'').trim()),[]);
  const signOut=useCallback(async()=>{
    await signOutAccount();
    setState({...emptyState,loading:false,permissionLoading:false});
  },[]);
  const canManageScopeSync=useCallback(
    scopeId=>Boolean(state.authorizer?.canManageScopeSync(scopeId)),
    [state.authorizer]
  );
  const canManageGlobalSync=useCallback(
    ()=>Boolean(state.authorizer?.canManageGlobalSync()),
    [state.authorizer]
  );
  const scopeDataFor=useCallback(scopeId=>{
    const id=normalizeScopeId(scopeId);
    return state.scopes.find(scope=>scope.id===id)
      ||(state.authorizer?.canManageGlobalSync()?defaultScopeData(id):null);
  },[state.authorizer,state.scopes]);

  return {
    ...state,refresh,signIn,signOut,
    canManageScopeSync,canManageGlobalSync,scopeDataFor
  };
}
