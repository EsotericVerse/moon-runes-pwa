'use client';

import {neonPublicClient} from './neon-client';

export const MAX_SPOOL_IDS=10000;
export const SPOOL_BATCH_SIZE=500;
const VALID_PURPOSES=new Set(['search','timeline','statistics']);
const VALID_ENTITY_TYPES=new Set(['uid','media_id']);

function relation(){
  return neonPublicClient.schema('silver').from('spool');
}
function clean(value,max){
  const text=String(value??'').trim();
  if(!text||text.length>max)throw new Error('Spool field is invalid.');
  return text;
}
function runId(){
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
  throw new Error('Secure spool run id is unavailable.');
}
function chunks(values,size){
  const output=[];
  for(let i=0;i<values.length;i+=size)output.push(values.slice(i,i+size));
  return output;
}

export async function purgeExpiredSpool(){
  const {error}=await relation().delete().lt('expires_at',new Date().toISOString());
  if(error)throw new Error(error.message||'Spool cleanup failed');
}

export async function writeSpoolIds({scopeId,purpose,entityType,ids=[],bucket=null,runId:existingRunId=''}={}){
  const scope=clean(scopeId,24);
  const use=clean(purpose,16);
  const type=clean(entityType,16);
  if(!VALID_PURPOSES.has(use))throw new Error('Spool purpose is invalid.');
  if(!VALID_ENTITY_TYPES.has(type))throw new Error('Spool entity type is invalid.');
  const unique=[...new Set((ids||[]).map(value=>String(value??'').trim()).filter(Boolean))];
  if(unique.length>MAX_SPOOL_IDS)throw new Error('Spool id limit exceeded.');
  for(const id of unique)if(id.length>64)throw new Error('Spool id is too long.');
  const shortBucket=bucket===null||bucket===undefined||bucket===''?null:clean(bucket,32);
  const id=existingRunId?clean(existingRunId,36):runId();

  await purgeExpiredSpool();
  for(const batch of chunks(unique,SPOOL_BATCH_SIZE)){
    const rows=batch.map(entityId=>({
      run_id:id,
      scope_id:scope,
      purpose:use,
      entity_type:type,
      entity_id:entityId,
      bucket:shortBucket
    }));
    const {error}=await relation().insert(rows);
    if(error)throw new Error(error.message||'Spool write failed');
  }
  return {runId:id,count:unique.length};
}

export async function readSpoolIds(id,{scopeId='',purpose='',entityType=''}={}){
  const key=clean(id,36);
  let query=relation().select('entity_type,entity_id,bucket,expires_at').eq('run_id',key).gt('expires_at',new Date().toISOString());
  if(scopeId)query=query.eq('scope_id',clean(scopeId,24));
  if(purpose)query=query.eq('purpose',clean(purpose,16));
  if(entityType)query=query.eq('entity_type',clean(entityType,16));
  const {data,error}=await query;
  if(error)throw new Error(error.message||'Spool read failed');
  return data||[];
}

export async function clearSpool(id){
  const key=clean(id,36);
  const {error}=await relation().delete().eq('run_id',key);
  if(error)throw new Error(error.message||'Spool cleanup failed');
}

export async function withSpoolIds(config,work){
  const current=await writeSpoolIds(config);
  try{return await work(current);}
  finally{await clearSpool(current.runId);}
}
