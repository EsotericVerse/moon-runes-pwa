'use client';

import {selectNeonRows} from './neon-query';
import {neonAuthClient} from './neon-client';

const SCOPE_ID_PATTERN=/^[a-z][a-z0-9]*$/;
const TABLE_TOKEN_PATTERN=/^[a-z][a-z0-9_]*$/;
const DEFAULT_MAPPING=Object.freeze({galaxy:'galaxy',time:'time'});

export function normalizeDataScopeId(scopeId){
  const id=String(scopeId||'').trim();
  return id==='lunarunes'?'lrunes':id;
}

function safeToken(value,fallback){
  const token=String(value||'').trim();
  return TABLE_TOKEN_PATTERN.test(token)?token:fallback;
}

export function mappedScopeTable(scopeId,mappingKey,mappingValue){
  const id=normalizeDataScopeId(scopeId);
  if(!SCOPE_ID_PATTERN.test(id))throw new Error('Scope ID 無效');
  const fallback=DEFAULT_MAPPING[mappingKey];
  if(!fallback)throw new Error('Scope table mapping key 無效');
  const suffix=safeToken(mappingValue,fallback);
  return `silver.${id}_${suffix}`;
}

export async function selectScopeTableMapping(scopeId,{email=''}={}){
  const id=normalizeDataScopeId(scopeId);
  if(!SCOPE_ID_PATTERN.test(id))throw new Error('Scope ID 無效');
  const normalizedEmail=String(email||'').trim().toLowerCase();
  let rows=[];
  if(normalizedEmail){
    const {data,error}=await neonAuthClient.schema('silver').from('manage')
      .select('id,email,galaxy,time')
      .eq('id',id)
      .eq('email',normalizedEmail)
      .limit(1);
    if(error)throw new Error(error.message||'Scope table mapping read failed');
    rows=data||[];
  }else{
    ({rows}=await selectNeonRows('silver.manage',{
      columns:'id,galaxy,time',
      filters:[{column:'id',operator:'eq',value:id}],
      limit:1000
    }));
  }
  if(!rows.length)return {...DEFAULT_MAPPING};
  if(normalizedEmail){
    const row=rows[0];
    return {
      galaxy:safeToken(row?.galaxy,DEFAULT_MAPPING.galaxy),
      time:safeToken(row?.time,DEFAULT_MAPPING.time)
    };
  }
  const galaxyValues=[...new Set(rows.map(row=>safeToken(row?.galaxy,DEFAULT_MAPPING.galaxy)))];
  const timeValues=[...new Set(rows.map(row=>safeToken(row?.time,DEFAULT_MAPPING.time)))];
  return {
    galaxy:galaxyValues.length===1?galaxyValues[0]:DEFAULT_MAPPING.galaxy,
    time:timeValues.length===1?timeValues[0]:DEFAULT_MAPPING.time
  };
}

export async function resolveScopeTables(scopeId,options={}){
  const id=normalizeDataScopeId(scopeId);
  const mapping=await selectScopeTableMapping(id,options);
  const galaxy=mappedScopeTable(id,'galaxy',mapping.galaxy);
  return {
    scopeId:id,
    mapping,
    galaxy,
    galaxyMedia:galaxy+'_media',
    time:mappedScopeTable(id,'time',mapping.time)
  };
}
