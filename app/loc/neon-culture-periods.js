'use client';

import {selectNeonRows} from './neon-repository';

export async function selectScopeCulturePeriods(scopeId){
  if(scopeId!=='lo3rwang')return {eras:[]};
  const {rows}=await selectNeonRows('api.lo3rwang_context_entries',{
    columns:'context_key,context_type,title,summary,era_id,period,entry_name,start_date,end_date,order_no,status',
    filters:[{column:'context_type',operator:'eq',value:'period'}],
    orders:[{column:'order_no',ascending:true},{column:'context_key',ascending:true}],
    limit:1000
  });
  const eras=(Array.isArray(rows)?rows:[]).map(row=>({
    era_id:row.era_id||row.context_key,
    period:row.period||row.context_key,
    name:row.entry_name||row.title,
    title:row.title,
    description:row.summary||'',
    start_date:row.start_date||null,
    end_date:row.end_date||null,
    order:Number(row.order_no||0),
    status:row.status||''
  }));
  return {eras};
}
