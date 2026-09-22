'use client';

import {createClient} from '@neondatabase/neon-js';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const DEFAULT_NEON_AUTH_URL='https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

function cleanUrl(value,fallback){return String(value||fallback).trim().replace(/\/+$/,'');}
export function neonDataApiUrl(){return cleanUrl(process.env.NEXT_PUBLIC_NEON_DATA_API_URL,DEFAULT_NEON_DATA_API_URL);}
export function neonAuthUrl(){return cleanUrl(process.env.NEXT_PUBLIC_NEON_AUTH_URL,DEFAULT_NEON_AUTH_URL);}

export const neonClient=createClient({
  auth:{url:neonAuthUrl(),allowAnonymous:true},
  dataApi:{url:neonDataApiUrl(),options:{db:{schema:'api'}}}
});

let sessionCache=null;
let sessionPromise=null;

export async function getNeonSession({force=false}={}){
  if(!force&&sessionCache)return sessionCache;
  if(!force&&sessionPromise)return sessionPromise;
  sessionPromise=neonClient.auth.getSession().then(result=>{
    if(result?.error)throw new Error(result.error.message||'Neon session failed');
    sessionCache=result?.data||null;
    return sessionCache;
  }).finally(()=>{sessionPromise=null;});
  return sessionPromise;
}

export async function signInNeonWithGoogle(callbackURL){
  const target=callbackURL||(typeof window!=='undefined'?window.location.href:'/');
  const result=await neonClient.auth.signIn.social({provider:'google',callbackURL:target});
  if(result?.error)throw new Error(result.error.message||'Neon Google sign-in failed');
  return result;
}

export async function signOutNeon(){
  const result=await neonClient.auth.signOut();
  if(result?.error)throw new Error(result.error.message||'Neon sign-out failed');
  sessionCache=null;
}

// Compatibility wrapper retained for callers during the cutover. It never falls back to a local file.
export async function readNeonOrPublicFallback(queryInput){
  const result=await (typeof queryInput==='function'?queryInput():queryInput);
  if(result?.error)throw new Error(result.error.message||'Neon SELECT failed');
  return result;
}

