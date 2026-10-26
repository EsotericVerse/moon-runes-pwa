'use client';

import {dbPublicClient,dbAuthRelation} from '../../../loc/db-client.mjs';
import {createUid8} from '../../../loc/uid';
import {traceCountyId} from './trace-county-id.mjs';
import {validateTraceRouteLabels} from './trace-route-classes.mjs';
import {anchorAddress,findAnchorWriteMatches,normalizeAnchorAddress,organizeAnchorCandidates} from './trace-organizer.mjs';

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
// County IDs are derived once on writes, not computed for every keystroke in
// the route composer. Unknown/border/overseas coordinates remain NULL.
function countyIdFromAddress(address){
  const start=String(address||'').trim().match(/^(.{2,3}[縣市])/u);
  return start?traceCountyId(start[1]):null;
}
async function countyIdAt(_longitude,_latitude,address=''){
  // GPS is only horizontal evidence; no postal county is fabricated when
  // the complete postal address is missing. Old county_id remains readable.
  return countyIdFromAddress(address);
}
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
// Floor is a semantic vertical coordinate, not inferred building height.
// Preserve complete unit/floor address text (e.g. B1, 3-4樓, 5樓之2).
function locationFields({address='',floor_label='',floor_level=null}={}){
  const full=String(address||'').trim();
  // The address itself can include a floor, as in ...152號B1 or ...100號2樓.
  // Extract only unambiguous suffixes; multi-floor units keep the label but
  // have no single numeric vertical level.
  const suffix=full.match(/(地下[0-9]+樓|B[0-9]+|[0-9]+[-~–～至][0-9]+樓|[0-9]+樓(?:之[0-9]+)?|[0-9]+F)$/i);
  const floor=String(floor_label||'').trim()||suffix?.[1]||'';
  if(full.length>320)throw Error('完整地址最多 320 字。');
  if(floor.length>40)throw Error('樓層／室別最多 40 字。');
  const raw=String(floor_level??'').trim();
  let level=raw===''?null:Number(raw);
  if(level===null){
    const solo=floor.match(/^(?:地下([0-9]+)樓|B([0-9]+)|([0-9]+)樓(?:之[0-9]+)?|([0-9]+)F)$/i);
    if(solo)level=solo[1]||solo[2]? -Number(solo[1]||solo[2]):Number(solo[3]||solo[4]);
  }
  if(level!==null&&(!Number.isInteger(level)||level===0||level < -100||level>300))
    throw Error('樓層序號需為 -100～-1 或 1～300；未知或跨樓層可留空。');
  return {address:full,floor_label:floor,floor_level:level};
}
export async function readTraceData(scopeId){
  const id=sourceId(scopeId);
  const union=id==='loc';
  const columns='uid,trace_type,title,description,longitude,latitude,radius_m,anchor_uids,created_at,times,county_id,address,floor_label,floor_level'+(union?',scope_id':'');
  // Read only when the selected Trace screen mounts. A former 2,000-row cap
  // silently hid historical places as imports grew; bounded pages preserve all.
  // This does not run on every autocomplete keystroke.
  const rows=[],pageSize=800;
  for(let offset=0;;offset+=pageSize){
    let request=dbPublicClient.schema('silver').from(id+'_trace')
      .select(columns).order('created_at',{ascending:true})
      .order('uid',{ascending:true});
    // The LOC union can contain the same UID in different Scopes; stable
    // pagination must include scope_id as the final tie-breaker.
    if(union)request=request.order('scope_id',{ascending:true});
    const result=await request.range(offset,offset+pageSize-1);
    const batch=verified(result,id+' 痕跡讀取')||[];
    rows.push(...batch.map(row=>({...row,source_scope:union?row.scope_id:id})));
    if(batch.length<pageSize)break;
  }
  return {
    anchors:rows.filter(row=>row.trace_type==='anchor'),
    maps:rows.filter(row=>row.trace_type==='map')
  };
}

/**
 * A saved trace map is the spatial counterpart of a Time period.
 * Its ordered anchor_uids are the membership list; do not invent a second
 * grouping table, or collapse distinct check-ins at the same coordinates.
 * The index is small. Only the current trace's anchors are read on demand.
 */
