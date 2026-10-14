import {createKyselyEdgeClient} from './kysely-edge.mjs';

const DEFAULT_SUPABASE_URL='https://qlouywsdiiyiyzpoxyqy.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

// Neon remains a read-only LOC backup target. Its credentials stay in the
// Edge Function; browser requests never reach the Neon Data API directly.
export function createNeonPublicAdapter({
  url=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL,
  publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  fetchImpl=globalThis.fetch
}={}){
  const publicClient=createKyselyEdgeClient({url,publishableKey,role:'anon',target:'neon',fetch:fetchImpl});
  return {publicClient};
}
