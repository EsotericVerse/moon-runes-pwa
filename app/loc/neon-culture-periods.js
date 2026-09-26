'use client';

import {selectScopeTimeRows} from './scope-time';

export async function selectScopeCulturePeriods(scopeId){
  if(scopeId!=='lo3rwang')return {eras:[]};
  const rows=await selectScopeTimeRows('lo3rwang');
  const eras=rows.filter(row=>row.entry_type==='period').map(row=>({
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
