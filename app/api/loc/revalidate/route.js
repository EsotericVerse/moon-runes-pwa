import {createClient} from '@supabase/supabase-js';
import {revalidateTag} from 'next/cache';
import {LOC_PUBLIC_CACHE_TAG} from '../_server';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://qlouywsdiiyiyzpoxyqy.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_qPn0vAzozVyXKllRuEKf2Q_fvLVV';

export async function POST(request){
  const token=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return Response.json({error:'Authentication required'},{status:401});
  const client=createClient(SUPABASE_URL,SUPABASE_KEY,{
    db:{schema:'silver'},
    global:{headers:{Authorization:`Bearer ${token}`}},
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:authData,error:authError}=await client.auth.getUser(token);
  const email=String(authData?.user?.email||'').trim().toLowerCase();
  if(authError||!email)return Response.json({error:'Authentication required'},{status:401});
  const {data:roles,error:roleError}=await client.from('loc')
    .select('manage_role').eq('manage_email',email).in('manage_role',['admin','scope']).limit(1);
  if(roleError||!roles?.length)return Response.json({error:'Metadata management permission required'},{status:403});
  revalidateTag(LOC_PUBLIC_CACHE_TAG,{expire:0});
  return new Response(null,{status:204});
}