export const traceMapIndexKey=scopeId=>['trace-map-index',scopeId];
export const traceCurrentKey=(scopeId,route)=>[
  'trace-current',scopeId,route.uid,(route.anchor_uids||[]).join(',')
];
export const traceAllAnchorsKey=scopeId=>['trace-all-anchors',scopeId];

const TRACE_DISPLAY_COLUMNS='uid,trace_type,title,description,longitude,latitude,radius_m,anchor_uids,created_at,times,county_id,address,floor_label,floor_level';

export async function readTraceMapIndex(scopeId,{nativeOnly=false}={}){
  const id=sourceId(scopeId);
  const union=id==='loc';
  const columns='uid,trace_type,title,description,anchor_uids,created_at,category,"class",class_group'+(union?',scope_id':'');
  let request=dbPublicClient.schema('silver').from(id+'_trace')
    .select(columns).eq('trace_type','map');
  if(union&&nativeOnly)request=request.eq('scope_id','loc');
  const result=await request.order('created_at',{ascending:false}).limit(2000);
  return (verified(result,'痕跡列表讀取')||[])
    .map(row=>({...row,source_scope:union?row.scope_id:id}));
}

export async function readCurrentTraceAnchors(scopeId,anchorUids=[],{nativeOnly=false}={}){
  const id=sourceId(scopeId);
  const ids=[...new Set((Array.isArray(anchorUids)?anchorUids:[])
    .map(uid=>String(uid||'').trim()).filter(uid=>/^[A-Za-z0-9]{8}$/.test(uid)))];
  if(ids.length>80)throw Error('單張痕跡圖的站點超過上限。');
  if(!ids.length)return [];
  const union=id==='loc';
  let request=dbPublicClient.schema('silver').from(id+'_trace')
    .select(TRACE_DISPLAY_COLUMNS+(union?',scope_id':''))
    .eq('trace_type','anchor').in('uid',ids);
  if(union&&nativeOnly)request=request.eq('scope_id','loc');
  const result=await request.limit(80);
  const found=(verified(result,'Current 痕跡錨點讀取')||[])
    .map(row=>({...row,source_scope:union?row.scope_id:id}));
  const byUid=new Map(found.map(row=>[row.uid,row]));
  // Preserve route order; never silently replace missing anchors.
  return ids.map(uid=>byUid.get(uid)).filter(Boolean);
}

// This is a READ-ONLY address library. Cross-Scope candidates are evidence,
// never a foreign UID that may be placed in the current Scope's route queue.
export async function readTraceAddressReferences(scopeId,term,limit=8){
  const owner=sourceId(scopeId);
  const q=String(term||'').trim().slice(0,100);
  if(q.length<2)return [];
  // PostgREST OR syntax requires quoted/escaped literal values for commas,
  // parentheses and quoted address/name fragments; SQL parameters stay bound.
  const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  const literal='"'+pattern.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  const result=await dbPublicClient.schema('silver').from('loc_trace')
    .select('scope_id,uid,trace_type,title,description,address,floor_label,floor_level,county_id,longitude,latitude,radius_m')
    .eq('trace_type','anchor').neq('scope_id',owner)
    .not('longitude','is',null).not('latitude','is',null)
    .or('title.ilike.'+literal+',address.ilike.'+literal)
    .order('title',{ascending:true}).order('uid',{ascending:true})
    .limit(Math.min(Math.max(1,Number(limit)||8),8));
  return (verified(result,'LOC 跨 Scope 地址參考')||[])
    .map(row=>({...row,source_scope:row.scope_id}));
}

