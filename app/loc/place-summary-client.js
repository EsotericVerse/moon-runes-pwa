'use client';

import {readNumericIsr,usesNumericIsr} from './numeric-isr-client';

// Server-side ISR aggregates public text check-ins into counts. The native
// SQLite provider never relies on a network cache or remote database.
export async function readPlaceSummary(scopeId,{startDate='',endDate=''}={}){
  if(usesNumericIsr(scopeId))return readNumericIsr(scopeId,'places',{startDate,endDate});
  const [{selectAllRows},{defaultScopeData}]=await Promise.all([
    import('./db-query.mjs'),import('./scope-data')
  ]);
  const scope=defaultScopeData(scopeId);
  if(!scope)return {rows:[],anchors:[]};
  const filters=[
    {column:'statistics_able',operator:'eq',value:true},
    {column:'searchable',operator:'eq',value:true},
    {column:'content',operator:'neq',value:''},
    ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
    ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
  ];
  const {rows}=await selectAllRows(scope.galaxy,{
    columns:'uid,source_place,createtime',filters
  });
  const summary=new Map();
  for(const row of rows){
    const place=String(row.source_place||'').trim();
    if(!place||!row.createtime)continue;
    const day=new Intl.DateTimeFormat('sv-SE',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
    }).format(new Date(row.createtime));
    const key=day+'\u0000'+place;
    summary.set(key,(summary.get(key)||0)+1);
  }
  return {
    rows:[...summary].map(([key,item_count])=>{
      const [day,category]=key.split('\u0000');
      return {day,category,item_count};
    }),
    anchors:[]
  };
}
