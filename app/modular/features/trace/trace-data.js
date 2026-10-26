'use client';

import {dbPublicClient,dbAuthRelation} from '../../../loc/db-client.mjs';
import {findAnchorWriteMatches,organizeAnchorCandidates} from './trace-organizer.mjs';

export const TRACE_SCOPES=Object.freeze(['loc','lo3rwang','lrunes']);
export const traceKey=scopeId=>['scope-trace',scopeId];
export const traceMapIndexKey=(scopeId,{nativeOnly=false}={})=>['trace-map-index',scopeId,...(nativeOnly?['native']:[])];
export const traceCurrentKey=(scopeId,route,{nativeOnly=false}={})=>
  ['trace-current',scopeId,route.uid,JSON.stringify(route.anchor_list||[]),...(nativeOnly?['native']:[])];
export const traceAllAnchorsKey=(scopeId,{nativeOnly=false}={})=>
  ['trace-all-anchors',scopeId,...(nativeOnly?['native']:[])];
const VALID_ID=/^[A-Za-z0-9]{4}$/;
const TRACE_TYPES=['space_anchor','space_road','space_trace'];
const CORE_COLUMNS='uid,trace_type,title,description,anchor_list,times,address';
const idScope=value=>{
  const id=String(value||'').toLowerCase().trim();
  if(!TRACE_SCOPES.includes(id))throw Error('無效的空間 Scope');
  return id;
};
const relation=id=>'silver.'+idScope(id)+'_trace';
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
async function readPages(id,{columns=CORE_COLUMNS,filter=null,nativeOnly=false}={}){
  const union=id==='loc',rows=[],size=750;
  for(let offset=0;;offset+=size){
    let query=dbPublicClient.schema('silver').from(id+'_trace')
      .select(columns+(union?',scope_id':'')).order('uid',{ascending:true})
      .range(offset,offset+size-1);
    if(filter)query=query.eq('trace_type',filter);
    if(union&&nativeOnly)query=query.eq('scope_id','loc');
    const batch=checked(await query,'空間資料讀取')||[];
    rows.push(...batch.map(row=>readRow(row,id)));
    if(batch.length<size)break;
  }
  return rows;
}
export async function readTraceData(scopeId){
  const id=idScope(scopeId),rows=await readPages(id);
  return {anchors:rows.filter(row=>row.trace_type==='space_anchor'),
    maps:rows.filter(row=>row.trace_type==='space_road'||row.trace_type==='space_trace')};
}
export async function readTraceMapIndex(scopeId,{nativeOnly=false}={}){
  const id=idScope(scopeId);
  return readPages(id,{columns:'uid,trace_type,title,description,anchor_list',nativeOnly})
    .then(rows=>rows.filter(row=>row.trace_type==='space_road'||row.trace_type==='space_trace'));
}
export const traceMemberUids=record=>[...new Set((record?.anchor_list||[])
  .flat(Infinity).map(uid=>String(uid||'').trim()).filter(uid=>VALID_ID.test(uid)))];