// "All anchors" is an explicit choice, not an eager bootstrap dependency.
// Paginate: a single 2,000-row cap would silently hide old check-ins.
// Search the server only after a user types inside a selected county.
export async function readTraceAnchorSuggestions(scopeId,countyId,term,limit=8){
  const id=sourceId(scopeId),q=String(term||'').trim().slice(0,100);
  const county=String(countyId||'');
  if(!q||!county)return [];
  const union=id==='loc';
  const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  let request=dbPublicClient.schema('silver').from(id+'_trace')
    .select('uid,title,trace_type,county_id,address,floor_label,floor_level,longitude,latitude'+(union?',scope_id':''))
    .eq('trace_type','anchor');
  // Address and place label are independent searchable evidence; matching a
  // full postal address must not depend on a place having the same title.
  // Quote the OR filter literal so commas and parentheses stay data.
  const literal='"'+pattern.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  const filters=['title.ilike.'+literal,'address.ilike.'+literal];
  if(/^[A-Za-z0-9]{8}$/.test(q))filters.push('uid.eq.'+q);
  request=request.or(filters.join(','));
  if(county==='OTHER')request=request.is('county_id',null);
  else request=request.eq('county_id',county);
  if(union)request=request.eq('scope_id','loc');
  const result=await request.order('title',{ascending:true})
    .order('uid',{ascending:true}).limit(Math.min(Math.max(1,limit),8));
  return (verified(result,'空間錨點自動完成')||[])
    .map(row=>({...row,source_scope:union?row.scope_id:id}));
}
export async function readTracePopularAnchors(scopeId){
  const id=sourceId(scopeId);
  const result=await dbPublicClient.schema('silver').rpc('trace_popular_anchors',{
    p_scope_id:id,p_limit:10
  });
  return (verified(result,'常用空間錨點')||[])
    .map(row=>({...row,trace_type:'anchor',source_scope:id}));
}

export async function readAllTraceAnchors(scopeId,{nativeOnly=false}={}){
  const id=sourceId(scopeId),union=id==='loc',pageSize=800;
  const rows=[];
  for(let offset=0;;offset+=pageSize){
    let request=dbPublicClient.schema('silver').from(id+'_trace')
      .select(TRACE_DISPLAY_COLUMNS+(union?',scope_id':''))
      .eq('trace_type','anchor');
    if(union&&nativeOnly)request=request.eq('scope_id','loc');
    const result=await request.order('created_at',{ascending:true})
      .order('uid',{ascending:true})
      .range(offset,offset+pageSize-1);
    const batch=verified(result,'全部痕跡錨點讀取')||[];
    rows.push(...batch.map(row=>({...row,source_scope:union?row.scope_id:id})));
    if(batch.length<pageSize)break;
  }
  return rows;
}

