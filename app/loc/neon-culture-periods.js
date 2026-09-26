'use client';

import {selectScopeTimeRows} from './scope-time';

export async function selectScopeCulturePeriods(scopeId){
  const runtimeId=String(scopeId||'');
  const dataScope=runtimeId==='lunarunes'?'lrunes':runtimeId;
  if(!['lo3rwang','lrunes'].includes(dataScope))return {eras:[]};
  const rows=await selectScopeTimeRows(dataScope);
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
