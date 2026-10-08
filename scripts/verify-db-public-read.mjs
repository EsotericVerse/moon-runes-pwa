import {createConfiguredAdapter} from '../app/loc/providers/configured.mjs';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;
const TABLE_TOKEN_PATTERN=/^[a-z][a-z0-9_]*$/;

function runtimeClient(){return createConfiguredAdapter().publicClient;}

async function probe(client,table,columns,{filters=[]}={}){
  let query=client.schema('silver').from(table).select(columns).limit(1);
  for(const [column,operator,value] of filters)query=query[operator](column,value);
  const {data,error,status}=await query;
  console.log(JSON.stringify({probe:'runtime-public-read',table,columns,status,rows:data?.length||0,code:error?.code||null,error:error?.message||null}));
  if(error)throw new Error(table+': '+(error.code||'')+' '+error.message);
}

function requiredToken(value,label){
  const token=String(value||'').trim()||label;
  if(!TABLE_TOKEN_PATTERN.test(token))throw new Error('silver.manage '+label+' setting invalid');
  return token;
}

function scopeMapping(row){
  const id=String(row?.id||'').trim();
  if(!SCOPE_ID_PATTERN.test(id))throw new Error('silver.manage Scope id invalid: '+id);
  const galaxySuffix=requiredToken(row?.galaxy,'galaxy');
  const timeSuffix=requiredToken(row?.time,'time');
  const galaxy=id+'_'+galaxySuffix;
  return {
    id,
    role:String(row?.role||'').trim(),
    metadata:id,
    galaxy,
    galaxyMedia:galaxy+'_media',
    time:id+'_'+timeSuffix
  };
}

function scopeMappings(rows=[]){
  const scopes=new Map();
  for(const row of rows){
    const next=scopeMapping(row);
    const current=scopes.get(next.id);
    if(current&&(current.galaxy!==next.galaxy||current.time!==next.time)){
      throw new Error('silver.manage Scope '+next.id+' galaxy/time mapping conflict');
    }
    scopes.set(next.id,current||next);
  }
  return [...scopes.values()].sort((a,b)=>a.id.localeCompare(b.id));
}

async function managedScopes(client){
  const {data,error,status}=await client.schema('silver').from('manage')
    .select('id,role,birthday,galaxy,time')
    .in('role',['admin','scope'])
    .order('id',{ascending:true});
  console.log(JSON.stringify({probe:'runtime-public-scope-mapping',status,rows:data?.length||0,code:error?.code||null,error:error?.message||null}));
  if(error)throw new Error('manage: '+(error.code||'')+' '+error.message);
  return scopeMappings(data||[]);
}

async function verifyManagedScope(client,scope){
  const metadataColumns=scope.id==='lo3rwang'
    ?'id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,media_count,media_counts,updated_at,keyword_min_chars,keyword_min_documents,current_keyword_class_id,keyword_class_share_enabled,keyword_document_count,keyword_meta,staticstime'
    :'id,period,period_start,period_end,theme,search_able,statistics_able,culture_able,sources,source_counts,media_count,media_counts,updated_at';
  const galaxyColumns='uid,title,content,source_name,createtime,class_id,group_lists';
  await probe(client,scope.metadata,metadataColumns);
  await probe(client,scope.time,'record_id,record_type,resource_id,label,display_order,status,note,time_date,anchor_ids,date_status,year_value,visibility,style_tags,style_description');
  await probe(client,scope.galaxy,galaxyColumns);
  await probe(client,scope.galaxyMedia,'media_id,galaxy_link,source_native_id,media_type,title,url,meta_tags,createtime');
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
await probe(client,'manage','id,role,birthday,galaxy,time');

const scopes=await managedScopes(client);
if(!scopes.length)throw new Error('silver.manage returned no managed Scopes');
for(const scope of scopes)await verifyManagedScope(client,scope);

// LunaRunes-only canonical SSOT remains explicitly named; it is not a general Scope mapping path.
await probe(client,'runes','rune_id,rune_name');
await probe(client,'game','game_key,record_type,sort_order,status,is_current,event_id,event_group,event_group_2,rune_id,role_id,rule_code,macro_code,asset_code');
await verifyGameContract(client);

console.log('Public database runtime repository-path probe passed.');
