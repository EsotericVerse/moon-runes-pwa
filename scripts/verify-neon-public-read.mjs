import {createClient,SupabaseAuthAdapter} from '@neondatabase/neon-js';

const DATA_API='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const AUTH_API='https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

async function clientProbe(){
  const client=createClient({
    auth:{url:AUTH_API,adapter:SupabaseAuthAdapter(),allowAnonymous:true},
    dataApi:{url:DATA_API,options:{db:{schema:'silver'}}}
  });
  for(const [table,columns] of [
    ['lrunes','rune_number,rune_name,record_type'],
    ['manage','record_id,record_type,scope_id'],
    ['v_lo3rwang_source_catalog','source_name,work_count'],
    ['lo3rwang_galaxy_media','media_id,media_link:galaxy_link,source_name,source_native_id,media_type,title,url,meta_tags,style_tags:style_prompt,created_at'],
    ['v_lo3rwang_canonical_works','work_id,scope_id,source_name,created_at,work_type,title,excerpt']
  ]){
    const {data,error}=await client.from(table).select(columns).limit(1);
    console.log(JSON.stringify({probe:'client',table,rows:data?.length||0,error:error?.message||null}));
    if(error)throw new Error(table+': '+error.message);
  }
}

await clientProbe();
console.log('Public Neon Data API probe passed.');
