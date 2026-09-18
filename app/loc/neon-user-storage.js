'use client';

import { neonClient, getNeonSession } from './neon-client';

async function requireUser(){
  const session=await getNeonSession();
  if(!session?.user?.id)throw new Error('請先登入 Neon 帳號');
  return session.user;
}

function normalizeRecordRow(record={}){
  const created=String(record.created_at||record.updated_at||new Date().toISOString());
  const date=String(record.date||'').match(/^\d{4}-\d{2}-\d{2}$/)?.[0]||null;
  return {
    id:String(record.id||'').trim(),
    record_type:String(record.type||record.record_type||'record').trim(),
    record_kind:String(record.record_kind||'').trim()||null,
    source:String(record.source||'').trim()||null,
    record_date:date,
    payload:record,
    created_at:created,
    updated_at:new Date().toISOString()
  };
}

function inflateRecord(row){
  return {...(row?.payload||{}),id:row.id,type:row.record_type,record_kind:row.record_kind||row?.payload?.record_kind,source:row.source||row?.payload?.source,created_at:row?.payload?.created_at||row.created_at,updated_at:row.updated_at};
}

export async function listNeonRecords(type=''){
  await requireUser();
  let query=neonClient.from('user_records').select('*').order('updated_at',{ascending:false});
  if(type)query=query.eq('record_type',type);
  const {data,error}=await query;
  if(error)throw new Error(error.message||'Neon records read failed');
  return (data||[]).map(inflateRecord);
}

export async function getNeonRecord(id){
  await requireUser();
  const {data,error}=await neonClient.from('user_records').select('*').eq('id',id).limit(1);
  if(error)throw new Error(error.message||'Neon record read failed');
  return data?.[0]?inflateRecord(data[0]):null;
}

export async function putNeonRecord(record){
  await requireUser();
  const row=normalizeRecordRow(record);
  if(!row.id)throw new Error('record.id is required');
  const {data:updated,error:updateError}=await neonClient.from('user_records').update(row).eq('id',row.id).select('*');
  if(updateError)throw new Error(updateError.message||'Neon record update failed');
  if(updated?.length)return inflateRecord(updated[0]);
  const {data,error}=await neonClient.from('user_records').insert(row).select('*');
  if(error)throw new Error(error.message||'Neon record insert failed');
  return data?.[0]?inflateRecord(data[0]):record;
}

export async function deleteNeonRecord(id){
  await requireUser();
  const {error}=await neonClient.from('user_records').delete().eq('id',id);
  if(error)throw new Error(error.message||'Neon record delete failed');
}

export async function clearNeonRecords(type=''){
  await requireUser();
  let query=neonClient.from('user_records').delete();
  if(type)query=query.eq('record_type',type);else query=query.neq('id','');
  const {error}=await query;
  if(error)throw new Error(error.message||'Neon records clear failed');
}

export async function getNeonSetting(key){
  await requireUser();
  const {data,error}=await neonClient.from('user_settings').select('setting_key,payload,updated_at').eq('setting_key',key).limit(1);
  if(error)throw new Error(error.message||'Neon setting read failed');
  return data?.[0]?.payload??null;
}

export async function putNeonSetting(key,payload){
  await requireUser();
  const updated_at=new Date().toISOString();
  const {data:updated,error:updateError}=await neonClient.from('user_settings').update({payload,updated_at}).eq('setting_key',key).select('setting_key');
  if(updateError)throw new Error(updateError.message||'Neon setting update failed');
  if(updated?.length)return payload;
  const {error}=await neonClient.from('user_settings').insert({setting_key:key,payload,updated_at});
  if(error)throw new Error(error.message||'Neon setting insert failed');
  return payload;
}

export async function deleteNeonSetting(key){
  await requireUser();
  const {error}=await neonClient.from('user_settings').delete().eq('setting_key',key);
  if(error)throw new Error(error.message||'Neon setting delete failed');
}
