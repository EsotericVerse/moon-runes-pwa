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
