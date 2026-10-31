// Clerk is the sole interactive identity in this opt-in mode. Existing
// Supabase SQL remains the primary data source until Neon schema is ready.
// All private writes go through Kysely with verified Clerk JWT and DB RLS.
import {createClerkAccountAdapter} from '../auth/clerk-browser.mjs';
import {createKyselyEdgeClient} from './kysely-edge.mjs';
import {createSupabaseAdapter} from './supabase.mjs';

const FALLBACK_AUTHORITY='https://loc-authority-control.sopa2306.workers.dev';
const DEFAULT_SUPABASE_URL='https://qlouywsdiiyiyzpoxyqy.supabase.co';
const DEFAULT_PUBLISHABLE_KEY='sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

export function createClerkGatewayAdapter({
  authorityUrl=process.env.NEXT_PUBLIC_LOC_CONTROL_URL||FALLBACK_AUTHORITY,
  url=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL,
  publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_PUBLISHABLE_KEY,
  fetchImpl=globalThis.fetch
}={}){
  const {auth,getAccessToken}=createClerkAccountAdapter({
    authorityOrigin:authorityUrl,fetchImpl
  });
  const legacy=createSupabaseAdapter({url,publishableKey,fetchImpl});
  const edge=createKyselyEdgeClient({
    url,publishableKey,role:'authenticated',target:'configured',
    gatewayUrl:String(url).replace(/\/+$/,'')+'/functions/v1/loc-kysely-clerk',
    getAccessToken,fetch:fetchImpl
  });
  return {
    publicClient:legacy.publicClient,
    authClient:edge,auth,
    configuredPublicClient:legacy.configuredPublicClient,
    backupPublicClient:null,
    realtimeClient:legacy.realtimeClient,
    primarySourceLabel:'Supabase SQL · Clerk 身分',
    backupSourceLabel:''
  };
}
