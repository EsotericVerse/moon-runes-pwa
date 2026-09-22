'use client';

import {createClient,SupabaseAuthAdapter} from '@neondatabase/neon-js';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const DEFAULT_NEON_AUTH_URL='https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

export function neonDataApiUrl(){
  const configured=String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||process.env.NEXT_PUBLIC_NEON_DATABASE_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
  return configured.endsWith('/rest/v1')?configured:`${configured}/rest/v1`;
}

export function neonAuthUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_AUTH_URL||process.env.NEXT_PUBLIC_LOC_AUTH_URL||DEFAULT_NEON_AUTH_URL).trim().replace(/\/+$/,'');
}

export const neonClient=createClient({
  auth:{
    adapter:SupabaseAuthAdapter(),
    url:neonAuthUrl(),
    allowAnonymous:true
  },
  dataApi:{
    url:neonDataApiUrl(),
    options:{db:{schema:'api'}}
  }
});

export async function getNeonSession(){
  const {data,error}=await neonClient.auth.getSession();
  if(error)throw new Error(error.message||'Neon session failed');
  const session=data?.session||null;
  return session?.user?{session,user:session.user}:null;
}

export async function signInNeonWithGoogle(callbackURL){
  const target=callbackURL||(typeof window!=='undefined'?window.location.href:'/');
  const {error}=await neonClient.auth.signInWithOAuth({provider:'google',options:{redirectTo:target}});
  if(error)throw new Error(error.message||'Neon Google sign-in failed');
}

export async function signOutNeon(){
  const {error}=await neonClient.auth.signOut();
  if(error)throw new Error(error.message||'Neon sign-out failed');
}
