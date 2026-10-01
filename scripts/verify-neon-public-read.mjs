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

// silver.game SSOT contract: query each segment precisely; do not fetch the table and slice in JS.
async function gameCount(client,recordType,{ruleCode=null}={}){
  let query=client.schema('silver').from('game')
    .select('game_key',{count:'exact',head:true})
    .eq('is_current',true)
    .eq('record_type',recordType);
  if(ruleCode)query=query.eq('rule_code',ruleCode);
  const {count,error,status}=await query;
  if(error)throw new Error('game '+recordType+': '+(error.code||'')+' '+error.message);
  return {count:Number(count)||0,status};
}

async function verifyGameContract(client){
  const [event,runeAction,role,macro,asset,round,result]=await Promise.all([
    gameCount(client,'event'),
    gameCount(client,'rune_action'),
    gameCount(client,'role'),
    gameCount(client,'macro'),
    gameCount(client,'asset'),
    gameCount(client,'rule',{ruleCode:'ROUND_PHASE'}),
    gameCount(client,'rule',{ruleCode:'EVENT_RESULT'})
  ]);
  const actual={
    event:event.count,
    rune_action:runeAction.count,
    role:role.count,
    macro:macro.count,
    asset:asset.count,
    round:round.count,
    result:result.count
  };
  const exact={rune_action:66,role:8,macro:4,round:8,result:5};
  const minimum={event:32,asset:13};
  console.log(JSON.stringify({probe:'runtime-public-game-contract',actual,exact,minimum}));
  for(const [key,value] of Object.entries(exact)){
    if(actual[key]!==value)throw new Error('silver.game '+key+' expected '+value+' got '+actual[key]);
  }
  for(const [key,value] of Object.entries(minimum)){
    if(actual[key]<value)throw new Error('silver.game '+key+' expected at least '+value+' got '+actual[key]);
  }
}

const client=runtimeClient();
for(const [table,columns,options] of [
  ['manage','id,role,birthday,galaxy,time'],
  ['lo3rwang','id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,media_count,media_counts,updated_at'],
  ['lo3rwang_time','record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility'],
  ['lrunes_time','record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_pair,date_status,year_value,visibility'],
  ['lo3rwang_galaxy','uid,title,content,source_name,createtime'],
  ['lo3rwang_galaxy_media','media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime'],
  ['lrunes_galaxy','uid,title,content,source_name,createtime'],
  ['lrunes_galaxy_media','media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime'],
  ['runes','rune_id,rune_name'],
  ['game','game_key,record_type,sort_order,status,is_current,event_id,event_group,event_group_2,rune_id,role_id,rule_code,macro_code,asset_code'],
  ['lrunes','id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,media_count,media_counts,updated_at'],
])await probe(client,table,columns,options||{});


await verifyGameContract(client);

console.log('Public Neon runtime repository-path probe passed.');
