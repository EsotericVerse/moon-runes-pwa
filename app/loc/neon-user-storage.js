'use client';

import {getNeonSession} from './neon-client';
import {selectNeonRows,insertNeonRows,updateNeonRows,deleteNeonRows} from './neon-repository';

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
    scope_id:String(record.scope_id||'').trim()||null,
    payload:record,
    created_at:created,
    updated_at:new Date().toISOString()
  };
}

function inflateRecord(row){
  return {...(row?.payload||{}),id:row.id,type:row.record_type,record_kind:row.record_kind||row?.payload?.record_kind,source:row.source||row?.payload?.source,scope_id:row.scope_id||row?.payload?.scope_id,created_at:row?.payload?.created_at||row.created_at,updated_at:row.updated_at};
}

export async function listNeonRecords(type=''){
  await requireUser();
  const {rows}=await selectNeonRows('api.user_records',{orders:[{column:'updated_at',ascending:false}],filters:type?[{column:'record_type',operator:'eq',value:type}]:[],limit:5000});
  return rows.map(inflateRecord);
}

export async function getNeonRecord(id){
  await requireUser();
  const {rows}=await selectNeonRows('api.user_records',{filters:[{column:'id',operator:'eq',value:id}],limit:1});
  return rows[0]?inflateRecord(rows[0]):null;
}

export async function putNeonRecord(record){
  await requireUser();
  const row=normalizeRecordRow(record);
  if(!row.id)throw new Error('record.id is required');
  const updated=await updateNeonRows('api.user_records',row,{filters:[{column:'id',operator:'eq',value:row.id}]});
  if(updated.length)return inflateRecord(updated[0]);
  const inserted=await insertNeonRows('api.user_records',[row]);
  return inserted[0]?inflateRecord(inserted[0]):record;
}

export async function deleteNeonRecord(id){
  await requireUser();
  await deleteNeonRows('api.user_records',{filters:[{column:'id',operator:'eq',value:id}],returning:null});
}

export async function clearNeonRecords(type=''){
  await requireUser();
  const filters=type?[{column:'record_type',operator:'eq',value:type}]:[{column:'id',operator:'neq',value:''}];
  await deleteNeonRows('api.user_records',{filters,returning:null});
}

export async function getNeonSetting(key){
  await requireUser();
  const {rows}=await selectNeonRows('api.user_settings',{columns:'setting_key,payload,updated_at',filters:[{column:'setting_key',operator:'eq',value:key}],limit:1});
  return rows[0]?.payload??null;
}

export async function putNeonSetting(key,payload){
  await requireUser();
  const updated_at=new Date().toISOString();
  const updated=await updateNeonRows('api.user_settings',{payload,updated_at},{filters:[{column:'setting_key',operator:'eq',value:key}],returning:'setting_key'});
  if(updated.length)return payload;
  await insertNeonRows('api.user_settings',[{setting_key:key,payload,updated_at}],{returning:'setting_key'});
  return payload;
}

export async function deleteNeonSetting(key){
  await requireUser();
  await deleteNeonRows('api.user_settings',{filters:[{column:'setting_key',operator:'eq',value:key}],returning:null});
}
