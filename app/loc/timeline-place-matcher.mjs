// Google Timeline is transient private evidence. Do not persist coordinates,
// activities or timeline source data to Galaxy, time anchors, or local storage.
export const TIMELINE_RADIUS_METERS=500;
const asTime=value=>{
  const n=typeof value==='number'?value:typeof value==='string'&&/^\d{10,13}$/.test(value)?Number(value):NaN;
  const t=Number.isFinite(n)?(String(Math.trunc(n)).length<=10?n*1000:n):Date.parse(String(value||''));
  return Number.isFinite(t)?t:null;
};
const e7=value=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const number=Number(value);
  return Number.isFinite(number)?(Math.abs(number)>180?number/1e7:number):null;
};
export function timelineCoordinates(input){
  if(!input)return null;
  let lat,lng;
  if(typeof input==='string'){
    const match=input.trim().replace(/^geo:/i,'').replace(/[°\s]/g,'').match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if(!match)return null;
    lat=Number(match[1]);lng=Number(match[2]);
  }else{
    const obj=input.placeLocation||input.location||input;
    if(typeof obj.latLng==='string')return timelineCoordinates(obj.latLng);
    if(typeof obj.point==='string')return timelineCoordinates(obj.point);
    lat=e7(obj.latitudeE7??obj.latE7??obj.latitude??obj.lat);
    lng=e7(obj.longitudeE7??obj.lngE7??obj.longitude??obj.lng);
  }
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180
    ?{lat,lng}:null;
}
export function timelineVisitWindows(document){
  const root=Array.isArray(document)?document
    :Array.isArray(document?.semanticSegments)?document.semanticSegments
    :Array.isArray(document?.timelineObjects)?document.timelineObjects:null;
  if(!root)throw Error('不支援的 Timeline JSON：需要 semanticSegments、timelineObjects 或手機匯出的事件陣列');
  const windows=[],seen=new Set();
  for(const item of root){
    const modern=item?.visit,legacy=item?.placeVisit;
    if(!modern&&!legacy)continue; // driving paths are not proof of a visit
    const loc=modern?(modern.topCandidate?.placeLocation||modern.topCandidate?.location||modern.topCandidate)
      :legacy.location;
    const point=timelineCoordinates(loc);
    const duration=legacy?.duration||{};
    const from=asTime(item.startTime??duration.startTimestamp??duration.startTimestampMs??item.startTimestamp);
    const to=asTime(item.endTime??duration.endTimestamp??duration.endTimestampMs??item.endTimestamp);
    if(!point||from===null||to===null||from>to)continue;
    const probability=modern?.topCandidate?.probability??modern?.probability;
    const lowConfidence=(probability!=null&&Number.isFinite(Number(probability))&&Number(probability)<0.5)
      ||/LOW/i.test(String(legacy?.placeConfidence||''));
    // Long visits can be split for indexed database range lookups.
    const end=Math.max(from+1,to);
    for(let start=from;start<end;start+=12*60*60*1000){
      const stop=Math.min(end,start+12*60*60*1000);
      const key=[start,stop,point.lat.toFixed(6),point.lng.toFixed(6)].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      windows.push({from:new Date(start).toISOString(),to:new Date(stop).toISOString(),
        lat:point.lat,lng:point.lng,uncertain:lowConfidence});
      if(windows.length>100000)throw Error('Timeline 造訪區間超過 100,000，請分年度匯入');
    }
  }
  windows.sort((a,b)=>a.from.localeCompare(b.from));
  return windows;
}
export function distanceInMeters(a,b){
  const rad=Math.PI/180;
  const dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;
  const n=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(n)));
}
export function matchTimelineWindows(windows,anchors,radius=TIMELINE_RADIUS_METERS){
  const locations=(anchors||[]).filter(row=>row.trace_type==='space_anchor')
    .map(row=>{
      const a=Array.isArray(row.address)?row.address:null;
      const lng=Number(a?.[0]),lat=Number(a?.[1]);
      return a?.length===2&&a[0]!=null&&a[1]!=null&&
        Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180
        ?{uid:String(row.uid||''),title:String(row.title||''),lat,lng}:null;
    }).filter(Boolean);
  let omitted=0,ambiguous=0;
  const selected=[];
  for(const window of windows){
    const candidates=locations.map(anchor=>({...anchor,distance:distanceInMeters(window,anchor)}))
      .filter(anchor=>anchor.distance<=radius).sort((a,b)=>a.distance-b.distance||a.uid.localeCompare(b.uid));
    if(!candidates.length){omitted++;continue;}
    if(candidates.length>1||window.uncertain)ambiguous++;
    selected.push({...window,index:selected.length,candidates:candidates.map(({uid,title,distance})=>({
      uid,title,meters:Math.round(distance)})),
      disputed:candidates.length>1||window.uncertain});
  }
  return {windows:selected,withoutAnchor:omitted,ambiguousWindows:ambiguous};
}
export function accumulateTimelineArticles(matches){
  const byUid=new Map();
  for(const hit of matches){
    const uid=String(hit.uid||'').trim(),window=hit.window;
    if(!uid||!window)continue;
    let entry=byUid.get(uid);
    if(!entry){entry={uid,title:String(hit.title||''),createtime:hit.createtime,
      existingPlaceId:String(hit.place_id||'').trim(),candidates:new Map(),coordinates:new Set(),disputed:false};byUid.set(uid,entry);}
    for(const candidate of window.candidates)entry.candidates.set(candidate.uid,candidate);
    if(Number.isFinite(window.lat)&&Number.isFinite(window.lng))
      entry.coordinates.add(String(window.lat)+','+String(window.lng));
    if(window.disputed)entry.disputed=true;
  }
  const ready=[],disputes=[],unchanged=[];
  for(const item of byUid.values()){
    const candidates=[...item.candidates.values()].sort((a,b)=>a.meters-b.meters||a.uid.localeCompare(b.uid));
    const unique=candidates.length===1&&!item.disputed;
    const coordinates=[...item.coordinates].sort();
    const article={...item,candidates,coordinates,
      groupKey:coordinates.length===1?'point:'+coordinates[0]:'article:'+item.uid};
    if(unique&&(!item.existingPlaceId||item.existingPlaceId===candidates[0].uid))
      ready.push({...article,placeId:candidates[0].uid});
    else disputes.push({...article,reason:coordinates.length>1?'文章跨多組座標，必須逐篇確認':
      item.existingPlaceId?'既有 place_id 與候選位置不同':
      '附近多個定錨點／來源信心不足'});
  }
  const byDate=(a,b)=>String(a.createtime||'').localeCompare(String(b.createtime||''))||a.uid.localeCompare(b.uid);
  ready.sort(byDate);disputes.sort(byDate);
  return {ready,disputes,unchanged};
}

/* Review is by exact Timeline coordinates, not one dialog per article.
   Separate articles matched at multiple coordinates: never infer a single place. */
export function groupTimelineMissingPlaces(analysis){
  const groups=new Map();
  for(const row of [...(analysis?.ready||[]),...(analysis?.disputes||[])]){
    const key=row.groupKey||'article:'+row.uid;
    if(!groups.has(key))groups.set(key,{key,coordinates:row.coordinates||[],rows:[]});
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map(group=>{
    const choices=new Map();
    for(const row of group.rows)
      for(const candidate of row.candidates||[])choices.set(candidate.uid,candidate);
    const candidates=[...choices.values()].sort((a,b)=>a.meters-b.meters||a.uid.localeCompare(b.uid));
    const unanimous=group.key.startsWith('point:')&&group.rows.every(row=>
      row.candidates.length===1&&!row.disputed&&row.candidates[0].uid===candidates[0]?.uid&&
      (!row.existingPlaceId||row.existingPlaceId===candidates[0]?.uid));
    return {...group,candidates,defaultPlaceId:unanimous?candidates[0]?.uid||'':'',
      disputed:!unanimous};
  }).sort((a,b)=>b.rows.length-a.rows.length||a.key.localeCompare(b.key));
}
