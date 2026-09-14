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

export async function signInManagementWithGoogle(callbackURL = '/governance'){
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
  const result = await authClient.getSession();
  return result?.data || null;
}