// Used for both interactive edits and bulk geocoding. All comparisons are
// based on the source Scope, never the LOC-wide materialized union.
const normalizedName=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,'').toLowerCase();
function comparableAnchors(data,scopeId,excludeUid=''){
  return (data?.anchors||[]).filter(row=>row.source_scope===scopeId&&row.uid!==excludeUid);
}
function classifyNewAnchor(candidate,known){
  const matches=findAnchorWriteMatches(candidate,known);
  const safe=matches.filter(item=>item.safeReuse);
  // Two or more seemingly equivalent records indicate that the *existing*
  // database needs a reviewed consolidation, not a new automatic decision.
  const reuse=safe.length===1?safe[0].b:null;
  // All uncertain same-name / same-address cases remain distinct identities.
  // Organizer shows candidates for review; it never blocks a new historical
  // store simply because its label or premises were previously used.
  return {reuse,matches};
}
async function reuseExistingAnchor({scopeId,candidate,existing}){
  const name=String(candidate.title).trim(),oldNote=String(existing.description||'');
  if(normalizedName(name)===normalizedName(existing.title))
    return {uid:existing.uid,reused:true};
  // This exact, reviewed postal address agrees within 60 meters. The existing
  // anchor is retained, with the incoming check-in name preserved as an alias.
  // Do not touch Galaxy, map anchor_uids, coordinates, or an existing title.
  const names=[...oldNote.matchAll(/(?:打卡別名|歷史名稱)[：:]\s*([^。\n]+)/g)]
    .flatMap(match=>match[1].split(/[、，,|]/).map(s=>normalizedName(s)));
  if(names.includes(normalizedName(name)))return {uid:existing.uid,reused:true};
  const provenance=String(candidate.description||'').trim();
  const extra=provenance&&provenance!==oldNote&&!oldNote.includes(provenance)
    ?'\n合併來源說明（'+name+'）：'+provenance:'';
  const note=oldNote+(oldNote?'\n':'')+'打卡別名：'+name+'。'+extra;
  if(note.length>2000)throw Error('同址別名說明會超過 2000 字，請先在整理頁處理。');
  let request=dbAuthRelation(relation(scopeId)).update({description:note})
    .eq('uid',existing.uid).eq('trace_type','anchor').eq('description',oldNote);
  if(scopeId==='loc')request=request.eq('scope_id','loc');
  const rows=verified(await request.select('uid'),'整理同址別名');
  if(!Array.isArray(rows)||rows.length!==1)
    throw Error('定錨點在檢查後已被其他工作修改；請重新讀取再儲存，避免覆蓋別名。');
  return {uid:existing.uid,reused:true,aliasAdded:name};
}
export async function inspectTraceAnchorBeforeWrite({scopeId,anchor,excludeUid=''}){
  const id=sourceId(scopeId);
  // Route/anchor writes inspect only the owner Scope. In particular a native
  // LOC write must not download every author's anchor from the public union.
  const anchors=await readAllTraceAnchors(id,{nativeOnly:id==='loc'});
  const existing=comparableAnchors({anchors},id,excludeUid);
  return classifyNewAnchor({...anchor,source_scope:id,trace_type:'anchor'},existing);
}
export async function addTraceAnchor({scopeId,title,description='',address='',floor_label='',floor_level=null,longitude,latitude,radius_m=500,forceNewIdentity=false}){
  const id=sourceId(scopeId);
  if(!validCoordinates(longitude,latitude))throw Error('經緯度超出有效範圍。');
  if(!validRadius(radius_m))throw Error('空間範圍必須介於 10 公尺與 20,000 公里。');
  const data={
    uid:createUid8(),trace_type:'anchor',title:verifiedText(title,'定錨點名稱'),
    description:descriptionText(description),longitude:Number(longitude),latitude:Number(latitude),radius_m:Number(radius_m),
    source_scope:id,
    county_id:await countyIdAt(longitude,latitude,address),
    ...locationFields({address,floor_label,floor_level})
  };
  // Explicitly copied cross-Scope references must get a NEW UID in this Scope.
  // Neither run same-Scope dedup nor alias-update an existing place's history.
  if(!forceNewIdentity){
    const {reuse}=await inspectTraceAnchorBeforeWrite({scopeId:id,anchor:data});
    if(reuse)return reuseExistingAnchor({scopeId:id,candidate:data,existing:reuse});
  }
  const {source_scope,...record}=data;
  return verified(await dbAuthRelation(relation(id)).insert(record).select('uid').single(),'新增定錨點');
}
// One authorized insert per bounded batch, never one read or insert per item.
// The after-batch audit reports unresolved candidates for the existing
// organizer; it does not blindly merge approximate coordinates.
export async function addTraceAnchorsBatch({scopeId,places=[]}){
  const id=sourceId(scopeId);
  if(id==='loc')throw Error('請在作品所屬的 Scope 建立空間定錨點。');
  const list=Array.isArray(places)?places:[];
  if(!list.length)throw Error('沒有已核對的座標可以儲存。');
  if(list.length>2000)throw Error('單次匯入超過安全上限。');
  const previous=await readTraceData(id);
  const known=comparableAnchors(previous,id);
  const pending=[],reuseQueue=[];
  let skipped=0,duplicatesInBatch=0;
  for(const place of list){
    const data={uid:createUid8(),trace_type:'anchor',source_scope:id,
      title:verifiedText(place.title,'打卡地點名稱'),
      description:descriptionText(place.description||''),
      longitude:Number(place.longitude),latitude:Number(place.latitude),
      county_id:countyIdFromAddress(place.address),
      radius_m:Number(place.radius_m??500),
      ...locationFields(place)};
    if(!validCoordinates(place.longitude,place.latitude))
      throw Error(data.title+' 的經緯度無效，請先確認候選位置。');
    if(!validRadius(data.radius_m))throw Error(data.title+' 的空間範圍無效。');
    const old=classifyNewAnchor(data,known);
    if(old.reuse){
      reuseQueue.push({candidate:data,existing:old.reuse});skipped++;continue;
    }
    // Keep candidates of uncertain identity as distinct records, so they can
    // be reviewed after import without losing the original check-in title.
    const sameBatch=classifyNewAnchor(data,pending);
    if(sameBatch.reuse){
      // Same-name near-identical coordinates: one place, not a second record.
      // Distinct names at one address are separate historical identities.
      skipped++;duplicatesInBatch++;continue;
    }
    pending.push(data);
  }
  let consolidated=0;
  for(const item of reuseQueue){
    try{await reuseExistingAnchor({scopeId:id,...item});consolidated++;}
    catch(error){throw Error('同址整併已完成 '+consolidated+' 處，下一筆失敗：'+String(error?.message||error));}
  }
  let count=0;
  for(let offset=0;offset<pending.length;offset+=80){
    const chunk=pending.slice(offset,offset+80).map(({source_scope,...item})=>item);
    try{
      const rows=verified(await dbAuthRelation(relation(id)).insert(chunk).select('uid'),'批次建立空間定錨點');
      if(!Array.isArray(rows)||rows.length!==chunk.length)throw Error('批次寫入數量不符');
      count+=rows.length;
    }catch(error){
      throw Error('已成功寫入 '+count+' 處，後續批次失敗：'+String(error.message||error)+'。可重新執行，已存在的地點會跳過。');
    }
  }
  let reviewCount=0,reviewPreview=[],auditError='';
  try{
    const current=await readTraceData(id);
    const all=organizeAnchorCandidates(comparableAnchors(current,id));
    reviewCount=all.length;
    reviewPreview=all.slice(0,8).map(item=>({
      a:item.a.title,b:item.b.title,meters:item.meters,type:item.type
    }));
  }catch(error){auditError=String(error?.message||error);}
  return {count,skipped,consolidated,duplicatesInBatch,reviewCount,reviewPreview,auditError};
}

