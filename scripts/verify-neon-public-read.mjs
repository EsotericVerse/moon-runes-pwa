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
    ['manage','id,role'],
    ['lo3rwang_time','record_id,record_type,resource_id'],
    ['lrunes_time','record_id,record_type,resource_id'],
    ['lo3rwang_galaxy','uid,source_name,createtime'],
    ['lo3rwang_galaxy_media','media_id,galaxy_link,media_type,meta_tags,createtime']
  ]){
    const {data,error}=await client.from(table).select(columns).limit(1);
    console.log(JSON.stringify({probe:'managed-anonymous',table,rows:data?.length||0,error:error?.message||null}));
    if(error)throw new Error(table+': '+error.message);
  }
}

await clientProbe();
console.log('Public Neon managed-anonymous runtime probe passed.');
