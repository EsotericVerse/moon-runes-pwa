'use client';

import {getNeonSession,neonClient} from './neon-client';

function recordsRelation(){return neonClient.schema('api').from('user_records');}
function settingsRelation(){return neonClient.schema('api').from('user_settings');}

async function requireUser(){
  const session=await getNeonSession();
  if(!session?.user)throw new Error('請先登入 Neon 帳號');
  return session.user;
}

function normalizeRecord(record={}){
  return {
    ...record,
    id:String(record.id||'').trim(),
    type:String(record.type||record.record_type||'record').trim(),
    updated_at:new Date().toISOString(),
    created_at:record.created_at||new Date().toISOString()
  };
}

function dbRecord(row={}){
  const payload=row.payload&&typeof row.payload==='object'?row.payload:{};
  return {
    ...payload,
    id:row.id,
    type:row.record_type,
    record_kind:row.record_kind??payload.record_kind,
    source:row.source??payload.source,
    record_date:row.record_date??payload.record_date,
    scope_id:row.scope_id??payload.scope_id,
    created_at:row.created_at??payload.created_at,
    updated_at:row.updated_at??payload.updated_at
  };
}

function recordPayload(row){
  const {
    id,type,record_type,record_kind,source,record_date,scope_id,
    created_at,updated_at,...payload
  }=row;
  return payload;
}

function dateKey(value){
  const date=value?new Date(value):new Date();
  if(Number.isNaN(date.getTime()))return '';
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function randomRecordId(prefix='record'){
  const suffix=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function throwQuery(error,operation){
  if(error)throw new Error(`Neon ${operation}：${error.message||'query failed'}`);
}

export async function listNeonRecords(type='',{
  recordKind='',
  recordDate='',
  offset=0,
  limit=20,
  count=false
}={}){
  await requireUser();
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  const safeLimit=Math.max(1,Math.min(50,Math.floor(Number(limit)||20)));
  let query=recordsRelation()
    .select(
      'id,record_type,record_kind,source,record_date,payload,created_at,updated_at,scope_id',
      count?{count:'exact'}:undefined
    )
    .order('updated_at',{ascending:false})
    .range(safeOffset,safeOffset+safeLimit-1);
  if(type)query=query.eq('record_type',type);
  if(recordKind)query=query.eq('record_kind',recordKind);
  if(recordDate)query=query.eq('record_date',recordDate);
  const {data,error,count:totalCount}=await query;
  throwQuery(error,'讀取個人紀錄失敗');
  const rows=(data||[]).map(dbRecord);
  return count?{rows,totalCount:Number(totalCount||0)}:rows;
}

export async function getNeonRecord(id){
  await requireUser();
  const {data,error}=await recordsRelation().select('id,record_type,record_kind,source,record_date,payload,created_at,updated_at,scope_id').eq('id',String(id)).limit(1);
  throwQuery(error,'讀取個人紀錄失敗');
  return data?.[0]?dbRecord(data[0]):null;
}

export async function putNeonRecord(record){
  await requireUser();
  const row=normalizeRecord(record);
  if(!row.id)throw new Error('record.id is required');
  const dbRow={
    id:row.id,
    record_type:row.type,
    record_kind:row.record_kind||null,
    source:row.source||null,
    record_date:row.record_date||null,
    scope_id:row.scope_id||null,
    payload:recordPayload(row),
    created_at:row.created_at,
    updated_at:row.updated_at
  };
  const {data,error}=await recordsRelation().upsert(dbRow,{onConflict:'id'}).select('id,record_type,record_kind,source,record_date,payload,created_at,updated_at,scope_id');
  throwQuery(error,'儲存個人紀錄失敗');
  return dbRecord(data?.[0]||dbRow);
}

export async function deleteNeonRecord(id){
  await requireUser();
  const {error}=await recordsRelation().delete().eq('id',String(id));
  throwQuery(error,'刪除個人紀錄失敗');
}

export async function clearNeonRecords(type=''){
  await requireUser();
  let query=recordsRelation().delete();
  if(type)query=query.eq('record_type',type);
  else{
    const ids=[];
    for(let offset=0;;offset+=50){
      const rows=await listNeonRecords('',{offset,limit:50});
      ids.push(...rows.map(row=>row.id));
      if(rows.length<50)break;
    }
    if(!ids.length)return;
    query=query.in('id',ids);
  }
  const {error}=await query;
  throwQuery(error,'清除個人紀錄失敗');
}

export async function getNeonSetting(key){
  await requireUser();
  const {data,error}=await settingsRelation().select('setting_key,payload,updated_at').eq('setting_key',String(key)).limit(1);
  throwQuery(error,'讀取個人設定失敗');
  return data?.[0]?.payload??null;
}

export async function putNeonSetting(key,payload){
  await requireUser();
  const settingKey=String(key||'').trim();
  if(!settingKey)throw new Error('setting key is required');
  const current=await settingsRelation().select('setting_key').eq('setting_key',settingKey).limit(1);
  throwQuery(current.error,'讀取個人設定失敗');
  if(current.data?.length){
    const result=await settingsRelation().update({payload,updated_at:new Date().toISOString()}).eq('setting_key',settingKey).select('payload');
    throwQuery(result.error,'更新個人設定失敗');
    return result.data?.[0]?.payload??payload;
  }
  const result=await settingsRelation().insert({setting_key:settingKey,payload}).select('payload');
  throwQuery(result.error,'建立個人設定失敗');
  return result.data?.[0]?.payload??payload;
}

export async function deleteNeonSetting(key){
  await requireUser();
  const {error}=await settingsRelation().delete().eq('setting_key',String(key));
  throwQuery(error,'刪除個人設定失敗');
}

export async function listRuneDrawSlots(){
  const rows=await listNeonRecords('rune-draw-slot',{limit:8});
  const slots=Array.from({length:8},(_,index)=>({slot:index+1,record:null}));
  for(const row of rows){
    const match=String(row.record_kind||'').match(/^slot-([1-8])$/);
    if(match)slots[Number(match[1])-1].record=row;
  }
  return slots;
}

export async function putRuneDrawSlot(slot,record){
  const number=Number(slot);
  if(!Number.isInteger(number)||number<1||number>8)throw new Error('抽牌儲存槽只能是 1–8。');
  const kind=`slot-${number}`;
  const rows=await listNeonRecords('rune-draw-slot',{recordKind:kind,limit:1});
  const current=rows[0]||null;
  return putNeonRecord({
    ...record,
    id:current?.id||randomRecordId('rune-draw-slot'),
    type:'rune-draw-slot',
    record_kind:kind,
    scope_id:'lunarunes',
    source:'lunarunes-management'
  });
}

export async function putDailyRuneRecord(record){
  const today=dateKey(record?.created_at||new Date());
  if(!today)throw new Error('每日符文紀錄日期無效。');
  const rows=await listNeonRecords('rune-draw',{recordKind:'daily',recordDate:today,limit:2});
  const roles=new Set(rows.map(row=>String(row.daily_role||'').toLowerCase()).filter(Boolean));
  const role=!roles.has('main')?'main':!roles.has('supplement')?'supplement':'';
  if(!role)throw new Error('今天的主符與副符都已儲存；如需調整請到管理頁編輯。');
  return putNeonRecord({
    ...record,
    id:randomRecordId('daily-rune'),
    type:'rune-draw',
    record_kind:'daily',
    record_date:today,
    daily_role:role,
    scope_id:'lunarunes',
    source:'lunarunes-management'
  });
}
