'use client';

import { createAuthClient } from 'better-auth/react';

function authBaseUrl(){
  return String(process.env.NEXT_PUBLIC_LOC_AUTH_URL || '').trim().replace(/\/+$/,'');
}

export function managementAuthConfigured(){
  return Boolean(authBaseUrl());
}

export const authClient = createAuthClient({
  baseURL: authBaseUrl() || undefined,
  fetchOptions: {
    credentials: 'include'
  }
});

export async function signInManagementWithGoogle(callbackURL = '/admin'){
  if(!managementAuthConfigured()) throw new Error('尚未設定 NEXT_PUBLIC_LOC_AUTH_URL');
  const resolvedCallbackURL = typeof window !== 'undefined'
    ? new URL(callbackURL, window.location.origin).toString()
    : callbackURL;
  return authClient.signIn.social({
    provider: 'google',
    callbackURL: resolvedCallbackURL
  });
}

export async function signOutManagement(){
  if(!managementAuthConfigured()) return;
  return authClient.signOut();
}

export async function managementRequest(path,{method='GET',body}={}){
  if(!managementAuthConfigured()) throw new Error('尚未設定 NEXT_PUBLIC_LOC_AUTH_URL');
  const normalized=`/${String(path||'').replace(/^\/+/, '')}`;
  const verb=String(method||'GET').toUpperCase();
  const response=await fetch(`${authBaseUrl()}/management${normalized}`,{
    method:verb,
    credentials:'include',
    headers:{
      accept:'application/json',
      ...(body===undefined?{}:{'content-type':'application/json'})
    },
    body:body===undefined?undefined:JSON.stringify(body),
    cache:'no-store'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.error||`management_request_failed:${response.status}`);
  return data;
}

export async function getManagementSession(){
  if(!managementAuthConfigured()) return null;
  const response=await fetch(`${authBaseUrl()}/management/session`,{
    method:'GET',credentials:'include',headers:{accept:'application/json'},cache:'no-store'
  });
  if(response.status===401)return null;
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false)throw new Error(data?.error||`management_session_failed:${response.status}`);
  return data?.authorized?data:null;
}

export function managementHasPermission(session, permission){
  if(!session?.authorized) return false;
  const permissions = Array.isArray(session?.permissions) ? session.permissions : [];
  return permissions.includes('platform:admin') || permissions.includes(String(permission || ''));
}

export async function managementStateRequest(path,{method='GET',body}={}){
  const normalized = `/${String(path || '').replace(/^\/+/, '')}`;
  if(!['/aliases','/visibility','/projection-rebuild','/eras','/daily-runes','/context'].includes(normalized)) throw new Error('management_state_path_not_allowed');
  const verb = String(method || 'GET').toUpperCase();
  if(!['GET','POST','PUT','DELETE'].includes(verb)) throw new Error('management_state_method_not_allowed');
  return managementRequest(`/state${normalized}`,{method:verb,body});
}

export async function managementStateWrite(path,{method='POST',body}={}){
  return managementStateRequest(path,{method,body});
}

export async function runSemanticObserver(payload){
  return managementRequest('/semantic/analyze',{method:'POST',body:payload});
}

export async function getNeonGovernanceStatus(){
  return managementRequest('/neon/status');
}
