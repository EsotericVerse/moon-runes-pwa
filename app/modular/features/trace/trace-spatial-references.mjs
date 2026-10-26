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
  const found=[],seen=new Set(),max=Math.min(200,Math.max(1,Number(limit)||8));
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

/**
 * Resolve one name's already-known positions as *review candidates*, never
 * an implicit winner or a merged identity. Same name at two coordinates,
 * floors or Scopes must remain distinct and visible.
 */
export function spatialReferenceChoicesForName(name,references=[]){
  const key=String(name||'').trim();
  const matches=(Array.isArray(references)?references:[])
    .filter(ref=>String(ref?.title||'').trim()===key);
  const choices=matches.slice(0,8).map(ref=>({
    longitude:ref.longitude,latitude:ref.latitude,
    address:ref.address||'',floor_label:ref.floor_label||'',
    floor_level:ref.floor_level??null,
    title:ref.title,source_scope:ref.source_scope,uid:ref.uid,
    label:ref.title+' · '+(ref.address||'地址未核實')+
      (ref.floor_label?' · '+ref.floor_label:'')+
      ' · '+ref.source_scope+' UID '+ref.uid
  }));
  return {choices,selected:-1,status:choices.length?'review':'notfound',
    origin:'loc-reference',moreChoices:matches.length>8};
}