export async function readCurrentTraceAnchors(scopeId,anchorUids=[],{nativeOnly=false}={}){
  const id=idScope(scopeId),ids=[...new Set((anchorUids||[]).flat(Infinity)
    .map(uid=>String(uid||'').trim()).filter(uid=>VALID_ID.test(uid)))];
  if(!ids.length)return [];
  if(ids.length>800)throw Error('地點數量超過上限');
  let query=dbPublicClient.schema('silver').from(id+'_trace')
    .select(CORE_COLUMNS+(id==='loc'?',scope_id':''))
    .eq('trace_type','space_anchor').in('uid',ids).limit(900);
  if(id==='loc'&&nativeOnly)query=query.eq('scope_id','loc');
  const rows=(checked(await query,'空間地點讀取')||[]).map(row=>readRow(row,id));
  const byId=new Map(rows.map(row=>[row.uid,row]));
  return ids.map(uid=>byId.get(uid)).filter(Boolean);
}
export async function readAllTraceAnchors(scopeId,{nativeOnly=false}={}){
  return readPages(idScope(scopeId),{filter:'space_anchor',nativeOnly});
}
export async function readTraceAnchorSuggestions(scopeId,term,limit=8){
  const id=idScope(scopeId),q=textValue(term).slice(0,100);
  if(!q)return [];
  const data=checked(await dbPublicClient.schema('silver').rpc('search_scope_trace_place_names',{
    p_scope_id:id,p_term:q,p_limit:Math.max(1,Math.min(Number(limit)||8,100))
  }),'搜尋地點標題')||[];
  return data.map(row=>readRow({...row,trace_type:'space_anchor'},id));
}
export async function readTracePopularAnchors(scopeId){
  return (await readAllTraceAnchors(scopeId,{nativeOnly:scopeId==='loc'})).slice(0,10);
}
export async function readTraceAddressReferences(scopeId,term,limit=8){
  const owner=idScope(scopeId),q=textValue(term);
  if(q.length<2)return [];
  const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  const result=await dbPublicClient.schema('silver').from('loc_trace')
    .select(CORE_COLUMNS+',scope_id')
    .eq('trace_type','space_anchor').neq('scope_id',owner)
    .ilike('title',pattern).limit(Math.min(Math.max(Number(limit)||8,1),8));
  return (checked(result,'讀取公開地點名稱')||[]).map(row=>readRow(row,'loc'));
}
export async function inspectTraceAnchorBeforeWrite({scopeId,anchor,excludeUid=''}){
  const id=idScope(scopeId),anchors=await readAllTraceAnchors(id,{nativeOnly:id==='loc'});
  const matches=findAnchorWriteMatches({...anchor,trace_type:'space_anchor',source_scope:id},
    anchors.filter(row=>row.uid!==excludeUid));
  return {reuse:null,matches}; // Never merge spatial identities without explicit approval.
}
export async function addTraceAnchor({scopeId,title,description='',address='',longitude,latitude,times=[]}){
  const id=idScope(scopeId);
  const record={trace_type:'space_anchor',title:nonempty(title,'地點標題'),
    description:descriptionObject(description,address),
    address:coordinateArray(longitude,latitude),
    times:Array.isArray(times)?times:[],anchor_list:[]};
  let query=dbAuthRelation(relation(id)).insert(record).select('uid').single();
  return checked(await query,'新增空間定錨點');
}
export async function updateTraceAnchor({scopeId,uid,title,description='',address='',longitude,latitude}){
  const id=idScope(scopeId),selected=textValue(uid);
  if(!VALID_ID.test(selected))throw Error('地點 UID 必須是四碼');
  const record={title:nonempty(title,'地點標題'),
    description:descriptionObject(description,address),
    address:coordinateArray(longitude,latitude)};
  let query=dbAuthRelation(relation(id)).update(record).eq('uid',selected).eq('trace_type','space_anchor');
  if(id==='loc')query=query.eq('scope_id','loc');
  return checked(await query.select('uid').single(),'更新空間定錨點');
}
export async function addTraceAnchorsBatch({scopeId,places=[]}){
  const id=idScope(scopeId);
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
function validatedConnections({scopeId,type,anchorUids=[],anchors=[]}){
  const id=idScope(scopeId),list=Array.isArray(anchorUids)?anchorUids:[];
  if(!['space_road','space_trace'].includes(type))throw Error('無效的連線類型');
  const ids=list.flat(Infinity);
  const known=new Set((anchors||[]).filter(row=>row.source_scope===id).map(row=>row.uid));
  if(ids.some(uid=>!VALID_ID.test(String(uid))||!known.has(uid)))throw Error('連線含不存在或跨 Scope 的地點');
  if(type==='space_road'){
    if(list.length<2||list.length>80||list.some(Array.isArray)||new Set(list).size!==list.length)
      throw Error('路線需依序排列 2～80 個不同地點');
  }else if(list.length<1||list.length>400||list.some(pair=>
    !Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(Array.isArray)))
    throw Error('痕跡圖需由一組以上的起點／終點配對組成');
  return list;
}
const validUid=value=>VALID_ID.test(textValue(value));
export async function addTraceMap({scopeId,title,description='',type='space_road',anchorUids=[],anchors=[]}){
  const id=idScope(scopeId),anchor_list=validatedConnections({scopeId:id,type,anchorUids,anchors});
  return checked(await dbAuthRelation(relation(id)).insert({
    trace_type:type,title:nonempty(title,'名稱'),description:descriptionObject(description),
    anchor_list
  }).select('uid').single(),'儲存路線或痕跡圖');
}
export async function updateTraceMap({scopeId,uid,title,description='',type='space_road',anchorUids=[],anchors=[]}){
  const id=idScope(scopeId),key=textValue(uid);
  if(!validUid(key))throw Error('無效 UID');
  const anchor_list=validatedConnections({scopeId:id,type,anchorUids,anchors});
  let query=dbAuthRelation(relation(id)).update({
    title:nonempty(title,'名稱'),description:descriptionObject(description),anchor_list
  }).eq('uid',key).eq('trace_type',type);
  if(id==='loc')query=query.eq('scope_id','loc');
  return checked(await query.select('uid').single(),'更新路線或痕跡圖');
}
export async function deleteTraceMap({scopeId,uid,type='space_road'}){
  const id=idScope(scopeId);
  if(!validUid(uid)||!['space_road','space_trace'].includes(type))throw Error('無效的刪除目標');
  let query=dbAuthRelation(relation(id)).delete().eq('uid',uid).eq('trace_type',type);
  if(id==='loc')query=query.eq('scope_id','loc');
  return checked(await query.select('uid').single(),'刪除路線或痕跡圖');
}
