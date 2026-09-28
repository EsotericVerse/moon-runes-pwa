import {createClient} from '@neondatabase/neon-js';

const DATA_API='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
const AUTH_API='https://ep-rapid-queen-b3oyboy6.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';

async function anonymousToken(){
  const response=await fetch(AUTH_API+'/token/anonymous',{headers:{accept:'application/json'}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.token)throw new Error('anonymous token: '+(payload?.message||response.status));
  return String(payload.token);
}

function runtimeClient(){
  return createClient({
    dataApi:{url:DATA_API,getToken:anonymousToken,options:{db:{schema:'api'}}}
  });
}

async function probe(client,table,columns,{filters=[]}={}){
  let query=client.schema('silver').from(table).select(columns).limit(1);
  for(const [column,operator,value] of filters)query=query[operator](column,value);
  const {data,error,status}=await query;
  console.log(JSON.stringify({probe:'runtime-public-token',table,columns,status,rows:data?.length||0,code:error?.code||null,error:error?.message||null}));
  if(error)throw new Error(table+': '+(error.code||'')+' '+error.message);
}

const client=runtimeClient();
for(const [table,columns,options] of [
  ['manage','id,role'],
  ['lo3rwang_time','record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility,style_tags'],
  ['lrunes_time','record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility,style_tags'],
  ['resource_visibility','scope,resource_type,resource_id,visibility,statistics_included,show_link,show_source,updated_at'],
  ['lo3rwang_style','style_no,node_type,representative_name,parent_group_name,keyword_group,keyword,order_no'],
  ['lo3rwang_galaxy','uid,title,content,source_name,createtime'],
  ['lo3rwang_galaxy_media','media_id,galaxy_link,source_native_id,source_place,media_type,title,url,meta_tags,createtime'],
  ['lrunes','record_id,record_type,rune_number,rune_name,group_name,keyword_group,keyword,title,content,source_name,createtime,media_id,media_type,meta_tags'],
  ['faq_entries','faq_id,question,answer']
])await probe(client,table,columns,options||{});

console.log('Public Neon runtime repository-path probe passed.');
