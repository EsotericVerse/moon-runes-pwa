import {createClient} from '@supabase/supabase-js';
import {revalidateTag} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../_cors';
const LOC_NUMERIC_CACHE_TAG='loc-numeric-summaries-v1';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://qlouywsdiiyiyzpoxyqy.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvG-pLVV';

export async function POST(request){
  const token=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return withLocCors(Response.json({error:'Authentication required'},{status:401}),request,{methods:'POST, OPTIONS'});
  const client=createClient(SUPABASE_URL,SUPABASE_KEY,{
    db:{schema:'silver'},
    global:{headers:{Authorization:`Bearer ${token}`}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:authData,error:authError}=await client.auth.getUser(token);
  const email=String(authData?.user?.email||'').trim().toLowerCase();
  if(authError||!email)return withLocCors(Response.json({error:'Authentication required'},{status:401}),request,{methods:'POST, OPTIONS'});
  // Check permissions server-side without selecting registry emails publicly.
  const {data:roles,error:roleError}=await client.rpc('get_my_scope_management');
  if(roleError||!roles?.length)return withLocCors(Response.json({error:'Numeric summary management permission required'},{status:403}),request,{methods:'POST, OPTIONS'});
  revalidateTag(LOC_NUMERIC_CACHE_TAG,{expire:0});
  return withLocCors(new Response(null,{status:204}),request,{methods:'POST, OPTIONS'});
}

export function OPTIONS(request){return locCorsPreflight(request,{methods:'POST, OPTIONS'});}
