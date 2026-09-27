import {NeonPostgrestClient} from '@neondatabase/postgrest-js';

const DATA_API='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';

async function rawProbe(){
  const url=DATA_API+'/lrunes?select=rune_number,rune_name&record_type=eq.rune&limit=1';
  const response=await fetch(url,{
    headers:{
      'Accept-Profile':'silver',
      'Origin':'https://loc.lo3rwang.cc'
    }
  });
  const body=await response.text();
  console.log(JSON.stringify({
    probe:'raw',
    status:response.status,
    allowOrigin:response.headers.get('access-control-allow-origin'),
    allowHeaders:response.headers.get('access-control-allow-headers'),
    body:body.slice(0,500)
  }));
  if(!response.ok)throw new Error('Raw public Data API probe failed: '+response.status+' '+body);
}

async function clientProbe(){
  const client=new NeonPostgrestClient({
    dataApiUrl:DATA_API,
    options:{db:{schema:'silver'}}
  });
  for(const [table,columns] of [
    ['lrunes','rune_number,rune_name,record_type'],
    ['manage','record_id,record_type,scope_id'],
    ['lo3rwang_galaxy','galaxy_id,source_name,createtime'],
    ['lo3rwang_galaxy_media','media_id,galaxy_link,media_type,meta_tags,createtime']
  ]){
    const {data,error}=await client.from(table).select(columns).limit(1);
    console.log(JSON.stringify({probe:'client',table,rows:data?.length||0,error:error?.message||null}));
    if(error)throw new Error(table+': '+error.message);
  }
}

await rawProbe();
await clientProbe();
console.log('Public Neon Data API probe passed.');
