'use client';

import {createClient,SupabaseAuthAdapter} from '@neondatabase/neon-js';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const DEFAULT_NEON_PUBLIC_READ_URL='https://br-restless-salad-b38eyn0q-locpublic.compute.c-4.ap-southeast-1.aws.neon.tech/';

export function neonDataApiUrl(){
  const configured=String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
  return configured.endsWith('/rest/v1')?configured:`${configured}/rest/v1`;
}

export function neonPublicReadUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_PUBLIC_READ_URL||DEFAULT_NEON_PUBLIC_READ_URL).trim().replace(/\/+$/,'')+'/';
}

export function neonAuthUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_AUTH_URL||process.env.NEXT_PUBLIC_LOC_AUTH_URL||'').trim().replace(/\/+$/,'');
}

export function neonAuthConfigured(){
  return Boolean(neonAuthUrl());
}

export const neonAuthClient=neonAuthConfigured()?createClient({
  auth:{adapter:SupabaseAuthAdapter(),url:neonAuthUrl()},
  dataApi:{url:neonDataApiUrl(),options:{db:{schema:'api'}}}
}):null;

export async function getNeonSession(){
  if(!neonAuthClient)return null;
  const {data,error}=await neonAuthClient.auth.getSession();
  if(error)throw new Error(error.message||'Neon session failed');
  const session=data?.session||null;
  return session?.user?{session,user:session.user}:null;
}

export async function signInNeonWithGoogle(callbackURL){
  if(!neonAuthClient)throw new Error('Production Neon Auth 尚未啟用。');
  const target=callbackURL||(typeof window!=='undefined'?window.location.href:'/');
  const {error}=await neonAuthClient.auth.signInWithOAuth({provider:'google',options:{redirectTo:target}});
  if(error)throw new Error(error.message||'Neon Google sign-in failed');
}

export async function signOutNeon(){
  if(!neonAuthClient)return;
  const {error}=await neonAuthClient.auth.signOut();
  if(error)throw new Error(error.message||'Neon sign-out failed');
}
