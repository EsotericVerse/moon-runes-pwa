// Space part of the shared Anchor contract. No coordinates or routing service
// are required to define semantic links. Real-world map coordinates are optional.
export const SPACE_ANCHOR='space_anchor';
export const SPACE_PERIOD='space_period';
export const SPACE_TRACE='space_trace';
export const BASE62_FOUR=/^[A-Za-z0-9]{4}$/;

export function spaceType(record){
  const kind=String(record?.type||record?.trace_type||'');
  if(kind==='anchor')return SPACE_ANCHOR; // Historic Trace rows (read-only until cutover).
  if(kind==='map')return SPACE_PERIOD; // Historic Frame was one ordered route.
  return kind;
}
export const spaceId=record=>String(record?.id??record?.uid??'').trim();
export const spaceScope=record=>String(record?.source_scope??record?.scope_id??'').trim();
export function spaceCoordinates(record){
  const address=record?.address;
  // The new address holds coordinates as [longitude, latitude]; text belongs
  // in description. Historic coordinate columns remain readable during migration.
  const values=Array.isArray(address)&&address.length===2
    ?address:[record?.longitude,record?.latitude];
  if(values.some(value=>value==null||String(value).trim()===''))return null;
  const [longitude,latitude]=values.map(Number);
  return Number.isFinite(longitude)&&Number.isFinite(latitude)
    &&Math.abs(longitude)<=180&&Math.abs(latitude)<=90
    ?[longitude,latitude]:null;
}
function sameScope(row,owner){
  return !owner||spaceScope(row)===owner;
}
function normalizedIds(input){
  return (Array.isArray(input)?input:[])
    .map(id=>String(id??'').trim()).filter(Boolean);
}
// No graph edges are inferred from a loose selection of places. The only
// automatic edges are adjacent stops inside one explicitly saved space_period.
export function spaceRouteIds(selection,routes=[]){
  const owner=spaceScope(selection);
  const ids=new Set();
  const all=new Map((routes||[]).filter(row=>sameScope(row,owner))
    .map(row=>[spaceId(row),row]));
  const addRoute=route=>{
    if(spaceType(route)!==SPACE_PERIOD)return;
    normalizedIds(route.anchor_list).forEach(id=>ids.add(id));
  };
  if(spaceType(selection)===SPACE_PERIOD)addRoute(selection);
  if(spaceType(selection)===SPACE_TRACE){
    normalizedIds(selection.anchor_list).forEach(id=>{
      const route=all.get(id);
      if(route)addRoute(route);
    });
  }
  return [...ids];
}
export function resolveSpaceGraph(selection,records=[],{scopeId}={}){
  const owner=scopeId||(!Array.isArray(selection)?spaceScope(selection):'');
  const scoped=(records||[]).filter(row=>sameScope(row,owner));
  const byId=new Map(scoped.map(row=>[spaceId(row),row]));
  const points=new Map();
  const lines=[];
  const routes=[];
  const missing=new Set();
  const addPoint=id=>{
    const record=byId.get(id);
    if(!record||spaceType(record)!==SPACE_ANCHOR){missing.add(id);return false;}
    if(!points.has(id))points.set(id,{id,title:String(record.title||record.label||''),coordinates:spaceCoordinates(record),record});
    return true;
  };
  const addRoute=route=>{
    if(!route||spaceType(route)!==SPACE_PERIOD)return false;
    const routeId=spaceId(route),nodes=normalizedIds(route.anchor_list);
    routes.push({id:routeId,title:String(route.title||''),nodes});
    nodes.forEach(addPoint);
    nodes.slice(1).forEach((id,index)=>{
      const from=nodes[index];
      // Missing endpoints never become a guessed/bridged segment.
      if(points.has(from)&&points.has(id)){
        lines.push({from,to:id,routeId,order:index});
      }
    });
    return true;
  };
  if(Array.isArray(selection)){
    normalizedIds(selection).forEach(addPoint);
  }else if(spaceType(selection)===SPACE_ANCHOR){
    addPoint(spaceId(selection));
  }else if(spaceType(selection)===SPACE_PERIOD){
    addRoute(selection);
  }else if(spaceType(selection)===SPACE_TRACE){
    normalizedIds(selection.anchor_list).forEach(routeId=>{
      const route=byId.get(routeId);
      if(!addRoute(route))missing.add(routeId);
    });
  }
  return {points:[...points.values()],lines,routes,missing:[...missing]};
}
