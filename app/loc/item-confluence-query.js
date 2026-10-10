'use client';

import {selectRows} from './db-query.mjs';
import {selectDailyRuneRange} from './daily-runes';
import {
  validateItemConfluenceRange,validateItemLane
} from './item-confluence-model.mjs';

const PER_PAGE=1000;
// Guardrail: no full-table reads. Date and source filters are pushed to SQL,
// pages contain timestamps only; reject excessive windows rather than truncate.
const MAX_LANE_ROWS=30000;
const PLATFORM_FILTERS=Object.freeze({
  'galaxy:facebook':'source_name.ilike.*facebook*,source_name.ilike.fb',
  'galaxy:threads':'source_name.ilike.*threads*',
  'galaxy:instagram':'source_name.ilike.*instagram*,source_name.ilike.ig,source_name.ilike.*reels*'
});

function taipeiDay(timestamp){
  if(!timestamp)return '';
  const date=new Date(timestamp);
  if(Number.isNaN(date.getTime()))return String(timestamp).slice(0,10);
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(date);
  const fields=Object.fromEntries(parts.filter(item=>item.type!=='literal').map(item=>[item.type,item.value]));
  return fields.year+'-'+fields.month+'-'+fields.day;
}

export async function selectLocItemDailySeries({scope,lane,startDate,endDate,knownScopes=[]}={}){
  const range=validateItemConfluenceRange(startDate,endDate);
  if(!range.valid)throw new Error(range.reason);
  const spec=validateItemLane(lane,knownScopes);
  if(!spec.valid||spec.scopeId!==scope?.id)throw new Error(spec.reason||'Scope 與河道不符。');
  const totals=new Map();
  if(spec.source==='daily:rune'){
    const rows=await selectDailyRuneRange(range);
    for(const row of rows){
      const day=String(row.record_date||'').slice(0,10);
      if(day<range.startDate||day>range.endDate)continue;
      totals.set(day,(totals.get(day)||0)+1);
    }
  }else{
    const media=spec.source.startsWith('media:');
    const table=media?scope.galaxyMedia:scope.galaxy;
    const filters=[
      {column:'createtime',operator:'gte',value:range.startDate+'T00:00:00+08:00'},
      {column:'createtime',operator:'lte',value:range.endDate+'T23:59:59.999+08:00'},
      ...(media?[]:[
        {column:'statistics_able',operator:'eq',value:true},
        {column:'searchable',operator:'eq',value:true},
        {column:'content',operator:'neq',value:''}
      ]),
      ...(spec.source==='galaxy:exact'?[{column:'source_name',operator:'eq',value:spec.exact}]:[]),
      ...(spec.source==='media:exact'?[{column:'media_type',operator:'eq',value:spec.exact}]:[])
    ];
    const orFilter=PLATFORM_FILTERS[spec.source]||'';
    let offset=0;
    while(true){
      const page=await selectRows(table,{
        columns:'createtime',
        filters,orFilter,
        orders:[{column:'createtime',ascending:true}],
        limit:PER_PAGE,offset,
        count:offset===0?'exact':null,
        maxLimit:PER_PAGE
      });
      if(offset===0&&Number(page.count)>MAX_LANE_ROWS)
        throw new Error('此河道的三個月紀錄超過 '+MAX_LANE_ROWS.toLocaleString()+' 筆，請縮小日期區間。');
      for(const row of page.rows||[]){
        const day=taipeiDay(row.createtime);
        if(day<range.startDate||day>range.endDate)continue;
        totals.set(day,(totals.get(day)||0)+1);
      }
      offset+=(page.rows||[]).length;
      if(offset>MAX_LANE_ROWS)throw new Error('項目交會資料量過大，請縮小日期區間。');
      if((page.rows||[]).length<PER_PAGE)break;
    }
  }
  return [...totals.entries()].map(([day,count])=>({day,count}))
    .sort((a,b)=>a.day.localeCompare(b.day));
}
