'use client';

import {selectNeonRows,selectNeonWindow} from './neon-repository';

export async function selectSourceCatalog({scopeId='lo3rwang',limit=100,offset=0}={}){
  const {rows,count}=await selectNeonWindow('silver.v_lo3rwang_source_catalog',{
    columns:'scope_id,source_name,work_count,first_created_at,last_created_at',
    filters:[{column:'scope_id',operator:'eq',value:scopeId}],
    orders:[{column:'work_count',ascending:false},{column:'source_name',ascending:true}],
    limit,
    offset,
    count:'exact'
  });
  return {rows,totalCount:Number(count??rows.length)||0};
}

export async function selectSourceWeekly({scopeId='lo3rwang',startDate='',endDate='',limit=500,offset=0}={}){
  const filters=[{column:'scope_id',operator:'eq',value:scopeId}];
  if(startDate)filters.push({column:'week_start',operator:'gte',value:startDate});
  if(endDate)filters.push({column:'week_start',operator:'lte',value:endDate});
  const {rows,count}=await selectNeonWindow('silver.v_lo3rwang_source_weekly',{
    columns:'scope_id,source_name,week_start,work_count',
    filters,
    orders:[{column:'week_start',ascending:true},{column:'source_name',ascending:true}],
    limit,
    offset,
    count:'exact'
  });
  return {rows,totalCount:Number(count??rows.length)||0};
}

export async function selectCanonicalWorksPage({scopeId='lo3rwang',sourceName='',startDate='',endDate='',limit=20,offset=0}={}){
  const filters=[{column:'scope_id',operator:'eq',value:scopeId}];
  if(sourceName)filters.push({column:'source_name',operator:'eq',value:sourceName});
  if(startDate)filters.push({column:'created_at',operator:'gte',value:startDate});
  if(endDate)filters.push({column:'created_at',operator:'lte',value:endDate});
  const {rows,count}=await selectNeonRows('silver.v_lo3rwang_canonical_works',{
    columns:'work_id,scope_id,source_name,created_at,work_type',
    filters,
    orders:[{column:'created_at',ascending:false}],
    limit,
    offset,
    count:'exact'
  });
  return {rows,totalCount:Number(count??rows.length)||0};
}
