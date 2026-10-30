import {importGeoKey} from './import-geocoordinates.mjs';

// Trace identity is the exact numeric [longitude, latitude] pair. Names are
// never identity keys. New anchors require an explicit source place name and
// a separate, opt-in createMissing action.
const VALID_UID=/^[A-Za-z0-9]{4}$/;
const safeTitle=value=>{
  const title=String(value??'').trim();
  return title&&title.length<=120&&!/[\u0000-\u001f]/u.test(title)?title:'';
};
function incomingLocations(records){
  const coordinates=new Map();let missing=0;
  for(const record of records||[]){
    const key=importGeoKey(record?.__importCoordinates);
    if(!key){missing++;continue;}
    const title=safeTitle(record?.__importPlaceName);
    const postal=String(record?.__importPlaceAddress??'').trim().slice(0,320);
    const previous=coordinates.get(key);
    if(!previous)coordinates.set(key,{title,postal,address:JSON.parse(key)});
    else if(!previous.title&&title)coordinates.set(key,{title,postal,address:previous.address});
  }
  return {coordinates,missing};
}
export async function prepareImportPlaceAnchors(records,{
  scopeId,relation,pageSize=750,allowMissing=false,createMissing=false,onProgress
}={}){
  const {coordinates,missing}=incomingLocations(records);
  const byCoordinate=new Map(),byName=new Map();
  const unavailable=()=>({byCoordinate,byName,created:0,reused:0,
    skipped:missing+coordinates.size,unmatchedCoordinates:coordinates.size});
  if(!coordinates.size||scopeId==='local'||scopeId==='loc'||!scopeId)
    return unavailable();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scopeId))throw Error('空間定錨 Scope 無效');
  if(typeof relation!=='function')throw Error('空間定錨資料庫不存在');
  const table='silver.'+scopeId+'_trace',existing=new Map();
  onProgress?.({phase:'讀取現有空間定錨',completed:0,total:0});
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await relation(table)
      .select('uid,title,address').eq('trace_type','space_anchor')
      .order('uid',{ascending:true}).range(offset,offset+pageSize-1);
    if(error){
      if(allowMissing&&!createMissing&&['42P01','PGRST205'].includes(String(error.code||'')))
        return unavailable();
      throw Error('讀取空間定錨失敗：'+(error.message||error));
    }
    for(const anchor of data||[]){
      const key=importGeoKey(anchor?.address);
      if(key&&VALID_UID.test(String(anchor?.uid||''))&&!existing.has(key))
        existing.set(key,String(anchor.uid));
    }
    onProgress?.({phase:'讀取現有空間定錨',completed:offset+(data||[]).length,total:0});
    if((data||[]).length<pageSize)break;
  }
  let reused=0,created=0;
  const pending=[];
  for(const [key,place] of coordinates){
    const uid=existing.get(key);
    if(uid){byCoordinate.set(key,uid);reused++;}
    else if(createMissing&&place.title)pending.push([key,place]);
  }
  for(let offset=0;offset<pending.length;offset+=80){
    const chunk=pending.slice(offset,offset+80);
    const rows=chunk.map(([,place])=>({
      trace_type:'space_anchor',title:place.title,
      description:{text:'',address:place.postal||null},
      address:place.address,times:[],anchor_list:[],hidden_depth:-1
    }));
    const {data,error}=await relation(table).insert(rows).select('uid,address');
    if(error)throw Error('新增空間定錨失敗：'+(error.message||error));
    if(!Array.isArray(data)||data.length!==rows.length)
      throw Error('新增空間定錨回傳筆數不符；請重新核對再重試');
    const expected=new Set(chunk.map(([key])=>key));
    for(const anchor of data){
      const key=importGeoKey(anchor?.address);
      const uid=String(anchor?.uid||'');
      if(!expected.has(key)||!VALID_UID.test(uid)||byCoordinate.has(key))
        throw Error('新增空間定錨座標或 UID 不符；請重新核對');
      byCoordinate.set(key,uid);
      created++;
    }
    onProgress?.({phase:'建立原始座標定錨',completed:offset+chunk.length,total:pending.length});
  }
  const unmatchedCoordinates=coordinates.size-byCoordinate.size;
  return {byCoordinate,byName,created,reused,
    skipped:missing+unmatchedCoordinates,unmatchedCoordinates};
}
export function importedPlaceId({incoming,existing,byCoordinate}){
  if(String(existing?.place_id||'').trim())return null;
  const key=importGeoKey(incoming?.__importCoordinates);
  const uid=key?byCoordinate?.get(key):null;
  return VALID_UID.test(String(uid||''))?uid:null;
}
