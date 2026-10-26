export const SPACE_ANCHOR='space_anchor';
export const SPACE_PERIOD='space_period';
export const SPACE_ROAD=SPACE_PERIOD; // Historical JS alias only; no space_road database writes.
export const SPACE_TRACE='space_trace';
export const BASE62_FOUR=/^[A-Za-z0-9]{4}$/;
export function spaceType(row){
  const type=String(row?.type||row?.trace_type||'');
  return type==='anchor'?SPACE_ANCHOR:type==='map'||type==='space_road'?SPACE_PERIOD:type;
}
export const spaceId=row=>String(row?.id??row?.uid??'').trim();
export const spaceScope=row=>String(row?.source_scope??row?.scope_id??'').trim();
export function spaceCoordinates(row){
  const address=row?.address;
  const point=Array.isArray(address)&&address.length===2?address:[row?.longitude,row?.latitude];
  if(point.some(value=>value==null||String(value).trim()===''))return null;
  const [lng,lat]=point.map(Number);
  return Number.isFinite(lng)&&Number.isFinite(lat)&&Math.abs(lng)<=180&&Math.abs(lat)<=90?[lng,lat]:null;
}
export function spaceMembers(record){return Array.isArray(record?.anchor_list)?record.anchor_list:[];}
export function spaceRouteIds(selection,records=[]){
  const owner=spaceScope(selection);
  const routes=new Map((records||[]).filter(row=>(!owner||spaceScope(row)===owner)
    &&spaceType(row)===SPACE_PERIOD).map(row=>[spaceId(row),row]));
  return [...new Set(spaceMembers(selection).flat(Infinity)
    .filter(uid=>typeof uid==='string'&&BASE62_FOUR.test(uid))
    .flatMap(uid=>routes.has(uid)?spaceMembers(routes.get(uid))
      .filter(id=>typeof id==='string'&&BASE62_FOUR.test(id)):[uid]))];
}
export function resolveSpaceGraph(selection,records=[],{scopeId}={}){
  const owner=scopeId||(!Array.isArray(selection)?spaceScope(selection):'');
  const byId=new Map(records.filter(row=>!owner||spaceScope(row)===owner).map(row=>[spaceId(row),row]));
  const points=new Map(),lines=[],routes=[],missing=new Set();
  const addPoint=uid=>{
    const row=byId.get(uid);
    if(!row||spaceType(row)!==SPACE_ANCHOR){missing.add(uid);return false;}
    if(!points.has(uid))points.set(uid,{id:uid,title:String(row.title||row.label||''),
      coordinates:spaceCoordinates(row),record:row});
    return true;
  };
  const addLine=(from,to,routeId,order)=>{
    const first=addPoint(from),second=addPoint(to);
    if(first&&second)lines.push({from,to,routeId,order});
  };
  if(Array.isArray(selection)){
    selection.filter(uid=>BASE62_FOUR.test(String(uid))).forEach(addPoint);
  }else if(spaceType(selection)===SPACE_ANCHOR){
    addPoint(spaceId(selection));
  }else if(spaceType(selection)===SPACE_ROAD){
    const nodes=spaceRouteIds(selection);
    routes.push({id:spaceId(selection),title:String(selection.title||''),nodes});
    nodes.forEach(addPoint);
    for(let i=1;i<nodes.length;i++)addLine(nodes[i-1],nodes[i],spaceId(selection),i-1);
  }else if(spaceType(selection)===SPACE_TRACE){
    spaceMembers(selection).forEach((part,index)=>{
      if(typeof part==='string'&&BASE62_FOUR.test(part)){
        const route=byId.get(part);
        if(!route||spaceType(route)!==SPACE_PERIOD){missing.add(part);return;}
        const nodes=spaceMembers(route);
        routes.push({id:part,title:String(route.title||''),nodes});
        nodes.forEach(addPoint);
        for(let i=1;i<nodes.length;i++)addLine(nodes[i-1],nodes[i],part,i-1);
        return;
      }
      if(!Array.isArray(part)||part.length!==2){missing.add('invalid-pair:'+index);return;}
      const [from,to]=part.map(uid=>String(uid||'').trim());
      if(!BASE62_FOUR.test(from)||!BASE62_FOUR.test(to)||from===to){
        missing.add('invalid-pair:'+index);return;
      }
      addLine(from,to,spaceId(selection),index);
    });
  }
  return {points:[...points.values()],lines,routes,missing:[...missing]};
}
