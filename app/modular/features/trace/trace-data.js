'use client';

import {dbPublicClient,dbAuthRelation} from '../../../loc/db-client.mjs';
import {createUid8} from '../../../loc/uid';

// Exactly one table per registered Scope. LOC aggregates by reading each table,
// but stores only LOC-authored entries in loc_trace. No cross-Scope writes.
export const TRACE_SCOPES=Object.freeze(['loc','lo3rwang','lrunes']);
export const traceKey=scopeId=>['scope-trace',scopeId];
function sourceId(value){
  const id=String(value||'').trim().toLowerCase();
  if(!TRACE_SCOPES.includes(id))throw Error('尚未開放此 Scope 的痕跡資料表。');
  return id;
}
const relation=id=>'silver.'+sourceId(id)+'_trace';
function verified(result,label){
  if(result.error)throw Error(label+'：'+result.error.message);
  return result.data;
}
export const validCoordinates=(longitude,latitude)=>{
  const lng=Number(longitude),lat=Number(latitude);
  return String(longitude).trim()!==''&&String(latitude).trim()!==''&&Number.isFinite(lng)&&Number.isFinite(lat)
    &&lng>=-180&&lng<=180&&lat>=-90&&lat<=90;
};
function verifiedText(value,label,max=120){
  const s=String(value||'').trim();
  if(!s||s.length>max)throw Error(label+'必填，最多 '+max+' 字。');
  return s;
}
function descriptionText(value){
  const s=String(value||'').trim();
  if(s.length>2000)throw Error('說明不能超過 2000 字。');
  return s;
}
export async function readTraceData(scopeId){
  const id=sourceId(scopeId);
  const sources=id==='loc'?TRACE_SCOPES:[id];
  const perScope=await Promise.all(sources.map(async source=>{
    const result=await dbPublicClient.schema('silver').from(source+'_trace')
      .select('uid,trace_type,title,description,longitude,latitude,anchor_uids,created_at')
      .order('created_at',{ascending:true}).limit(2000);
    return (verified(result,source+' 痕跡讀取')||[]).map(row=>({...row,source_scope:source}));
  }));
  const rows=perScope.flat();
  return {
    anchors:rows.filter(row=>row.trace_type==='anchor'),
    maps:rows.filter(row=>row.trace_type==='map')
  };
}
export async function addTraceAnchor({scopeId,title,description='',longitude,latitude}){
  const id=sourceId(scopeId);
  if(!validCoordinates(longitude,latitude))throw Error('經緯度超出有效範圍。');
  const data={
    uid:createUid8(),trace_type:'anchor',title:verifiedText(title,'定錨點名稱'),
    description:descriptionText(description),longitude:Number(longitude),latitude:Number(latitude)
  };
  const result=await dbAuthRelation(relation(id)).insert(data).select('uid').single();
  return verified(result,'新增定錨點');
}
export async function addTraceMap({scopeId,title,description='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const chosen=Array.isArray(anchorUids)?anchorUids:[];
  if(chosen.length<2||chosen.length>80||new Set(chosen).size!==chosen.length)
    throw Error('請依順序選擇 2～80 個不重複的定錨點。');
  const existing=new Set(anchors.filter(row=>row.source_scope===id).map(row=>row.uid));
  if(chosen.some(uid=>!existing.has(uid)))
    throw Error('痕跡圖不能引用不同 Scope 或不存在的定錨點。');
  const data={
    uid:createUid8(),trace_type:'map',title:verifiedText(title,'痕跡圖名稱'),
    description:descriptionText(description),anchor_uids:chosen
  };
  const result=await dbAuthRelation(relation(id)).insert(data).select('uid').single();
  return verified(result,'新增痕跡圖');
}
