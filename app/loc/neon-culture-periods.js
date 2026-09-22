'use client';

import {neonClient} from './neon-client';

const PERIOD_SOURCE_BY_SCOPE=Object.freeze({
  lo3rwang:'lo3rwang_period_context_entries'
});

export async function selectScopeCulturePeriods(scopeId){
  const table=PERIOD_SOURCE_BY_SCOPE[scopeId];
  if(!table)return {eras:[]};

  const {data,error}=await neonClient
    .schema('silver')
    .from(table)
    .select('context_key,context_type,title,summary,payload')
    .eq('context_type','period');

  if(error)throw new Error(`culture periods ${scopeId}: ${error.message||'query failed'}`);

  const eras=(Array.isArray(data)?data:[]).map(row=>({
    era_id:row.payload?.era_id||row.context_key,
    period:row.payload?.period||'',
    name:row.payload?.name||row.title,
    title:row.title,
    description:row.summary||'',
    start_date:row.payload?.start_date||null,
    end_date:row.payload?.end_date||null,
    order:Number(row.payload?.order||0),
    status:row.payload?.status||''
  })).sort((a,b)=>a.order-b.order);

  return {eras};
}
