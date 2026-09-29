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

async function verifyPublicSpoolContract(client){
  const runId=crypto.randomUUID();
  const row={run_id:runId,scope_id:'lo3rwang',purpose:'search',uid:'A11CE001'};
  let inserted=false;
  try{
    const {error:writeError,status:writeStatus}=await client.schema('silver').from('spool').insert(row);
    console.log(JSON.stringify({probe:'runtime-public-spool-write',status:writeStatus,code:writeError?.code||null,error:writeError?.message||null}));
    if(writeError)throw new Error('spool anonymous write: '+(writeError.code||'')+' '+writeError.message);
    inserted=true;

    const {data,error:readError,status:readStatus}=await client.schema('silver').from('spool')
      .select('uid')
      .eq('run_id',runId)
      .eq('uid',row.uid);
    console.log(JSON.stringify({probe:'runtime-public-spool-read',status:readStatus,rows:data?.length||0,code:readError?.code||null,error:readError?.message||null}));
    if(readError)throw new Error('spool anonymous read: '+(readError.code||'')+' '+readError.message);
    if(data?.length!==1||data[0]?.uid?.trim()!==row.uid)throw new Error('spool anonymous read: UID contract mismatch');
  }finally{
    if(inserted){
      const {error:deleteError,status:deleteStatus}=await client.schema('silver').from('spool').delete().eq('run_id',runId);
      console.log(JSON.stringify({probe:'runtime-public-spool-delete',status:deleteStatus,code:deleteError?.code||null,error:deleteError?.message||null}));
      if(deleteError)throw new Error('spool anonymous delete: '+(deleteError.code||'')+' '+deleteError.message);
    }
  }
}

async function probe(client,table,columns,{filters=[]}={}){
  let query=client.schema('silver').from(table).select(columns).limit(1);
  for(const [column,operator,value] of filters)query=query[operator](column,value);
  const {data,error,status}=await query;
  console.log(JSON.stringify({probe:'runtime-public-token',table,columns,status,rows:data?.length||0,code:error?.code||null,error:error?.message||null}));
  if(error)throw new Error(table+': '+(error.code||'')+' '+error.message);
}

// silver.game SSOT contract: fail RC when any required Game segment is missing.
async function verifyGameContract(client){
  const {data,error,status}=await client.schema('silver').from('game')
    .select('game_key,record_type,rule_code')
    .eq('is_current',true)
    .limit(500);
  if(error)throw new Error('game: '+(error.code||'')+' '+error.message);
  const rows=data||[];
  const count=type=>rows.filter(row=>row.record_type===type).length;
  const roundCount=rows.filter(row=>row.record_type==='rule'&&row.rule_code==='ROUND_PHASE').length;
  const resultCount=rows.filter(row=>row.record_type==='rule'&&row.rule_code==='EVENT_RESULT').length;
  const actual={
    event:count('event'),
    rune_action:count('rune_action'),
    role:count('role'),
    macro:count('macro'),
    asset:count('asset'),
    round:roundCount,
    result:resultCount
  };
  const expected={event:32,rune_action:66,role:8,macro:4,asset:13,round:8,result:5};
  console.log(JSON.stringify({probe:'runtime-public-game-contract',status,actual,expected}));
  for(const [key,value] of Object.entries(expected)){
    if(actual[key]!==value)throw new Error('silver.game '+key+' expected '+value+' got '+actual[key]);
  }
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
  ['runes','rune_id,rune_name'],
  ['game','game_key,record_type,sort_order,status,is_current,event_id,rune_id,role_id,rule_code,macro_code,asset_code'],
  ['lrunes','id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,work_count,media_count,media_counts,updated_at'],
  ['faq_entries','faq_id,question,answer'],
  ['content_blocks','block_id,scope_id,page_key,slot_key,title,body,display_order,active,updated_at']
])await probe(client,table,columns,options||{});

await verifyPublicSpoolContract(client);

await verifyGameContract(client);

console.log('Public Neon runtime repository-path probe passed.');
