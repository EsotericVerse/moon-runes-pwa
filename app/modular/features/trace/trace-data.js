'use client';

import {dbPublicClient,dbAuthClient,dbAuthRelation} from '../../../loc/db-client.mjs';
import {findAnchorWriteMatches,organizeAnchorCandidates} from './trace-organizer.mjs';

export const TRACE_SCOPES=Object.freeze(['loc','lo3rwang','lrunes']);
export const traceKey=(scopeId,{includeHidden=false}={})=>['scope-trace',scopeId,...(includeHidden?['manager']:[])];
export const traceMapIndexKey=(scopeId,{nativeOnly=false,includeHidden=false}={})=>['trace-map-index',scopeId,...(nativeOnly?['native']:[]),...(includeHidden?['manager']:[])];
export const traceCurrentKey=(scopeId,route,{nativeOnly=false,includeHidden=false}={})=>
  ['trace-current',scopeId,route.uid,JSON.stringify(route.anchor_list||[]),...(nativeOnly?['native']:[]),...(includeHidden?['manager']:[])];
export const traceAllAnchorsKey=(scopeId,{nativeOnly=false,includeHidden=false}={})=>
  ['trace-all-anchors',scopeId,...(nativeOnly?['native']:[]),...(includeHidden?['manager']:[])];
const VALID_ID=/^[A-Za-z0-9]{4}$/;
const TRACE_TYPES=['space_anchor','space_period','space_trace'];
const CORE_COLUMNS='uid,trace_type,title,description,anchor_list,route_list,hidden_depth,times,address';
const visibleDepth=value=>{const number=Number(value);if(![-1,0,1,2].includes(number))throw Error('隱藏範圍不正確');return number;};
const idScope=value=>{
  const id=String(value||'').toLowerCase().trim();
  if(!TRACE_SCOPES.includes(id))throw Error('無效的空間 Scope');
  return id;
};
const writableScope=scopeId=>{
  const scope=idScope(scopeId);
  if(scope==='loc')throw Error('LOC 空間聚合尚未重建；請先整理來源 Scope');
  return scope;
};
const relation=id=>'silver.'+writableScope(id)+'_trace';
function checked(result,label){
  if(result.error)throw Error(label+'：'+result.error.message);
  return result.data;
}
const nonempty=(value,label,max=120)=>{
  const result=String(value||'').trim();
  if(!result||result.length>max)throw Error(label+'必填，最多 '+max+' 字');
  return result;
};
const textValue=value=>String(value??'').trim();
const noteValue=value=>typeof value==='string'?value:String(value?.text||'');
const descriptionObject=(text,postal='')=>{
  const message=textValue(text),address=textValue(postal);
  if(message.length>2000||address.length>320)throw Error('說明或文字地址過長');
  return {text:message,address:address||null};
};
export const validCoordinates=(longitude,latitude)=>
  (longitude==null||String(longitude).trim()==='')&&(latitude==null||String(latitude).trim()==='')
  ||(longitude!=null&&latitude!=null&&String(longitude).trim()!==''&&String(latitude).trim()!==''
    &&Number.isFinite(Number(longitude))&&Number.isFinite(Number(latitude))
    &&Math.abs(Number(longitude))<=180&&Math.abs(Number(latitude))<=90);
