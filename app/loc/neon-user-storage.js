'use client';

import {getNeonSession} from './neon-client';
import {
  selectNeonRows,selectNeonRowById,upsertNeonRows,
  deleteNeonRows
} from './neon-repository';

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

export async function listNeonRecords(type='',{
  recordKind='',
  recordDate='',
  offset=0,
  limit=20,
  count=false
}={}){
  await requireUser();
  const filters=[];
  if(type)filters.push({column:'record_type',operator:'eq',value:type});
  if(recordKind)filters.push({column:'record_kind',operator:'eq',value:recordKind});
  if(recordDate)filters.push({column:'record_date',operator:'eq',value:recordDate});
  const result=await selectNeonRows('api.user_records',{
    columns:'id,record_type,record_kind,source,record_date,payload,created_at,updated_at,scope_id',
    filters,
    orders:[{column:'updated_at',ascending:false}],
    offset,
    limit,
    count:count?'exact':null
  });
  const rows=result.rows.map(dbRecord);
  return count?{rows,totalCount:Number(result.count||0)}:rows;
}

export async function getNeonRecord(id){
  await requireUser();
  const row=await selectNeonRowById('api.user_records',{
    idColumn:'id',
    id,
    columns:'id,record_type,record_kind,source,record_date,payload,created_at,updated_at,scope_id'
  });
  return row?dbRecord(row):null;
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
  const rows=await upsertNeonRows('api.user_records',[dbRow],{
    conflict:'owner_id,id',
    returning:'id,record_type,record_kind,source,record_date,payload,created_at,updated_at,scope_id'
  });
  return dbRecord(rows[0]||dbRow);
}

export async function deleteNeonRecord(id){
  await requireUser();
  await deleteNeonRows('api.user_records',{
    filters:[{column:'id',operator:'eq',value:String(id)}],
    returning:null
  });
}

export async function clearNeonRecords(type=''){
  await requireUser();
  if(type){
    await deleteNeonRows('api.user_records',{
      filters:[{column:'record_type',operator:'eq',value:type}],
      returning:null
    });
    return;
  }
  while(true){
    const rows=await listNeonRecords('',{offset:0,limit:64});
    if(!rows.length)break;
    await deleteNeonRows('api.user_records',{
      filters:[{column:'id',operator:'in',value:rows.map(row=>row.id)}],
      returning:null
    });
    if(rows.length<64)break;
  }
}

export async function getNeonSetting(key){
  await requireUser();
  const row=await selectNeonRowById('api.user_settings',{
    idColumn:'setting_key',
    id:key,
    columns:'setting_key,payload,updated_at'
  });
  return row?.payload??null;
}

export async function putNeonSetting(key,payload){
  await requireUser();
  const settingKey=String(key||'').trim();
  if(!settingKey)throw new Error('setting key is required');
  const rows=await upsertNeonRows('api.user_settings',[{
    setting_key:settingKey,
    payload,
    updated_at:new Date().toISOString()
  }],{conflict:'owner_id,setting_key',returning:'payload'});
  return rows[0]?.payload??payload;
}

export async function deleteNeonSetting(key){
  await requireUser();
  await deleteNeonRows('api.user_settings',{
    filters:[{column:'setting_key',operator:'eq',value:String(key)}],
    returning:null
  });
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
