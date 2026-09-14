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

export async function signInManagementWithGoogle(callbackURL = '/management'){
  if(!managementAuthConfigured()) throw new Error('尚未設定 NEXT_PUBLIC_LOC_AUTH_URL');
  return authClient.signIn.social({
    provider: 'google',
    callbackURL
  });
}

export async function signOutManagement(){
  if(!managementAuthConfigured()) return;
  return authClient.signOut();
}

export async function getManagementSession(){
  if(!managementAuthConfigured()) return null;
  const response = await fetch(`${authBaseUrl()}/management/session`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      accept: 'application/json'
    },
    cache: 'no-store'
  });
  if(response.status === 401) return null;
  if(!response.ok) throw new Error(`management_session_failed:${response.status}`);
  const data = await response.json();
  return data?.authorized ? data : null;
}

export async function managementStateWrite(path, { method='POST', body } = {}){
  if(!managementAuthConfigured()) throw new Error('尚未設定 NEXT_PUBLIC_LOC_AUTH_URL');
  const normalized = `/${String(path || '').replace(/^\/+/, '')}`;
  if(!['/eras','/daily-runes','/context'].includes(normalized)) throw new Error('management_state_path_not_allowed');
  const verb = String(method || 'POST').toUpperCase();
  if(!['POST','PUT','DELETE'].includes(verb)) throw new Error('management_state_method_not_allowed');

  const response = await fetch(`${authBaseUrl()}/management/state${normalized}`, {
    method: verb,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok || data?.ok === false) throw new Error(data?.error || `management_state_failed:${response.status}`);
  return data;
}
