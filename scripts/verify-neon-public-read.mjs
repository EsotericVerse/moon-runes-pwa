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
  ['lo3rwang','id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,work_count,media_count,media_counts,updated_at'],
  ['lo3rwang_time','record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility'],
  ['lrunes_time','record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility'],
  ['lo3rwang_galaxy','uid,title,content,source_name,createtime'],
  ['lo3rwang_galaxy_media','media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime'],
  ['lrunes_galaxy','uid,title,content,source_name,createtime'],
  ['lrunes_galaxy_media','media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime'],
  ['lo3rwang_source_stats','source_name,work_count'],
  ['lo3rwang_source_daily','source_name,work_date,work_count'],
  ['runes','rune_id,rune_name'],
  ['lrunes','id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,work_count,media_count,media_counts,updated_at'],
  ['faq_entries','faq_id,question,answer'],
  ['content_blocks','block_id,scope_id,page_key,slot_key,title,body,display_order,active,updated_at']
])await probe(client,table,columns,options||{});

console.log('Public Neon runtime repository-path probe passed.');
