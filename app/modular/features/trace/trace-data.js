'use client';

import {dbPublicClient,dbAuthRelation} from '../../../loc/db-client.mjs';
import {createUid8} from '../../../loc/uid';

// Exactly one source table per Scope. Source-table SQL triggers mirror changes
// into loc_trace (scope_id + uid); LOC reads this one materialized union directly.
// Only writes made with scopeId='loc' may target LOC's native rows.
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
export const validRadius=value=>Number.isInteger(Number(value))&&Number(value)>=10&&Number(value)<=20000000;
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
  const union=id==='loc';
  const columns='uid,trace_type,title,description,longitude,latitude,radius_m,anchor_uids,created_at'+(union?',scope_id':'');
  const result=await dbPublicClient.schema('silver').from(id+'_trace')
    .select(columns).order('created_at',{ascending:true}).limit(2000);
  const rows=(verified(result,id+' 痕跡讀取')||[])
    .map(row=>({...row,source_scope:union?row.scope_id:id}));
  return {
    anchors:rows.filter(row=>row.trace_type==='anchor'),
    maps:rows.filter(row=>row.trace_type==='map')
  };
}
export async function addTraceAnchor({scopeId,title,description='',longitude,latitude,radius_m=500}){
  const id=sourceId(scopeId);
  if(!validCoordinates(longitude,latitude))throw Error('經緯度超出有效範圍。');
  if(!validRadius(radius_m))throw Error('空間範圍必須介於 10 公尺與 20,000 公里。');
  const data={
    uid:createUid8(),trace_type:'anchor',title:verifiedText(title,'定錨點名稱'),
    description:descriptionText(description),longitude:Number(longitude),latitude:Number(latitude),radius_m:Number(radius_m)
  };
  const result=await dbAuthRelation(relation(id)).insert(data).select('uid').single();
  return verified(result,'新增定錨點');
}
// One authorized insert per bounded batch, not one SQL round-trip per place.
// A fresh source read skips names already saved by a previous partial run.
// This never writes to Galaxy's source_place or any other article field.
export async function addTraceAnchorsBatch({scopeId,places=[]}){
  const id=sourceId(scopeId);
  if(id==='loc')throw Error('請在作品所屬的 Scope 建立空間定錨點。');
  const list=Array.isArray(places)?places:[];
  if(!list.length)throw Error('沒有已核對的座標可以儲存。');
  if(list.length>2000)throw Error('單次匯入超過安全上限。');
  const seen=new Set(), prepared=[];
  for(const place of list){
    const title=verifiedText(place.title,'打卡地點名稱');
    if(seen.has(title))continue;
    seen.add(title);
    if(!validCoordinates(place.longitude,place.latitude))
      throw Error(title+' 的經緯度無效，請先確認候選位置。');
    if(!validRadius(place.radius_m??500))throw Error(title+' 的空間範圍無效。');
    prepared.push({
      uid:createUid8(),trace_type:'anchor',title,
      longitude:Number(place.longitude),latitude:Number(place.latitude),
      radius_m:Number(place.radius_m??500),description:''
    });
  }
  const previous=await readTraceData(id);
  const names=new Set(previous.anchors.map(row=>String(row.title||'').trim()));
  const pending=prepared.filter(row=>!names.has(row.title));
  let count=0;
  for(let offset=0;offset<pending.length;offset+=80){
    const chunk=pending.slice(offset,offset+80);
    try{
      const rows=verified(await dbAuthRelation(relation(id)).insert(chunk).select('uid'),'批次建立空間定錨點');
      if(!Array.isArray(rows)||rows.length!==chunk.length)throw Error('批次寫入數量不符');
      count+=rows.length;
    }catch(error){
      throw Error('已成功寫入 '+count+' 處，後續批次失敗：'+String(error.message||error)+'。可重新執行，已存在的地點會跳過。');
    }
  }
  return {count,skipped:list.length-pending.length};
}

export async function updateTraceAnchor({scopeId,uid,title,description='',longitude,latitude,radius_m=500}){
  const id=sourceId(scopeId);
  const anchorId=String(uid||'').trim();
  if(!/^[A-Za-z0-9]{8}$/.test(anchorId))throw Error('定錨點 UID 格式無效。');
  if(!validCoordinates(longitude,latitude))throw Error('經緯度超出有效範圍。');
  if(!validRadius(radius_m))throw Error('空間範圍必須介於 10 公尺與 20,000 公里。');
  const changes={
    title:verifiedText(title,'定錨點名稱'),
    description:descriptionText(description),
    longitude:Number(longitude),latitude:Number(latitude),radius_m:Number(radius_m)
  };
  let request=dbAuthRelation(relation(id)).update(changes)
    .eq('uid',anchorId).eq('trace_type','anchor');
  if(id==='loc')request=request.eq('scope_id','loc');
  const result=await request.select('uid').single();
  return verified(result,'更新定錨點');
}

function validatedTraceMapValues({scopeId,title,description='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const chosen=Array.isArray(anchorUids)?anchorUids:[];
  if(chosen.length<2||chosen.length>80||new Set(chosen).size!==chosen.length)
    throw Error('請依順序選擇 2～80 個不重複的定錨點。');
  const existing=new Set(anchors.filter(row=>row.source_scope===id).map(row=>row.uid));
  if(chosen.some(uid=>!existing.has(uid)))
    throw Error('痕跡圖不能引用不同 Scope 或不存在的定錨點。');
  return {
    title:verifiedText(title,'痕跡圖名稱'),description:descriptionText(description),
    anchor_uids:chosen
  };
}
function traceMapUid(uid){
  const id=String(uid||'').trim();
  if(!/^[A-Za-z0-9]{8}$/.test(id))throw Error('痕跡圖 UID 格式無效。');
  return id;
}
export async function addTraceMap({scopeId,title,description='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const data={uid:createUid8(),trace_type:'map',
    ...validatedTraceMapValues({scopeId:id,title,description,anchorUids,anchors})};
  const result=await dbAuthRelation(relation(id)).insert(data).select('uid').single();
  return verified(result,'新增痕跡圖');
}
export async function updateTraceMap({scopeId,uid,title,description='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const changes=validatedTraceMapValues({scopeId:id,title,description,anchorUids,anchors});
  let request=dbAuthRelation(relation(id)).update(changes)
    .eq('uid',traceMapUid(uid)).eq('trace_type','map');
  if(id==='loc')request=request.eq('scope_id','loc');
  return verified(await request.select('uid').single(),'更新痕跡圖');
}
export async function deleteTraceMap({scopeId,uid}){
  const id=sourceId(scopeId);
  // Remove the selected saved route only. The original spatial anchors and
  // Galaxy articles are never deleted when a map is removed.
  let request=dbAuthRelation(relation(id)).delete()
    .eq('uid',traceMapUid(uid)).eq('trace_type','map');
  if(id==='loc')request=request.eq('scope_id','loc');
  return verified(await request.select('uid').single(),'刪除痕跡圖');
}
