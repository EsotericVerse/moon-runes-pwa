'use client';

import {selectNeonAllRows,selectNeonRows,selectNeonWindow} from './neon-repository';

export async function selectSourceCatalog({scopeId='lo3rwang',limit=null,offset=0}={}){
  const options={
    columns:'scope_id,source_name,work_count,first_created_at,last_created_at',
    filters:[{column:'scope_id',operator:'eq',value:scopeId}],
    orders:[{column:'work_count',ascending:false},{column:'source_name',ascending:true}]
  };
  const bounded=limit!==null&&limit!==undefined&&Number.isFinite(Number(limit));
  const result=bounded
    ?await selectNeonWindow('silver.v_lo3rwang_source_catalog',{...options,limit:Number(limit),offset})
    :await selectNeonAllRows('silver.v_lo3rwang_source_catalog',options);
  return {rows:result.rows,totalCount:Number(result.count??result.rows.length)||0};
}

export async function selectSourceWeekly({scopeId='lo3rwang',startDate='',endDate='',limit=null,offset=0}={}){
  const filters=[{column:'scope_id',operator:'eq',value:scopeId}];
  if(startDate)filters.push({column:'week_start',operator:'gte',value:startDate});
  if(endDate)filters.push({column:'week_start',operator:'lte',value:endDate});
  const options={
    columns:'scope_id,source_name,week_start,work_count',
    filters,
    orders:[{column:'week_start',ascending:true},{column:'source_name',ascending:true}]
  };
  const bounded=limit!==null&&limit!==undefined&&Number.isFinite(Number(limit));
  const result=bounded
    ?await selectNeonWindow('silver.v_lo3rwang_source_weekly',{...options,limit:Number(limit),offset,count:'exact'})
    :await selectNeonAllRows('silver.v_lo3rwang_source_weekly',options);
  return {rows:result.rows,totalCount:Number(result.count??result.rows.length)||0};
}

export async function selectCanonicalWorksPage({scopeId='lo3rwang',sourceName='',startDate='',endDate='',limit=20,offset=0}={}){
  const filters=[{column:'scope_id',operator:'eq',value:scopeId}];
  if(sourceName)filters.push({column:'source_name',operator:'eq',value:sourceName});
  if(startDate)filters.push({column:'created_at',operator:'gte',value:String(startDate).slice(0,10)+'T00:00:00+08:00'});
  if(endDate)filters.push({column:'created_at',operator:'lte',value:String(endDate).slice(0,10)+'T23:59:59.999+08:00'});
  const {rows,count}=await selectNeonRows('silver.v_lo3rwang_canonical_works',{
    columns:'work_id,scope_id,source_name,created_at,work_type,title,excerpt',
    filters,
    orders:[{column:'created_at',ascending:false}],
    limit,
    offset,
    count:'exact'
  });
  return {rows,totalCount:Number(count??rows.length)||0};
}


export async function selectCanonicalWorkSummaries(workIds=[]){
  const ids=[...new Set((workIds||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  if(!ids.length)return [];
  const {rows}=await selectNeonRows('silver.v_lo3rwang_canonical_works',{
    columns:'work_id,title,excerpt',
    filters:[{column:'work_id',operator:'in',value:ids}],
    limit:ids.length
  });
  return rows;
}
