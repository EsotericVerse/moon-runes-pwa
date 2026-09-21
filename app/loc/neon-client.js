'use client';

import { createClient } from '@neondatabase/neon-js';

const DEFAULT_NEON_DATABASE_URL='https://ep-rapid-queen-b3oyboy6.c-4.ap-southeast-1.aws.neon.tech/neondb';

export function neonDatabaseUrl(){
  return String(process.env.NEXT_PUBLIC_NEON_DATABASE_URL||DEFAULT_NEON_DATABASE_URL).trim().replace(/\/+$/,'');
}

export const neonClient=createClient(neonDatabaseUrl());

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

export async function readNeonOrPublicFallback(queryPromise,fallbackPath){
  let original={data:[],error:null};
  try{
    const result=await queryPromise;
    if(!result?.error)return result;
    original=result;
  }catch(error){
    original={data:[],error:{message:error?.message||String(error)}};
  }
  try{
    const response=await fetch(fallbackPath,{cache:'no-store'});
    if(!response.ok)return original;
    const payload=await response.json();
    const rows=Array.isArray(payload)?payload:(Array.isArray(payload?.rows)?payload.rows:[]);
    return {data:rows,error:null,fallback:true};
  }catch{
    return original;
  }
}