export const validRadius=value=>Number.isInteger(Number(value))&&Number(value)>=10&&Number(value)<=20000000;
const coordinateArray=(longitude,latitude)=>{
  if(!validCoordinates(longitude,latitude))throw Error('經緯度需同時輸入有效數值，或同時留空');
  if(longitude==null||String(longitude).trim()==='')return null;
  return [Number(longitude),Number(latitude)];
};
function readRow(row,scope){
  const description=row?.description&&typeof row.description==='object'?row.description:{text:noteValue(row?.description)};
  const coordinates=Array.isArray(row?.address)&&row.address.length===2?row.address:null;
  return {...row,description:noteValue(description),postal_address:String(description.address||''),
    longitude:coordinates?.[0]??null,latitude:coordinates?.[1]??null,
    source_scope:row.scope_id||scope,anchor_list:Array.isArray(row.anchor_list)?row.anchor_list:[]};
}
async function readPages(id,{columns=CORE_COLUMNS,filter=null,nativeOnly=false,includeHidden=false}={}){
  // The LOC materialized union was deliberately dropped. Never query it
  // until the owner Scope place data has been reviewed and a new union built.
  if(id==='loc')return [];
  const union=false,rows=[],size=750;
  for(let offset=0;;offset+=size){
    let query=(includeHidden?dbAuthClient:dbPublicClient).schema('silver').from(id+'_trace')
      .select(columns+(union?',scope_id':'')).order('uid',{ascending:true})
      .range(offset,offset+size-1);
    if(filter)query=query.eq('trace_type',filter);
    if(union&&nativeOnly)query=query.eq('scope_id','loc');
    if(union)query=query.order('scope_id',{ascending:true});
    const batch=checked(await query,'空間資料讀取')||[];
    rows.push(...batch.map(row=>readRow(row,id)));
    if(batch.length<size)break;
  }
  return rows;
}
export async function readTraceData(scopeId,{includeHidden=false}={}){
  const id=idScope(scopeId),rows=await readPages(id,{includeHidden});
  return {anchors:rows.filter(row=>row.trace_type==='space_anchor'),
    maps:rows.filter(row=>row.trace_type==='space_period'||row.trace_type==='space_trace')};
}
export async function readTraceMapIndex(scopeId,{nativeOnly=false,includeHidden=false}={}){
  const id=idScope(scopeId);
  return readPages(id,{columns:'uid,trace_type,title,description,anchor_list,route_list,hidden_depth',nativeOnly,includeHidden})
    .then(rows=>rows.filter(row=>row.trace_type==='space_period'||row.trace_type==='space_trace'));
}
export const traceMemberUids=record=>[...new Set((record?.anchor_list||[])
  .flat(Infinity).map(uid=>String(uid||'').trim()).filter(uid=>VALID_ID.test(uid)))];
