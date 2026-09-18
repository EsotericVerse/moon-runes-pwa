'use client';

import { createClient } from '@neondatabase/neon-js';

const DEFAULT_NEON_DATABASE_URL='https://ep-rapid-queen-b3oyboy6.c-4.ap-southeast-1.aws.neon.tech/neondb';

export function neonDatabaseUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_DATABASE_URL||DEFAULT_NEON_DATABASE_URL).trim().replace(/\/+$/,'');
}

export const neonClient=createClient(neonDatabaseUrl(),{
  auth:{allowAnonymous:true}
});

export async function getNeonSession(){
  const {data,error}=await neonClient.auth.getSession();
  if(error)throw new Error(error.message||'Neon session failed');
  return data?.session&&data?.user?data:null;
}

export async function signInNeonWithGoogle(callbackURL){
  const target=callbackURL||(typeof window!=='undefined'?window.location.href:'/');
  const {error}=await neonClient.auth.signIn.social({provider:'google',callbackURL:target});
  if(error)throw new Error(error.message||'Neon Google sign-in failed');
}

export async function signOutNeon(){
  const {error}=await neonClient.auth.signOut();
  if(error)throw new Error(error.message||'Neon sign-out failed');
}
