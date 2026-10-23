'use client';

import {useCallback,useEffect,useState} from 'react';
import {z} from 'zod';
import {getAccountSession,dbAuthRelation,isCurrentEmailBlocklisted,signInWithGoogle,signOutAccount} from './db-client.mjs';
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

export function useAccount({enabled=true,sessionOnly=false}={}){
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
      // Personalized navigation needs only a session. Management authorization
      // is intentionally deferred until the protected route or edit action.
      if(sessionOnly){
        setState({...emptyState,loading:false,permissionLoading:false,user,email});
        return user;
      }
      // Deny globally before assigning any scope/admin management role.
      if(await isCurrentEmailBlocklisted()){
        await signOutAccount();
        setState({...emptyState,loading:false,permissionLoading:false,error:'此帳號已列入系統黑名單，無法登入 LOC 管理功能。'});
        return null;
      }
      let permissions=[];
      if(email){
        // silver.manage 已停用：登入權限改由 silver.loc 的 manage_email/manage_role
        // 欄位判斷（main index table），回傳形狀跟舊版 silver.manage 查詢完全相同，
        // 呼叫端（createScopeAuthorizer / scopeDataFromManageRows）不需要改動。
        const {data,error}=await dbAuthRelation('silver.loc')
          .select('id,email:manage_email,role:manage_role,galaxy:galaxy_table,time:time_table,birthday')
          .eq('manage_email',email);
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
      return {user,authorizer};
    }catch(error){
      setState({...emptyState,loading:false,permissionLoading:false,error:String(error?.message||error)});
      return null;
    }
  },[sessionOnly]);

  useEffect(()=>{if(enabled)refresh()},[enabled,refresh]);

  const signIn=useCallback(callbackURL=>signInWithGoogle(String(callbackURL||'').trim()),[]);
  const signOut=useCallback(async()=>{
    await signOutAccount();
    setState({...emptyState,loading:false,permissionLoading:false});
  },[]);
  // `local` is the hidden, device-only Scope (see scope-registry.js /
  // providers/local-sqlite.mjs): its data never reaches Supabase, so the
  // normal cloud manage-role check neither applies nor can ever pass for it
  // (it has no row in silver.loc, and must stay usable without any sign-in
  // at all -- that's the point of a private, on-device import). It is
  // always "managed" by whoever is physically using this device/browser.
  const canManageScopeSync=useCallback(
    scopeId=>normalizeScopeId(scopeId)==='local'||Boolean(state.authorizer?.canManageScopeSync(scopeId)),
    [state.authorizer]
  );
  const canManageGlobalSync=useCallback(
    ()=>Boolean(state.authorizer?.canManageGlobalSync()),
    [state.authorizer]
  );
  const scopeDataFor=useCallback(scopeId=>{
    const id=normalizeScopeId(scopeId);
    if(id==='local')return defaultScopeData('local');
    return state.scopes.find(scope=>scope.id===id)
      ||(state.authorizer?.canManageGlobalSync()?defaultScopeData(id):null);
  },[state.authorizer,state.scopes]);

  return {
    ...state,refresh,signIn,signOut,
    canManageScopeSync,canManageGlobalSync,scopeDataFor
  };
}
