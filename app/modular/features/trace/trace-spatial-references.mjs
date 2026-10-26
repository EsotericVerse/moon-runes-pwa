// Read-only LOC-wide reference candidates; distinct from anchor identity.
export function normalizedSpatialReferenceTerm(value){
  return String(value ?? '').trim().normalize('NFKC').slice(0,100);
}
export function spatialReferenceLikePattern(value){
  const q=normalizedSpatialReferenceTerm(value);
  if(q.length<2)return '';
  return '%'+q.replace(/[\\%_]/g,'\\$&')+'%';
}
export function spatialReferenceCandidates(groups,limit=8){
  const found=[],seen=new Set(),max=Math.min(8,Math.max(1,limit));
  for(const group of groups){
    for(const item of group||[]){
      const scope=String(item?.scope_id||item?.source_scope||'');
      const uid=String(item?.uid||'');
      if(!scope||!uid||item.latitude==null||item.longitude==null||
        String(item.latitude).trim()===''||String(item.longitude).trim()==='')continue;
      const lng=Number(item.longitude),lat=Number(item.latitude);
      if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90)continue;
      if(seen.has(scope+':'+uid))continue;
      seen.add(scope+':'+uid);
      found.push({uid,source_scope:scope,title:item.title,
        address:item.address||'',floor_label:item.floor_label||'',
        floor_level:item.floor_level??null,longitude:lng,latitude:lat});
      if(found.length>=max)return found;
    }
  }
  return found;
}
