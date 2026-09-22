'use client';

import {selectNeonRows} from './neon-repository';

const PERIOD_SOURCE_BY_SCOPE=Object.freeze({
  lo3rwang:'lo3rwang_period_context_entries'
});

export async function selectScopeCulturePeriods(scopeId){
  const table=PERIOD_SOURCE_BY_SCOPE[scopeId];
  if(!table)return {eras:[]};

  const {rows}=await selectNeonRows(`silver.${table}`,{
    columns:'context_key,context_type,title,summary,payload',
    filters:[{column:'context_type',operator:'eq',value:'period'}],
    orders:[{column:'context_key',ascending:true}],
    limit:1000
  });

  const eras=(Array.isArray(rows)?rows:[]).map(row=>({
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
