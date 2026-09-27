'use client';

import {NeonPostgrestClient} from '@neondatabase/postgrest-js';
import {createClient,SupabaseAuthAdapter} from '@neondatabase/neon-js';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';

export function neonDataApiUrl(){
  const configured=String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||process.env.NEXT_PUBLIC_NEON_DATABASE_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
  return configured.endsWith('/rest/v1')?configured:`${configured}/rest/v1`;
}

export function neonAuthUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_AUTH_URL||process.env.NEXT_PUBLIC_LOC_AUTH_URL||'').trim().replace(/\/+$/,'');
}

export function neonAuthConfigured(){
  return Boolean(neonAuthUrl());
}

// Public Canon reads must never depend on Neon Auth. The Data API's db_anon_role
// and RLS policies are the authority for unauthenticated read access.
export const neonPublicClient=new NeonPostgrestClient({
  dataApiUrl:neonDataApiUrl(),
  options:{db:{schema:'api'}}
});

// Auth is an optional management boundary. Do not create an auth-integrated
// database client until the production Auth endpoint is explicitly configured.
export const neonAuthClient=neonAuthConfigured()?createClient({
  auth:{
    adapter:SupabaseAuthAdapter(),
    url:neonAuthUrl()
  },
  dataApi:{
    url:neonDataApiUrl(),
    options:{db:{schema:'api'}}
  }
}):null;

// Compatibility name for public read callers. New code should prefer the
// explicit neonPublicClient / neonAuthClient exports.
export const neonClient=neonPublicClient;

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
