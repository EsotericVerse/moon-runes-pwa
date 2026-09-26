'use client';

import {selectNeonRows} from './neon-repository';

export async function selectScopeCulturePeriods(scopeId){
  if(scopeId!=='lo3rwang')return {eras:[]};
  const {rows}=await selectNeonRows('silver.lo3rwang_style_time',{
    columns:'entry_key,entry_type,title,summary,era_id,period,entry_name,start_date,end_date,order_no,status',
    filters:[{column:'entry_type',operator:'eq',value:'period'}],
    orders:[{column:'order_no',ascending:true},{column:'entry_key',ascending:true}],
    limit:1000
  });
  const eras=(Array.isArray(rows)?rows:[]).map(row=>({
    era_id:row.era_id||row.entry_key,
    period:row.period||row.entry_key,
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