export async function readCurrentTraceAnchors(scopeId,anchorUids=[],{nativeOnly=false,includeHidden=false}={}){
  const id=idScope(scopeId);
  if(id==='loc')return [];
  const ids=[...new Set((anchorUids||[]).flat(Infinity)
    .map(uid=>String(uid||'').trim()).filter(uid=>VALID_ID.test(uid)))];
  if(!ids.length)return [];
  if(ids.length>800)throw Error('地點數量超過上限');
  let query=(includeHidden?dbAuthClient:dbPublicClient).schema('silver').from(id+'_trace')
    .select(CORE_COLUMNS+(id==='loc'?',scope_id':''))
    .eq('trace_type','space_anchor').in('uid',ids).limit(900);
  if(id==='loc'&&nativeOnly)query=query.eq('scope_id','loc');
  const rows=(checked(await query,'空間地點讀取')||[]).map(row=>readRow(row,id));
  const byId=new Map(rows.map(row=>[row.uid,row]));
  return ids.map(uid=>byId.get(uid)).filter(Boolean);
}
export async function readAllTraceAnchors(scopeId,{nativeOnly=false,includeHidden=false}={}){
  return readPages(idScope(scopeId),{filter:'space_anchor',nativeOnly,includeHidden});
}
export async function readTraceAnchorSuggestions(scopeId,term,limit=8){
  const id=idScope(scopeId),q=textValue(term).slice(0,100);
  if(id==='loc'||!q)return [];
  const data=checked(await dbPublicClient.schema('silver').rpc('search_scope_trace_place_names',{
    p_scope_id:id,p_term:q,p_limit:Math.max(1,Math.min(Number(limit)||8,100))
  }),'搜尋地點標題')||[];
  if(!data.length)return [];
  const ids=data.map(row=>row.uid).filter(uid=>VALID_ID.test(String(uid)));
  if(!ids.length)return [];
  const allowed=checked(await dbPublicClient.schema('silver').from(id+'_trace')
    .select('uid').eq('trace_type','space_anchor').in('uid',ids),'公開地點權限檢查')||[];
  const visible=new Set(allowed.map(row=>row.uid));
  return data.filter(row=>visible.has(row.uid)).map(row=>readRow({...row,trace_type:'space_anchor'},id));
}
export async function readTracePopularAnchors(scopeId){
  return (await readAllTraceAnchors(scopeId,{nativeOnly:scopeId==='loc'})).slice(0,10);
}
// Cross-Scope reference suggestions remain disabled while LOC union is absent.
export async function readTraceAddressReferences(_scopeId,_term,_limit=8){
  return [];
}
export async function inspectTraceAnchorBeforeWrite({scopeId,anchor,excludeUid=''}){
  const id=idScope(scopeId),anchors=await readAllTraceAnchors(id,{nativeOnly:id==='loc'});
  const matches=findAnchorWriteMatches({...anchor,trace_type:'space_anchor',source_scope:id},
    anchors.filter(row=>row.uid!==excludeUid));
  return {reuse:null,matches}; // Never merge spatial identities without explicit approval.
}
export async function addTraceAnchor({scopeId,title,description='',address='',longitude,latitude,times=[],hiddenDepth=-1}){
  const id=writableScope(scopeId);
  const record={trace_type:'space_anchor',title:nonempty(title,'地點標題'),
    description:descriptionObject(description,address),
    address:coordinateArray(longitude,latitude),hidden_depth:visibleDepth(hiddenDepth),
    times:Array.isArray(times)?times:[],anchor_list:[]};
  let query=dbAuthRelation(relation(id)).insert(record).select('uid').single();
  return checked(await query,'新增空間定錨點');
}
export async function updateTraceAnchor({scopeId,uid,title,description='',address='',longitude,latitude,hiddenDepth=-1}){
  const id=writableScope(scopeId),selected=textValue(uid);
  if(!VALID_ID.test(selected))throw Error('地點 UID 必須是四碼');
  const record={title:nonempty(title,'地點標題'),
    description:descriptionObject(description,address),
    address:coordinateArray(longitude,latitude),hidden_depth:visibleDepth(hiddenDepth)};
  let query=dbAuthRelation(relation(id)).update(record).eq('uid',selected).eq('trace_type','space_anchor');
  if(id==='loc')query=query.eq('scope_id','loc');
  return checked(await query.select('uid').single(),'更新空間定錨點');
}
// Bulk rename preserves every Trace UID, coordinate, timestamp and route reference.
// It changes title only; the caller explicitly selects a reviewed canonical spelling.
export async function renameTraceAnchorTitles({scopeId,uids,title}){
  const id=writableScope(scopeId);
  const ids=[...new Set((uids||[]).map(value=>textValue(value)))];
  if(!ids.length||ids.length>100||ids.some(uid=>!VALID_ID.test(uid)))
    throw Error('快速更新定錨點清單無效');
  const result=checked(await dbAuthRelation(relation(id))
    .update({title:nonempty(title,'地點標題')})
    .eq('trace_type','space_anchor').in('uid',ids)
    .select('uid'),'快速更新地點名稱')||[];
  if(result.length!==ids.length)throw Error('部分地點未能更新，請重新載入確認 UID');
  return result.length;
}
export async function addTraceAnchorsBatch({scopeId,places=[]}){
  const id=writableScope(scopeId);
  if(id==='loc')throw Error('請在作品 Scope 儲存地點');
  if(!Array.isArray(places)||places.length>2000)throw Error('大量匯入範圍無效');
  const existing=await readAllTraceAnchors(id),seen=new Set(existing
    .map(item=>item.title.trim().toLocaleLowerCase()+'|'+JSON.stringify(item.address)));
  const inserts=[];let skipped=0;
  for(const place of places){
    const title=nonempty(place.title,'地點標題');
    const address=coordinateArray(place.longitude,place.latitude);
    const key=title.toLocaleLowerCase()+'|'+JSON.stringify(address);
    if(seen.has(key)){skipped++;continue;}
    seen.add(key);
    inserts.push({trace_type:'space_anchor',title,
      description:descriptionObject(place.description||'',place.address||''),
      address,anchor_list:[],times:Array.isArray(place.times)?place.times:[]});
  }
  let count=0;
  for(let offset=0;offset<inserts.length;offset+=80){
    const chunk=inserts.slice(offset,offset+80);
    const inserted=checked(await dbAuthRelation(relation(id)).insert(chunk).select('uid'),'批次新增地點')||[];
    count+=inserted.length;
  }
  const review=organizeAnchorCandidates((await readAllTraceAnchors(id)));
  return {count,skipped,consolidated:0,duplicatesInBatch:skipped,reviewCount:review.length,
    reviewPreview:review.slice(0,8),auditError:''};
}
function validatedConnections({scopeId,type,anchorUids=[],anchors=[],hasRoutes=false}){
  const id=idScope(scopeId),list=Array.isArray(anchorUids)?anchorUids:[];
  if(!['space_period','space_trace'].includes(type))throw Error('無效的連線類型');
  const ids=list.flat(Infinity);
  const known=new Set((anchors||[]).filter(row=>row.source_scope===id).map(row=>row.uid));
  if(ids.some(uid=>!VALID_ID.test(String(uid))||!known.has(uid)))throw Error('連線含不存在或跨 Scope 的地點');
  if(type==='space_period'){
    if(list.length<2||list.length>80||list.some(Array.isArray)||new Set(list).size!==list.length)
      throw Error('路線需依序排列 2～80 個不同地點');
  }else if((!hasRoutes&&list.length<1)||list.length>400||list.some(pair=>
    !Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(Array.isArray)))
    throw Error('痕跡圖需由一組以上的起點／終點配對組成');
  return list;
}
// A Spatial Trace's second level is an explicit list of existing routes, not
// geographic inference. Members are validated in the same writable Scope.
async function validatedRouteList(scopeId,type,routeUids=[]){
  const ids=[...new Set((Array.isArray(routeUids)?routeUids:[]).map(textValue))];
  if(ids.length>80||ids.some(uid=>!VALID_ID.test(uid)))throw Error('路線圖關聯必須是本 Scope 的四碼 UID');
  if(type!=='space_trace'){
    if(ids.length)throw Error('只有空間痕跡圖可包含路線圖');
    return [];
  }
  if(!ids.length)return [];
  const rows=checked(await dbAuthRelation(relation(scopeId)).select('uid')
    .eq('trace_type','space_period').in('uid',ids).limit(81),'確認下層路線圖')||[];
  if(rows.length!==ids.length)throw Error('包含不存在或跨 Scope 的路線圖');
  return ids;
}
const validUid=value=>VALID_ID.test(textValue(value));
export async function addTraceMap({scopeId,title,description='',type='space_period',anchorUids=[],anchors=[],routeUids=[],hiddenDepth=-1}){
  const id=writableScope(scopeId),route_list=await validatedRouteList(id,type,routeUids);
  const anchor_list=validatedConnections({scopeId:id,type,anchorUids,anchors,hasRoutes:route_list.length>0});
  return checked(await dbAuthRelation(relation(id)).insert({
    trace_type:type,title:nonempty(title,'名稱'),description:descriptionObject(description),
    anchor_list,route_list,hidden_depth:visibleDepth(hiddenDepth)
  }).select('uid').single(),'儲存路線或痕跡圖');
}
export async function updateTraceMap({scopeId,uid,title,description='',type='space_period',anchorUids=[],anchors=[],routeUids=[],hiddenDepth=-1}){
  const id=writableScope(scopeId),key=textValue(uid);
  if(!validUid(key))throw Error('無效 UID');
  const route_list=await validatedRouteList(id,type,routeUids);
  const anchor_list=validatedConnections({scopeId:id,type,anchorUids,anchors,hasRoutes:route_list.length>0});
  let query=dbAuthRelation(relation(id)).update({
    title:nonempty(title,'名稱'),description:descriptionObject(description),anchor_list,route_list,
    hidden_depth:visibleDepth(hiddenDepth)
  }).eq('uid',key).eq('trace_type',type);
  if(id==='loc')query=query.eq('scope_id','loc');
  return checked(await query.select('uid').single(),'更新路線或痕跡圖');
}
export async function updateTraceVisibilityBulk({scopeId,uids=[],hiddenDepth=-1}){
  const id=writableScope(scopeId),ids=[...new Set(uids.map(textValue))];
  if(!ids.length||ids.length>200||ids.some(uid=>!VALID_ID.test(uid)))throw Error('請選擇 1 至 200 筆有效項目');
  const rows=checked(await dbAuthRelation(relation(id)).update({hidden_depth:visibleDepth(hiddenDepth)})
    .in('uid',ids).select('uid'),'大量設定空間隱藏')||[];
  if(rows.length!==ids.length)throw Error('部分地點權限未更新，請重新讀取');
  return rows.length;
}
export async function deleteTraceMap({scopeId,uid,type='space_period'}){
  const id=writableScope(scopeId);
  if(!validUid(uid)||!['space_period','space_trace'].includes(type))throw Error('無效的刪除目標');
  let query=dbAuthRelation(relation(id)).delete().eq('uid',uid).eq('trace_type',type);
  if(id==='loc')query=query.eq('scope_id','loc');
  return checked(await query.select('uid').single(),'刪除路線或痕跡圖');
}
