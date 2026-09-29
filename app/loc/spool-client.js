'use client';

import {neonPublicClient} from './neon-client';

export const SPOOL_PURPOSES=Object.freeze(['search','timeline','statistics']);

function defaultRelation(){
  return neonPublicClient.schema('silver').from('spool');
}
function clean(value,max){
  const text=String(value??'').trim();
  if(!text||text.length>max)throw new Error('Spool field is invalid.');
  return text;
}
function cleanUid(value){
  const uid=String(value??'').trim().toUpperCase();
  if(!/^[A-F0-9]{8}$/.test(uid))throw new Error('Spool accepts 8-character Galaxy UID only.');
  return uid;
}
function runId(){
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
  throw new Error('Secure spool run id is unavailable.');
}

export function createUidSpoolAdapter({relation=defaultRelation}={}){
  return Object.freeze({
    async purgeExpired(){
      const {error}=await relation().delete().lt('expires_at',new Date().toISOString());
      if(error)throw new Error(error.message||'Spool cleanup failed');
    },
    async write({scopeId,purpose,uids=[],runId:existingRunId=''}={}){
      const scope=clean(scopeId,24);
      const use=clean(purpose,16);
      if(!SPOOL_PURPOSES.includes(use))throw new Error('Spool purpose is invalid.');
      const ids=[...new Set((uids||[]).map(cleanUid))];
      const id=existingRunId?clean(existingRunId,36):runId();
      await this.purgeExpired();
      if(ids.length){
        const {error}=await relation().insert(ids.map(uid=>({
          run_id:id,
          scope_id:scope,
          purpose:use,
          uid
        })));
        if(error)throw new Error(error.message||'Spool write failed');
      }
      return {runId:id,count:ids.length};
    },
    async read(id,{scopeId='',purpose=''}={}){
      const key=clean(id,36);
      let query=relation().select('uid,expires_at').eq('run_id',key).gt('expires_at',new Date().toISOString());
      if(scopeId)query=query.eq('scope_id',clean(scopeId,24));
      if(purpose)query=query.eq('purpose',clean(purpose,16));
      const {data,error}=await query;
      if(error)throw new Error(error.message||'Spool read failed');
      return data||[];
    },
    async clear(id){
      const key=clean(id,36);
      const {error}=await relation().delete().eq('run_id',key);
      if(error)throw new Error(error.message||'Spool cleanup failed');
    },
    async withUids(config,work){
      const current=await this.write(config);
      try{return await work(current);}
      finally{await this.clear(current.runId);}
    }
  });
}

export const neonUidSpool=createUidSpoolAdapter();

export const purgeExpiredSpool=(...args)=>neonUidSpool.purgeExpired(...args);
export const writeSpoolUids=(...args)=>neonUidSpool.write(...args);
export const readSpoolUids=(...args)=>neonUidSpool.read(...args);
export const clearSpool=(...args)=>neonUidSpool.clear(...args);
export const withSpoolUids=(...args)=>neonUidSpool.withUids(...args);
