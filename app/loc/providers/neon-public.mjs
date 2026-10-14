import {createKyselyEdgeClient} from './kysely-edge.mjs';

const DEFAULT_SUPABASE_URL='https://qlouywsdiiyiyzpoxyqy.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

export function createBackupPublicAdapter({
  url=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL,
  publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  fetchImpl=globalThis.fetch
}={}){
  const publicClient=createKyselyEdgeClient({url,publishableKey,role:'anon',target:'backup',fetch:fetchImpl});
  return {publicClient};
}
