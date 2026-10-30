import {importGeoKey} from './import-geocoordinates.mjs';

// Only the exact numeric coordinate pair identifies a Trace space anchor.
// Import never invents an anchor name or silently creates a new place.
const VALID_UID=/^[A-Za-z0-9]{4}$/;
function incomingLocations(records){
  const coordinates=new Set();let missing=0;
  for(const record of records||[]){
    const key=importGeoKey(record?.__importCoordinates);
    if(key)coordinates.add(key);
    else missing++;
  }
  return {coordinates,missing};
}
export async function prepareImportPlaceAnchors(records,{
  scopeId,relation,pageSize=750,allowMissing=false,onProgress
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
      if(allowMissing&&['42P01','PGRST205'].includes(String(error.code||'')))
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
  let reused=0,unmatchedCoordinates=0;
  for(const key of coordinates){
    const uid=existing.get(key);
    if(uid){byCoordinate.set(key,uid);reused++;}
    else unmatchedCoordinates++;
  }
  return {byCoordinate,byName,created:0,reused,
    skipped:missing+unmatchedCoordinates,unmatchedCoordinates};
}
export function importedPlaceId({incoming,existing,byCoordinate}){
  if(String(existing?.place_id||'').trim())return null;
  const key=importGeoKey(incoming?.__importCoordinates);
  const uid=key?byCoordinate?.get(key):null;
  return VALID_UID.test(String(uid||''))?uid:null;
}
