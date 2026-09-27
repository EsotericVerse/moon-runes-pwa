'use client';

import {selectNeonAllRows,upsertNeonRows} from './neon-repository';

export function visibilityDraft(settings={}){
  return {
    includeStatistics:settings?.statistics_included??true,
    fullText:settings?.projection_level==='full',
    hidden:settings?.visibility==='private',
    showLink:settings?.show_link??true,
    showSource:settings?.show_source??true
  };
}

export function visibilityRecord({scope,resourceType,resourceId,draft,sourceRef=null}){
  return {
    scope,
    resource_type:resourceType,
    resource_id:resourceId,
    visibility:draft.hidden?'private':'public',
    projection_level:draft.fullText?'full':'summary',
    search_indexed:!draft.hidden,
    statistics_included:draft.includeStatistics!==false,
    semantic_scan_included:false,
    source_ref:sourceRef,
    show_link:draft.showLink!==false,
    show_source:draft.showSource!==false,
    updated_at:new Date().toISOString()
  };
}

export async function saveResourceVisibility(args){
  const record=visibilityRecord(args);
  await upsertNeonRows('silver.resource_visibility',record,{conflict:'scope,resource_type,resource_id'});
  return record;
}

export async function listResourceVisibility(){
  const {rows}=await selectNeonAllRows('silver.resource_visibility',{
    columns:'scope,resource_type,resource_id,visibility,projection_level,search_indexed,statistics_included,semantic_scan_included,source_ref,show_link,show_source,updated_at'
  });
  return rows;
}


export async function listResourceVisibilityFor(resources=[]){
  const ids=[...new Set((resources||[]).map(item=>String(item?.resourceId||item?.resource_id||'').trim()).filter(Boolean))];
  if(!ids.length)return [];
  const {rows}=await selectNeonRows('silver.resource_visibility',{
    columns:'scope,resource_type,resource_id,visibility,projection_level,search_indexed,statistics_included,semantic_scan_included,source_ref,show_link,show_source,updated_at',
    filters:[{column:'resource_id',operator:'in',value:ids}]
  });
  const wanted=new Set((resources||[]).map(item=>[
    String(item?.scope||''),
    String(item?.resourceType||item?.resource_type||''),
    String(item?.resourceId||item?.resource_id||'')
  ].join(':')));
  return rows.filter(row=>wanted.has([String(row.scope||''),String(row.resource_type||''),String(row.resource_id||'')].join(':')));
}