export async function updateTraceAnchor({scopeId,uid,title,description='',address='',floor_label='',floor_level=null,longitude,latitude,radius_m=500}){
  const id=sourceId(scopeId);
  const anchorId=String(uid||'').trim();
  if(!/^[A-Za-z0-9]{8}$/.test(anchorId))throw Error('定錨點 UID 格式無效。');
  if(!validCoordinates(longitude,latitude))throw Error('經緯度超出有效範圍。');
  if(!validRadius(radius_m))throw Error('空間範圍必須介於 10 公尺與 20,000 公里。');
  const changes={
    title:verifiedText(title,'定錨點名稱'),
    description:descriptionText(description),
    longitude:Number(longitude),latitude:Number(latitude),radius_m:Number(radius_m),
    county_id:await countyIdAt(longitude,latitude,address),
    ...locationFields({address,floor_label,floor_level})
  };
  const check=await inspectTraceAnchorBeforeWrite({scopeId:id,
    anchor:{...changes,source_scope:id,trace_type:'anchor'},excludeUid:anchorId});
  if(check.reuse)
    throw Error('更新後與既有相同名稱、相同位置的定錨點重疊；請先核對 UID。');
  let request=dbAuthRelation(relation(id)).update(changes)
    .eq('uid',anchorId).eq('trace_type','anchor');
  if(id==='loc')request=request.eq('scope_id','loc');
  const result=await request.select('uid').single();
  return verified(result,'更新定錨點');
}

function validatedTraceMapValues({scopeId,title,description='',category='',className='',group='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const chosen=Array.isArray(anchorUids)?anchorUids:[];
  if(chosen.length<2||chosen.length>80||new Set(chosen).size!==chosen.length)
    throw Error('請依順序選擇 2～80 個不重複的定錨點。');
  const existing=new Set(anchors.filter(row=>row.source_scope===id).map(row=>row.uid));
  if(chosen.some(uid=>!existing.has(uid)))
    throw Error('痕跡圖不能引用不同 Scope 或不存在的定錨點。');
  return {
    title:verifiedText(title,'痕跡圖名稱'),description:descriptionText(description),
    ...validateTraceRouteLabels(category,className,group),
    anchor_uids:chosen
  };
}
function traceMapUid(uid){
  const id=String(uid||'').trim();
  if(!/^[A-Za-z0-9]{8}$/.test(id))throw Error('痕跡圖 UID 格式無效。');
  return id;
}
export async function addTraceMap({scopeId,title,description='',category='',className='',group='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const data={uid:createUid8(),trace_type:'map',
    ...validatedTraceMapValues({scopeId:id,title,description,category,className,group,anchorUids,anchors})};
  const result=await dbAuthRelation(relation(id)).insert(data).select('uid').single();
  return verified(result,'新增痕跡圖');
}
export async function updateTraceMap({scopeId,uid,title,description='',category='',className='',group='',anchorUids=[],anchors=[]}){
  const id=sourceId(scopeId);
  const changes=validatedTraceMapValues({scopeId:id,title,description,category,className,group,anchorUids,anchors});
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
